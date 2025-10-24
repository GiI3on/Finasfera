// src/app/fire-path/components/PartnerFirePanel.jsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";

/* =================== helpers =================== */
const FIRE_CALC_KEYS = ["fireCalculator:lastPlan","fire:lastPlan","fire:calc","calculator:fire"];

const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 })
    .format(Number.isFinite(v) ? Math.round(v) : 0);

const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

function readPlanFromLocal() {
  if (typeof window === "undefined") return null;
  for (const key of FIRE_CALC_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (data && typeof data === "object") return data;
    } catch {}
  }
  return null;
}

/** Symulacja m/m z opcjonalną indeksacją wpłat: NBP CPI lub custom (%/rok) */
function monthsToTarget({
  initial = 0,
  monthly = 0,
  rate = 0,
  target = 0,
  indexMonthly = false,
  useNBP = false,
  nbpCpi = [],               // [{year: 2025, cpi: 3.2}, ...]
  customWageAnnual = 0,      // %/rok
  hardCapMonths = 1200,
}) {
  if (target <= 0) return 0;

  let capital = Math.max(0, Number(initial) || 0);
  let pay     = Math.max(0, Number(monthly) || 0);
  const mRate = (Number(rate) || 0) / 100 / 12;

  const start = new Date();
  const baseYear  = start.getFullYear();
  const baseMonth = start.getMonth();

  for (let m = 0; m <= hardCapMonths; m++) {
    if (capital >= target) return m;

    capital += pay;
    capital *= 1 + mRate;

    if (indexMonthly) {
      const currentYear = baseYear + Math.floor((baseMonth + m) / 12);
      const annual = useNBP && Array.isArray(nbpCpi) && nbpCpi.length
        ? (Number(nbpCpi.find((r) => r?.year === currentYear)?.cpi) || 0)
        : (Number(customWageAnnual) || 0);
      if (annual) pay *= 1 + (annual / 100) / 12;
    }
  }
  return NaN;
}

