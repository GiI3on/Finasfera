/**
 * Provider: Yahoo Finance (public endpoints)
 * Zwraca:
 *   events: [{ symbol, currency, gross, wht, net, payDate, exDate, recordDate, kind }]
 */

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = String(searchParams.get("symbol") || "").trim();
    if (!raw) {
      return new Response(JSON.stringify({ events: [] }), {
        headers: { "content-type": "application/json; charset=utf-8" },
        status: 200,
      });
    }

    const sU = raw.toUpperCase();
    const candidates = Array.from(new Set([
      sU,
      sU.endsWith(".WA") ? sU : `${sU}.WA`,
      sU.replace(/\.WA$/, ""),
    ]));

    async function fetchCurrency(symbol) {
      try {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
          { cache: "no-store" }
        );
        if (!r.ok) return null;
        const j = await r.json().catch(() => null);
        const cur = j?.quoteResponse?.result?.[0]?.currency
          || j?.quoteResponse?.result?.[0]?.financialCurrency
          || null;
        return cur || null;
      } catch {
        return null;
      }
    }

    async function fetchDivs(symbol) {
      const nowSec = Math.floor(Date.now() / 1000);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=0&period2=${nowSec}&interval=1d&events=dividends&includeAdjustedClose=true`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return { currency: null, events: [] };

      const j = await r.json().catch(() => null);
      const res = j?.chart?.result?.[0];
      if (!res) return { currency: null, events: [] };

      const metaCurrency = res?.meta?.currency || null;
      const divObj = res?.events?.dividends || {};

      const out = [];
      for (const key of Object.keys(divObj)) {
        const d = divObj[key] || {};
        const amt = Number(d.amount);
        const ts  = Number(d.date || d.ts || key);
        if (!Number.isFinite(amt) || !Number.isFinite(ts)) continue;
        const payDate = new Date(ts * 1000).toISOString().slice(0, 10);
        out.push({
          kind: "fact",
          symbol,
          currency: metaCurrency || "PLN",
          gross: amt,
          wht: null,
          net: null,           // NIE zgadujemy netto
          payDate,
          exDate: null,
          recordDate: null,
        });
      }
      out.sort((a, b) => String(a.payDate).localeCompare(String(b.payDate)));
      return { currency: metaCurrency, events: out };
    }

    async function fetchNextExDate(symbol) {
      try {
        const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=calendarEvents`;
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) return null;
        const j = await r.json().catch(() => null);
        const exUnix = j?.quoteSummary?.result?.[0]?.calendarEvents?.exDividendDate?.raw || null;
        if (!Number.isFinite(exUnix)) return null;
        const exISO = new Date(exUnix * 1000).toISOString().slice(0, 10);
        if (exISO < new Date().toISOString().slice(0, 10)) return null;
        return exISO;
      } catch {
        return null;
      }
    }

    let usedSymbol = null;
    let currency = null;
    let history = [];

    for (const sym of candidates) {
      const divs = await fetchDivs(sym);
      if ((divs.events || []).length) {
        usedSymbol = sym;
        currency = await fetchCurrency(sym);
        history = divs.events;
        break;
      }
    }

    if (!currency) {
      currency = await fetchCurrency(usedSymbol || raw);
      if (!currency && (raw.toUpperCase().endsWith(".WA") || (usedSymbol||"").endsWith(".WA"))) {
        currency = "PLN";
      }
    }

    // PLAN (tylko exDate)
    let planEvent = null;
    if (usedSymbol || raw) {
      const forSym = usedSymbol || raw;
      const exISO = await fetchNextExDate(forSym);
      if (exISO) {
        const lastGross = history.length
          ? Number(history[history.length - 1]?.gross) || null
          : null;

        planEvent = {
          kind: "plan",
          symbol: forSym,
          currency: currency || "PLN",
          gross: lastGross,
          wht: null,
          net: null,         // NIE zgadujemy netto
          payDate: null,
          exDate: exISO,
          recordDate: null,
        };
      }
    }

    const events = history.map(e => ({
      ...e,
      symbol: usedSymbol || e.symbol || raw,
      currency: currency || e.currency || "PLN",
      net: Number.isFinite(Number(e.net)) ? Number(e.net) : null,
    }));
    if (planEvent) events.push(planEvent);

    return new Response(
      JSON.stringify({
        used: usedSymbol || raw,
        currency: currency || null,
        events,
      }),
      { headers: { "content-type": "application/json; charset=utf-8" }, status: 200 }
    );
  } catch {
    return new Response(JSON.stringify({ events: [], error: "provider_failed" }), {
      headers: { "content-type": "application/json; charset=utf-8" },
      status: 200,
    });
  }
}
