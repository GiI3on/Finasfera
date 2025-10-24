// src/app/api/dividends/route.js
/**
 * Provider: Yahoo Finance (public endpoints)
 * Zwraca: [{ symbol, currency, gross, wht, net, exDate, payDate, recordDate }]
 * Uwaga: w v8/chart "events.dividends" data punktu pokrywa się z EX-DATE.
 * payDate historycznie nie jest dostępny w tym endpoincie – zostawiamy null.
 */

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = String(searchParams.get("symbol") || "").trim();
    if (!raw) {
      return new Response(JSON.stringify({ events: [] }), {
        headers: { "content-type": "application/json; charset=utf-8" }, status: 200
      });
    }

    const sU = raw.toUpperCase();
    const candidates = Array.from(new Set([sU, sU.endsWith(".WA") ? sU : `${sU}.WA`, sU.replace(/\.WA$/, "")]));

    async function fetchCurrency(symbol) {
      try {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
          { cache: "no-store" }
        );
        if (!r.ok) return null;
        const j = await r.json();
        const res = j?.quoteResponse?.result?.[0];
        return res?.currency || res?.financialCurrency || null;
      } catch { return null; }
    }

    async function fetchDivs(symbol) {
      const nowSec = Math.floor(Date.now() / 1000);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=0&period2=${nowSec}&interval=1d&events=dividends&includeAdjustedClose=true`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return { events: [] };

      const j = await r.json();
      const res = j?.chart?.result?.[0];
      const divObj = res?.events?.dividends || {};

      const out = [];
      for (const key of Object.keys(divObj)) {
        const d = divObj[key] || {};
        const amt = Number(d.amount);
        const ts = Number(d.date || d.ts || key);
        if (!Number.isFinite(amt) || !Number.isFinite(ts)) continue;

        const exDate = new Date(ts * 1000).toISOString().slice(0, 10); // traktujemy jako EX-DATE
        out.push({
          symbol,
          currency: res?.meta?.currency || "PLN",
          gross: amt,
          wht: null,
          net: null,
          exDate,
          payDate: null,
          recordDate: null,
        });
      }
      out.sort((a, b) => String(a.exDate).localeCompare(String(b.exDate)));
      return { events: out };
    }

    let usedSymbol = null;
    let events = [];
    let currency = null;

    for (const sym of candidates) {
      const r = await fetchDivs(sym);
      if ((r.events || []).length) {
        usedSymbol = sym;
        currency = await fetchCurrency(sym);
        events = r.events.map(e => ({
          ...e,
          symbol: sym,
          currency: currency || e.currency || "PLN",
          net: Number.isFinite(Number(e.net)) ? Number(e.net) : Number(e.gross || 0),
        }));
        break;
      }
    }

    return new Response(JSON.stringify({ used: usedSymbol || raw, currency: currency || null, events }), {
      headers: { "content-type": "application/json; charset=utf-8" }, status: 200
    });
  } catch {
    return new Response(JSON.stringify({ events: [], error: "provider_failed" }), {
      headers: { "content-type": "application/json; charset=utf-8" }, status: 200
    });
  }
}