/* =================== Panel =================== */
export default function PartnerFirePanel({
  currentCombinedValue = 0,
  baseTargetSingle,
  nbpCpi = [],             // podaj z page.js
}) {
  /* plan z kalkulatora */
  const [plan, setPlan] = useState(() => readPlanFromLocal());
  useEffect(() => {
    const refresh = () => setPlan(readPlanFromLocal());
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const rate       = Number(plan?.rate) || 0;
  const multiplier = Number(plan?.targetMultiplier || plan?.mult) || 25;
  const years      = Math.max(1, Number(plan?.years) || 30);

  // indeksacja jak w kalkulatorze
  const indexMonthly     = !!plan?.indexMonthly;
  const useNBPPath       = !!plan?.useNBPPath;
  const customWageAnnual = Number(plan?.customWageGrowth) || 0;

  // 🔸 Subtelna premia za dywersyfikację — tylko dla "Razem"
  const DIVERSIFICATION_BONUS_PP = 0.5; // +0,5 p.p.

  /* wejście */
  const [youMonthly] = useState(() => Number(plan?.monthly) || 0);
  const [partnerMonthly, setPartnerMonthly] = useState(() =>
    Math.max(0, Math.round(Number(plan?.monthly) || 0))
  );

  /* skala 20–30, domyślnie 25% */
  const SCALE_MIN = 20;
  const SCALE_MAX = 30;
  const [scalePct, setScalePct] = useState(25);

  /* logika */
  const targetSolo = Math.max(0, Number(baseTargetSingle) || 0);
  const targetTogether = useMemo(() => {
    const s = clamp(Number(scalePct) || 0, SCALE_MIN, SCALE_MAX) / 100;
    return Math.round((targetSolo * 2) * (1 - s));
  }, [scalePct, targetSolo]);

  const monthlySolo     = Math.max(0, Number(youMonthly) || 0);
  const monthlyTogether = Math.max(0, (Number(youMonthly) || 0) + (Number(partnerMonthly) || 0));

  // stopy dla wariantów
  const rateSolo     = rate;
  const rateTogether = rate + DIVERSIFICATION_BONUS_PP; // <— premia tylko dla "Razem"

  const mSolo = useMemo(
    () => monthsToTarget({
      initial: currentCombinedValue,
      monthly: monthlySolo,
      rate: rateSolo,
      target: targetSolo,
      indexMonthly,
      useNBP: useNBPPath,
      nbpCpi,
      customWageAnnual,
    }),
    [currentCombinedValue, monthlySolo, rateSolo, targetSolo, indexMonthly, useNBPPath, nbpCpi, customWageAnnual]
  );

  const mTogether = useMemo(
    () => monthsToTarget({
      initial: currentCombinedValue,
      monthly: monthlyTogether,
      rate: rateTogether,      // <— używamy podbitej stopy
      target: targetTogether,
      indexMonthly,
      useNBP: useNBPPath,
      nbpCpi,
      customWageAnnual,
    }),
    [currentCombinedValue, monthlyTogether, rateTogether, targetTogether, indexMonthly, useNBPPath, nbpCpi, customWageAnnual]
  );

  const fasterMonths = useMemo(() => {
    if (!Number.isFinite(mSolo) || !Number.isFinite(mTogether)) return 0;
    return Math.max(0, mSolo - mTogether);
  }, [mSolo, mTogether]);

  const ratioPct = useMemo(() => {
    if (!Number.isFinite(mSolo) || mSolo <= 0 || !Number.isFinite(mTogether) || mTogether < 0) return 100;
    return clamp((mTogether / mSolo) * 100, 0, 100);
  }, [mSolo, mTogether]);

  const toYM = (m) => {
    if (!Number.isFinite(m)) return "—";
    const Y = Math.floor(m / 12);
    const M = m % 12;
    if (Y <= 0) return `${M} mies.`;
    if (M === 0) return `${Y} ${Y === 1 ? "rok" : Y < 5 ? "lata" : "lat"}`;
    return `${Y} ${Y === 1 ? "rok" : Y < 5 ? "lata" : "lat"} i ${M} mies.`;
  };

  /* ===== UI ===== */
  return (
    <div className="h-full flex flex-col space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-300 font-medium truncate">FIRE z partnerem</div>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/40 text-yellow-300 whitespace-nowrap">
          Time Cut Meter
        </span>
      </div>

      {/* Hero */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[11px] uppercase tracking-wide text-zinc-400 whitespace-nowrap">Wspólnie szybciej o</div>
              <span
                className="text-[10px] px-2 py-[2px] rounded-full border border-zinc-700 text-zinc-400"
                title="+0,5 p.p. premii za dywersyfikację portfela w trybie 'Razem'"
              >
                +0,5 p.p.
              </span>
            </div>
            <div className="mt-1 text-[26px] md:text-[32px] font-extrabold text-yellow-400 tabular leading-none whitespace-nowrap">
              {fasterMonths > 0 ? toYM(fasterMonths) : "—"}
            </div>
            <div className="mt-2 text-[11px] text-zinc-400 flex flex-wrap gap-x-2">
              <span className="whitespace-nowrap">Solo: <b className="text-zinc-200">{toYM(mSolo)}</b></span>
              <span className="text-zinc-600">•</span>
              <span className="whitespace-nowrap">Razem: <b className="text-zinc-200">{toYM(mTogether)}</b></span>
            </div>
          </div>

          <TimelineCompare ratioPct={ratioPct} />
        </div>

        {/* legenda pod osią */}
        <div className="mt-2 text-[10px] text-zinc-500 flex items-center justify-end gap-3">
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <i className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 ring-2 ring-yellow-200/30" /> Razem: {toYM(mTogether)}
          </span>
        </div>
      </div>

      {/* Sterowanie */}
      <div className="grow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-fr">
          <Card className="h-full p-3.5 gap-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-zinc-400 truncate">Cel razem</label>
              <span className="text-[10px] text-zinc-500 whitespace-nowrap">skala {scalePct}%</span>
            </div>
            <div className="text-[18px] font-semibold tabular text-zinc-100 whitespace-nowrap">
              {fmtPLN(targetTogether)}
            </div>
          </Card>

          <Card className="h-full p-3.5 gap-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-zinc-400 truncate">Partner – wpłata (PLN/mies.)</label>
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-[10px] text-zinc-500 whitespace-nowrap">
                  Razem: <b className="tabular">{fmtPLN(monthlyTogether)}</b>/mies.
                </span>
                <button
                  type="button"
                  className="text-[11px] px-2 py-[2px] rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 whitespace-nowrap"
                  onClick={() => setPartnerMonthly(youMonthly)}
                >
                  = Ty
                </button>
              </div>
            </div>
            <SliderWithValue
              min={0}
              max={20000}
              step={100}
              value={partnerMonthly}
              onChange={setPartnerMonthly}
            />
            <div className="md:hidden text-[11px] text-zinc-500 mt-1 whitespace-nowrap">
              Razem: <b className="tabular">{fmtPLN(monthlyTogether)}</b>/mies.
            </div>
          </Card>

          <Card className="h-full p-3.5 gap-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-zinc-400 truncate">Oszczędność skali</label>
              <ScaleInfo />
            </div>
            <SliderWithValue
              min={SCALE_MIN}
              max={SCALE_MAX}
              step={1}
              value={scalePct}
              onChange={(v) => setScalePct(clamp(v, SCALE_MIN, SCALE_MAX))}
              suffix="%"
            />
            <div className="mt-2 flex items-center gap-2">
              {[20, 25, 30].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setScalePct(p)}
                  className={`text-[11px] px-2 py-[2px] rounded-full border ${scalePct === p ? "border-yellow-500/60 text-yellow-200 bg-yellow-500/10" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* KPI 4x */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SmallKpi label="Kapitał teraz (razem)" value={fmtPLN(currentCombinedValue)} />
        <SmallKpi label="Twoja wpłata (mies.)" value={fmtPLN(youMonthly)} />
        <SmallKpi label="Partner (mies.)" value={fmtPLN(partnerMonthly)} />
        <SmallKpi label="Stopa / horyzont" value={`${(rate + DIVERSIFICATION_BONUS_PP).toFixed(1)}% • ${years} lat`} />
      </div>

      <p className="text-[10px] text-zinc-500">
        Założenia: {rate.toFixed(1)}% rocznie (Razem: {(rate + DIVERSIFICATION_BONUS_PP).toFixed(1)}% z premią dywersyfikacji),
        {indexMonthly ? (useNBPPath ? " indeksacja wpłat wg NBP CPI" : ` indeksacja wpłat ${customWageAnnual}%/rok`) : " bez indeksacji wpłat"}.
        „Oszczędność skali”: 2 × cel solo × (1 − skala). Mnożnik: {multiplier}.
      </p>
    </div>
  );
}

/* =================== subcomponents =================== */

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-2 ${className}`}>
      {children}
    </div>
  );
}

function SliderWithValue({ min = 0, max = 100, step = 1, value, onChange, suffix = "" }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-zinc-300">
        <span className="tabular whitespace-nowrap">{min}{suffix}</span>
        <span className="tabular whitespace-nowrap">{clamp(value, min, max)}{suffix}</span>
        <span className="tabular whitespace-nowrap">{max}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(value, min, max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-fire w-full mt-2"
      />
    </div>
  );
}

function SmallKpi({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="text-[11px] text-zinc-400 leading-tight truncate">{label}</div>
      <div className="mt-1 text-zinc-100 text-lg font-semibold tabular whitespace-nowrap">{value}</div>
    </div>
  );
}

/** Info popover – ładny prostokąt, bez natywnego title */
function ScaleInfo() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="w-5 h-5 rounded-full border border-zinc-700 hover:bg-zinc-800 inline-flex items-center justify-center text-[11px] text-zinc-300"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Informacja o skali"
      >
        i
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-[min(320px,80vw)] rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 text-[12px] shadow-lg p-3">
          <div className="font-medium text-zinc-100 mb-1">Oszczędność skali</div>
          Dwie osoby razem nie wydają 2× więcej. <b>OECD-modified scale</b> ≈ <b>25%</b> oszczędności.
          W panelu domyślnie używamy <b>25%</b> (zakres 20–30%).
        </div>
      )}
    </div>
  );
}

