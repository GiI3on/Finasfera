// scripts/validate-popular.mjs
import curatedRaw from '../src/app/data/popular-pl.js';

// --- pomocnicze: bezpieczny fetch JSON ---
async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// --- Yahoo quote (najczęściej USD, ale czasem PLN) ---
async function yahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const j = await getJSON(url);
  const r = j?.quoteResponse?.result?.[0];
  if (!r) return null;
  return {
    price: Number.isFinite(r.regularMarketPrice) ? r.regularMarketPrice : null,
    previousClose: Number.isFinite(r.regularMarketPreviousClose) ? r.regularMarketPreviousClose : null,
    currency: r?.currency || null,
  };
}

// --- Stooq (PLN) ---
async function stooqQuote(ticker) {
  // JSON feed z no-store; w trakcie sesji last bywa puste — fallback do close
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(ticker)}&f=sd2t2ohlcv&h&e=json`;
  const j = await getJSON(url);
  const r = j?.symbols?.[0];
  if (!r || r?.symbol === 'N/D') return null;

  const last = Number(r?.z?.replace(',', '.'));
  const close = Number(r?.c?.replace(',', '.'));
  const price = Number.isFinite(last) && last > 0 ? last : (Number.isFinite(close) ? close : null);

  return { price, currency: 'PLN' };
}

// --- kurs USD/PLN z Yahoo (fallback 4.0) ---
async function usdPlnRate() {
  const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=USDPLN=X';
  try {
    const j = await getJSON(url);
    const r = j?.quoteResponse?.result?.[0];
    const rate = Number.isFinite(r?.regularMarketPrice) ? r.regularMarketPrice : null;
    return rate || 4.0;
  } catch {
    return 4.0;
  }
}

// --- główna walidacja ---
(async () => {
  const items = Array.isArray(curatedRaw) ? curatedRaw : [];
  if (items.length === 0) {
    console.log('Brak danych w popular-pl.js');
    process.exit(1);
  }

  const rate = await usdPlnRate();
  const problems = [];
  let okCount = 0;

  const chunkSize = 15;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    await Promise.all(chunk.map(async (item) => {
      const yahoo = item.yahoo || null;
      const stooq = item.stooq || null;

      // 1) preferuj Stooq dla GPW (PLN)
      if (stooq) {
        try {
          const q = await stooqQuote(stooq);
          if (!q || !Number.isFinite(q.price) || q.price <= 0) {
            problems.push({ item, reason: 'stooq: brak ceny lub 0', quote: q });
            return;
          }
          okCount++;
          return;
        } catch (e) {
          problems.push({ item, reason: 'stooq: wyjątek', error: e.message });
          return;
        }
      }

      // 2) fallback: Yahoo (często USD) z fallbackiem do poprzedniego zamknięcia
      if (yahoo) {
        try {
          const q = await yahooQuote(yahoo);
          if (!q || (!Number.isFinite(q.price) && !Number.isFinite(q.previousClose))) {
            problems.push({ item, reason: 'yahoo: brak ceny i poprzedniego zamknięcia', quote: q });
            return;
          }

          const base = Number.isFinite(q.price) ? q.price : q.previousClose;
          const pricePLN = q.currency === 'PLN' ? base : (Number(base) * rate);

          if (!Number.isFinite(pricePLN) || pricePLN <= 0) {
            problems.push({ item, reason: 'yahoo: po konwersji PLN brak sensownej ceny', quote: q, rate });
            return;
          }

          okCount++;
          return;
        } catch (e) {
          problems.push({ item, reason: 'yahoo: wyjątek', error: e.message });
          return;
        }
      }

      // 3) nie ma ani stooq ani yahoo
      problems.push({ item, reason: 'brak stooq i yahoo' });
    }));

    // drobny throttling
    await new Promise((r) => setTimeout(r, 250));
  }

  // raport
  console.log('\n=== RAPORT WALIDACJI popular-pl.js ===');
  console.log(`OK: ${okCount} / ${items.length}`);
  if (problems.length) {
    console.log(`Problemy (${problems.length}):`);
    for (const p of problems) {
      const { item, reason, quote, error } = p;
      console.log(
        `- ${item.name} | yahoo=${item.yahoo || '-'} | stooq=${item.stooq || '-'} | ${reason}`
        + (error ? ` | err="${error}"` : '')
        + (quote ? ` | quote=${JSON.stringify(quote)}` : '')
      );
    }
  } else {
    console.log('Brak problemów 🎉');
  }
})();
