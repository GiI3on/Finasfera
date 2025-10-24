export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";

/* ======================== CACHE / SWR (15 min) ======================== */
const CACHE_TTL_MS = 15 * 60 * 1000;
const _CACHE = new Map();
const _INFLIGHT = new Map();
function makeCacheKey({ yahoo, range, interval }) {
  const y = String(yahoo || "").trim().toUpperCase();
  const r = String(range || "1y").trim().toLowerCase();
  const i = String(interval || "1d").trim().toLowerCase();
  return `${y}|${r}|${i}`;
}
const now = () => Date.now();
function readCache(key) {
  const hit = _CACHE.get(key);
  if (!hit) return { hit: false, fresh: false, data: null, age: Infinity };
  const age = now() - hit.ts;
  return { hit: true, fresh: age < CACHE_TTL_MS, data: hit.data, age };
}
function writeCache(key, data) { _CACHE.set(key, { ts: now(), data }); }
async function dedupFetch(key, fetcher) {
  if (_INFLIGHT.has(key)) return _INFLIGHT.get(key);
  const p = (async () => {
    try { const data = await fetcher(); writeCache(key, data); return data; }
    finally { _INFLIGHT.delete(key); }
  })();
  _INFLIGHT.set(key, p);
  return p;
}
async function getOrFetchSWR({ yahoo, range, interval, debug }, fetcher) {
  const key = makeCacheKey({ yahoo, range, interval });
  const { hit, fresh, data } = readCache(key);
  if (hit && fresh) return data;
  if (hit) { void dedupFetch(key, fetcher); return data; }
  return await dedupFetch(key, fetcher);
}

/* ============== Uniwersalny timeout ============== */
const EXT_TIMEOUT_MS = 1500; // 1.5 s per host
function fetchWithTimeout(url, opts = {}, controller, dbgTag, dbg) {
  const ac = controller || new AbortController();
  const t = setTimeout(() => ac.abort(), EXT_TIMEOUT_MS);
  const p = fetch(url, { ...opts, signal: ac.signal })
    .finally(() => clearTimeout(t))
    .catch((e) => {
      dbg && dbg.push({ tag: dbgTag || "fetch", url, err: String(e?.name || e) });
      throw e;
    });
  return { promise: p, controller: ac };
}

/* ================= Helpers (oryginały) ================= */
const normalizeYahoo = (s = "") => String(s || "").trim().toUpperCase();
const isWATicker = (y = "") => normalizeYahoo(y).endsWith(".WA");
const yahooWAToStooqCode = (y = "") => String(y).split(".")[0].toLowerCase();
const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

function toStooqGeneric(sym = "") { const S = normalizeYahoo(sym); return S.includes(".") ? S.toLowerCase() : `${S.toLowerCase()}.us`; }
function toYahooSymbol(sym = "") { const S = normalizeYahoo(sym); return S.endsWith(".US") ? S.slice(0, -3) : S; }

function mapGpwIndexToStooq(sym = "") {
  const S = normalizeYahoo(sym).replace(/\s+/g, "");
  if (S === "^WIG"   || S === "WIG")   return "wig";
  if (S === "^WIG20" || S === "WIG20") return "wig20";
  if (S === "^MWIG40" || S === "MWIG40" || S === "^MW40" || S === "MW40") return "mwig40";
  if (S === "^SWIG80" || S === "SWIG80" || S === "^SW80" || S === "SW80") return "swig80";
  return null;
}
function yahooCandidatesForGpw(sym = "") {
  const S = normalizeYahoo(sym).replace(/\s+/g, "");
  if (S === "^WIG" || S === "WIG")       return ["^WIG", "WIG.PL", "WIG"];
  if (S === "^WIG20" || S === "WIG20")   return ["^WIG20", "WIG20.PL", "WIG20"];
  if (S === "^MWIG40" || S === "MWIG40") return ["^MWIG40", "MWIG40.PL", "MWIG40"];
  if (S === "^SWIG80" || S === "SWIG80") return ["^SWIG80", "SWIG80.PL", "SWIG80"];
  return [];
}

