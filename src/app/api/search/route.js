export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

/* ========== MIGRE (małe, miękkie preferencje giełd) ========== */
const EXCHANGE_BOOSTS = {
  // Polska
  WAR: 60, "WSE (PL)": 60, WSE: 60, PL: 40,
  // USA
  XNYS: 50, NYSE: 50, XNAS: 50, NASDAQ: 50,
  // Euronext (np. InPost w AMS)
  XAMS: 55, AMS: 55,
  // Niemcy (Xetra > inne)
  XETR: 45, ETR: 35, FRA: 10, BE: 5,
  // UK
  XLON: 40, LSE: 40,
  // Hong Kong
  XHKG: 40, HKEX: 40,
  // Japonia
  TSE: 40, JPX: 40, XJPX: 40,
  // Cboe/alternatywne – prawie neutralne
  XC: 3, XCBOE: 3, CBOE: 3,
};
const EXCHANGE_PENALTIES = { PNK: 120, OTC: 120, OTCM: 120 }; // Pink/OTC
const SUFFIX_BOOSTS = { ".WA": 60, ".PL": 30, ".AS": 40, ".DE": 20, ".F": 5, ".BE": 3, ".XC": 1 };
const SOURCE_CURATED_BOOST = 120; // katalog ręczny > Yahoo (ale nie przebija exact tickera)

/* ========== Y headers ========== */
const Y_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json,text/plain,*/*",
  Referer: "https://finance.yahoo.com/",
};

/* ========== Utils ========== */
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizeYahoo = (raw = "") => String(raw || "").toUpperCase().trim();
const asTicker = (s) => norm(String(s || "").toUpperCase());
const rootSymbol = (sym) => String(sym || "").toUpperCase().replace(/\.[A-Z]{1,4}$/, "");
const isWATicker = (y) => String(y || "").toUpperCase().endsWith(".WA");

const stripCompanySuffixes = (name = "") =>
  norm(name)
    .replace(/\b(inc|inc\.|corp|corporation|co|company|group|sa|ag|plc|nv|oyj|ab|spa|s\.a\.|s\.a|a\/s|kgaa|sas|sarl|llc|ltd)\b/g, "")
    .replace(/\b(ord|ordinary|shs|shares?|registered|class|series|spon|adr|ads|unsponsored|pref|preference)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const makeTokens = (q) =>
  stripCompanySuffixes(q)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);

const isEquityLike = (type) => {
  const t = String(type || "").toUpperCase();
  return t === "EQUITY" || t === "ETF" || t === "STOCK";
};

/* ========== LRU cache (10 min) ========== */
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE = 200;
const cache = new Map();
const getCache = (k) => {
  const it = cache.get(k);
  if (!it) return null;
  if (Date.now() - it.t > CACHE_TTL_MS) { cache.delete(k); return null; }
  cache.delete(k); cache.set(k, it);
  return it.data;
};
const setCache = (k, data) => {
  cache.set(k, { t: Date.now(), data });
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
};

/* ========== Katalog ręczny ========== */
async function loadCatalog() {
  const candidates = [
    path.join(process.cwd(), "public", "data", "catalog.json"),
    path.join(process.cwd(), "public", "catalog.json"),
    path.join(process.cwd(), "src", "app", "data", "catalog.json"),
  ];
  for (const p of candidates) {
    try { const raw = await readFile(p, "utf-8"); return JSON.parse(raw); } catch {}
  }
  return [];
}

