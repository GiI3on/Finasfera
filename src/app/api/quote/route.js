export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";

/* =========================
   Helpers & small utilities
   ========================= */
const normSym = (s = "") => String(s || "").trim().toUpperCase();
const isWA = (s = "") => normSym(s).endsWith(".WA");
const toStooqCodeWA = (y = "") => String(y).split(".")[0].toLowerCase();

function normalizeGBX(price, prevClose, currency) {
  let px = Number(price);
  let pc = Number(prevClose);
  let ccy = currency ? String(currency).toUpperCase() : null;
  if (ccy === "GBX") {
    ccy = "GBP"; // LSE -> pensy => funty
    if (Number.isFinite(px)) px /= 100;
    if (Number.isFinite(pc)) pc /= 100;
  }
  return { px: Number.isFinite(px) ? px : null, pc: Number.isFinite(pc) ? pc : null, ccy };
}

/* ====== currency from Yahoo suffix ====== */
function guessCcyFromYahoo(sym = "") {
  const s = String(sym).toUpperCase();
  if (s.endsWith(".WA")) return "PLN";
  if (s.endsWith(".US")) return "USD";
  if (
    s.endsWith(".DE") || s.endsWith(".F") || s.endsWith(".BE") || s.endsWith(".VI") ||
    s.endsWith(".AS") || s.endsWith(".PA") || s.endsWith(".MI") || s.endsWith(".BR")
  ) return "EUR";
  if (s.endsWith(".L"))  return "GBX";
  if (s.endsWith(".HK")) return "HKD";
  if (s.endsWith(".T"))  return "JPY";
  if (s.endsWith(".TO") || s.endsWith(".V")) return "CAD";
  if (s.endsWith(".SW")) return "CHF";
  if (s.endsWith(".SS") || s.endsWith(".SZ")) return "CNY";
  if (s.endsWith(".KS") || s.endsWith(".KQ")) return "KRW";
  if (s.endsWith(".AX")) return "AUD";
  return null;
}
const normalizeCcyForFx = (ccy) =>
  (String(ccy || "").toUpperCase() === "GBX" ? "GBP" : String(ccy || "").toUpperCase());

/* === NOWE: mapowanie indeksów GPW -> kody Stooq (jak w /api/history) === */
function mapGpwIndexToStooq(sym = "") {
  const S = normSym(sym).replace(/\s+/g, "");
  // akceptuj ^WIG, WIG; ^WIG20, WIG20; ^MWIG40 (również MW40), ^SWIG80 (SW80)
  if (S === "^WIG" || S === "WIG") return "wig";
  if (S === "^WIG20" || S === "WIG20") return "wig20";
  if (S === "^MWIG40" || S === "MWIG40" || S === "^MW40" || S === "MW40") return "mw40";
  if (S === "^SWIG80" || S === "SWIG80" || S === "^SW80" || S === "SW80") return "sw80";
  return null;
}

/* =========================
   Tiny in-memory cache + inflight dedupe
   ========================= */
const cache = new Map(); // key -> { value, exp }
const inflight = new Map(); // key -> Promise
const now = () => Date.now();
const getCache = (k) => {
  const it = cache.get(k);
  if (!it) return null;
  if (it.exp && it.exp < now()) { cache.delete(k); return null; }
  return it.value;
};
const setCache = (k, v, ttl) => cache.set(k, { value: v, exp: ttl ? now() + ttl : 0 });
const withInflight = async (key, fn) => {
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    try { return await fn(); }
    finally { inflight.delete(key); }
  })();
  inflight.set(key, p);
  return p;
};

const TTL_INTRADAY_MS = 60_000;
const TTL_EOD_MS      = 24 * 3600_000;

/* =========================
   Stooq (multi-host; race)
   ========================= */
const S_HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "text/csv,*/*" };
const STOOQ_HOSTS = [
  "https://stooq.com",
  "https://stooq.pl",
  "http://stooq.com",
  "http://stooq.pl",
];