function guessCurrency(sym = "") {
  const s = normalizeYahoo(sym);
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
const normCcyForFx = (ccy) => (String(ccy || "").toUpperCase() === "GBX" ? "GBP" : String(ccy || "").toUpperCase());

function isoLocal(d) { const pad = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function startISOForRange(rangeKey) {
  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const d = now.getDate(); const dt = new Date(y, m, d);
  switch ((rangeKey || "1y").toLowerCase()) {
    case "1mo": dt.setMonth(m - 1); return isoLocal(dt);
    case "3mo": dt.setMonth(m - 3); return isoLocal(dt);
    case "6mo": dt.setMonth(m - 6); return isoLocal(dt);
    case "ytd": return isoLocal(new Date(y, 0, 1));
    case "1y": dt.setFullYear(y - 1); return isoLocal(dt);
    case "5y": dt.setFullYear(y - 5); return isoLocal(dt);
    case "max": return null;
    default: dt.setFullYear(y - 1); return isoLocal(dt);
  }
}
function filterByRange(points, rangeKey) {
  const since = startISOForRange(rangeKey);
  if (!since) return points || [];
  return (points || []).filter((p) => (p?.t || "") >= since);
}

/* ================= Stooq: równoległy race do hostów ================= */
const STOOQ_HOSTS = ["https://stooq.com", "https://stooq.pl", "http://stooq.com", "http://stooq.pl"];
const S_HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "text/csv,*/*" };

async function stooqRaceCsv(path, dbg) {
  const controllers = STOOQ_HOSTS.map(() => new AbortController());
  const promises = STOOQ_HOSTS.map((host, i) => {
    const url = `${host}${path}`;
    const { promise } = fetchWithTimeout(url, { cache: "no-store", headers: S_HEADERS }, controllers[i], "stooq-csv", dbg);
    return promise.then(async (r) => {
      dbg && dbg.push({ stooq: "csv", host, status: r.status, ok: r.ok, url });
      if (!r.ok) throw new Error("bad stooq status");
      const txt = (await r.text() || "").trim();
      if (!txt) throw new Error("empty");
      const lower = txt.toLowerCase();
      if (lower.includes("limit") && lower.includes("wywołań")) throw new Error("__LIMIT__");
      if (lower.startsWith("<!doctype") || lower.startsWith("<html")) throw new Error("html");
      const lines = txt.split(/\r?\n/);
      if (lines.length <= 1) throw new Error("no data");
      return { lines, index: i };
    });
  });

  try {
    // Promise.any – bierzemy pierwszą poprawną odpowiedź
    const res = await Promise.any(promises);
    // abort pozostałe
    controllers.forEach((c, idx) => { if (idx !== res.index) try { c.abort(); } catch {} });
    dbg && dbg.push({ stooq_preview_head: res.lines[0], stooq_preview_rows: res.lines.slice(0, 4) });
    return res.lines;
  } catch (e) {
    // jeżeli wszystkie padły z "__LIMIT__", zasygnalizuj limit
    if (e && e.errors && e.errors.some((er) => String(er?.message) === "__LIMIT__")) return "__LIMIT__";
    return [];
  }
}

function stooqIntervalToParam(interval = "1d") { if (interval === "1wk") return "w"; if (interval === "1mo") return "m"; return "d"; }
async function stooqHistory(code, interval = "1d", dbg) {
  const i = stooqIntervalToParam(interval);
  const lines = await stooqRaceCsv(`/q/d/l/?s=${encodeURIComponent(code)}&i=${i}`, dbg);
  if (!lines || lines === "__LIMIT__") return lines;
  const out = [];
  const header = (lines[0] || "").trim();
  const headerDelim = header.includes(";") ? ";" : ",";
  for (let k = 1; k < lines.length; k++) {
    let row = (lines[k] || "").trim();
    if (!row) continue;
    if (k === 1 && row.charCodeAt(0) === 0xFEFF) row = row.slice(1);
    let cols = row.split(headerDelim);
    if (cols.length < 5) { const alt = headerDelim === ";" ? "," : ";"; cols = row.split(alt); if (cols.length < 5) cols = row.split(/[;,]/); }
    if (cols.length < 5) continue;
    const date = cols[0].trim();
    let closeStr = String(cols[4] || "").trim().replace(/\s/g, "").replace(",", ".");
    const c = Number(closeStr);
    if (Number.isFinite(c) && c > 0) out.push({ t: date, close: c });
  }
  return out;
}

/* ================= Yahoo: równoległy race query1/query2 ================= */
const Y_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json,*/*",
  Referer: "https://finance.yahoo.com/",
};

async function yahooChart(sym, range, interval, dbg) {
  const bases = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
  const controllers = bases.map(() => new AbortController());
  const promises = bases.map((base, i) => {
    const url = `${base}/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`;
    const { promise } = fetchWithTimeout(url, { cache: "no-store", headers: Y_HEADERS }, controllers[i], "yahoo-chart", dbg);
    return promise.then(r => r.ok ? r.json() : Promise.reject(new Error("bad"))).then((j) => {
      const res = j?.chart?.result?.[0] || null;
      if (!res?.timestamp?.length) throw new Error("empty");
      return { res, index: i };
    });
  });
  try {
    const out = await Promise.any(promises);
    controllers.forEach((c, idx) => { if (idx !== out.index) try { c.abort(); } catch {} });
    dbg && dbg.push({ yahoo: "chart-win", baseIndex: out.index });
    return out.res;
  } catch {
    return null;
  }
}

async function yahooSpark(sym, range, interval, dbg) {
  const bases = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
  const controllers = bases.map(() => new AbortController());
  const promises = bases.map((base, i) => {
    const url = `${base}/v8/finance/spark?symbols=${encodeURIComponent(sym)}&range=${range}&interval=${interval}`;
    const { promise } = fetchWithTimeout(url, { cache: "no-store", headers: Y_HEADERS }, controllers[i], "yahoo-spark", dbg);
    return promise.then(r => r.ok ? r.json() : Promise.reject(new Error("bad"))).then((j) => {
      const it = j?.spark?.result?.[0];
      if (!it?.response?.[0]?.timestamp || !it?.response?.[0]?.indicators?.quote?.[0]?.close) throw new Error("empty");
      return {
        index: i,
        payload: {
          timestamp: it.response[0].timestamp,
          close: it.response[0].indicators.quote[0].close,
          currency: it?.response?.[0]?.meta?.currency || null,
        }
      };
    });
  });
  try {
    const out = await Promise.any(promises);
    controllers.forEach((c, idx) => { if (idx !== out.index) try { c.abort(); } catch {} });
    dbg && dbg.push({ yahoo: "spark-win", baseIndex: out.index });
    return out.payload;
  } catch {
    return null;
  }
}

/** Yahoo – tylko Close > 0 */
async function yahooHistoryDaily(sym, range = "1y", interval = "1d", dbg) {
  const rc = await yahooChart(sym, range, interval, dbg);
  if (rc?.timestamp?.length) {
    const ts = rc.timestamp;
    const cl = rc.indicators?.quote?.[0]?.close || [];
    const pts = [];
    for (let i = 0; i < ts.length; i++) {
      const t = new Date(ts[i] * 1000).toISOString().slice(0, 10);
      const c = safeNum(cl[i]);
      if (t && Number.isFinite(c) && c > 0) pts.push({ t, close: c });
    }
    let currency = rc?.meta?.currency || null;
    if (!currency) {
      try {
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
        const { promise } = fetchWithTimeout(url, { cache: "no-store", headers: Y_HEADERS }, undefined, "yahoo-quote", dbg);
        const jr = await promise;
        const j = await jr.json().catch(() => ({}));
        currency = j?.quoteResponse?.result?.[0]?.currency || null;
      } catch {}
    }
    return { points: pts, currency };
  }

  const rs = await yahooSpark(sym, range, interval, dbg);
  if (rs?.timestamp?.length) {
    const pts = [];
    for (let i = 0; i < rs.timestamp.length; i++) {
      const t = new Date(rs.timestamp[i] * 1000).toISOString().slice(0, 10);
      const c = safeNum(rs.close?.[i]);
      if (t && Number.isFinite(c) && c > 0) pts.push({ t, close: c });
    }
    return { points: pts, currency: rs.currency || null };
  }

  return { points: [], currency: null };
}

/* ========= Yahoo FX + FX accessor ========= */
async function yahooFxHistory(ccy, range = "1y", interval = "1d", dbg) {
  const sym = `${String(ccy).toUpperCase()}PLN=X`;
  const { points } = await yahooHistoryDaily(sym, range, interval, dbg);
  return Array.isArray(points) ? points : [];
}

async function getFxSeries(ccy, range, interval, dbg) {
  const norm = normCcyForFx(ccy);
  const isGBX = String(ccy).toUpperCase() === "GBX";

  const fxCode = ({
    USD: "usdpln", EUR: "eurpln", GBP: "gbppln", JPY: "jpypln", CHF: "chfpln",
    HKD: "hkdpln", CAD: "cadpln", CNY: "cnypln", KRW: "krwpln", AUD: "audpln"
  })[norm] || `${norm.toLowerCase()}pln`;

  const stooq = await stooqHistory(fxCode, "1d", dbg);
  if (stooq === "__LIMIT__") { dbg && dbg.push({ fx: "stooq-limit", code: fxCode }); }
  else if (Array.isArray(stooq) && stooq.length) { return isGBX ? stooq.map(p => ({ t: p.t, close: p.close })) : stooq; }

  const yfx = await yahooFxHistory(isGBX ? "GBP" : norm, range, "1d", dbg);
  if (Array.isArray(yfx) && yfx.length) return yfx;

  dbg && dbg.push({ fx: "fallback-empty", code: fxCode, norm });
  return [];
}

function makeFxAccessorWithBackfill(fxPts, backDays = 7) {
  const map = new Map(); for (const p of fxPts) map.set(p.t, p.close);
  return (dayISO) => {
    if (map.has(dayISO)) return map.get(dayISO);
    const d = new Date(dayISO);
    for (let k = 1; k <= backDays; k++) { d.setDate(d.getDate() - 1); const ds = d.toISOString().slice(0, 10); if (map.has(ds)) return map.get(ds); }
    return null;
  };
}

/* ================= Core: historia w PLN ================= */
function startFilter(points, range) { return filterByRange(points, range); }

async function buildHistoryPLN(yahooSym, range = "1y", interval = "1d", dbg) {
  const sym = normalizeYahoo(yahooSym);

  // Indeksy GPW → najpierw Yahoo, fallback Stooq
  if (mapGpwIndexToStooq(sym)) {
    for (const ySym of yahooCandidatesForGpw(sym)) {
      const y = await yahooHistoryDaily(ySym, range, interval, dbg);
      if ((y.points || []).length) return startFilter(y.points, range);
    }
    const code = mapGpwIndexToStooq(sym);
    const histIdx = await stooqHistory(code, interval, dbg);
    if (histIdx !== "__LIMIT__" && Array.isArray(histIdx) && histIdx.length) return startFilter(histIdx, range);
    return [];
  }

  // GPW spółki (.WA) → Stooq (PLN); fallback Yahoo + FX
  if (isWATicker(sym)) {
    const code = yahooWAToStooqCode(sym);
    let histAll = await stooqHistory(code, interval, dbg);
    if (histAll === "__LIMIT__" || !Array.isArray(histAll) || !histAll.length) {
      const ySym = toYahooSymbol(sym);
      const { points: yPts, currency } = await yahooHistoryDaily(ySym, range, interval, dbg);
      if (!yPts.length) return [];
      if (!currency || currency === "PLN") return startFilter(yPts, range);
      const fxPtsAll = await getFxSeries(currency, range, interval, dbg);
      if (!fxPtsAll.length) return [];
      const fxAt = makeFxAccessorWithBackfill(fxPtsAll, 7);
      const out = [];
      for (const p of yPts) { const fx = fxAt(p.t); if (Number.isFinite(fx)) out.push({ t: p.t, close: p.close * fx }); }
      return startFilter(out, range);
    }
    return startFilter(histAll, range);
  }

  // Zagranica
  const stooqSym = toStooqGeneric(sym);
  let nativePts = await stooqHistory(stooqSym, interval, dbg);

  if (nativePts === "__LIMIT__" || !Array.isArray(nativePts) || !nativePts.length) {
    const ySym = toYahooSymbol(sym);
    const y = await yahooHistoryDaily(ySym, range, interval, dbg);
    if (!y.points.length) return [];
    if (!y.currency || y.currency === "PLN") return startFilter(y.points, range);
    const fx2 = await getFxSeries(y.currency, range, interval, dbg);
    if (!fx2.length) return [];
    const fxAt2 = makeFxAccessorWithBackfill(fx2, 7);
    const out2 = [];
    for (const p of y.points) { const fx = fxAt2(p.t); if (Number.isFinite(fx)) out2.push({ t: p.t, close: p.close * fx }); }
    return startFilter(out2, range);
  }

  // Mamy Stooq — przelicz walutę (jeśli ≠ PLN)
  let ccy = guessCurrency(sym) || "USD";
  const isGBX = ccy === "GBX";
  ccy = normCcyForFx(ccy);
  if (isGBX) nativePts = nativePts.map((p) => ({ t: p.t, close: p.close / 100 }));
  if (ccy === "PLN") return startFilter(nativePts, range);

  const fxPtsAll = await getFxSeries(ccy, range, interval, dbg);
  if (!fxPtsAll.length) {
    const ySym = toYahooSymbol(sym);
    const y = await yahooHistoryDaily(ySym, range, interval, dbg);
    if (!y.points.length) return [];
    if (!y.currency || y.currency === "PLN") return startFilter(y.points, range);
    const fx2 = await getFxSeries(y.currency, range, interval, dbg);
    if (!fx2.length) return [];
    const fxAt2 = makeFxAccessorWithBackfill(fx2, 7);
    const out2 = [];
    for (const p of y.points) { const fx = fxAt2(p.t); if (Number.isFinite(fx)) out2.push({ t: p.t, close: p.close * fx }); }
    return startFilter(out2, range);
  }

  const fxAt = makeFxAccessorWithBackfill(fxPtsAll, 7);
  const out = [];
  for (const p of nativePts) { const fx = fxAt(p.t); if (Number.isFinite(fx)) out.push({ t: p.t, close: p.close * fx }); }
  return startFilter(out, range);
}

/* ================= API (SWR) ================= */
async function computeHistory({ yahoo, range, interval, debug }) {
  const dbg = debug ? [] : null;
  const hist = await buildHistoryPLN(yahoo, range, interval, dbg);
  return debug ? { historyPLN: hist, _debug: dbg } : { historyPLN: hist };
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const yahoo = body?.pair?.yahoo || body?.yahoo || "";
  const range = body?.range || "1y";
  const interval = String(body?.interval || "1d").toLowerCase();
  const debug = !!body?.debug;

  if (!yahoo) return NextResponse.json({ historyPLN: [] });

  try {
    const data = await getOrFetchSWR(
      { yahoo, range, interval, debug },
      () => computeHistory({ yahoo, range, interval, debug })
    );
    return NextResponse.json(data);
  } catch {
    const key = makeCacheKey({ yahoo, range, interval });
    const { hit, data } = readCache(key);
    if (hit) return NextResponse.json(data);
    return NextResponse.json({ historyPLN: [] });
  }
}

export async function GET(req) {
  const url = new URL(req.url);
  const symQ = url.searchParams.get("symbol");
  const listQ = url.searchParams.get("symbols");
  const yahoo = (symQ || (listQ ? listQ.split(",")[0] : "") || "").trim();
  const range = url.searchParams.get("range") || "1y";
  const interval = String(url.searchParams.get("interval") || "1d").toLowerCase();
  const debug = url.searchParams.get("debug") === "1";

  if (!yahoo) return NextResponse.json({ historyPLN: [] });

  try {
    const data = await getOrFetchSWR(
      { yahoo, range, interval, debug },
      () => computeHistory({ yahoo, range, interval, debug })
    );
    return NextResponse.json(data);
  } catch {
    const key = makeCacheKey({ yahoo, range, interval });
    const { hit, data } = readCache(key);
    if (hit) return NextResponse.json(data);
    return NextResponse.json({ historyPLN: [] });
  }
}
