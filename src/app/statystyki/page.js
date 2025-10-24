"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* === auth + UI === */
import { useAuth } from "../components/AuthProvider";
import PortfolioSwitcher from "../components/PortfolioSwitcher";
/* ZAMIANA: zamiast StatsCompositionSection używamy Twojego komponentu */
import PortfolioComposition from "../components/PortfolioComposition";
import DividendsSection from "../components/DividendsSection.hidden";


/* === Firestore === */
import {
  listenHoldings,
  listenCashBalance,
  autoBackfillBuyFlowsIfNeeded,
  autoBackfillDepositsIfNeeded,
} from "../../lib/portfolioStore";

/* === rdzeń: dzienne r_t === */
import * as TWR from "../../lib/twr";
import { computeTWR as computeTWRSafe } from "../../lib/twrMath";

/* === przepływy === */
import {
  normalizeCashflowsForTWR,
  filterCashflowsByAxis,
} from "../../lib/twrFlows";

/* === benchmarki: utilsy + definicje === */
import {
  BENCHES,
  fetchBenchmarks,
  computeCAGRForBenches,
  ensurePairMappings,
  parseHistoryArray,
  toDayISO,
  getLegalAttribution,
} from "../../lib/benchmarks";

/* === metadane do składu portfela (Klasy/Sektory/Kraje) === */
import * as composition from "../../lib/analytics/composition";

/* === Recharts === */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from "recharts";

/* ==== zakresy ==== */
const RANGES = [
  { key: "1M", label: "1M", range: "1mo", interval: "1d" },
  { key: "3M", label: "3M", range: "3mo", interval: "1d" },
  { key: "6M", label: "6M", range: "6mo", interval: "1d" },
  { key: "YTD", label: "YTD", range: "ytd", interval: "1d" },
  { key: "1R", label: "1R", range: "1y", interval: "1d" },
  { key: "5L", label: "5L", range: "5y", interval: "1wk" },
  { key: "MAX", label: "MAX", range: "max", interval: "1d" },
];

/* ==== utils ==== */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(v)) ? Number(v) : 0);
const fmtPct = (v) => `${Number(v || 0).toFixed(2)}%`;
const numOrNull = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

function isoLocal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startISOForRange(rangeKey) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const dt = new Date(y, m, now.getDate());
  switch ((rangeKey || "1y").toLowerCase()) {
    case "1mo": dt.setMonth(m - 1); return isoLocal(dt);
    case "3mo": dt.setMonth(m - 3); return isoLocal(dt);
    case "6mo": dt.setMonth(m - 6); return isoLocal(dt);
    case "ytd": return isoLocal(new Date(y, 0, 1));
    case "1y":  dt.setFullYear(y - 1); return isoLocal(dt);
    case "5y":  dt.setFullYear(y - 5); return isoLocal(dt);
    case "max": return null;
    default:    dt.setFullYear(y - 1); return isoLocal(dt);
  }
}
function chunk(array, size) { const out = []; for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size)); return out; }
function buildDailyAxis(startISO, endISO) {
  if (!startISO || !endISO || startISO > endISO) return [];
  const out = [];
  const s = new Date(startISO + "T00:00:00Z");
  const e = new Date(endISO + "T00:00:00Z");
  for (let t = s; t <= e; t.setUTCDate(t.getUTCDate() + 1)) out.push(t.toISOString().slice(0, 10));
  return out;
}
// prosty downsampling po dacie (np. co 7 dni dla długich zakresów)
function downsampleDays(rows = [], everyNDays = 7) {
  if (!Array.isArray(rows) || rows.length <= everyNDays) return rows;
  const out = [];
  let last = null;
  for (const r of rows) {
    if (!last) { out.push(r); last = r.t; continue; }
    const dLast = new Date(last);
    const dCur = new Date(r.t);
    const diff = Math.floor((dCur - dLast) / (24*3600*1000));
    if (diff >= everyNDays) { out.push(r); last = r.t; }
  }
  // dodaj ostatni punkt jeśli go nie ma
  const lastOut = out[out.length - 1]?.t;
  const lastIn  = rows[rows.length - 1]?.t;
  if (lastIn && lastOut !== lastIn) out.push(rows[rows.length - 1]);
  return out;
}

/* ===== aktywny start ===== */
function firstActiveISOFromHoldings(holdings = []) {
  let min = null;
  for (const h of holdings) {
    const d = toDayISO(h?.buyDate);
    if (!d) continue;
    if (!min || d < min) min = d;
  }
  return min;
}
function firstActiveISOFromCashflows(flows = []) {
  let min = null;
  const EXTERNAL = new Set(["deposit", "withdraw", "manual", "correction"]);
  for (const f of flows) {
    const t = String(f?.type || "").toLowerCase();
    if (EXTERNAL.has(t)) {
      if (f?.excludeFromTWR || f?.storno) continue;
      const d = toDayISO(f?.date);
      if (!d) continue;
      if (!min || d < min) min = d;
    }
  }
  return min;
}
function firstActiveISO(holdings = [], flows = []) {
  const a = firstActiveISOFromHoldings(holdings);
  const b = firstActiveISOFromCashflows(flows);
  if (a && b) return a < b ? a : b;
  return a || b || null;
}

