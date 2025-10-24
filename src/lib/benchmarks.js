/* ==== definicje benchmarków + prawo/licencje ==== */
/*
  ZAŁOŻENIA:
  - Polska: używamy ETF-ów Beta (TR) jako *domyślnego* proxy indeksów (stabilne tickery na Yahoo).
  - Mamy FALBACK: gdyby ETF miał przerwę w danych, próbujemy symbolu indeksu z Yahoo.
  - Świat: używamy ETF-ów notowanych globalnie (SPY/ACWI/IEMG/IWDA itd.).
  - Eksportujemy getLegalAttribution() do wyświetlenia krótkiego "disclaimera" w UI.

  UWAGA PRAWNA (skrót dla devów):
  - Dane Yahoo nadają się do wersji MVP/dev/darmowej. Do wersji płatnej/komercyjnej podmień źródła na licencjonowane
    (np. GPW Data Services / vendor typu EOD, Tiingo itp.) i zmień LEGAL_NOTICE_PROD.
*/

/* ==== benchmarki (główne) ==== */
export const BENCHES = [
  // Polska – ETF proxy TR (GPW)
  { key: "WIG20",  label: "WIG20 (ETF WIG20TR)",   kind: "yahoo", yahoo: "ETFBW20TR.WA" },
  { key: "MWIG40", label: "mWIG40 (ETF mWIG40TR)", kind: "yahoo", yahoo: "ETFBM40TR.WA" },
  { key: "SWIG80", label: "sWIG80 (ETF sWIG80TR)", kind: "yahoo", yahoo: "ETFBS80TR.WA" },

  // Świat – akcje (ETF-y)
  { key: "SP500TR", label: "S&P 500 (SPY, proxy TR via AdjClose)", kind: "yahoo", yahoo: "SPY" },
  { key: "ACWI",    label: "MSCI ACWI (ACWI)",                     kind: "yahoo", yahoo: "ACWI" },
  { key: "IEMG",    label: "MSCI EM (IEMG)",                       kind: "yahoo", yahoo: "IEMG" },
  { key: "IWDA",    label: "MSCI World (IWDA.AS, EUR)",            kind: "yahoo", yahoo: "IWDA.AS" },

  // Obligacje
  { key: "AGGH",    label: "Global Bonds Hedged (AGGH.MI)", kind: "yahoo", yahoo: "AGGH.MI" },
  { key: "BND",     label: "US Total Bond (BND)",           kind: "yahoo", yahoo: "BND" },
  { key: "TLT",     label: "US 20+Y Treasuries (TLT)",      kind: "yahoo", yahoo: "TLT" },
  { key: "TIP",     label: "US TIPS (TIP)",                 kind: "yahoo", yahoo: "TIP" },

  // Złoto / surowce / REIT
  { key: "GLD",     label: "Gold (GLD)",        kind: "yahoo", yahoo: "GLD" },
  { key: "DBC",     label: "Commodities (DBC)", kind: "yahoo", yahoo: "DBC" },
  { key: "VNQ",     label: "US REIT (VNQ)",     kind: "yahoo", yahoo: "VNQ" },

  // Risk-free – syntetyczna krzywa z /api/riskfree (WIRON 1M skł.)
  { key: "RISKFREE", label: "WIRON 1M (składany)", kind: "riskfree" },
];

/* ==== możliwe fallbacki (np. indeksowe tickery Yahoo) ==== */
export const FALLBACKS = {
  WIG20:  { yahoo_index: "WIG20TR.WA" },
  MWIG40: { yahoo_index: "MWIG40TR.WA" },
  SWIG80: { yahoo_index: "SWIG80TR.WA" },
};

/* ==== kolory (eksport) ==== */
export const BENCH_COLORS = {
  WIG20:  "#3b82f6",
  MWIG40: "#f59e0b",
  SWIG80: "#ef4444",
  SP500TR: "#60a5fa",
  ACWI:    "#22d3ee",
  IEMG:    "#34d399",
  IWDA:    "#a78bfa",
  AGGH: "#f472b6",
  BND:  "#93c5fd",
  TLT:  "#67e8f9",
  TIP:  "#86efac",
  GLD: "#facc15",
  DBC: "#fbbf24",
  VNQ: "#fca5a5",
  RISKFREE: "#a3a3a3",
};
export const getBenchColor = (key) => BENCH_COLORS[key] || "#9CA3AF";

