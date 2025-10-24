// File: src/app/api/history-batch/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";

/* ========= HELPERY skopiowane z /api/history ========= */
const normalizeYahoo = (s = "") => String(s || "").trim().toUpperCase();
const isWATicker = (y = "") => normalizeYahoo(y).endsWith(".WA");
const yahooWAToStooqCode = (y = "") => String(y).split(".")[0].toLowerCase();
const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

function toStooqGeneric(sym = "") {
  const S = normalizeYahoo(sym);
  if (!S.includes(".")) return `${S.toLowerCase()}.us`;
  return S.toLowerCase();
}
function toYahooSymbol(sym = "") {
  const S = normalizeYahoo(sym);
  return S.endsWith(".US") ? S.slice(0, -3) : S;
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

function startISOForRange(rangeKey) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  const dt = new Date(y, m, d);
  switch ((rangeKey || "1y").toLowerCase()) {
    case "1mo": dt.setMonth(m - 1); break;
    case "3mo": dt.setMonth(m - 3); break;
    case "6mo": dt.setMonth(m - 6); break;
    case "ytd": return new Date(y, 0, 1).toISOString().slice(0, 10);
    case "1y": dt.setFullYear(y - 1); break;
    case "5y": dt.setFullYear(y - 5); break;
    case "max": return null;
    default: dt.setFullYear(y - 1); break;
  }
  return dt.toISOString().slice(0, 10);
}
function filterByRange(points, rangeKey) {
  const since = startISOForRange(rangeKey);
  if (!since) return points || [];
  return (points || []).filter((p) => (p?.t || "") >= since);
}

/* ============ Stooq ============ */
const STOOQ_HOSTS = ["https://stooq.com", "https://stooq.pl", "http://stooq.com", "http://stooq.pl"];
const S_HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "text/csv,*/*" };

async function fetchStooqCsv(path, dbg) {
  for (const host of STOOQ_HOSTS) {
    try {
      const url = `${host}${path}`;
      const r = await fetch(url, { cache: "no-store", headers: S_HEADERS });
      dbg && dbg.push({ stooq: "csv", host, status: r.status, ok: r.ok, url });
      if (!r.ok) continue;
      const txt = (await r.text() || "").trim();
      if (!txt) continue;

      const lower = txt.toLowerCase();
      if (lower.includes("limit") && lower.includes("wywołań")) {
        dbg && dbg.push({ stooq: "csv-limit", host });
        return "__LIMIT__";
      }
      if (lower.startsWith("<!doctype") || lower.startsWith("<html")) {
        dbg && dbg.push({ stooq: "csv-html", host });
        continue;
      }
      const lines = txt.split(/\r?\n/);
      if (lines.length <= 1) continue;
      return lines;
    } catch (e) {
      dbg && dbg.push({ stooq: "csv-err", host, err: String(e) });
    }
  }
  return [];
}
function stooqIntervalToParam(interval = "1d") {
  if (interval === "1wk") return "w";
  if (interval === "1mo") return "m";
  return "d";
}
async function stooqHistory(code, interval = "1d", dbg) {
  const i = stooqIntervalToParam(interval);
  const lines = await fetchStooqCsv(`/q/d/l/?s=${encodeURIComponent(code)}&i=${i}`, dbg);
  if (!lines || lines === "__LIMIT__") return lines;
  const out = [];
  for (let k = 1; k < lines.length; k++) {
    const [date, , , , close] = (lines[k] || "").split(",");
    const c = safeNum(close);
    if (Number.isFinite(c)) out.push({ t: date, close: c });
  }
  return out;
}