/* ===== dodatkowe metryki ===== */
function computeMaxDrawdown(vals) {
  let peak = 0, mdd = 0;
  for (const p of vals) {
    const v = Number(p?.value) || 0;
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = v / peak - 1;
      if (dd < mdd) mdd = dd;
    }
  }
  return mdd;
}
function computeCAGRFromDaily(dailyReturns = [], nDays = 0) {
  let mult = 1;
  for (const r of dailyReturns) mult *= 1 + (Number(r) || 0);
  const total = mult - 1;
  const years = nDays / 365;
  if (years < 1) return total;
  return Math.pow(1 + total, 1 / years) - 1;
}

/* ================== PAGE ================== */
export default function Page() {
  const { user, signOut } = useAuth();

  const [currentPortfolioId, setCurrentPortfolioId] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [cash, setCash] = useState({ balance: 0, flows: [] });

  const [rangeKey, setRangeKey] = useState("YTD");
  const currentRange = useMemo(
    () => RANGES.find((r) => r.key === rangeKey) || RANGES[3],
    [rangeKey]
  );

  // *** USUWAMY podwójną historię: używamy tylko DAILY dla wszystkiego ***
  const [seriesByIdDaily, setSeriesByIdDaily] = useState({});

  // benchmarki: predefiniowane + custom tickery
  const [selectedBenches, setSelectedBenches] = useState(["WIG20","SP500TR","ACWI"]);
  const [benchSeries, setBenchSeries] = useState({});     // wyrównane do osi (close lub null)
  const [benchSeriesRaw, setBenchSeriesRaw] = useState({});// surowe (do CAGR)
  const [benchMeta, setBenchMeta] = useState({});         // pomocnicze info

  const [customDefs, setCustomDefs] = useState([]); // { key, label, yahoo }
  const [showBenchMgr, setShowBenchMgr] = useState(false);

  const [valueMode, setValueMode] = useState("PCT"); // domyślnie %

  // risk-free (WIRON 1M)
  const [rf, setRf] = useState({ daily: 0, annual: 0, asOf: null, source: "—" });

  // ====== KOLORY ======
  const PORTFOLIO_COLOR = "#eab308"; // żółty
  const BENCH_PALETTE = [
    "#60a5fa", "#22c55e", "#06b6d4", "#a78bfa",
    "#f97316", "#ef4444", "#14b8a6", "#93c5fd", "#f472b6",
  ];
  const benchColorMap = useMemo(() => {
    const map = {};
    (selectedBenches || []).forEach((k, i) => { map[k] = BENCH_PALETTE[i % BENCH_PALETTE.length]; });
    return map;
  }, [selectedBenches]);

  const histDailyAbortRef = useRef(null);
  const benchAbortRef = useRef(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      histDailyAbortRef.current?.abort();
      benchAbortRef.current?.abort();
    };
  }, []);

  /* Auto-backfill */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try { await autoBackfillBuyFlowsIfNeeded(user.uid, currentPortfolioId); } catch {}
      try { await autoBackfillDepositsIfNeeded(user.uid, currentPortfolioId); } catch {}
    })();
  }, [user, currentPortfolioId]);

  /* RF */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/riskfree", { cache: "no-store" });
        const j = r.ok ? await r.json() : null;
        if (alive && j && Number.isFinite(j.daily)) {
          setRf({ daily: j.daily, annual: j.annual, asOf: j.asOf || null, source: j.source || "WIRON 1M" });
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  /* Listeners */
  useEffect(() => {
    if (!user) { setHoldings([]); return; }
    const unsub = currentPortfolioId
      ? listenHoldings(user.uid, currentPortfolioId, (rows) => setHoldings(rows))
      : listenHoldings(user.uid, (rows) => setHoldings(rows));
    return () => unsub?.();
  }, [user, currentPortfolioId]);

  useEffect(() => {
    if (!user) { setCash({ balance: 0, flows: [] }); return; }
    const unsub = currentPortfolioId
      ? listenCashBalance(user.uid, currentPortfolioId, (info) => setCash(info || { balance: 0, flows: [] }))
      : listenCashBalance(user.uid, (info) => setCash(info || { balance: 0, flows: [] }));
    return () => unsub?.();
  }, [user, currentPortfolioId]);

  /* Historia – JEDEN fetch (1d) przez BULK dla wszystkich walorów */
  useEffect(() => {
    if (!holdings.length) { setSeriesByIdDaily({}); return; }
    const controller = new AbortController();
    histDailyAbortRef.current?.abort();
    histDailyAbortRef.current = controller;

    (async () => {
      try {
        // mapuj holdings -> symbol Yahoo
        const items = holdings.map((h) => ({
          id: h.id,
          shares: Number(h.shares) || 0,
          pair: ensurePairMappings(h.pair || { yahoo: h?.pair?.yahoo || h?.name }),
        }));
        const symbols = Array.from(new Set(items.map(it => String(it.pair?.yahoo || "").toUpperCase()).filter(Boolean)));

        // BULK: jedno żądanie zamiast kilkudziesięciu
        const r = await fetch("/api/history/bulk", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ symbols, range: currentRange.range, interval: "1d" }),
          signal: controller.signal,
        });
        const j = r.ok ? await r.json().catch(() => ({})) : {};
        const results = j?.results || {};

        // ułóż strukturę pod TWR.buildPortfolioValueSeries
        const byId = {};
        for (const it of items) {
          const y = String(it.pair?.yahoo || "").toUpperCase();
          const arr = Array.isArray(results[y]) ? results[y] : [];
          const hist = (arr || []).map(p => ({ t: p?.t, close: numOrNull(p?.close) })).filter(p => p.t && p.close != null);
          byId[it.id] = { history: hist, shares: it.shares };
        }

        if (mountedRef.current && !controller.signal.aborted) setSeriesByIdDaily(byId);
      } catch (e) {
        if (e?.name !== "AbortError") console.error("bulk daily history fetch err:", e);
      }
    })();

    return () => controller.abort();
  }, [holdings, currentRange.range]); // zawsze 1d

  /* ====== Serie wartości ====== */
  // bazowa seria wartości z historii 1d
  const valueSeriesRawDaily = useMemo(() => {
    if (!Object.keys(seriesByIdDaily).length) return [];
    return TWR.buildPortfolioValueSeries({ seriesById: seriesByIdDaily, holdings });
  }, [seriesByIdDaily, holdings]);

  // daty
  const lifetimeSince = useMemo(
    () => firstActiveISO(holdings, cash?.flows || []) || (valueSeriesRawDaily.find(v => (v?.value||0) > 0)?.t || null),
    [holdings, cash?.flows, valueSeriesRawDaily]
  );
  const rawSinceISO = useMemo(() => startISOForRange(currentRange.range), [currentRange.range]);
  const effectiveSince = useMemo(() => {
    if (!rawSinceISO && !lifetimeSince) return null;
    if (!rawSinceISO) return lifetimeSince;
    if (!lifetimeSince) return rawSinceISO;
    return rawSinceISO > lifetimeSince ? rawSinceISO : lifetimeSince;
  }, [rawSinceISO, lifetimeSince]);
  const endISO = useMemo(() => isoLocal(new Date()), []);

  // osie
  const axisDailyAll = useMemo(() => buildDailyAxis(lifetimeSince, endISO), [lifetimeSince, endISO]);
  const axisDaily = useMemo(() => buildDailyAxis(effectiveSince, endISO), [effectiveSince, endISO]);

  // wartości wyrównane (lifetime + zakres)
  const valuesAlignedAll = useMemo(() => {
    const map = new Map(valueSeriesRawDaily.map((p) => [p.t, Number(p.value) || 0]));
    let last = null;
    return axisDailyAll.map((d) => {
      if (map.has(d)) last = Number(map.get(d)) || 0;
      return { t: d, value: last ?? 0 };
    });
  }, [valueSeriesRawDaily, axisDailyAll]);

  // seria do wykresu wartości (PLN) – na podstawie 1d + ewentualny downsampling
  const valueSeriesChart = useMemo(() => {
    if (!valueSeriesRawDaily.length) return [];
    const base = effectiveSince
      ? valueSeriesRawDaily.filter((p) => (p?.t || "") >= effectiveSince)
      : valueSeriesRawDaily;
    // dla długich zakresów zmniejsz liczbę punktów (render szybciej)
    if (rangeKey === "5L" || rangeKey === "MAX") {
      return downsampleDays(base, 7); // co ok. tydzień
    }
    return base;
  }, [valueSeriesRawDaily, effectiveSince, rangeKey]);

  // wyrównanie do osi zakresu (do TWR okresowego)
  const valuesAlignedDaily = useMemo(() => {
    const src = valueSeriesRawDaily.filter((p) => (p?.t || "") >= (effectiveSince || "0000-01-01"));
    const map = new Map(src.map((p) => [p.t, Number(p.value) || 0]));
    let last = null;
    return axisDaily.map((d) => {
      if (map.has(d)) last = Number(map.get(d)) || 0;
      return { t: d, value: last ?? 0 };
    });
  }, [valueSeriesRawDaily, axisDaily, effectiveSince]);

  // CF lifetime & okres
  const cashMapAll = useMemo(() => {
    const m = normalizeCashflowsForTWR(cash?.flows || []);
    const out = new Map();
    m.forEach((amt, dRaw) => {
      const d = toDayISO(dRaw);
      if (!d) return;
      if (lifetimeSince && d < lifetimeSince) return;
      if (endISO && d > endISO) return;
      out.set(d, (out.get(d) || 0) + (Number(amt) || 0));
    });
    return out;
  }, [cash?.flows, lifetimeSince, endISO]);
  const cashPerDayAll = useMemo(() => filterCashflowsByAxis(cashMapAll, axisDailyAll), [cashMapAll, axisDailyAll]);

  const cashMapRange = useMemo(() => {
    const m = normalizeCashflowsForTWR(cash?.flows || []);
    const out = new Map();
    m.forEach((amt, dRaw) => {
      const d = toDayISO(dRaw);
      if (!d) return;
      if (effectiveSince && d < effectiveSince) return;
      if (endISO && d > endISO) return;
      out.set(d, (out.get(d) || 0) + (Number(amt) || 0));
    });
    return out;
  }, [cash?.flows, effectiveSince, endISO]);
  const cashPerDay = useMemo(() => filterCashflowsByAxis(cashMapRange, axisDaily), [cashMapRange, axisDaily]);

  // dzienne r_t
  const rOutAll = useMemo(
    () => computeTWRSafe({ values: valuesAlignedAll, cashflows: cashPerDayAll }),
    [valuesAlignedAll, cashPerDayAll]
  );
  const rOut = useMemo(
    () => computeTWRSafe({ values: valuesAlignedDaily, cashflows: cashPerDay }),
    [valuesAlignedDaily, cashPerDay]
  );
  const dailyRAll = useMemo(() => (rOutAll.daily || []).map((d) => Number(d.r) || 0), [rOutAll.daily]);
  const dailyR = useMemo(() => (rOut.daily || []).map((d) => Number(d.r) || 0), [rOut.daily]);

  // krzywa skumulowana
  const cumCurve = useMemo(() => {
    let mult = 1;
    return (rOut.daily || []).map((d) => {
      mult *= 1 + (Number(d.r) || 0);
      return { t: d.t, cum: (mult - 1) * 100 };
    });
  }, [rOut.daily]);

  /* ===== KPI – STRATEGICZNE (LIFETIME) ===== */
  const lastValueNow = useMemo(
    () => (valuesAlignedAll.length ? valuesAlignedAll[valuesAlignedAll.length - 1].value : 0),
    [valuesAlignedAll]
  );
  const firstNonZeroAll = useMemo(() => {
    for (const p of valuesAlignedAll) if ((p?.value || 0) > 0) return p.value;
    return 0;
  }, [valuesAlignedAll]);

  const portfolioCAGR_LIFETIME = useMemo(() => {
    const nDays = axisDailyAll.length > 0 ? axisDailyAll.length - 1 : 0;
    return computeCAGRFromDaily(dailyRAll, nDays);
  }, [dailyRAll, axisDailyAll.length]);

  const mddLifetime = useMemo(() => computeMaxDrawdown(valuesAlignedAll), [valuesAlignedAll]);

  /* ===== KPI – Z OKRESU (POD WYKRESEM) ===== */
  const periodReturnPct = useMemo(() => {
    let mult = 1;
    for (const r of dailyR) mult *= 1 + (Number(r) || 0);
    return (mult - 1) * 100;
  }, [dailyR]);

  const dailyChangePct = useMemo(() => {
    const last = (rOut.daily || [])[rOut.daily.length - 1];
    return last ? (Number(last.r) || 0) * 100 : 0;
  }, [rOut.daily]);

  const dailyProfitPLN = useMemo(() => {
    if (!(axisDaily.length >= 2)) return 0;
    const today = axisDaily[axisDaily.length - 1];
    const yesterday = axisDaily[axisDaily.length - 2];
    const mapV = new Map(valuesAlignedDaily.map((p) => [p.t, Number(p.value) || 0]));
    const Vt = mapV.get(today) || 0;
    const Vprev = mapV.get(yesterday) || 0;
    const cfToday = Number(cashPerDay.get(today) || 0);
    return (Vt - Vprev - cfToday) || 0;
  }, [axisDaily, valuesAlignedDaily, cashPerDay]);

  const monthsPlusMinus = useMemo(() => {
    const byMonth = new Map();
    for (const d of rOut.daily || []) {
      const ym = String(d.t || "").slice(0, 7);
      const r = Number(d.r) || 0;
      byMonth.set(ym, (byMonth.get(ym) || 1) * (1 + r));
    }
    let plus = 0, minus = 0;
    byMonth.forEach((mult) => {
      const ret = mult - 1;
      if (ret > 0) plus += 1;
      else if (ret < 0) minus += 1;
    });
    return { plus, minus };
  }, [rOut.daily]);

  const winRate = useMemo(() => {
    const n = dailyR.length; if (!n) return 0;
    const wins = dailyR.filter((x) => x > 0).length; return wins / n;
  }, [dailyR]);

  const volAnn = useMemo(() => {
    const n = dailyR.length; if (n <= 1) return 0;
    const mean = dailyR.reduce((a,b)=>a+b,0)/n;
    const varSum = dailyR.reduce((a,b)=>a+(b-mean)*(b-mean),0);
    const s = Math.sqrt(varSum/(n-1)); return s * Math.sqrt(252);
  }, [dailyR]);

  const sharpeAnn = useMemo(() => {
    const n = dailyR.length; if (n <= 1) return null;
    const mean = dailyR.reduce((a,b)=>a+b,0)/n;
    const varSum = dailyR.reduce((a,b)=>a+(b-mean)*(b-mean),0);
    const s = Math.sqrt(varSum/(n-1)); if (!(s>0)) return null;
    return ((mean - (Number(rf.daily)||0)) / s) * Math.sqrt(252);
  }, [dailyR, rf.daily]);

  /* ===== Benchmark – pobranie i CAGR ===== */
  const daysAxisChart = useMemo(() => valueSeriesChart.map((x) => x.t), [valueSeriesChart]);

  // automatycznie % jeśli porównujemy
  useEffect(() => { if (selectedBenches.length > 0 && valueMode !== "PCT") setValueMode("PCT"); }, [selectedBenches, valueMode]);

  // pobierz benchmarki (predefiniowane + custom) – bez zmian funkcjonalnych
  useEffect(() => {
    const controller = new AbortController();
    benchAbortRef.current?.abort();
    benchAbortRef.current = controller;

    (async () => {
      try {
        if (!selectedBenches.length && !customDefs.length) {
          setBenchSeries({}); setBenchSeriesRaw({}); setBenchMeta({}); return;
        }
        let rawByKey = {}; let alignedByKey = {}; let meta = {};

        if (selectedBenches.length) {
          const out = await fetchBenchmarks(selectedBenches, {
            range: currentRange.range,
            interval: currentRange.interval,
            axisDays: daysAxisChart,
          });
          rawByKey = out.rawByKey || {};
          alignedByKey = out.alignedByKey || {};
          meta = out.meta || {};
        }

        const custom = customDefs.filter((d) => selectedBenches.includes(d.key));
        for (const c of custom) {
          try {
            const r = await fetch("/api/history", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                pair: ensurePairMappings({ yahoo: c.yahoo }),
                range: currentRange.range,
                interval: currentRange.interval,
              }),
              signal: controller.signal,
            });
            const j = r.ok ? await r.json().catch(() => ({})) : {};
            const hist = parseHistoryArray(j);

            rawByKey[c.key] = hist;

            const map = new Map(hist.map((p) => [p.t, numOrNull(p.close)]));
            let last = null; let seen = false;
            alignedByKey[c.key] = daysAxisChart.map((d) => {
              const v = numOrNull(map.get(d));
              if (v != null) { last = v; seen = true; }
              return { t: d, close: seen ? (last ?? null) : null };
            });

            const hasPositive = (hist || []).some(p => numOrNull(p?.close) != null);
            meta[c.key] = { used: c.yahoo, noData: !hasPositive, custom: true, label: c.label };
          } catch {
            rawByKey[c.key] = [];
            alignedByKey[c.key] = daysAxisChart.map((t) => ({ t, close: null }));
            meta[c.key] = { used: c.yahoo, noData: true, custom: true, label: c.label };
          }
        }

        for (const k of Object.keys(rawByKey)) {
          const hasPos = (rawByKey[k] || []).some(p => numOrNull(p?.close) != null);
          meta[k] = { ...(meta[k] || {}), noData: meta[k]?.noData ?? !hasPos };
        }

        if (!controller.signal.aborted) {
          setBenchSeriesRaw(rawByKey);
          setBenchSeries(alignedByKey);
          setBenchMeta(meta);
        }
      } catch (e) {
        if (e?.name !== "AbortError") console.error("bench fetch err:", e);
      }
    })();

    return () => controller.abort();
  }, [selectedBenches, customDefs, currentRange.range, currentRange.interval, daysAxisChart.length]);

  const benchCAGR = useMemo(() => {
    const nDays = axisDaily.length > 0 ? axisDaily.length - 1 : 0;
    return computeCAGRForBenches(benchSeriesRaw, nDays);
  }, [benchSeriesRaw, axisDaily.length]);

  // --- seria do wykresu wartości/% (portfel + benchmarki)
  const chartSeries = useMemo(() => {
    const base = valueSeriesChart.map((row) => ({ t: row.t, value: row.value }));

    const mapsByKey = {};
    for (const k of Object.keys(benchSeries)) {
      const m = new Map();
      for (const p of (benchSeries[k] || [])) {
        const d = (p?.t || "").slice(0, 10);
        const v = numOrNull(p?.close);
        if (d) m.set(d, v);
      }
      mapsByKey[k] = m;
    }
    for (const row of base) {
      for (const k of Object.keys(mapsByKey)) {
        const v = mapsByKey[k].get(row.t);
        row[k] = v == null ? null : v;
      }
    }

    if (valueMode === "PCT") {
      const f0 = valueSeriesChart.find((v) => v.value > 0)?.value ?? 0;

      const pctBase = base.map((row) => {
        const out = { t: row.t, valuePct: f0 ? (row.value / f0 - 1) * 100 : null };
        for (const k of Object.keys(mapsByKey)) {
          const arrRaw = benchSeriesRaw[k] || [];
          const ref = arrRaw.map(p => numOrNull(p?.close)).find(v => v != null) ?? 0;
          const val = row[k];
          out[`${k}Pct`] = val == null || !ref ? null : (val / ref - 1) * 100;
        }
        return out;
      });

      return { mode: "PCT", data: pctBase };
    }

    return { mode: "PLN", data: base };
  }, [valueSeriesChart, benchSeries, benchSeriesRaw, valueMode]);

  // ====== LEGEND ======
  const benchLabel = (k) => {
    const custom = (customDefs || []).find((d) => d.key === k)?.label;
    if (custom) return custom;
    const def = (BENCHES || []).find((b) => b.key === k)?.label;
    return def || k;
  };
  const legendLabelFormatter = (value) => {
    if (value === "value" || value === "valuePct") {
      return <span style={{ fontWeight: 700 }}>Portfel</span>;
    }
    const key = String(value).replace(/Pct$/, "");
    return benchLabel(key);
  };

  const isLoadingUser = user === undefined;
  const isLoggedIn = !!user;

  // ====== Proste grupy do sekcji „Skład portfela” (symbol -> wartość) ======
  const groupsForComposition = useMemo(() => {
    const byKey = new Map();
    for (const h of holdings) {
      const sym = String(h?.pair?.yahoo || h?.name || "").toUpperCase();
      const lastClose =
        (seriesByIdDaily?.[h.id]?.history || []).slice(-1)[0]?.close ?? 0;
      const value = (Number(h?.shares) || 0) * (Number(lastClose) || 0);
      if (!byKey.has(sym)) {
        byKey.set(sym, { key: sym, name: h.name || sym, pair: h.pair || {}, value: 0 });
      }
      byKey.get(sym).value += value;
    }
    return Array.from(byKey.values()).sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [holdings, seriesByIdDaily]);

  // === META dla PortfolioComposition
  const metaBySymbol = useMemo(
    () => (composition.buildMetaBySymbol ? composition.buildMetaBySymbol(holdings) : {}),
    [holdings]
  );

  return (
  <main className="mx-auto max-w-6xl px-4 pb-24">
    <section className="text-center mt-8 mb-6">
      <h1 className="h1">Statystyki</h1>
      <p className="muted text-sm">
        {isLoadingUser
          ? "Ładowanie…"
          : isLoggedIn ? (
            <>
              Zalogowano jako {user.email} ·{" "}
              <button className="underline hover:text-zinc-200" onClick={signOut}>Wyloguj</button>
            </>
          ) : "Nie zalogowano"}
      </p>
    </section>

    {!isLoggedIn ? (
      <section className="mx-auto max-w-6xl pb-24">
        <div className="mx-auto max-w-md text-center text-zinc-400">
          Zaloguj się, aby zobaczyć statystyki.
        </div>
      </section>
    ) : (
      <>
        {/* Pasek kontrolek */}
        <section className="mb-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangeKey(r.key)}
                className={[
                  "px-3 py-1.5 rounded-lg border text-sm",
                  rangeKey === r.key
                    ? "bg-yellow-600/70 border-yellow-500 text-black"
                    : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                ].join(" ")}
                aria-pressed={rangeKey === r.key}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="inline-flex rounded-lg overflow-hidden border border-zinc-700">
              {["PLN", "PCT"].map((m) => (
                <button
                  key={m}
                  onClick={() => setValueMode(m)}
                  className={[
                    "px-3 py-1.5 text-sm",
                    valueMode === m ? "bg-yellow-600/70 text-black" : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
                  ].join(" ")}
                  title={m === "PLN" ? "Wartość portfela (PLN)" : "Zmiana od początku zakresu (%)"}
                >
                  {m === "PLN" ? "PLN" : "%"}
                </button>
              ))}
            </div>
            <PortfolioSwitcher uid={user.uid} value={currentPortfolioId} onChange={setCurrentPortfolioId} />
          </div>
        </section>

        {/* KAFELKI – WSZYSTKO NA GÓRZE */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <div className="card">
            <div className="card-inner">
              <div className="muted text-sm">
                Śr. roczna stopa zwrotu (CAGR)
                <span className="opacity-60"> {axisDailyAll.length - 1 < 365 ? "• nieannualizowane <1R" : ""}</span>
              </div>
              <div className={`text-3xl font-semibold tabular-nums ${portfolioCAGR_LIFETIME >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmtPct((portfolioCAGR_LIFETIME || 0) * 100)}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
              <div className="muted text-sm">Wartość portfela (teraz)</div>
              <div className="text-3xl font-semibold tabular-nums">{fmtPLN(lastValueNow)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
              <div className="muted text-sm">Całkowity zysk (od startu)</div>
              <div className={`text-3xl font-semibold tabular-nums ${(lastValueNow - firstNonZeroAll) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmtPLN(lastValueNow - firstNonZeroAll)}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
              <div className="muted text-sm">Max Drawdown (od startu)</div>
              <div className="text-3xl font-semibold tabular-nums text-red-400">
                {fmtPct((mddLifetime || 0) * 100)}
              </div>
            </div>
          </div>
        </section>

        {/* okresowe */}
        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-4">
          <div className="card">
            <div className="card-inner">
              <div className="muted text-sm">Zwrot w okresie <span className="opacity-60">({rangeKey})</span></div>
              <div className={`text-3xl font-semibold tabular-nums ${periodReturnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmtPct(periodReturnPct)}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
              <div className="muted text-sm">Zmiana dzienna <span className="opacity-60">({rangeKey})</span></div>
              <div className={`text-3xl font-semibold tabular-nums ${dailyChangePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmtPct(dailyChangePct)}
              </div>
              <div className="text-xs text-zinc-400">Czysty dzienny zwrot</div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
              <div className="muted text-sm">Zysk dzienny <span className="opacity-60">({rangeKey})</span></div>
              <div className={`text-3xl font-semibold tabular-nums ${dailyProfitPLN >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmtPLN(dailyProfitPLN)}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
              <div className="muted text-sm">Miesiące + / − <span className="opacity-60">({rangeKey})</span></div>
              <div className="text-3xl font-semibold tabular-nums">
                <span className="text-emerald-400">{monthsPlusMinus.plus}</span>
                {" / "}
                <span className="text-red-400">{monthsPlusMinus.minus}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
              <div className="muted text-sm">Skuteczność dni <span className="opacity-60">({rangeKey})</span></div>
              <div className="text-3xl font-semibold tabular-nums">{fmtPct((winRate || 0) * 100)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
              <div className="muted text-sm">Zmienność roczna <span className="opacity-60">({rangeKey})</span></div>
              <div className="text-3xl font-semibold tabular-nums">
                {fmtPct((volAnn || 0) * 100)}
              </div>
              <div className="text-xs text-zinc-400">Odchylenie dzienne × √252</div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
              <div className="muted text-sm">Sharpe <span className="opacity-60">({rangeKey}, RF=WIRON 1M)</span></div>
              <div className="text-3xl font-semibold tabular-nums">
                {Number.isFinite(sharpeAnn) ? sharpeAnn.toFixed(2) : "—"}
              </div>
              <div className="text-xs text-zinc-400">
                RF (rocznie): {(rf.annual * 100).toFixed(2)}%{rf.asOf ? ` · ${rf.asOf}` : ""}
              </div>
            </div>
          </div>
        </section>

        {/* Benchmarki + eksport */}
        <section className="flex items-center flex-wrap gap-2 mb-2">
          <span className="muted text-sm">Benchmark:</span>

          {selectedBenches.map((k) => {
            const def = BENCHES.find((b) => b.key === k);
            const custom = customDefs.find((d) => d.key === k);
            const label = custom?.label || def?.label || k;
            return (
              <span
                key={k}
                className="px-2.5 py-1.5 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-100 text-sm inline-flex items-center gap-2"
                title={[
                  Number.isFinite(benchCAGR[k]) ? `CAGR (${rangeKey}): ${(benchCAGR[k]*100).toFixed(2)}%` : (benchMeta[k]?.noData ? "Brak danych" : ""),
                  benchMeta[k]?.used ? `Źródło: ${benchMeta[k]?.used}` : "",
                  benchMeta[k]?.disclaimer ? benchMeta[k]?.disclaimer : "",
                ].filter(Boolean).join(" • ")}
              >
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: benchColorMap[k] }} />
                {label}
                {benchMeta[k]?.noData ? <span className="text-orange-300">⚠︎</span> : null}
                <button
                  className="ml-1 text-zinc-400 hover:text-zinc-200"
                  onClick={() => setSelectedBenches((prev) => prev.filter((x) => x !== k))}
                  aria-label={`Usuń ${label}`}
                >
                  ✕
                </button>
              </span>
            );
          })}

          <button
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 hover:bg-zinc-800"
            onClick={() => setShowBenchMgr(true)}
          >
            Zmień benchmarki…
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 hover:bg-zinc-800"
              onClick={() => {
                const rows = [["date", "portfolio_value_pln"], ...valueSeriesChart.map((p) => [p.t, String(p.value)])];
                const csv = rows.map((r) => r.join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "portfolio_values.csv"; a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Eksport wartości (CSV)
            </button>

            <button
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 hover:bg-zinc-800"
              onClick={() => {
                const keys = Object.keys(benchSeries);
                const header = ["date", ...keys.map((k) => `${k}_pct`)];
                const rows = [header];
                for (const row of chartSeries.data) {
                  const r = [row.t];
                  for (const k of keys) r.push(row[`${k}Pct`] == null ? "" : Number(row[`${k}Pct`]).toFixed(4));
                  rows.push(r);
                }
                const csv = rows.map((r) => r.join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "benchmarks_pct.csv"; a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Eksport benchmarków (CSV)
            </button>
          </div>
        </section>

        {/* DISCLAIMER / źródła danych */}
        <section className="w-full mt-2">
          <div className="text-[11px] leading-snug text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded-lg p-2">
            {(() => {
              const used = Array.from(new Set(Object.keys(benchMeta || {}).map(k => benchMeta[k]?.used).filter(Boolean)));
              const txt = getLegalAttribution({ mode: "dev", used });
              return (<><span className="font-medium">Informacja o danych:</span> {txt}</>);
            })()}
          </div>
        </section>

        {/* Wykres wartości / % */}
        <section className="card mb-4">
          <div className="card-inner">
            <h3 className="h2 mb-2">
              {valueMode === "PLN" ? "Wartość portfela (PLN)" : "Zmiana od początku zakresu (%)"}
            </h3>
            <div className="w-full h-72">
              <ResponsiveContainer>
                {valueMode === "PLN" ? (
                  <AreaChart data={chartSeries.data}>
                    <defs>
                      <linearGradient id="valFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PORTFOLIO_COLOR} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={PORTFOLIO_COLOR} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="t" tick={{ fontSize: 12 }} minTickGap={28} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => new Intl.NumberFormat("pl-PL").format(v)} width={70} />
                    <Tooltip formatter={(v) => fmtPLN(v)} labelFormatter={(l) => l} />
                    {/* PORTFEL */}
                    <Area type="monotone" dataKey="value" stroke={PORTFOLIO_COLOR} strokeWidth={2.5} fillOpacity={1} fill="url(#valFill)" />
                    {/* BENCHMARKI */}
                    {Object.keys(benchSeries).map((k) => (
                      <Line key={k} type="monotone" dataKey={k} strokeWidth={2} dot={false} stroke={benchColorMap[k]} />
                    ))}
                    <Legend
                      formatter={legendLabelFormatter}
                      iconType="plainline"
                      wrapperStyle={{ color: "#e5e7eb" }}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={chartSeries.data}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="t" tick={{ fontSize: 12 }} minTickGap={28} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Number(v||0).toFixed(0)}%`} width={60} />
                    <Tooltip formatter={(v) => v == null ? "—" : `${Number(v).toFixed(2)}%`} labelFormatter={(l) => l} />
                    {/* PORTFEL */}
                    <Line type="monotone" dataKey="valuePct" stroke={PORTFOLIO_COLOR} strokeWidth={2.5} dot={false} />
                    {/* BENCHMARKI */}
                    {Object.keys(benchSeries).map((k) => (
                      <Line key={k} type="monotone" dataKey={`${k}Pct`} strokeWidth={2} dot={false} stroke={benchColorMap[k]} />
                    ))}
                    <Legend
                      formatter={legendLabelFormatter}
                      iconType="plainline"
                      wrapperStyle={{ color: "#e5e7eb" }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Skumulowana stopa zwrotu */}
        <section className="card mt-4">
          <div className="card-inner">
            <h3 className="h2 mb-2">Skumulowana stopa zwrotu (zakres: {rangeKey})</h3>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <LineChart data={cumCurve}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="t" tick={{ fontSize: 12 }} minTickGap={28} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Number(v||0).toFixed(0)}%`} width={60} />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} labelFormatter={(l) => l} />
                  <Line type="monotone" dataKey="cum" strokeWidth={2.5} dot={false} stroke={PORTFOLIO_COLOR} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Skład portfela — Twoja wersja z zakładkami */}
        <section className="mt-4">
          <PortfolioComposition
            groups={groupsForComposition}
            totalValue={lastValueNow}
            metaBySymbol={metaBySymbol}
          />
        </section>
        {/* Dywidendy */}
        <DividendsSection
          uid={user?.uid}
          portfolioId={currentPortfolioId}
          currentPortfolioValuePLN={lastValueNow}
        />
      </>
    )}
  </main>
  );
}
