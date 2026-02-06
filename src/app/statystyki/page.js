"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* === auth + UI === */
import { useAuth } from "../components/AuthProvider";
import PortfolioSwitcher from "../components/PortfolioSwitcher";
import PortfolioComposition from "../components/PortfolioComposition";
import DividendsSection from "../components/DividendsSection.hidden";
import MonthlyPnLBarChart from "../components/MonthlyPnLBarChart";
import { getDemoStats } from "../../lib/demo/statsDemoEngine";

/* === Firestore === */
import {
  listenHoldings,
  listenCashBalance,
  autoBackfillBuyFlowsIfNeeded,
  autoBackfillDepositsIfNeeded,
} from "../../lib/portfolioStore";

/* 🔹 LISTA PORTFELI – jak w Mój Portfel */
import { listenPortfolios } from "../../lib/portfolios";

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

const ALL_PORTFOLIO_ID = "__ALL__";

/* ==== utils ==== */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(v)) ? Number(v) : 0);

const fmtPct = (v) => `${Number(v || 0).toFixed(2)}%`;

const numOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

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
    case "1mo":
      dt.setMonth(m - 1);
      return isoLocal(dt);
    case "3mo":
      dt.setMonth(m - 3);
      return isoLocal(dt);
    case "6mo":
      dt.setMonth(m - 6);
      return isoLocal(dt);
    case "ytd":
      return isoLocal(new Date(y, 0, 1));
    case "1y":
      dt.setFullYear(y - 1);
      return isoLocal(dt);
    case "5y":
      dt.setFullYear(y - 5);
      return isoLocal(dt);
    case "max":
      return null;
    default:
      dt.setFullYear(y - 1);
      return isoLocal(dt);
  }
}
function buildDailyAxis(startISO, endISO) {
  if (!startISO || !endISO || startISO > endISO) return [];
  const out = [];
  const s = new Date(startISO + "T00:00:00Z");
  const e = new Date(endISO + "T00:00:00Z");
  for (let t = s; t <= e; t.setUTCDate(t.getUTCDate() + 1)) {
    out.push(t.toISOString().slice(0, 10));
  }
  return out;
}
// prosty downsampling po dacie (np. co 7 dni dla długich zakresów)
function downsampleDays(rows = [], everyNDays = 7) {
  if (!Array.isArray(rows) || rows.length <= everyNDays) return rows;
  const out = [];
  let last = null;
  for (const r of rows) {
    if (!last) {
      out.push(r);
      last = r.t;
      continue;
    }
    const dLast = new Date(last);
    const dCur = new Date(r.t);
    const diff = Math.floor((dCur - dLast) / (24 * 3600 * 1000));
    if (diff >= everyNDays) {
      out.push(r);
      last = r.t;
    }
  }
  const lastOut = out[out.length - 1]?.t;
  const lastIn = rows[rows.length - 1]?.t;
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
  let peak = 0,
    mdd = 0;
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

/* ===== GOTÓWKA ===== */
function buildCashBalanceAligned(axisDays = [], flows = [], endBalance = 0) {
  if (!Array.isArray(axisDays) || axisDays.length === 0) return [];
  const start = axisDays[0];
  const end = axisDays[axisDays.length - 1];

  const perDay = new Map();
  for (const f of flows || []) {
    if (f?.storno) continue;
    const d = toDayISO(f?.date);
    if (!d) continue;
    if (d < start || d > end) continue;
    const amt = Number(f?.amount);
    if (!Number.isFinite(amt)) continue;
    perDay.set(d, (perDay.get(d) || 0) + amt);
  }

  const sumInAxis = Array.from(perDay.values()).reduce((a, b) => a + (Number(b) || 0), 0);
  const endBal = Number(endBalance) || 0;
  const init = endBal - sumInAxis;

  let bal = init;
  return axisDays.map((d) => {
    bal += Number(perDay.get(d) || 0);
    return { t: d, value: bal };
  });
}

/* ===================== Tooltip z X (mobile) ===================== */
function CloseableTooltip({ active, payload, label, formatValue, formatName, onClose }) {
  if (!active || !payload?.length) return null;

  const rows = (payload || []).filter((p) => p && p.value != null);

  return (
    <div className="relative rounded-xl border border-zinc-700 bg-zinc-950/95 px-4 py-3 text-sm text-zinc-100 shadow-lg max-w-[88vw] sm:max-w-none break-words">
      {typeof onClose === "function" ? (
        <button
          type="button"
          className="sm:hidden absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200 active:scale-[0.98]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          aria-label="Zamknij"
        >
          ✕
        </button>
      ) : null}

      <div className="text-base font-semibold mb-2 pr-8">{label}</div>

      <div className="space-y-1">
        {rows.map((p, idx) => {
          const color = p.color || p.stroke || "#eab308";
          const name = formatName ? formatName(p) : p.name || p.dataKey;
          const val = formatValue ? formatValue(p.value, p) : String(p.value);
          return (
            <div key={`${p.dataKey || p.name || "r"}-${idx}`} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="truncate">{name}</span>
              </div>
              <span className="tabular-nums font-semibold">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== DEMO ===== */
function DemoStats() {
  const { signIn } = useAuth();

  // ✅ DEMO: tylko 1R
  const [rangeKey] = useState("1R");
  const [valueMode, setValueMode] = useState("PCT");

  // ✅ X zamyka tooltip na mobile (remount chart)
  const [demoChartNonce, setDemoChartNonce] = useState(0);
  const closeDemoTooltip = () => setDemoChartNonce((n) => n + 1);

  const demoBase = useMemo(() => getDemoStats(rangeKey), [rangeKey]);

  const rfAnnualPct = 3;
  const rfDaily = Math.pow(1 + rfAnnualPct / 100, 1 / 252) - 1;

  const DEMO_BENCHES = useMemo(
    () => [
      { key: "WIG20TR", label: "WIG20 (ETF WIG20TR)", color: "#60a5fa", target: 0.11 },
      { key: "SP500TR", label: "S&P 500 (SPY, proxy TR)", color: "#22c55e", target: 0.15 },
      { key: "ACWI", label: "MSCI ACWI (ACW)", color: "#06b6d4", target: 0.12 },
      { key: "NASDAQ", label: "NASDAQ-100 (QQQ)", color: "#a78bfa", target: 0.17 },
    ],
    []
  );

  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

  function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const dates = useMemo(() => {
    const src = Array.isArray(demoBase?.valueSeriesChart) ? demoBase.valueSeriesChart : [];
    const axis = src.map((p) => p?.t).filter(Boolean);

    if (axis.length < 2) {
      const r = RANGES.find((x) => x.key === rangeKey) || RANGES[4];
      const start = startISOForRange(r.range);
      const end = isoLocal(new Date());
      const built = start ? buildDailyAxis(start, end) : [];
      return built.length ? built : axis;
    }

    return axis;
  }, [demoBase, rangeKey]);

  const demoTargets = useMemo(
    () => ({
      "1M": 0.03,
      "3M": 0.06,
      "6M": 0.09,
      YTD: 0.13,
      "1R": 0.13,
      "5L": 0.55,
      MAX: 0.75,
    }),
    []
  );

  const demoSeries = useMemo(() => {
    const n = dates.length;
    const lastBase =
      Array.isArray(demoBase?.valueSeriesChart) && demoBase.valueSeriesChart.length
        ? Number(demoBase.valueSeriesChart[demoBase.valueSeriesChart.length - 1].value) || 22336
        : 22336;

    if (n < 2) {
      return {
        values: [{ t: isoLocal(new Date()), value: lastBase }],
        daily: [],
        periodReturn: 0,
        dailyChange: 0,
        dailyProfit: 0,
        monthsPlusMinus: { plus: 0, minus: 0 },
        winRate: 0,
        volatility: 0,
        sharpe: null,
        maxDrawdown: 0,
        cagrLifetime: 0,
      };
    }

    const targetTotal = demoTargets[rangeKey] ?? 0.13;
    const firstWanted = lastBase / (1 + targetTotal);

    const seed = hashSeed(`demo:${rangeKey}:${n}`);
    const rand = mulberry32(seed);

    const drift = Math.pow(1 + targetTotal, 1 / (n - 1)) - 1;
    const vol = clamp(0.010 + (n < 60 ? 0.004 : 0), 0.008, 0.018);

    const values = [];
    let v = firstWanted;

    values.push({ t: dates[0], value: v });

    for (let i = 1; i < n; i++) {
      const w1 = Math.sin((2 * Math.PI * i) / 14);
      const w2 = Math.sin((2 * Math.PI * i) / 47);
      const noise = (rand() - 0.5) * vol;

      const r = clamp(drift + 0.006 * w1 + 0.004 * w2 + noise, -0.035, 0.035);

      v = v * (1 + r);
      values.push({ t: dates[i], value: v });
    }

    const lastGen = values[values.length - 1]?.value || lastBase;
    const k = lastGen > 0 ? lastBase / lastGen : 1;
    const scaled = values.map((p) => ({ t: p.t, value: p.value * k }));

    const daily = [];
    for (let i = 1; i < scaled.length; i++) {
      const prev = scaled[i - 1].value;
      const cur = scaled[i].value;
      const r = prev > 0 ? cur / prev - 1 : 0;
      daily.push({ t: scaled[i].t, r });
    }
    const dailyR = daily.map((d) => Number(d.r) || 0);

    const periodReturn = scaled[0]?.value > 0 ? scaled[scaled.length - 1].value / scaled[0].value - 1 : 0;
    const dailyChange = dailyR.length ? dailyR[dailyR.length - 1] : 0;
    const dailyProfit =
      scaled.length >= 2 ? (scaled[scaled.length - 1].value - scaled[scaled.length - 2].value) || 0 : 0;

    const byMonth = new Map();
    for (const d of daily) {
      const ym = String(d.t || "").slice(0, 7);
      const r = Number(d.r) || 0;
      byMonth.set(ym, (byMonth.get(ym) || 1) * (1 + r));
    }
    let plus = 0,
      minus = 0;
    byMonth.forEach((mult) => {
      const ret = mult - 1;
      if (ret > 0) plus += 1;
      else if (ret < 0) minus += 1;
    });

    const wins = dailyR.filter((x) => x > 0).length;
    const winRate = dailyR.length ? wins / dailyR.length : 0;

    let volatility = 0;
    let sharpe = null;
    if (dailyR.length > 1) {
      const nR = dailyR.length;
      const mean = dailyR.reduce((a, b) => a + b, 0) / nR;
      const varSum = dailyR.reduce((a, b) => a + (b - mean) * (b - mean), 0);
      const s = Math.sqrt(varSum / (nR - 1));
      volatility = s * Math.sqrt(252);
      if (s > 0) sharpe = ((mean - (Number(rfDaily) || 0)) / s) * Math.sqrt(252);
    }

    const maxDrawdown = computeMaxDrawdown(scaled);
    const nDays = Math.max(0, scaled.length - 1);
    const cagrLifetime = computeCAGRFromDaily(dailyR, nDays);

    return {
      values: scaled,
      daily,
      periodReturn,
      dailyChange,
      dailyProfit,
      monthsPlusMinus: { plus, minus },
      winRate,
      volatility,
      sharpe,
      maxDrawdown,
      cagrLifetime,
    };
  }, [dates, demoBase, rangeKey, demoTargets, rfDaily]);

  const lastValueNow = demoSeries.values.length ? demoSeries.values[demoSeries.values.length - 1].value : 0;
  const firstValue = demoSeries.values.length ? demoSeries.values[0].value : 0;

  const benchesPct = useMemo(() => {
    const n = dates.length;
    if (n < 2) return {};

    const seed = hashSeed(`benches:${rangeKey}:${n}`);
    const rand = mulberry32(seed);

    const pR = (demoSeries.daily || []).map((d) => Number(d.r) || 0);
    const out = {};

    for (const b of DEMO_BENCHES) {
      const target = Number(b.target) || 0.12;
      const drift = Math.pow(1 + target, 1 / (n - 1)) - 1;
      const beta = 0.55;

      let v = 100;
      const series = [{ t: dates[0], close: v }];

      const pMean = pR.reduce((a, x) => a + x, 0) / Math.max(1, pR.length);

      for (let i = 1; i < n; i++) {
        const pr = pR[i - 1] ?? 0;
        const noise = (rand() - 0.5) * 0.010;

        const r = clamp(drift + beta * (pr - pMean) + noise, -0.04, 0.04);
        v = v * (1 + r);
        series.push({ t: dates[i], close: v });
      }

      const ref = series[0]?.close || 100;
      out[b.key] = series.map((p) => ({
        t: p.t,
        pct: ref ? (p.close / ref - 1) * 100 : 0,
      }));
    }

    return out;
  }, [dates, rangeKey, demoSeries.daily, DEMO_BENCHES]);

  const chartDataPLN = useMemo(
    () =>
      demoSeries.values.map((p) => ({
        t: p.t,
        value: p.value,
      })),
    [demoSeries.values]
  );

  const chartDataPct = useMemo(() => {
    const n = dates.length;
    if (!n) return [];

    const base = [];
    for (let i = 0; i < n; i++) {
      const t = dates[i];
      const val = demoSeries.values[i]?.value ?? null;
      const valuePct = firstValue ? ((val || 0) / firstValue - 1) * 100 : 0;

      const row = { t, valuePct };

      for (const b of DEMO_BENCHES) {
        const arr = benchesPct[b.key] || [];
        row[`${b.key}Pct`] = Number.isFinite(arr[i]?.pct) ? arr[i].pct : null;
      }

      base.push(row);
    }
    return base;
  }, [dates, demoSeries.values, firstValue, benchesPct, DEMO_BENCHES]);

  const demoGroups = useMemo(() => {
    const total = Number(lastValueNow) || 0;
    const weights = [
      { key: "KRU.WA", name: "KRUK", w: 0.34 },
      { key: "PKN.WA", name: "PKNORLEN", w: 0.31 },
      { key: "PZU.WA", name: "PZU", w: 0.19 },
      { key: "XTB.WA", name: "XTB", w: 0.16 },
    ];
    const rows = weights.map((x) => ({
      key: x.key,
      name: x.name,
      pair: { yahoo: x.key },
      value: total * x.w,
    }));
    const sum = rows.reduce((a, b) => a + (Number(b.value) || 0), 0);
    const diff = total - sum;
    if (rows.length) rows[rows.length - 1].value += diff;
    return rows.sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [lastValueNow]);

  const demoMetaBySymbol = useMemo(
    () => ({
      "KRU.WA": { assetClass: "Akcje", sector: "Finanse", country: "Polska" },
      "PKN.WA": { assetClass: "Akcje", sector: "Energia", country: "Polska" },
      "PZU.WA": { assetClass: "Akcje", sector: "Finanse", country: "Polska" },
      "XTB.WA": { assetClass: "Akcje", sector: "Finanse", country: "Polska" },
    }),
    []
  );

  return (
    <>
      {/* Nagłówek demo + CTA */}
      <section className="text-center mt-8 mb-6">
        <h1 className="h1">Statystyki — tryb demo</h1>
        <p className="muted text-sm max-w-xl mx-auto">
          To jest przykładowy przegląd statystyk dla portfela demo. Po
          zalogowaniu zobaczysz swoje prawdziwe wyniki w identycznym układzie.
        </p>
        <button className="btn-primary inline-flex px-5 py-2 text-sm mt-4" onClick={signIn}>
          Zaloguj się i podepnij swój portfel
        </button>
      </section>

      {/* KPI – lifetime (kompakt na mobile) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <div className="card">
          <div className="card-inner !p-3 sm:!p-5">
            <div className="muted text-xs sm:text-sm">Śr. roczna stopa zwrotu (CAGR)</div>
            <div
              className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                demoSeries.cagrLifetime >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {fmtPct((demoSeries.cagrLifetime || 0) * 100)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner !p-3 sm:!p-5">
            <div className="muted text-xs sm:text-sm">Wartość portfela (teraz)</div>
            <div className="text-2xl sm:text-3xl font-semibold tabular-nums">{fmtPLN(lastValueNow)}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner !p-3 sm:!p-5">
            <div className="muted text-xs sm:text-sm">Całkowity zysk (od startu)</div>
            <div
              className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                lastValueNow - firstValue >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {fmtPLN(lastValueNow - firstValue)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner !p-3 sm:!p-5">
            <div className="muted text-xs sm:text-sm">Max Drawdown (od startu)</div>
            <div className="text-2xl sm:text-3xl font-semibold tabular-nums text-red-400">
              {fmtPct((demoSeries.maxDrawdown || 0) * 100)}
            </div>
          </div>
        </div>
      </section>

      {/* KPI okresowe (kompakt na mobile) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4 mb-4">
        <div className="card">
          <div className="card-inner !p-3 sm:!p-5">
            <div className="muted text-xs sm:text-sm">
              Zwrot w okresie <span className="opacity-60">({rangeKey})</span>
            </div>
            <div
              className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                demoSeries.periodReturn >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {fmtPct((demoSeries.periodReturn || 0) * 100)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner !p-3 sm:!p-5">
            <div className="muted text-xs sm:text-sm">
              Zmiana dzienna <span className="opacity-60">({rangeKey})</span>
            </div>
            <div
              className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                demoSeries.dailyChange >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {fmtPct((demoSeries.dailyChange || 0) * 100)}
            </div>
            <div className="text-[11px] text-zinc-400">Czysty dzienny zwrot</div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner !p-3 sm:!p-5">
            <div className="muted text-xs sm:text-sm">
              Zysk dzienny <span className="opacity-60">({rangeKey})</span>
            </div>
            <div
              className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                demoSeries.dailyProfit >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {fmtPLN(demoSeries.dailyProfit)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner !p-3 sm:!p-5">
            <div className="muted text-xs sm:text-sm">
              Miesiące + / − <span className="opacity-60">({rangeKey})</span>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold tabular-nums">
              <span className="text-emerald-400">{demoSeries.monthsPlusMinus.plus}</span>
              {" / "}
              <span className="text-red-400">{demoSeries.monthsPlusMinus.minus}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner !p-3 sm:!p-5">
            <div className="muted text-xs sm:text-sm">
              Skuteczność dni <span className="opacity-60">({rangeKey})</span>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold tabular-nums">
              {fmtPct((demoSeries.winRate || 0) * 100)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner !p-3 sm:!p-5">
            <div className="muted text-xs sm:text-sm">
              Zmienność roczna <span className="opacity-60">({rangeKey})</span>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold tabular-nums">
              {fmtPct((demoSeries.volatility || 0) * 100)}
            </div>
            <div className="text-[11px] text-zinc-400">Odchylenie dzienne × √252</div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner !p-3 sm:!p-5">
            <div className="muted text-xs sm:text-sm">
              Sharpe{" "}
              <span className="opacity-60">
                ({rangeKey}, RF≈{rfAnnualPct}%)
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold tabular-nums">
              {Number.isFinite(demoSeries.sharpe) ? demoSeries.sharpe.toFixed(2) : "—"}
            </div>
            <div className="text-[11px] text-zinc-400">Przybliżony Sharpe dla portfela demo</div>
          </div>
        </div>
      </section>

      {/* Wykres wartości / % + sterowanie wykresem */}
      <section className="card mb-4">
        <div className="card-inner !p-2 sm:!p-5">
          <h3 className="h2 mb-2">
            {valueMode === "PLN" ? "Wartość portfela (PLN)" : "Zmiana od początku zakresu (%)"}
          </h3>

          {/* ✅ DEMO: tylko 1R */}
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-400">Zakres (DEMO)</span>
              <span className="px-2.5 py-1 rounded-lg border text-xs sm:text-sm bg-yellow-600/70 border-yellow-500 text-black">
                1R
              </span>
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
              <div className="inline-flex rounded-lg overflow-hidden border border-zinc-700">
                {["PLN", "PCT"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setValueMode(m)}
                    className={[
                      "px-3 py-1.5 text-xs sm:text-sm",
                      valueMode === m
                        ? "bg-yellow-600/70 text-black"
                        : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    {m === "PLN" ? "PLN" : "%"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {valueMode === "PCT" ? (
            <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-zinc-400">
              <span>Benchmarki (DEMO):</span>
              {DEMO_BENCHES.map((b) => (
                <span key={b.key} className="inline-flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
                  {b.label}
                </span>
              ))}
            </div>
          ) : null}

          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer>
              {valueMode === "PLN" ? (
                <AreaChart
                  key={`demo-pln-${demoChartNonce}`}
                  data={chartDataPLN}
                  margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="demoValFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#eab308" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#eab308" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="t" tick={{ fontSize: 11 }} minTickGap={22} interval="preserveStartEnd" padding={{ left: 0, right: 0 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => new Intl.NumberFormat("pl-PL").format(v)} width={70} />
                  <Tooltip
                    wrapperStyle={{ zIndex: 60, outline: "none" }}
                    allowEscapeViewBox={{ x: false, y: false }}
                    content={(props) => (
                      <CloseableTooltip
                        {...props}
                        onClose={closeDemoTooltip}
                        formatValue={(v) => fmtPLN(v)}
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#eab308"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#demoValFill)"
                    name="Portfel (demo)"
                  />
                </AreaChart>
              ) : (
                <LineChart
                  key={`demo-pct-${demoChartNonce}`}
                  data={chartDataPct}
                  margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="t" tick={{ fontSize: 11 }} minTickGap={22} interval="preserveStartEnd" padding={{ left: 0, right: 0 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Number(v || 0).toFixed(0)}%`} width={60} />
                  <Tooltip
                    wrapperStyle={{ zIndex: 60, outline: "none" }}
                    allowEscapeViewBox={{ x: false, y: false }}
                    content={(props) => (
                      <CloseableTooltip
                        {...props}
                        onClose={closeDemoTooltip}
                        formatValue={(v) => (v == null ? "—" : `${Number(v).toFixed(2)}%`)}
                      />
                    )}
                  />
                  <Line type="monotone" dataKey="valuePct" stroke="#eab308" strokeWidth={2.5} dot={false} name="Portfel (demo)" />
                  {DEMO_BENCHES.map((b) => (
                    <Line
                      key={b.key}
                      type="monotone"
                      dataKey={`${b.key}Pct`}
                      stroke={b.color}
                      strokeWidth={2}
                      dot={false}
                      name={b.label}
                    />
                  ))}
                  {/* ✅ DEMO: legenda wyłączona (masz listę benchmarków nad wykresem) */}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ✅ DEMO: słupki tylko 1R */}
      <MonthlyPnLBarChart
        title="Zyski/Straty miesięczne"
        axisDays={dates}
        valuesAligned={demoSeries.values}
        dailyReturns={demoSeries.daily}
        defaultRange="1R"
        defaultMode="PLN"
        rangeOptions={["1R"]}
      />

      {/* Skład portfela (DEMO) */}
      <section className="mt-4">
        <PortfolioComposition groups={demoGroups} totalValue={lastValueNow} metaBySymbol={demoMetaBySymbol} />
      </section>
    </>
  );
}

/* ================== PAGE ================== */
export default function Page() {
  const { user, signOut } = useAuth();

  const [currentPortfolioId, setCurrentPortfolioId] = useState(null);

  const portfolioIdForFirestore =
    currentPortfolioId === ALL_PORTFOLIO_ID ? null : currentPortfolioId;

  const [holdings, setHoldings] = useState([]);
  const [cash, setCash] = useState({ balance: 0, flows: [] });

  const [portfolioList, setPortfolioList] = useState([]);

  const [rangeKey, setRangeKey] = useState("YTD");
  const currentRange = useMemo(
    () => RANGES.find((r) => r.key === rangeKey) || RANGES[3],
    [rangeKey]
  );

  const [seriesByIdDaily, setSeriesByIdDaily] = useState({});

  // benchmarki
  const [selectedBenches, setSelectedBenches] = useState([
    "WIG20",
    "SP500TR",
    "ACWI",
  ]);
  const [benchSeries, setBenchSeries] = useState({});
  const [benchSeriesRaw, setBenchSeriesRaw] = useState({});
  const [benchMeta, setBenchMeta] = useState({});

  const [customDefs, setCustomDefs] = useState([]);
  const [showBenchMgr, setShowBenchMgr] = useState(false);

  const [valueMode, setValueMode] = useState("PCT");

  // ✅ X zamyka tooltip na mobile (remount chart)
  const [mainChartNonce, setMainChartNonce] = useState(0);
  const closeMainTooltip = () => setMainChartNonce((n) => n + 1);

  const [rf, setRf] = useState({
    daily: 0,
    annual: 0,
    asOf: null,
    source: "—",
  });

  const PORTFOLIO_COLOR = "#eab308";
  const BENCH_PALETTE = [
    "#60a5fa",
    "#22c55e",
    "#06b6d4",
    "#a78bfa",
    "#f97316",
    "#ef4444",
    "#14b8a6",
    "#93c5fd",
    "#f472b6",
  ];
  const benchColorMap = useMemo(() => {
    const map = {};
    (selectedBenches || []).forEach((k, i) => {
      map[k] = BENCH_PALETTE[i % BENCH_PALETTE.length];
    });
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

  /* ================= LISTA PORTFELI ================= */
  useEffect(() => {
    if (!user?.uid) {
      setPortfolioList([]);
      return;
    }
    const unsub = listenPortfolios(user.uid, (items) => {
      setPortfolioList(Array.isArray(items) ? items.filter(Boolean) : []);
    });
    return () => unsub?.();
  }, [user?.uid]);

  /* Auto-backfill */
  useEffect(() => {
    if (!user) return;
    if (currentPortfolioId === ALL_PORTFOLIO_ID) return;
    (async () => {
      try {
        await autoBackfillBuyFlowsIfNeeded(user.uid, portfolioIdForFirestore);
      } catch {}
      try {
        await autoBackfillDepositsIfNeeded(user.uid, portfolioIdForFirestore);
      } catch {}
    })();
  }, [user, portfolioIdForFirestore, currentPortfolioId]);

  /* RF */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/riskfree", { cache: "no-store" });
        const j = r.ok ? await r.json() : null;
        if (alive && j && Number.isFinite(j.daily)) {
          setRf({
            daily: j.daily,
            annual: j.annual,
            asOf: j.asOf || null,
            source: j.source || "WIRON 1M",
          });
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ================= HOLDINGS – SINGLE vs ALL ================= */
  useEffect(() => {
    if (!user?.uid) {
      setHoldings([]);
      return;
    }

    if (currentPortfolioId === ALL_PORTFOLIO_ID) {
      const unsubs = [];
      const mapByPid = new Map();

      const emit = () => {
        const merged = [];
        for (const [pid, rows] of mapByPid.entries()) {
          for (const r of rows || []) {
            merged.push({
              ...r,
              id: `${pid || "MAIN"}__${r.id}`,
              __origin: pid || null,
            });
          }
        }
        setHoldings(merged);
      };

      const attach = (pid) => {
        const off = pid
          ? listenHoldings(user.uid, pid, (rows) => {
              mapByPid.set(pid, rows || []);
              emit();
            })
          : listenHoldings(user.uid, (rows) => {
              mapByPid.set(null, rows || []);
              emit();
            });
        if (typeof off === "function") unsubs.push(off);
      };

      attach(null);
      const ids = (portfolioList || []).map((p) => p?.id).filter(Boolean);
      Array.from(new Set(ids)).forEach(attach);

      return () => {
        unsubs.forEach((u) => {
          try {
            u();
          } catch {}
        });
      };
    }

    const unsub = portfolioIdForFirestore
      ? listenHoldings(user.uid, portfolioIdForFirestore, (rows) => setHoldings(rows))
      : listenHoldings(user.uid, (rows) => setHoldings(rows));
    return () => unsub?.();
  }, [user?.uid, currentPortfolioId, portfolioIdForFirestore, portfolioList]);

  /* ================= CASH – SINGLE vs ALL ================= */
  useEffect(() => {
    if (!user?.uid) {
      setCash({ balance: 0, flows: [] });
      return;
    }

    if (currentPortfolioId === ALL_PORTFOLIO_ID) {
      const unsubs = [];
      const mapByPid = new Map();

      const emit = () => {
        let balance = 0;
        const flowsMerged = [];
        for (const [pid, info] of mapByPid.entries()) {
          const val = info || { balance: 0, flows: [] };
          balance += Number(val.balance) || 0;
          for (const f of val.flows || []) {
            flowsMerged.push({
              ...f,
              id: `${pid || "MAIN"}__${f.id}`,
              __origin: pid || null,
            });
          }
        }
        setCash({ balance, flows: flowsMerged });
      };

      const attach = (pid) => {
        const off = pid
          ? listenCashBalance(user.uid, pid, (info) => {
              mapByPid.set(pid, info || { balance: 0, flows: [] });
              emit();
            })
          : listenCashBalance(user.uid, (info) => {
              mapByPid.set(null, info || { balance: 0, flows: [] });
              emit();
            });
        if (typeof off === "function") unsubs.push(off);
      };

      attach(null);
      const ids = (portfolioList || []).map((p) => p?.id).filter(Boolean);
      Array.from(new Set(ids)).forEach(attach);

      return () => {
        unsubs.forEach((u) => {
          try {
            u();
          } catch {}
        });
      };
    }

    const unsub = portfolioIdForFirestore
      ? listenCashBalance(user.uid, portfolioIdForFirestore, (info) => setCash(info || { balance: 0, flows: [] }))
      : listenCashBalance(user.uid, (info) => setCash(info || { balance: 0, flows: [] }));
    return () => unsub?.();
  }, [user?.uid, currentPortfolioId, portfolioIdForFirestore, portfolioList]);

  const activeSinceISO = useMemo(
    () => firstActiveISO(holdings, cash?.flows || []),
    [holdings, cash?.flows]
  );

  const historyRange = useMemo(() => {
    const top = String(currentRange?.range || "1y").toLowerCase();

    if (top === "5y" || top === "max") return top;

    if (!activeSinceISO) return "1y";

    const now = new Date();
    const since = new Date(activeSinceISO + "T00:00:00Z");
    const days = Math.floor((now - since) / (24 * 3600 * 1000));

    if (days > 365 * 5) return "max";
    if (days > 365) return "5y";
    return "1y";
  }, [currentRange?.range, activeSinceISO]);

  /* Historia – JEDEN fetch */
  useEffect(() => {
    if (!holdings.length) {
      setSeriesByIdDaily({});
      return;
    }
    const controller = new AbortController();
    histDailyAbortRef.current?.abort();
    histDailyAbortRef.current = controller;

    (async () => {
      try {
        const items = holdings.map((h) => ({
          id: h.id,
          shares: Number(h.shares) || 0,
          pair: ensurePairMappings(h.pair || { yahoo: h?.pair?.yahoo || h?.name }),
        }));
        const symbols = Array.from(
          new Set(
            items
              .map((it) => String(it.pair?.yahoo || "").toUpperCase())
              .filter(Boolean)
          )
        );

        const r = await fetch("/api/history/bulk", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            symbols,
            range: historyRange,
            interval: "1d",
          }),
          signal: controller.signal,
        });
        const j = r.ok ? await r.json().catch(() => ({})) : {};
        const results = j?.results || {};

        const byId = {};
        for (const it of items) {
          const y = String(it.pair?.yahoo || "").toUpperCase();
          const arr = Array.isArray(results[y]) ? results[y] : [];
          const hist = (arr || [])
            .map((p) => ({ t: p?.t, close: numOrNull(p?.close) }))
            .filter((p) => p.t && p.close != null);
          byId[it.id] = { history: hist, shares: it.shares };
        }

        if (mountedRef.current && !controller.signal.aborted) setSeriesByIdDaily(byId);
      } catch (e) {
        if (e?.name !== "AbortError") console.error("bulk daily history fetch err:", e);
      }
    })();

    return () => controller.abort();
  }, [holdings, historyRange]);

  /* ====== Serie wartości (AKCJE) ====== */
  const valueSeriesStocksRawDaily = useMemo(() => {
    if (!Object.keys(seriesByIdDaily).length) return [];
    return TWR.buildPortfolioValueSeries({
      seriesById: seriesByIdDaily,
      holdings,
    });
  }, [seriesByIdDaily, holdings]);

  const lifetimeSince = useMemo(
    () =>
      firstActiveISO(holdings, cash?.flows || []) ||
      (valueSeriesStocksRawDaily.find((v) => (v?.value || 0) > 0)?.t || null),
    [holdings, cash?.flows, valueSeriesStocksRawDaily]
  );
  const rawSinceISO = useMemo(() => startISOForRange(currentRange.range), [currentRange.range]);
  const effectiveSince = useMemo(() => {
    if (!rawSinceISO && !lifetimeSince) return null;
    if (!rawSinceISO) return lifetimeSince;
    if (!lifetimeSince) return rawSinceISO;
    return rawSinceISO > lifetimeSince ? rawSinceISO : lifetimeSince;
  }, [rawSinceISO, lifetimeSince]);
  const endISO = useMemo(() => isoLocal(new Date()), []);

  const axisDailyAll = useMemo(() => buildDailyAxis(lifetimeSince, endISO), [lifetimeSince, endISO]);
  const axisDaily = useMemo(() => buildDailyAxis(effectiveSince, endISO), [effectiveSince, endISO]);

  const valuesStocksAlignedAll = useMemo(() => {
    if (!axisDailyAll.length) return [];
    const map = new Map(valueSeriesStocksRawDaily.map((p) => [p.t, Number(p.value) || 0]));
    let last = null;
    return axisDailyAll.map((d) => {
      if (map.has(d)) last = Number(map.get(d)) || 0;
      return { t: d, value: last ?? 0 };
    });
  }, [valueSeriesStocksRawDaily, axisDailyAll]);

  const valuesCashAlignedAll = useMemo(
    () => buildCashBalanceAligned(axisDailyAll, cash?.flows || [], cash?.balance || 0),
    [axisDailyAll, cash?.flows, cash?.balance]
  );

  const valuesAlignedAll = useMemo(() => {
    if (!axisDailyAll.length) return [];
    const out = [];
    for (let i = 0; i < axisDailyAll.length; i++) {
      out.push({
        t: axisDailyAll[i],
        value: (Number(valuesStocksAlignedAll[i]?.value) || 0) + (Number(valuesCashAlignedAll[i]?.value) || 0),
      });
    }
    return out;
  }, [axisDailyAll, valuesStocksAlignedAll, valuesCashAlignedAll]);

  const valuesStocksAlignedDaily = useMemo(() => {
    if (!axisDaily.length) return [];
    const src = valueSeriesStocksRawDaily.filter((p) => (p?.t || "") >= (effectiveSince || "0000-01-01"));
    const map = new Map(src.map((p) => [p.t, Number(p.value) || 0]));
    let last = null;
    return axisDaily.map((d) => {
      if (map.has(d)) last = Number(map.get(d)) || 0;
      return { t: d, value: last ?? 0 };
    });
  }, [valueSeriesStocksRawDaily, axisDaily, effectiveSince]);

  const valuesCashAlignedDaily = useMemo(
    () => buildCashBalanceAligned(axisDaily, cash?.flows || [], cash?.balance || 0),
    [axisDaily, cash?.flows, cash?.balance]
  );

  const valuesAlignedDaily = useMemo(() => {
    if (!axisDaily.length) return [];
    const out = [];
    for (let i = 0; i < axisDaily.length; i++) {
      out.push({
        t: axisDaily[i],
        value: (Number(valuesStocksAlignedDaily[i]?.value) || 0) + (Number(valuesCashAlignedDaily[i]?.value) || 0),
      });
    }
    return out;
  }, [axisDaily, valuesStocksAlignedDaily, valuesCashAlignedDaily]);

  const valueSeriesChart = useMemo(() => {
    if (!valuesAlignedDaily.length) return [];
    if (rangeKey === "5L" || rangeKey === "MAX") return downsampleDays(valuesAlignedDaily, 7);
    return valuesAlignedDaily;
  }, [valuesAlignedDaily, rangeKey]);

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

  const rOutAll = useMemo(() => computeTWRSafe({ values: valuesAlignedAll, cashflows: cashPerDayAll }), [valuesAlignedAll, cashPerDayAll]);
  const rOut = useMemo(() => computeTWRSafe({ values: valuesAlignedDaily, cashflows: cashPerDay }), [valuesAlignedDaily, cashPerDay]);

  const dailyRAll = useMemo(() => (rOutAll.daily || []).map((d) => Number(d.r) || 0), [rOutAll.daily]);
  const dailyR = useMemo(() => (rOut.daily || []).map((d) => Number(d.r) || 0), [rOut.daily]);

  const portfolioValueNow = useMemo(
    () => (valuesAlignedAll.length ? valuesAlignedAll[valuesAlignedAll.length - 1].value : 0),
    [valuesAlignedAll]
  );
  const cashValueNow = useMemo(
    () => (valuesCashAlignedAll.length ? valuesCashAlignedAll[valuesCashAlignedAll.length - 1].value : (Number(cash?.balance) || 0)),
    [valuesCashAlignedAll, cash?.balance]
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
    return Vt - Vprev - cfToday || 0;
  }, [axisDaily, valuesAlignedDaily, cashPerDay]);

  const monthsPlusMinus = useMemo(() => {
    const byMonth = new Map();
    for (const d of rOut.daily || []) {
      const ym = String(d.t || "").slice(0, 7);
      const r = Number(d.r) || 0;
      byMonth.set(ym, (byMonth.get(ym) || 1) * (1 + r));
    }
    let plus = 0,
      minus = 0;
    byMonth.forEach((mult) => {
      const ret = mult - 1;
      if (ret > 0) plus += 1;
      else if (ret < 0) minus += 1;
    });
    return { plus, minus };
  }, [rOut.daily]);

  const winRate = useMemo(() => {
    const n = dailyR.length;
    if (!n) return 0;
    const wins = dailyR.filter((x) => x > 0).length;
    return wins / n;
  }, [dailyR]);

  const volAnn = useMemo(() => {
    const n = dailyR.length;
    if (n <= 1) return 0;
    const mean = dailyR.reduce((a, b) => a + b, 0) / n;
    const varSum = dailyR.reduce((a, b) => a + (b - mean) * (b - mean), 0);
    const s = Math.sqrt(varSum / (n - 1));
    return s * Math.sqrt(252);
  }, [dailyR]);

  const sharpeAnn = useMemo(() => {
    const n = dailyR.length;
    if (n <= 1) return null;
    const mean = dailyR.reduce((a, b) => a + b, 0) / n;
    const varSum = dailyR.reduce((a, b) => a + (b - mean) * (b - mean), 0);
    const s = Math.sqrt(varSum / (n - 1));
    if (!(s > 0)) return null;
    return ((mean - (Number(rf.daily) || 0)) / s) * Math.sqrt(252);
  }, [dailyR, rf.daily]);

  const twrCumByDate = useMemo(() => {
    const out = new Map();
    if (!axisDaily.length) return out;

    out.set(axisDaily[0], 0);
    const rMap = new Map((rOut.daily || []).map((d) => [d.t, Number(d.r) || 0]));

    let mult = 1;
    for (let i = 1; i < axisDaily.length; i++) {
      const d = axisDaily[i];
      const r = rMap.get(d) ?? 0;
      mult *= 1 + r;
      out.set(d, (mult - 1) * 100);
    }
    return out;
  }, [axisDaily, rOut.daily]);

  const daysAxisChart = useMemo(() => valueSeriesChart.map((x) => x.t), [valueSeriesChart]);

  useEffect(() => {
    if (selectedBenches.length > 0 && valueMode !== "PCT") setValueMode("PCT");
  }, [selectedBenches, valueMode]);

  useEffect(() => {
    const controller = new AbortController();
    benchAbortRef.current?.abort();
    benchAbortRef.current = controller;

    (async () => {
      try {
        if (!selectedBenches.length && !customDefs.length) {
          setBenchSeries({});
          setBenchSeriesRaw({});
          setBenchMeta({});
          return;
        }
        let rawByKey = {};
        let alignedByKey = {};
        let meta = {};

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
            let last = null;
            let seen = false;
            alignedByKey[c.key] = daysAxisChart.map((d) => {
              const v = numOrNull(map.get(d));
              if (v != null) {
                last = v;
                seen = true;
              }
              return { t: d, close: seen ? last ?? null : null };
            });

            const hasPositive = (hist || []).some((p) => numOrNull(p?.close) != null);
            meta[c.key] = {
              used: c.yahoo,
              noData: !hasPositive,
              custom: true,
              label: c.label,
            };
          } catch {
            rawByKey[c.key] = [];
            alignedByKey[c.key] = daysAxisChart.map((t) => ({ t, close: null }));
            meta[c.key] = {
              used: c.yahoo,
              noData: true,
              custom: true,
              label: c.label,
            };
          }
        }

        for (const k of Object.keys(rawByKey)) {
          const hasPos = (rawByKey[k] || []).some((p) => numOrNull(p?.close) != null);
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

  const chartSeries = useMemo(() => {
    const base = valueSeriesChart.map((row) => ({
      t: row.t,
      value: row.value,
    }));

    const mapsByKey = {};
    for (const k of Object.keys(benchSeries)) {
      const m = new Map();
      for (const p of benchSeries[k] || []) {
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
      const pctBase = base.map((row) => {
        const out = {
          t: row.t,
          valuePct: twrCumByDate.has(row.t) ? twrCumByDate.get(row.t) : null,
        };
        for (const k of Object.keys(mapsByKey)) {
          const arrRaw = benchSeriesRaw[k] || [];
          const ref = arrRaw.map((p) => numOrNull(p?.close)).find((v) => v != null) ?? 0;
          const val = row[k];
          out[`${k}Pct`] = val == null || !ref ? null : (val / ref - 1) * 100;
        }
        return out;
      });

      return { mode: "PCT", data: pctBase };
    }

    return { mode: "PLN", data: base };
  }, [valueSeriesChart, benchSeries, benchSeriesRaw, valueMode, twrCumByDate]);

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
  const tooltipNameFor = (p) => {
    const dk = String(p?.dataKey || "");
    if (dk === "value" || dk === "valuePct") return "Portfel";
    const key = dk.replace(/Pct$/, "");
    return benchLabel(key);
  };

  const isLoadingUser = user === undefined;
  const isLoggedIn = !!user;

  const groupsForComposition = useMemo(() => {
    const byKey = new Map();
    for (const h of holdings) {
      const sym = String(h?.pair?.yahoo || h?.name || "").toUpperCase();
      const lastClose = (seriesByIdDaily?.[h.id]?.history || []).slice(-1)[0]?.close ?? 0;
      const value = (Number(h?.shares) || 0) * (Number(lastClose) || 0);
      if (!byKey.has(sym)) {
        byKey.set(sym, {
          key: sym,
          name: h.name || sym,
          pair: h.pair || {},
          value: 0,
        });
      }
      byKey.get(sym).value += value;
    }
    return Array.from(byKey.values()).sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [holdings, seriesByIdDaily]);

  const holdingsValueNow = useMemo(
    () => (groupsForComposition || []).reduce((a, g) => a + (Number(g?.value) || 0), 0),
    [groupsForComposition]
  );

  const metaBySymbol = useMemo(
    () => (composition.buildMetaBySymbol ? composition.buildMetaBySymbol(holdings) : {}),
    [holdings]
  );

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <section className="text-center mt-8 mb-6">
        <h1 className="h1">Statystyki</h1>
        <p className="muted text-sm">
          {isLoadingUser ? (
            "Ładowanie…"
          ) : isLoggedIn ? (
            <>
              Zalogowano jako {user.email} ·{" "}
              <button className="underline hover:text-zinc-200" onClick={signOut}>
                Wyloguj
              </button>
            </>
          ) : (
            "Nie zalogowano"
          )}
        </p>
      </section>

      {!isLoggedIn ? (
        <DemoStats />
      ) : (
        <>
          {/* TYLKO przełącznik portfeli na górze */}
          <section className="mb-4 flex items-center justify-center sm:justify-end">
            <PortfolioSwitcher uid={user.uid} value={currentPortfolioId} onChange={setCurrentPortfolioId} />
          </section>

          {/* KPI – lifetime (kompakt na mobile) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div className="card">
              <div className="card-inner !p-3 sm:!p-5">
                <div className="muted text-xs sm:text-sm">
                  Śr. roczna stopa zwrotu (CAGR)
                  <span className="opacity-60"> {axisDailyAll.length - 1 < 365 ? "• nieannualizowane <1R" : ""}</span>
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                    portfolioCAGR_LIFETIME >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {fmtPct((portfolioCAGR_LIFETIME || 0) * 100)}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner !p-3 sm:!p-5">
                <div className="muted text-xs sm:text-sm">Wartość portfela (teraz) · akcje + gotówka</div>
                <div className="text-2xl sm:text-3xl font-semibold tabular-nums">{fmtPLN(portfolioValueNow)}</div>
                <div className="text-[11px] text-zinc-400">Gotówka: {fmtPLN(cashValueNow)}</div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner !p-3 sm:!p-5">
                <div className="muted text-xs sm:text-sm">Całkowity zysk (od startu)</div>
                <div
                  className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                    portfolioValueNow - firstNonZeroAll >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {fmtPLN(portfolioValueNow - firstNonZeroAll)}
                </div>
                <div className="text-[11px] text-zinc-400">Czysty wynik rynkowy (bez wpływu wpłat/wypłat)</div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner !p-3 sm:!p-5">
                <div className="muted text-xs sm:text-sm">Max Drawdown (od startu)</div>
                <div className="text-2xl sm:text-3xl font-semibold tabular-nums text-red-400">
                  {fmtPct((mddLifetime || 0) * 100)}
                </div>
              </div>
            </div>
          </section>

          {/* okresowe (kompakt na mobile) */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4 mb-4">
            <div className="card">
              <div className="card-inner !p-3 sm:!p-5">
                <div className="muted text-xs sm:text-sm">
                  Zwrot w okresie <span className="opacity-60">({rangeKey})</span>
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                    periodReturnPct >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {fmtPct(periodReturnPct)}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner !p-3 sm:!p-5">
                <div className="muted text-xs sm:text-sm">
                  Zmiana dzienna <span className="opacity-60">({rangeKey})</span>
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                    dailyChangePct >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {fmtPct(dailyChangePct)}
                </div>
                <div className="text-[11px] text-zinc-400">Czysty dzienny zwrot</div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner !p-3 sm:!p-5">
                <div className="muted text-xs sm:text-sm">
                  Zysk dzienny <span className="opacity-60">({rangeKey})</span>
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-semibold tabular-nums ${
                    dailyProfitPLN >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {fmtPLN(dailyProfitPLN)}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner !p-3 sm:!p-5">
                <div className="muted text-xs sm:text-sm">
                  Miesiące + / − <span className="opacity-60">({rangeKey})</span>
                </div>
                <div className="text-2xl sm:text-3xl font-semibold tabular-nums">
                  <span className="text-emerald-400">{monthsPlusMinus.plus}</span>
                  {" / "}
                  <span className="text-red-400">{monthsPlusMinus.minus}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner !p-3 sm:!p-5">
                <div className="muted text-xs sm:text-sm">
                  Skuteczność dni <span className="opacity-60">({rangeKey})</span>
                </div>
                <div className="text-2xl sm:text-3xl font-semibold tabular-nums">{fmtPct((winRate || 0) * 100)}</div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner !p-3 sm:!p-5">
                <div className="muted text-xs sm:text-sm">
                  Zmienność roczna <span className="opacity-60">({rangeKey})</span>
                </div>
                <div className="text-2xl sm:text-3xl font-semibold tabular-nums">{fmtPct((volAnn || 0) * 100)}</div>
                <div className="text-[11px] text-zinc-400">Odchylenie dzienne × √252</div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner !p-3 sm:!p-5">
                <div className="muted text-xs sm:text-sm">
                  Sharpe <span className="opacity-60">({rangeKey}, RF=WIRON 1M)</span>
                </div>
                <div className="text-2xl sm:text-3xl font-semibold tabular-nums">
                  {Number.isFinite(sharpeAnn) ? sharpeAnn.toFixed(2) : "—"}
                </div>
                <div className="text-[11px] text-zinc-400">
                  RF (rocznie): {(rf.annual * 100).toFixed(2)}%
                  {rf.asOf ? ` · ${rf.asOf}` : ""}
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
                    Number.isFinite(benchCAGR[k])
                      ? `CAGR (${rangeKey}): ${(benchCAGR[k] * 100).toFixed(2)}%`
                      : benchMeta[k]?.noData
                      ? "Brak danych"
                      : "",
                    benchMeta[k]?.used ? `Źródło: ${benchMeta[k]?.used}` : "",
                    benchMeta[k]?.disclaimer ? benchMeta[k]?.disclaimer : "",
                  ]
                    .filter(Boolean)
                    .join(" • ")}
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

            <button className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 hover:bg-zinc-800" onClick={() => setShowBenchMgr(true)}>
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
                  a.href = url;
                  a.download = "portfolio_values.csv";
                  a.click();
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
                  a.href = url;
                  a.download = "benchmarks_pct.csv";
                  a.click();
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
                const used = Array.from(
                  new Set(Object.keys(benchMeta || {}).map((k) => benchMeta[k]?.used).filter(Boolean))
                );
                const txt = getLegalAttribution({ mode: "dev", used });
                return (
                  <>
                    <span className="font-medium">Informacja o danych:</span> {txt}
                  </>
                );
              })()}
            </div>
          </section>

          {/* Wykres wartości / % + sterowanie wykresem */}
          <section className="card mb-4">
            <div className="card-inner !p-2 sm:!p-5">
              <h3 className="h2 mb-2">{valueMode === "PLN" ? "Wartość portfela (PLN) · akcje + gotówka" : "Zmiana od początku zakresu (%)"}</h3>

              <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-400">Sterowanie wykresem</span>
                  <div className="flex flex-wrap gap-1.5">
                    {RANGES.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => setRangeKey(r.key)}
                        className={[
                          "px-2.5 py-1 rounded-lg border text-xs sm:text-sm",
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
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
                  <div className="inline-flex rounded-lg overflow-hidden border border-zinc-700">
                    {["PLN", "PCT"].map((m) => (
                      <button
                        key={m}
                        onClick={() => setValueMode(m)}
                        className={[
                          "px-3 py-1.5 text-xs sm:text-sm",
                          valueMode === m
                            ? "bg-yellow-600/70 text-black"
                            : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
                        ].join(" ")}
                        title={m === "PLN" ? "Wartość portfela (PLN)" : "Zwrot TWR (bez wpłat/wypłat)"}
                      >
                        {m === "PLN" ? "PLN" : "%"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full h-64 sm:h-72">
                <ResponsiveContainer>
                  {valueMode === "PLN" ? (
                    <AreaChart
                      key={`main-pln-${mainChartNonce}`}
                      data={chartSeries.data}
                      margin={{ top: 8, right: 0, left: 0, bottom: 40 }}
                    >
                      <defs>
                        <linearGradient id="valFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PORTFOLIO_COLOR} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={PORTFOLIO_COLOR} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="t" tick={{ fontSize: 11 }} minTickGap={22} interval="preserveStartEnd" padding={{ left: 0, right: 0 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => new Intl.NumberFormat("pl-PL").format(v)} width={70} />
                      <Tooltip
                        wrapperStyle={{ zIndex: 60, outline: "none" }}
                        allowEscapeViewBox={{ x: false, y: false }}
                        content={(props) => (
                          <CloseableTooltip
                            {...props}
                            onClose={closeMainTooltip}
                            formatValue={(v) => fmtPLN(v)}
                            formatName={tooltipNameFor}
                          />
                        )}
                      />
                      <Area type="monotone" dataKey="value" stroke={PORTFOLIO_COLOR} strokeWidth={2.5} fillOpacity={1} fill="url(#valFill)" />
                      {Object.keys(benchSeries).map((k) => (
                        <Line key={k} type="monotone" dataKey={k} strokeWidth={2} dot={false} stroke={benchColorMap[k]} />
                      ))}
                      <Legend
                        formatter={legendLabelFormatter}
                        iconType="plainline"
                        verticalAlign="bottom"
                        height={34}
                        wrapperStyle={{ color: "#e5e7eb" }}
                      />
                    </AreaChart>
                  ) : (
                    <LineChart
                      key={`main-pct-${mainChartNonce}`}
                      data={chartSeries.data}
                      margin={{ top: 8, right: 0, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="t" tick={{ fontSize: 11 }} minTickGap={22} interval="preserveStartEnd" padding={{ left: 0, right: 0 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Number(v || 0).toFixed(0)}%`} width={60} />
                      <Tooltip
                        wrapperStyle={{ zIndex: 60, outline: "none" }}
                        allowEscapeViewBox={{ x: false, y: false }}
                        content={(props) => (
                          <CloseableTooltip
                            {...props}
                            onClose={closeMainTooltip}
                            formatValue={(v) => (v == null ? "—" : `${Number(v).toFixed(2)}%`)}
                            formatName={tooltipNameFor}
                          />
                        )}
                      />
                      <Line type="monotone" dataKey="valuePct" stroke={PORTFOLIO_COLOR} strokeWidth={2.5} dot={false} />
                      {Object.keys(benchSeries).map((k) => (
                        <Line key={k} type="monotone" dataKey={`${k}Pct`} strokeWidth={2} dot={false} stroke={benchColorMap[k]} />
                      ))}
                      <Legend
                        formatter={legendLabelFormatter}
                        iconType="plainline"
                        verticalAlign="bottom"
                        height={34}
                        wrapperStyle={{ color: "#e5e7eb" }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Zyski/Straty miesięczne */}
          <MonthlyPnLBarChart
            title="Zyski/Straty miesięczne"
            axisDays={axisDailyAll}
            valuesAligned={valuesAlignedAll}
            cashPerDay={cashPerDayAll}
            dailyReturns={rOutAll.daily}
            defaultRange="1R"
            defaultMode="PLN"
          />

          {/* Skład portfela (tylko akcje) */}
          <section className="mt-4">
            <PortfolioComposition groups={groupsForComposition} totalValue={holdingsValueNow} metaBySymbol={metaBySymbol} />
          </section>

          {/* Dywidendy */}
          <DividendsSection uid={user?.uid} portfolioId={portfolioIdForFirestore} currentPortfolioValuePLN={holdingsValueNow} />
        </>
      )}
    </main>
  );
}