async function stooqLiteClose(symbol, debugArr) {
  const tasks = STOOQ_HOSTS.map(async (host) => {
    const url = `${host}/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv`;
    const r = await fetch(url, { cache: "no-store", headers: S_HEADERS });
    debugArr?.push({ stooq: "lite", host, status: r.status });
    if (!r.ok) throw new Error("stooq-lite-bad");
    const text = await r.text();
    const line = (text.split("\n")[1] || "").trim();
    const raw = (line.split(",")[6] || "").trim(); // Close
    const val = Number(raw);
    if (!Number.isFinite(val)) throw new Error("stooq-lite-nan");
    return val;
  });
  try { return await Promise.any(tasks); } catch { return null; }
}

async function stooqDailyLastClose(symbol, debugArr) {
  const tasks = STOOQ_HOSTS.map(async (host) => {
    const url = `${host}/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
    const r = await fetch(url, { cache: "no-store", headers: S_HEADERS });
    debugArr?.push({ stooq: "daily", host, status: r.status });
    if (!r.ok) throw new Error("stooq-daily-bad");
    const lines = (await r.text()).trim().split(/\r?\n/);
    for (let i = lines.length - 1; i >= 1; i--) {
      const v = Number((lines[i].split(",")[4] || "").trim());
      if (Number.isFinite(v)) return v;
    }
    throw new Error("stooq-daily-empty");
  });
  try { return await Promise.any(tasks); } catch { return null; }
}

async function stooqClose(symbol, debugArr) {
  const ck = `stooq:${symbol}`;
  const c = getCache(ck); if (c != null) return c;
  const lite = await stooqLiteClose(symbol, debugArr);
  if (Number.isFinite(lite)) { setCache(ck, lite, TTL_EOD_MS); return lite; }
  const daily = await stooqDailyLastClose(symbol, debugArr);
  if (Number.isFinite(daily)) { setCache(ck, daily, TTL_EOD_MS); return daily; }
  setCache(ck, null, 5_000);
  return null;
}

/* =========================
   FX: Stooq -> NBP -> exchangerate.host
   ========================= */
async function nbpFx(ccy, debugArr) {
  try {
    const url = `https://api.nbp.pl/api/exchangerates/rates/A/${encodeURIComponent(ccy)}/?format=json`;
    const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    debugArr?.push({ fx: "nbp", status: r.status });
    if (!r.ok) return null;
    const j = await r.json().catch(()=>null);
    const rate = Number(j?.rates?.[0]?.mid);
    return Number.isFinite(rate) ? rate : null;
  } catch { return null; }
}
async function hostFx(ccy, debugArr) {
  try {
    const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(ccy)}&symbols=PLN&source=ecb`;
    const r = await fetch(url, { cache: "no-store" });
    debugArr?.push({ fx: "exchangerate.host", status: r.status });
    if (!r.ok) return null;
    const j = await r.json().catch(()=>null);
    const rate = Number(j?.rates?.PLN);
    return Number.isFinite(rate) ? rate : null;
  } catch { return null; }
}
async function fxToPLN(ccy, debugArr) {
  const C = String(ccy || "PLN").toUpperCase();
  if (C === "PLN") return 1;
  const ck = `fx:${C}`;
  const cached = getCache(ck); if (cached != null) return cached;

  const st = await stooqClose(`${C.toLowerCase()}pln`, debugArr);
  if (Number.isFinite(st)) { setCache(ck, st, TTL_EOD_MS); return st; }

  const nbp = await nbpFx(C, debugArr);
  if (Number.isFinite(nbp)) { setCache(ck, nbp, TTL_EOD_MS); return nbp; }

  const host = await hostFx(C, debugArr);
  if (Number.isFinite(host)) { setCache(ck, host, TTL_EOD_MS); return host; }

  setCache(ck, null, 5_000);
  return null;
}

/* =========================
   Yahoo (+ proxy) & Finnhub
   ========================= */
const Y_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json,*/*",
  Referer: "https://finance.yahoo.com/",
};
const Y_PROXY = (sym) => `https://yahoo-proxy.gibadlopatryk.workers.dev/?symbols=${encodeURIComponent(sym)}`;

async function yahooRaw(sym, debugArr) {
  const u1 = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
  const u2 = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
  const up = Y_PROXY(sym);

  const tryFetch = async (url, tag) =>
    withInflight(`yraw:${tag}:${sym}`, async () => {
      try {
        const r = await fetch(url, { cache: "no-store", headers: Y_HEADERS });
        debugArr?.push({ yahoo: tag, status: r.status, ok: r.ok });
        if (!r.ok) return null;
        const j = await r.json().catch(() => null);
        return j?.quoteResponse?.result?.[0] || null;
      } catch {
        return null;
      }
    });

  try {
    const res = await Promise.any([
      tryFetch(u1, "q1"),
      tryFetch(u2, "q2"),
      tryFetch(up, "proxy"),
    ].map(p => p.catch(() => null)));
    return res || null;
  } catch {
    return null;
  }
}

async function yahooQuote(sym, debugArr) {
  const ck = `y:${sym}`;
  const c = getCache(ck); if (c) return c;
  const r = await yahooRaw(sym, debugArr);
  if (!r) { setCache(ck, null, 5_000); return null; }

  const price =
    (Number.isFinite(r?.regularMarketPrice) ? r.regularMarketPrice : null) ??
    (Number.isFinite(r?.postMarketPrice)    ? r.postMarketPrice    : null) ??
    (Number.isFinite(r?.preMarketPrice)     ? r.preMarketPrice     : null) ??
    (Number.isFinite(r?.regularMarketPreviousClose) ? r.regularMarketPreviousClose : null);

  const prevClose = Number.isFinite(r?.regularMarketPreviousClose) ? r.regularMarketPreviousClose : null;
  const currency  = r?.currency || r?.financialCurrency || null;
  const val = { price, prevClose, currency };
  setCache(ck, val, TTL_INTRADAY_MS);
  return val;
}

const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY || "";
async function finnhubQuote(sym, debugArr) {
  if (!FINNHUB_TOKEN) return null;
  const base = "https://finnhub.io/api/v1";
  try {
    const q = await fetch(`${base}/quote?symbol=${encodeURIComponent(sym)}&token=${FINNHUB_TOKEN}`, { cache: "no-store" });
    debugArr?.push({ finnhub: "quote", status: q.status });
    const jq = q.ok ? await q.json().catch(() => null) : null;
    if (!jq || !Number.isFinite(jq.c)) return null;

    let currency = null;
    try {
      const pr = await fetch(`${base}/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${FINNHUB_TOKEN}`, { cache: "no-store" });
      debugArr?.push({ finnhub: "profile2", status: pr.status });
      const jp = pr.ok ? await jp.json().catch(() => null) : null;
      currency = jp?.currency || null;
    } catch {}

    return { price: jq.c, prevClose: Number.isFinite(jq.pc) ? jq.pc : null, currency };
  } catch (e) {
    debugArr?.push({ finnhub: "err", msg: String(e) });
    return null;
  }
}

/* =========================
   Transform → PLN
   ========================= */
async function toPLNFromQuoteStruct(sym, srcQuote, debugArr) {
  const { px, pc, ccy } = normalizeGBX(srcQuote?.price, srcQuote?.prevClose, srcQuote?.currency);
  if (!Number.isFinite(px)) {
    return { pricePLN: null, prevClosePLN: null, currency: ccy || null, yahoo: sym, source: "noprice" };
  }
  const useCcy = normalizeCcyForFx(ccy);
  if (!useCcy || useCcy === "PLN") {
    return { pricePLN: px, prevClosePLN: Number.isFinite(pc) ? pc : null, currency: useCcy || "PLN", yahoo: sym, source: "direct" };
  }
  const fx = await fxToPLN(useCcy, debugArr);
  return {
    pricePLN: Number.isFinite(fx) ? px * fx : null,
    prevClosePLN: Number.isFinite(fx) && Number.isFinite(pc) ? pc * fx : null,
    currency: useCcy, yahoo: sym, source: "direct+fx",
  };
}

/* =========================
   Quote one symbol (with fallbacks)
   ========================= */
async function quoteOneToPLN(yahooSym, debugArr) {
  const sym = normSym(yahooSym);

  /* === NOWE: obsługa indeksów GPW (WIG/WIG20/mWIG40/sWIG80) przez Stooq === */
  const gpwIdx = mapGpwIndexToStooq(sym);
  if (gpwIdx) {
    const st = await stooqClose(gpwIdx, debugArr);
    if (Number.isFinite(st)) {
      return { pricePLN: st, prevClosePLN: null, currency: "PLN", yahoo: sym, source: "stooq-index" };
    }
    // jeśli Stooq zawiedzie, nie ma sensu iść w Yahoo/Finnhub dla tych tickerów;
    // ale spróbujemy jeszcze Yahoo awaryjnie:
    const y = await yahooQuote(sym, debugArr);
    if (y && Number(y.price) > 0) return toPLNFromQuoteStruct(sym, y, debugArr);
    return { pricePLN: null, prevClosePLN: null, currency: "PLN", yahoo: sym, source: "index-fail" };
  }

  // GPW spółki (.WA): najpierw Stooq, potem Yahoo/Finnhub
  if (isWA(sym)) {
    const st = await stooqClose(toStooqCodeWA(sym), debugArr);
    if (Number.isFinite(st)) {
      return { pricePLN: st, prevClosePLN: null, currency: "PLN", yahoo: sym, source: "stooq" };
    }
    const y = await yahooQuote(sym, debugArr);
    if (y && Number(y.price) > 0) return toPLNFromQuoteStruct(sym, y, debugArr);

    const fh = await finnhubQuote(sym, debugArr);
    if (fh && Number(fh.price) > 0) return toPLNFromQuoteStruct(sym, fh, debugArr);

    return { pricePLN: null, prevClosePLN: null, currency: null, yahoo: sym, source: "fail" };
  }

  // Rynki zagraniczne: Yahoo → Finnhub → Stooq (+ FX wg sufiksu)
  const y = await yahooQuote(sym, debugArr);
  if (y && Number(y.price) > 0) return toPLNFromQuoteStruct(sym, y, debugArr);

  const fh = await finnhubQuote(sym, debugArr);
  if (fh && Number(fh.price) > 0) {
    if (!fh.currency) fh.currency = guessCcyFromYahoo(sym);
    return toPLNFromQuoteStruct(sym, fh, debugArr);
  }

  const st = await stooqClose(sym.toLowerCase(), debugArr);
  if (Number.isFinite(st)) {
    const guessed = guessCcyFromYahoo(sym);
    const fx = await fxToPLN(normalizeCcyForFx(guessed || "USD"), debugArr);
    return {
      pricePLN: Number.isFinite(fx) ? st * fx : null,
      prevClosePLN: null,
      currency: guessed || "USD",
      yahoo: sym,
      source: "stooq+fx",
    };
  }

  return { pricePLN: null, prevClosePLN: null, currency: null, yahoo: sym, source: "fail" };
}

/* =========================
   GET (batch) + POST (compat)
   ========================= */
export async function GET(req) {
  const url = new URL(req.url);
  const raw = String(url.searchParams.get("symbols") || "").trim();
  const debug = url.searchParams.get("debug") === "1";
  if (!raw) return NextResponse.json({ pricePLN: null, prevClosePLN: null, currency: null, yahoo: null });

  const list = raw.split(",").map(normSym).filter(Boolean);
  if (list.length === 1) {
    const key = `one:${list[0]}`;
    const out = await withInflight(key, async () => {
      const dbg = [];
      const o = await quoteOneToPLN(list[0], debug ? dbg : null);
      return debug ? { ...o, _debug: dbg } : o;
    });
    return NextResponse.json(out);
  }

  const uniq = Array.from(new Set(list));
  const settled = await Promise.allSettled(
    uniq.map(async (s) => {
      const key = `one:${s}`;
      const dbg = [];
      const val = await withInflight(key, () => quoteOneToPLN(s, debug ? dbg : null));
      return { s, val, dbg };
    })
  );
  const results = {};
  const dbgAll = {};
  for (const it of settled) {
    if (it.status === "fulfilled") {
      results[it.value.s] = it.value.val;
      if (debug) dbgAll[it.value.s] = it.value.dbg;
    }
  }
  return NextResponse.json(debug ? { quotes: results, _debug: dbgAll } : { quotes: results });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const sym = normSym(body?.pair?.yahoo || body?.pair?.symbol || body?.pair?.ticker || "");
    if (!sym) return NextResponse.json({ pricePLN: null, prevClosePLN: null, currency: null, yahoo: null });

    const key = `one:${sym}`;
    const out = await withInflight(key, () => quoteOneToPLN(sym));
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({ pricePLN: null, prevClosePLN: null, currency: null, yahoo: null });
  }
}
