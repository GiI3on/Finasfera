// src/app/lib/providers.js

/** ---------- Yahoo: single quote ---------- */
export async function yahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const json = await fetch(url, { cache: "no-store" }).then(r => r.json());
  const q = json?.quoteResponse?.result?.[0];
  if (!q) throw new Error("yahoo no data");
  const price = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice ?? null;
  const prevClose = q.regularMarketPreviousClose ?? price ?? null;
  return { price: Number(price), prevClose: Number(prevClose), currency: q.currency || null }; // np. USD/EUR/PLN
}

/** ---------- Yahoo: history (z walutą w meta) ---------- */
export async function yahooHistoryWithCurrency(symbol, range = "1y", interval = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const json = await fetch(url, { cache: "no-store" }).then(r => r.json());
  const res = json?.chart?.result?.[0];
  if (!res?.timestamp?.length) throw new Error("yahoo no history");

  const currency = res?.meta?.currency || null;
  const ts = res.timestamp;
  const closes = res.indicators?.quote?.[0]?.close || [];

  const history = ts.map((t, i) => {
    const d = new Date(t * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return { t: `${yyyy}-${mm}-${dd}`, close: Number(closes[i]) };
  }).filter(p => Number.isFinite(p.close));

  return { currency, history }; // currency może być null -> traktuj jako PLN
}

/** ---------- Stooq: quote (CSV) ---------- */
export async function stooqQuote(symbol) {
  const url = `https://stooq.pl/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
  const txt = await fetch(url, { cache: "no-store" }).then(r => r.text());
  const line = txt.trim().split("\n")[1];
  if (!line || /N\/A/i.test(line)) throw new Error("stooq no data");
  const cols = line.split(",");
  const close = parseFloat(cols[6]);
  return { price: close, prevClose: close, currency: "PLN" };
}

/** ---------- Stooq: history (CSV) ---------- */
export async function stooqHistory(symbol, interval = "d") {
  const url = `https://stooq.pl/q/d/l/?s=${encodeURIComponent(symbol)}&i=${interval}`;
  const txt = await fetch(url, { cache: "no-store" }).then(r => r.text());
  const lines = txt.trim().split("\n");
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, , , , close] = lines[i].split(",");
    if (!date || /,N\/A/.test(lines[i])) continue;
    out.push({ t: date, close: parseFloat(close) });
  }
  return out; // w PLN
}

/** ---------- Unified prefer: Yahoo -> Stooq ---------- */
export async function getQuoteYahooStooq({ yahoo, stooq }) {
  try { return await yahooQuote(yahoo); }
  catch (_) { return await stooqQuote(stooq); }
}

export async function getHistoryYahooStooq({ yahoo, stooq }, range = "1y", interval = "1d") {
  try { return await yahooHistoryWithCurrency(yahoo, range, interval); } // { currency, history }
  catch (_) { return { currency: "PLN", history: await stooqHistory(stooq, "d") }; }
}

/** =========================================================
 *      FX → PLN (cache, Yahoo FX, NBP fallback)
 * ======================================================= */

// prosty cache w pamięci: { 'USDPLN': {rate, ts} }
const fxCache = new Map();
const FX_TTL_MS = 5 * 60 * 1000; // 5 min cache

function cacheKey(from, to) {
  return `${from.toUpperCase()}_${to.toUpperCase()}`;
}

function getCachedFx(from, to) {
  const k = cacheKey(from, to);
  const obj = fxCache.get(k);
  if (!obj) return null;
  if (Date.now() - obj.ts > FX_TTL_MS) { fxCache.delete(k); return null; }
  return obj.rate;
}
function setCachedFx(from, to, rate) {
  fxCache.set(cacheKey(from, to), { rate, ts: Date.now() });
}

export async function yahooFxRate(from, to) {
  const pair = `${from}${to}=X`; // np. USDPLN=X
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${pair}`;
  const j = await fetch(url, { cache: "no-store" }).then(r => r.json());
  const q = j?.quoteResponse?.result?.[0];
  const rate = q?.regularMarketPrice ?? q?.postMarketPrice ?? q?.preMarketPrice ?? null;
  if (!Number.isFinite(rate)) throw new Error("yahoo fx no data");
  return Number(rate);
}

export async function nbpLatest(code) {
  try {
    const r = await fetch(`https://api.nbp.pl/api/exchangerates/rates/A/${code}/?format=json`, { cache: "no-store" });
    const j = await r.json();
    return j?.rates?.[0]?.mid ?? null;
  } catch {
    return null;
  }
}

/** główna funkcja – pewny kurs → PLN */
export async function getFxToPLN(code /* 'USD' | 'EUR' | 'PLN' */) {
  const c = (code || "PLN").toUpperCase();
  if (c === "PLN") return 1;

  const cached = getCachedFx(c, "PLN");
  if (cached) return cached;

  try {
    const y = await yahooFxRate(c, "PLN");
    if (Number.isFinite(y)) { setCachedFx(c, "PLN", y); return y; }
  } catch (_) {}

  const nbp = await nbpLatest(c);
  if (Number.isFinite(nbp)) { setCachedFx(c, "PLN", nbp); return nbp; }

  throw new Error(`No FX for ${c}/PLN`);
}

/** konwersje pomocnicze */
export async function convertQuoteToPLN(quote /* {price,prevClose,currency} */) {
  const rate = await getFxToPLN(quote.currency || "PLN");
  return {
    ...quote,
    pricePLN: Number.isFinite(quote.price) ? quote.price * rate : null,
    prevClosePLN: Number.isFinite(quote.prevClose) ? quote.prevClose * rate : null,
    fxRate: rate,
  };
}

export async function convertHistoryToPLN(currency /* 'USD'|'EUR'|'PLN'|null */, history /* [{t,close}] */) {
  const rate = await getFxToPLN(currency || "PLN");
  const historyPLN = history.map(p => ({ t: p.t, close: Number.isFinite(p.close) ? p.close * rate : null }))
                            .filter(p => Number.isFinite(p.close));
  return { fxRate: rate, historyPLN };
}