/* ========== Stooq: cena i FX ========== */
async function stooqClose(symbol) {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv`;
    const csv = await fetch(url, { cache: "no-store" }).then((r) => r.text());
    const line = csv.split("\n")[1] || "";
    const cells = line.split(",");
    const closeRaw = (cells[6] || "").trim();
    if (!closeRaw || closeRaw === "N/D") return null;
    const val = Number(closeRaw);
    return Number.isFinite(val) ? val : null;
  } catch { return null; }
}
async function fetchStooqPricePLN(yahooSym) {
  if (!isWATicker(yahooSym)) return null;
  const base = yahooSym.split(".")[0].toLowerCase();
  return stooqClose(base);
}
async function fetchFxToPLN(ccy) {
  if (!ccy || ccy === "PLN") return 1;
  return stooqClose(String(ccy).toLowerCase() + "pln");
}

/* ========== Yahoo quotes: batch ========== */
async function fetchYahooBatchQuotes(symbols) {
  if (!symbols?.length) return new Map();
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}`;
    const j = await fetch(url, { cache: "no-store", headers: Y_HEADERS }).then((r) => r.json());
    const out = new Map();
    for (const r of j?.quoteResponse?.result || []) {
      const sym = normalizeYahoo(r.symbol);
      const price =
        (Number.isFinite(r?.regularMarketPrice) ? r.regularMarketPrice : null) ??
        (Number.isFinite(r?.postMarketPrice)    ? r.postMarketPrice    : null) ??
        (Number.isFinite(r?.preMarketPrice)     ? r.preMarketPrice     : null) ??
        (Number.isFinite(r?.regularMarketPreviousClose) ? r.regularMarketPreviousClose : null);
      out.set(sym, {
        price,
        currency: r?.currency || null,
        marketCap: Number.isFinite(r?.marketCap) ? r.marketCap : null,
        adv10: Number.isFinite(r?.averageDailyVolume10Day) ? r.averageDailyVolume10Day : null,
        volume: Number.isFinite(r?.regularMarketVolume) ? r.regularMarketVolume : null,
        sharesOut: Number.isFinite(r?.sharesOutstanding) ? r.sharesOutstanding : null,
        exch: r?.exchange || r?.market || null,
        fullExchangeName: r?.fullExchangeName || null,
        quoteType: r?.quoteType || null,
      });
    }
    return out;
  } catch { return new Map(); }
}

/* ========== ceny → PLN do dropdownu ========== */
async function enrichWithPLNPrices(items) {
  const gpw = [], non = [];
  for (const it of items) (isWATicker(it.yahoo || it.symbol) ? gpw : non).push(it);

  const resolved = [];
  // GPW → Stooq
  for (const it of gpw) {
    const p = await fetchStooqPricePLN(it.yahoo || it.symbol);
    resolved.push({ ...it, price: Number.isFinite(p) ? p : null, currency: "PLN" });
  }
  // Reszta → Yahoo + FX
  const syms = non.map(x => normalizeYahoo(x.yahoo || x.symbol)).filter(Boolean);
  const ymap = await fetchYahooBatchQuotes(syms);
  const fxCache = new Map();
  const getFxPLN = async (ccy) => {
    if (!ccy || ccy === "PLN") return 1;
    if (fxCache.has(ccy)) return fxCache.get(ccy);
    const fx = await fetchFxToPLN(ccy);
    fxCache.set(ccy, fx || null);
    return fx || null;
  };

  for (const it of non) {
    const sym = normalizeYahoo(it.yahoo || it.symbol);
    const q = ymap.get(sym);
    const price = q?.price ?? null;
    const ccy   = q?.currency ?? null;
    if (!Number.isFinite(price)) { resolved.push({ ...it, price: null, currency: ccy }); continue; }
    const fx = await getFxPLN(ccy);
    if (!Number.isFinite(fx))   { resolved.push({ ...it, price: null, currency: ccy }); continue; }
    resolved.push({ ...it, price: price * fx, currency: "PLN" });
  }

  return resolved;
}

/* ========== Yahoo search mapping ========== */
function mapYahooSearch(q) {
  const ySym = normalizeYahoo(q.symbol);
  if (!ySym) return null;
  const type = String(q.quoteType || q.typeDisp || "").toUpperCase();
  return {
    name: q.shortname || q.longname || q.name || ySym,
    yahoo: ySym,
    symbol: ySym,
    exch: q.exchange || q.exchDisp || q.region || "",
    type,
    country: q.country || null,
    isin: q.isin || null,
    aliases: [],
    _source: "yahoo",
  };
}

/* ========== Grupowanie po emitencie ========== */
function groupByIssuer(items) {
  const groups = new Map();
  for (const it of items) {
    const cleanName = stripCompanySuffixes(it.name || "");
    const k = it.isin || cleanName;
    if (!groups.has(k)) groups.set(k, { key: k, items: [], cleanName });
    groups.get(k).items.push(it);
  }
  return Array.from(groups.values());
}