/* ==== legal / disclaimer ==== */
const LEGAL_NOTICE_DEV =
  "Dane notowań pochodzą z publicznych agregatów (np. Yahoo Finance) i służą wyłącznie celom poglądowym/edukacyjnym. " +
  "ETF-y stanowią proxy indeksów (możliwy tracking error i koszty funduszu).";

const LEGAL_NOTICE_PROD =
  "Wersja komercyjna wymaga licencjonowanych źródeł danych (np. GPW Data Services dla indeksów PL, vendor dla notowań ETF/akcji). " +
  "Wyświetlane serie odzwierciedlają instrumenty ETF pokrywające wskazane indeksy.";

export function getLegalAttribution({ mode = "dev", used = [] } = {}) {
  const srcInfo = used.length ? `Źródła: ${used.join(", ")}.` : "";
  const text = mode === "prod" ? LEGAL_NOTICE_PROD : LEGAL_NOTICE_DEV;
  return `${text} ${srcInfo}`.trim();
}

/* ==== utils ==== */
const posNumOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
export const fmtPct = (v) => `${Number(v || 0).toFixed(2)}%`;

export function toDayISO(x) {
  if (!x) return null;
  if (typeof x === "string") {
    const m = x.match(/^\d{4}-\d{2}-\d{2}/);
    if (m) return m[0];
  }
  if (typeof x === "object" && x && typeof x.seconds === "number") {
    return new Date(x.seconds * 1000).toISOString().slice(0, 10);
  }
  const d = x instanceof Date ? x : new Date(x);
  if (Number.isNaN(d?.getTime?.())) return null;
  return d.toISOString().slice(0, 10);
}

export function ensurePairMappings(pairIn = {}) {
  const out = { ...pairIn };
  const y = String(out?.yahoo || out?.symbol || "").toUpperCase().trim();

  if (y.endsWith(".WA")) {
    out.yahoo = y;
    out.stooq = out.stooq || y.slice(0, -3).toLowerCase();
    out.finnhub = out.finnhub || y;
    out.currency = out.currency || "PLN";
  }
  if (!out.stooq && /^[A-Z.^\-]{1,12}$/.test(y) && !y.includes(".")) {
    out.yahoo = y;
    out.stooq = `${y.toLowerCase()}.us`;
    out.finnhub = out.finnhub || y;
  }
  return out;
}

export function parseHistoryArray(json) {
  if (!json || typeof json !== "object") return [];
  const base =
    (Array.isArray(json.historyPLN) && json.historyPLN) ||
    (Array.isArray(json.history) && json.history) ||
    (Array.isArray(json.prices) && json.prices) ||
    [];
  return base
    .map((p) => {
      const tRaw = p?.t ?? p?.date ?? p?.Date ?? p?.time ?? p?.timestamp;
      const t = tRaw ? new Date(tRaw).toISOString().slice(0, 10) : null;
      const close = posNumOrNull(p?.close ?? p?.price ?? p?.adjClose ?? p?.c);
      return { t, close };
    })
    .filter((p) => p.t && p.close != null);
}

export function forwardFill(history = [], days = []) {
  const map = new Map();
  for (const p of history) {
    const d = (p?.t || "").slice(0, 10);
    const v = posNumOrNull(p?.close);
    if (d && v != null) map.set(d, v);
  }
  const out = [];
  let last = null;
  let seen = false;
  for (const d of days) {
    const exp = map.get(d);
    if (exp != null) { last = exp; seen = true; }
    out.push({ t: d, close: seen ? (last ?? null) : null });
  }
  return out;
}

export function forwardFillSafe(history = [], days = []) {
  const aligned = forwardFill(history, days);
  const hasAny = aligned.some(p => p.close != null);
  if (!hasAny && Array.isArray(history) && history.length) {
    return history.map(p => ({
      t: (p?.t || '').slice(0,10),
      close: posNumOrNull(p?.close),
    }));
  }
  return aligned;
}