/* ============ Yahoo (chart + spark) ============ */
const Y_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json,*/*",
  Referer: "https://finance.yahoo.com/",
};
async function yahooChart(sym, range, interval, dbg) {
  const tryBase = async (base) => {
    try {
      const url = `${base}/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`;
      const r = await fetch(url, { cache: "no-store", headers: Y_HEADERS });
      dbg && dbg.push({ yahoo: "chart", base, status: r.status, ok: r.ok, url });
      if (!r.ok) return null;
      const j = await r.json().catch(() => null);
      return j?.chart?.result?.[0] || null;
    } catch (e) {
      dbg && dbg.push({ yahoo: "chart-err", msg: String(e) });
      return null;
    }
  };
  return (await tryBase("https://query1.finance.yahoo.com")) ||
         (await tryBase("https://query2.finance.yahoo.com"));
}
async function yahooSpark(sym, range, interval, dbg) {
  const tryBase = async (base) => {
    try {
      const url = `${base}/v8/finance/spark?symbols=${encodeURIComponent(sym)}&range=${range}&interval=${interval}`;
      const r = await fetch(url, { cache: "no-store", headers: Y_HEADERS });
      dbg && dbg.push({ yahoo: "spark", base, status: r.status, ok: r.ok, url });
      if (!r.ok) return null;
      const j = await r.json().catch(() => null);
      const it = j?.spark?.result?.[0];
      if (!it?.response?.[0]?.timestamp || !it?.response?.[0]?.indicators?.quote?.[0]?.close) return null;
      return {
        timestamp: it.response[0].timestamp,
        close: it.response[0].indicators.quote[0].close,
        currency: it?.response?.[0]?.meta?.currency || null,
      };
    } catch (e) {
      dbg && dbg.push({ yahoo: "spark-err", msg: String(e) });
      return null;
    }
  };
  return (await tryBase("https://query1.finance.yahoo.com")) ||
         (await tryBase("https://query2.finance.yahoo.com"));
}
async function yahooHistoryDaily(sym, range = "1y", interval = "1d", dbg) {
  const rc = await yahooChart(sym, range, interval, dbg);
  if (rc?.timestamp?.length) {
    const ts = rc.timestamp;
    const cl = rc.indicators?.quote?.[0]?.close || [];
    const pts = [];
    for (let i = 0; i < ts.length; i++) {
      const t = new Date(ts[i] * 1000).toISOString().slice(0, 10);
      const c = safeNum(cl[i]);
      if (t && Number.isFinite(c)) pts.push({ t, close: c });
    }
    let currency = rc?.meta?.currency || null;
    if (!currency) {
      try {
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
        const j = await fetch(url, { cache: "no-store", headers: Y_HEADERS }).then((r) => r.json());
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
      if (t && Number.isFinite(c)) pts.push({ t, close: c });
    }
    return { points: pts, currency: rs.currency || null };
  }
  return { points: [], currency: null };
}

/* ============ FX series (Stooq → Yahoo fallback) ============ */
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
  if (stooq === "__LIMIT__") {
    dbg && dbg.push({ fx: "stooq-limit", code: fxCode });
  } else if (Array.isArray(stooq) && stooq.length) {
    return isGBX ? stooq.map(p => ({ t: p.t, close: p.close })) : stooq;
  }

  const yfx = await yahooFxHistory(isGBX ? "GBP" : norm, range, "1d", dbg);
  if (Array.isArray(yfx) && yfx.length) return yfx;

  dbg && dbg.push({ fx: "fallback-empty", code: fxCode, norm });
  return [];
}
function makeFxAccessorWithBackfill(fxPts, backDays = 7) {
  const map = new Map();
  for (const p of fxPts) map.set(p.t, p.close);
  return (dayISO) => {
    if (map.has(dayISO)) return map.get(dayISO);
    const d = new Date(dayISO);
    for (let k = 1; k <= backDays; k++) {
      d.setDate(d.getDate() - 1);
      const ds = d.toISOString().slice(0, 10);
      if (map.has(ds)) return map.get(ds);
    }
    return null;
  };
}