/* ========== Handler ========== */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("q") || "";
  const query = raw.trim().slice(0, 80);
  const debug = searchParams.get("debug") === "1";
  if (!query) return NextResponse.json([]);

  try {
    const cacheKey = "v1|" + norm(query) + (debug ? "|d" : "");
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const qNorm   = stripCompanySuffixes(query);
    const qTick   = asTicker(query);
    const tokens  = makeTokens(query);
    const wantSuffix = (String(query).toUpperCase().match(/\.[A-Z]{1,4}/) || [null])[0];

    /* 1) curated-first */
    const catalogJson = await loadCatalog();
    const CURATED = Array.isArray(catalogJson) ? catalogJson : [];
    const curated = CURATED.map((x) => {
      const y = normalizeYahoo(x.yahoo || x.ticker || x.symbol);
      if (!y) return null;
      const type = String(x.type || "").toUpperCase();
      return {
        name: x.name || y,
        aliases: Array.isArray(x.aliases) ? x.aliases : [],
        yahoo: y,
        symbol: y,
        exch: x.exchange_name || x.exchange || x.exch || "",
        currency: x.currency || null,
        type,
        exchange_name: x.exchange_name || x.exchange || "",
        exchange_mic: x.exchange_mic || "",
        country: x.country || null,
        is_primary: !!x.is_primary,
        stooq: x.stooq || null,
        isin: x.isin || null,
        _source: "curated",
      };
    }).filter(Boolean);

    /* 2) Yahoo search – uzupełnienie */
    let yahooItems = [];
    try {
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=pl-PL&region=PL`;
      const j = await fetch(url, { cache: "no-store", headers: Y_HEADERS }).then((r) => r.json());
      yahooItems = (j?.quotes || []).map(mapYahooSearch).filter(Boolean);
      if (yahooItems.length === 0) {
        const url2 = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=pl-PL`;
        const j2   = await fetch(url2, { cache: "no-store", headers: Y_HEADERS }).then((r) => r.json());
        yahooItems = (j2?.quotes || []).map(mapYahooSearch).filter(Boolean);
      }
    } catch { yahooItems = []; }

    /* 3) Join + filtr tokenowy + wstępna deduplikacja */
    const mergedRaw = [...curated, ...yahooItems];

    const merged = mergedRaw.filter((it) => {
      if (!isEquityLike(it.type)) return false; // zostawiamy EQUITY/ETF
      const name = stripCompanySuffixes(it.name || "");
      const sym  = norm(it.symbol || it.yahoo);
      const aliases = Array.isArray(it.aliases) ? it.aliases.map(stripCompanySuffixes) : [];
      return tokens.every((t) => sym.includes(t) || name.includes(t) || aliases.some((a) => a.includes(t)));
    });

    // deduplikacja po symbolu/isin (zachowaj pierwszy – curated będzie pierwszy)
    const byKey = new Map();
    for (const it of merged) {
      const key = it.isin || it.symbol || it.yahoo;
      if (!key || byKey.has(key)) continue;
      byKey.set(key, it);
    }
    const list = Array.from(byKey.values());
    if (list.length === 0) return NextResponse.json([]);

    /* 4) Scoring bazowy (tekst + źródło + giełda) */
    let baseRanked = list.map((it) => {
      const symNorm  = norm(it.symbol || it.yahoo);
      const nameNorm = stripCompanySuffixes(it.name || "");
      const suffix   = (it.symbol || "").match(/\.[A-Z]+$/)?.[0] || "";

      const exactTicker = asTicker(it.yahoo) === qTick || asTicker(it.stooq) === qTick;
      const exactAlias  = Array.isArray(it.aliases) && it.aliases.map(stripCompanySuffixes).some(a => a === qNorm);
      const prefixHit   = nameNorm.startsWith(qNorm) || symNorm.startsWith(qNorm);

      let base =
        (symNorm === qNorm ? 100 : 0) +
        (nameNorm === qNorm ? 90 : 0) +
        (prefixHit ? 60 : nameNorm.includes(qNorm) ? 30 : 0) +
        (EXCHANGE_BOOSTS[it.exch || ""] || 0) +
        (SUFFIX_BOOSTS[suffix] || 0) -
        (EXCHANGE_PENALTIES[it.exch || ""] || 0);

      if (it._source === "curated") base += SOURCE_CURATED_BOOST;
      if (exactTicker) base += 1200;
      if (exactAlias)  base += 900;
      if (it.is_primary) base += 300;
      if (wantSuffix && suffix === wantSuffix) base += 500;

      return { ...it, _score: base, _dbg: debug ? { base, exactTicker, exactAlias, prefixHit, exchBoost: EXCHANGE_BOOSTS[it.exch || ""] || 0, suffix, suffixBoost: SUFFIX_BOOSTS[suffix] || 0, curated: it._source === "curated", penalty: EXCHANGE_PENALTIES[it.exch || ""] || 0 } : undefined };
    });

    /* 5) Grupowanie po emitencie */
    const groups = groupByIssuer(baseRanked);

    /* 6) Market data dla wyboru zwycięzcy w grupie */
    const allSymbols = baseRanked.map(it => normalizeYahoo(it.yahoo || it.symbol)).filter(Boolean);
    const qmap = await fetchYahooBatchQuotes(allSymbols);

    const fxCache = new Map();
    const getFxPLN = async (ccy) => {
      if (!ccy || ccy === "PLN") return 1;
      if (fxCache.has(ccy)) return fxCache.get(ccy);
      const fx = await fetchFxToPLN(ccy);
      fxCache.set(ccy, fx || null);
      return fx || null;
    };

    const winners = [];
    for (const g of groups) {
      // twarde: exact ticker wygrywa zawsze
      const exact = g.items.find(it => asTicker(it.yahoo) === qTick || asTicker(it.stooq) === qTick);
      if (exact) { winners.push(exact); continue; }

      const enriched = [];
      for (const it of g.items) {
        const sym = normalizeYahoo(it.yahoo || it.symbol);
        const q = qmap.get(sym) || {};
        const ccy = q.currency || it.currency || null;
        const fx = await getFxPLN(ccy);

        const price = Number.isFinite(q.price) ? q.price : null;
        const pricePLN = Number.isFinite(price) && Number.isFinite(fx) ? price * fx : null;

        let capPLN = null;
        if (Number.isFinite(q.marketCap) && Number.isFinite(fx)) capPLN = q.marketCap * fx;
        else if (Number.isFinite(q.sharesOut) && Number.isFinite(pricePLN)) capPLN = q.sharesOut * pricePLN;

        const vol = Number.isFinite(q.adv10) ? q.adv10 : (Number.isFinite(q.volume) ? q.volume : null);
        const turnoverPLN = Number.isFinite(vol) && Number.isFinite(pricePLN) ? vol * pricePLN : null;

        const capBoost = Number.isFinite(capPLN) && capPLN > 0 ? Math.min(250, 40 * Math.log10(capPLN / 1e6)) : 0;
        const liqBoost = Number.isFinite(turnoverPLN) && turnoverPLN > 0 ? Math.min(120, 30 * Math.log10(turnoverPLN / 1e6)) : 0;

        const suffix = (it.symbol || "").match(/\.[A-Z]+$/)?.[0] || "";
        const tie = (it.is_primary ? 30 : 0) + (wantSuffix && suffix === wantSuffix ? 15 : 0) - (EXCHANGE_PENALTIES[it.exch || ""] || 0);

        const score = it._score + capBoost + liqBoost + tie;

        enriched.push({ it, score, capBoost, liqBoost, tie, pricePLN, capPLN, turnoverPLN, fx, ccy });
      }

      enriched.sort((a,b)=> b.score - a.score || b.capBoost - a.capBoost || b.liqBoost - a.liqBoost || String(a.it.symbol).localeCompare(String(b.it.symbol)));
      if (enriched.length) {
        const win = enriched[0];
        if (debug) win.it._dbg = Object.assign({}, win.it._dbg, { capBoost: win.capBoost, liqBoost: win.liqBoost, tie: win.tie, capPLN: win.capPLN, turnoverPLN: win.turnoverPLN, fx: win.fx, ccy: win.ccy, chosen: true });
        winners.push(win.it);
      }
    }

    /* 7) Finalny ranking zwycięzców (mały bonus GPW jako tie-break) */
    let ranked = winners
      .map(it => ({ ...it, _score: it._score + (isWATicker(it.symbol) ? 80 : 0) }))
      .sort((a,b)=> b._score - a._score)
      .slice(0, 24);

    /* 8) Ceny → PLN do dropdownu */
    ranked = await enrichWithPLNPrices(ranked);

    /* 9) Payload (z debug opcjonalnie) */
    const out = ranked.slice(0, 12).map((r) => {
      const base = {
        name: r.name || r.yahoo,
        yahoo: r.yahoo || r.symbol,
        stooq: isWATicker(r.yahoo || r.symbol) ? (r.yahoo || r.symbol || "").split(".")[0].toLowerCase() : null,
        price: Number.isFinite(r.price) ? r.price : null, // PLN
        currency: "PLN",
        exchangeName: r.exchange_name || r.exch || "",
        exchange: r.exchange_mic || r.exch || "",
        country: r.country || null,
        type: r.type || "",
      };
      if (debug) base._debug = r._dbg || { baseScore: r._score };
      return base;
    });

    setCache(cacheKey, out);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