/* ==== BULK fetch benchmarków (1 request na wszystkie) ==== */
export async function fetchBenchmarks(keys = [], opts = {}) {
  const { range = "1y", interval = "1d", axisDays = [] } = opts;
  const uniqKeys = Array.from(new Set(keys));
  const defs = uniqKeys
    .map((k) => BENCHES.find((b) => b.key === k))
    .filter(Boolean);

  const rawByKey = {};
  const alignedByKey = {};
  const meta = {};

  // Zbierz wszystkie symbole do jednego BULK-a (główne + ewentualne fallbacki)
  const symbolsSet = new Set();
  for (const def of defs) {
    if (def.kind === "yahoo" && def.yahoo) symbolsSet.add(String(def.yahoo).toUpperCase());
    const fb = FALLBACKS[def.key]?.yahoo_index;
    if (fb) symbolsSet.add(String(fb).toUpperCase());
  }
  const symbols = Array.from(symbolsSet);

  // Jeden request bulk (bez client-timeoutu; serwer ma własne, krótkie time-outy do źródeł)
  let bulkResults = {};
  try {
    const r = await fetch("/api/history/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbols, range, interval }),
    });
    const j = r.ok ? await r.json().catch(() => ({})) : {};
    bulkResults = j?.results || {};
  } catch {
    bulkResults = {};
  }

  const getHist = (sym) => {
    if (!sym) return [];
    const arr = bulkResults[String(sym).toUpperCase()];
    return Array.isArray(arr) ? arr : [];
  };

  for (const def of defs) {
    if (def.kind === "riskfree") {
      try {
        const rfRes = await fetch("/api/riskfree", { cache: "no-store" });
        const j = rfRes.ok ? await rfRes.json().catch(() => null) : null;
        const rfDaily = Number.isFinite(j?.daily) ? Number(j.daily) : 0;

        let value = 100;
        const hist = axisDays.map((t, i) => {
          if (i > 0) value *= 1 + rfDaily;
          return { t, close: value };
        });

        rawByKey[def.key] = hist;
        alignedByKey[def.key] = hist;
        meta[def.key] = {
          label: def.label,
          used: "Synthetic (WIRON 1M)",
          source: "synthetic",
          sourceLabel: "RF (WIRON 1M)",
          disclaimer: "Syntetyczna krzywa RF oparta o dzienną stopę WIRON 1M.",
          noData: false,
        };
      } catch {
        rawByKey[def.key] = [];
        alignedByKey[def.key] = axisDays.map((t) => ({ t, close: null }));
        meta[def.key] = {
          label: def.label,
          used: "Synthetic (WIRON 1M)",
          source: "synthetic",
          sourceLabel: "RF (WIRON 1M)",
          disclaimer: "Brak danych RF.",
          noData: true,
        };
      }
      continue;
    }

    // zwykłe benchmarki (yahoo)
    const mainSym = def.yahoo;
    const fbSym = FALLBACKS[def.key]?.yahoo_index || null;

    let histMain = getHist(mainSym);
    let used = mainSym;

    const hasPos = (histMain || []).some(p => posNumOrNull(p?.close) != null);
    if (!hasPos && fbSym) {
      const histFB = getHist(fbSym);
      const hasPosFB = (histFB || []).some(p => posNumOrNull(p?.close) != null);
      if (hasPosFB) { histMain = histFB; used = fbSym; }
    }

    rawByKey[def.key] = histMain;
    alignedByKey[def.key] = forwardFillSafe(histMain, axisDays);
    meta[def.key] = {
      label: def.label,
      used,
      source: "Yahoo",
      sourceLabel: "Yahoo Finance (notowania ETF/indeks)",
      disclaimer:
        def.key === "WIG20" || def.key === "MWIG40" || def.key === "SWIG80"
          ? "ETF jako proxy indeksu (możliwy tracking error oraz koszty funduszu)."
          : "ETF jako proxy indeksu (Adj Close jako przybliżenie TR).",
      noData: !(histMain || []).some(p => posNumOrNull(p?.close) != null),
    };
  }

  return { rawByKey, alignedByKey, meta };
}

/** CAGR z first/last; <1R → total (tylko dodatnie ceny) */
export function computeCAGRForBenches(rawByKey = {}, nDays = 0) {
  const years = nDays / 365;
  const out = {};
  for (const k of Object.keys(rawByKey)) {
    const arr = rawByKey[k] || [];
    const first = arr.map(p => posNumOrNull(p?.close)).find(v => v != null) ?? null;
    const last  = [...arr].reverse().map(p => posNumOrNull(p?.close)).find(v => v != null) ?? null;
    if (first != null && last != null) {
      const total = last / first - 1;
      out[k] = years < 1 ? total : Math.pow(1 + total, 1 / years) - 1;
    } else {
      out[k] = 0;
    }
  }
  return out;
}