/* ============ Core: historia w PLN dla 1 symbolu ============ */
async function buildHistoryPLN(yahooSym, range = "1y", interval = "1d", dbg) {
  const sym = normalizeYahoo(yahooSym);

  if (isWATicker(sym)) {
    const code = yahooWAToStooqCode(sym);
    let histAll = await stooqHistory(code, interval, dbg);
    if (histAll === "__LIMIT__" || !Array.isArray(histAll) || !histAll.length) {
      const ySym = toYahooSymbol(sym);
      const { points: yPts, currency } = await yahooHistoryDaily(ySym, range, interval, dbg);
      if (!yPts.length) return [];
      if (!currency || currency === "PLN") return filterByRange(yPts, range);
      const fxPtsAll = await getFxSeries(currency, range, interval, dbg);
      if (!fxPtsAll.length) return [];
      const fxAt = makeFxAccessorWithBackfill(fxPtsAll, 7);
      const out = [];
      for (const p of yPts) {
        const fx = fxAt(p.t);
        if (Number.isFinite(fx)) out.push({ t: p.t, close: p.close * fx });
      }
      return filterByRange(out, range);
    }
    return filterByRange(histAll, range);
  }

  const stooqSym = toStooqGeneric(sym);
  let nativePts = await stooqHistory(stooqSym, interval, dbg);

  if (nativePts === "__LIMIT__" || !Array.isArray(nativePts) || !nativePts.length) {
    const ySym = toYahooSymbol(sym);
    const y = await yahooHistoryDaily(ySym, range, interval, dbg);
    if (!y.points.length) return [];
    if (!y.currency || y.currency === "PLN") return filterByRange(y.points, range);
    const fx2 = await getFxSeries(y.currency, range, interval, dbg);
    if (!fx2.length) return [];
    const fxAt2 = makeFxAccessorWithBackfill(fx2, 7);
    const out2 = [];
    for (const p of y.points) {
      const fx = fxAt2(p.t);
      if (Number.isFinite(fx)) out2.push({ t: p.t, close: p.close * fx });
    }
    return filterByRange(out2, range);
  }

  let ccy = guessCurrency(sym) || "USD";
  const isGBX = ccy === "GBX";
  ccy = normCcyForFx(ccy);
  if (isGBX) nativePts = nativePts.map((p) => ({ t: p.t, close: p.close / 100 }));
  if (ccy === "PLN") return filterByRange(nativePts, range);

  const fxPtsAll = await getFxSeries(ccy, range, interval, dbg);
  if (!fxPtsAll.length) {
    const ySym = toYahooSymbol(sym);
    const y = await yahooHistoryDaily(ySym, range, interval, dbg);
    if (!y.points.length) return [];
    if (!y.currency || y.currency === "PLN") return filterByRange(y.points, range);
    const fx2 = await getFxSeries(y.currency, range, interval, dbg);
    if (!fx2.length) return [];
    const fxAt2 = makeFxAccessorWithBackfill(fx2, 7);
    const out2 = [];
    for (const p of y.points) {
      const fx = fxAt2(p.t);
      if (Number.isFinite(fx)) out2.push({ t: p.t, close: p.close * fx });
    }
    return filterByRange(out2, range);
  }

  const fxAt = makeFxAccessorWithBackfill(fxPtsAll, 7);
  const out = [];
  for (const p of nativePts) {
    const fx = fxAt(p.t);
    if (Number.isFinite(fx)) out.push({ t: p.t, close: p.close * fx });
  }
  return filterByRange(out, range);
}

/* ============ API ============ */
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body?.items) ? body.items : [];
  const range = body?.range || "1y";
  const interval = String(body?.interval || "1d").toLowerCase();
  const debug = !!body?.debug;

  if (!items.length) return NextResponse.json({ histories: {} });

  // Prosty limiter współbieżności
  const CONC = 6;
  const out = {};
  const dbgAll = debug ? {} : null;

  async function runOne(it) {
    const yahoo = it?.pair?.yahoo || it?.yahoo || "";
    const shares = Number(it?.shares) || 0;
    if (!yahoo) { out[it.id] = { history: [], shares }; return; }
    const dbg = debug ? [] : null;
    const hist = await buildHistoryPLN(yahoo, range, interval, dbg);
    out[it.id] = { history: hist || [], shares };
    if (debug) dbgAll[it.id] = dbg;
  }

  for (let i = 0; i < items.length; i += CONC) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(items.slice(i, i + CONC).map(runOne));
  }

  return NextResponse.json(debug ? { histories: out, _debug: dbgAll } : { histories: out });
}

export async function GET() {
  return NextResponse.json({ error: "Use POST with { items: [...] }" }, { status: 405 });
}