/** Oś czasu – kropki, opis w legendzie */
function TimelineCompare({ ratioPct = 100 }) {
  return (
    <div className="w-full md:w-[48%]">
      <div className="h-2 w-full bg-zinc-800 rounded-full relative overflow-hidden">
        <div className="absolute inset-0 bg-zinc-700/40" />
        <div className="absolute inset-y-0 left-0 bg-yellow-500" style={{ width: `${clamp(ratioPct, 0, 100)}%` }} />
      </div>
      <div className="relative mt-2">
        <Dot style={{ left: `${clamp(ratioPct, 0, 100)}%` }} variant="yellow" />
        <Dot style={{ left: "100%" }} variant="ring" />
      </div>
    </div>
  );
}

function Dot({ style, variant = "ring" }) {
  const base = "absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full";
  if (variant === "yellow") {
    return <div className={`${base} bg-yellow-400 ring-2 ring-yellow-200/30`} style={style} />;
  }
  return <div className={`${base} bg-transparent border border-zinc-300 ring-2 ring-white/20`} style={style} />;
}

/* styl suwaka */
if (typeof document !== "undefined" && !document.getElementById("range-fire-style")) {
  const style = document.createElement("style");
  style.id = "range-fire-style";
  style.innerHTML = `
    .range-fire{ -webkit-appearance:none; appearance:none; height:8px; border-radius:9999px; background:#2a2a2e; outline:none; }
    .range-fire:hover{ filter:brightness(1.05); }
    .range-fire:focus{ box-shadow:0 0 0 3px rgba(250,204,21,.22); }
    .range-fire::-webkit-slider-thumb{ -webkit-appearance:none; width:18px; height:18px; border-radius:9999px; background:#facc15; border:2px solid #0a0a0a; cursor:pointer; }
    .range-fire::-moz-range-thumb{ width:18px; height:18px; border-radius:9999px; background:#facc15; border:2px solid #0a0a0a; cursor:pointer; }
  `;
  document.head.appendChild(style);
}
