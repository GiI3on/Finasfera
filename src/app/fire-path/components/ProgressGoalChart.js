// src/app/fire-path/components/ProgressGoalChart.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ===== helpers ===== */
const FIRE_CALC_KEYS = [
  "fireCalculator:lastPlan",
  "fire:lastPlan",
  "fire:calc",
  "calculator:fire",
];

const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(v) ? Math.round(v) : 0);

const fmtPLNCompact = (v) =>
  new Intl.NumberFormat("pl-PL", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(v) ? Math.round(v) : 0);

const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

function useIsMobile(maxWidthPx = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const update = () => setIsMobile(!!mq.matches);
    update();

    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, [maxWidthPx]);

  return isMobile;
}

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

function goalFromPlan(plan) {
  const mult = Number(plan?.targetMultiplier || plan?.mult || 25);
  const annual =
    Number(plan?.annualExpenses) ||
    Number(plan?.expenses) ||
    (Number(plan?.monthlyExpenses) ? Number(plan?.monthlyExpenses) * 12 : 0);
  const goal = Math.max(
    0,
    Math.round((Number(annual) || 0) * (Number(mult) || 0))
  );
  return Number.isFinite(goal) ? goal : 0;
}

/** Prosta symulacja m/m – bez indeksacji wpłat */
function simulateSeries({ initial = 0, monthly = 0, rate = 0, years = 30 }) {
  const yr = Math.max(0, Math.round(years));
  const mRate = (Number(rate) || 0) / 100 / 12;
  let capital = Number(initial) || 0;
  const yearly = [capital];
  for (let y = 0; y < yr; y++) {
    for (let m = 0; m < 12; m++) {
      capital += monthly;
      capital *= 1 + mRate;
    }
    yearly.push(capital);
  }
  return yearly;
}

function createScaler({ xs, ys, width, height, pad, shiftX = 0 }) {
  const minX = 0;
  const maxX = Math.max(1, xs[xs.length - 1]);
  const minY = 0;
  const maxY = Math.max(1, Math.max(...ys));
  const x0 = pad + shiftX;
  const y0 = pad;
  const w = width - 2 * pad - shiftX;
  const h = height - 2 * pad;

  return {
    x: (v) => x0 + (clamp(v, minX, maxX) / (maxX - minX)) * w,
    y: (v) => y0 + h - (clamp(v, minY, maxY) / (maxY - minY)) * h,
    x0,
    y0,
    w,
    h,
    maxX,
    maxY,
  };
}

function firstHitIndex(series, goal) {
  const g = Number(goal) || 0;
  for (let i = 0; i < series.length; i++) {
    if (series[i] >= g) return i;
  }
  return NaN;
}

function toYMFromYears(y) {
  if (!Number.isFinite(y)) return "—";
  const years = Math.floor(y);
  const months = Math.round((y - years) * 12);
  if (years === 0) return `${months} mies.`;
  if (months === 0)
    return `${years} ${years === 1 ? "rok" : years < 5 ? "lata" : "lat"}`;
  return `${years} ${years === 1 ? "rok" : years < 5 ? "lata" : "lat"} i ${months} mies.`;
}

/* ===== Component ===== */
export default function ProgressGoalChart({
  currentValue = 0,
  rateDeltaPct = 2,
  monthlyDeltaPct = 10,
  height = 340,
}) {
  const isMobile = useIsMobile(640);

  const [plan, setPlan] = useState(() => readPlanFromLocal());
  useEffect(() => {
    const onStorage = (e) => {
      if (FIRE_CALC_KEYS.includes(e.key)) setPlan(readPlanFromLocal());
    };
    const onFocus = () => setPlan(readPlanFromLocal());
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // styl suwaka – tylko raz (nie sypie w konsoli)
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("range-fire-style")) return;
    const style = document.createElement("style");
    style.id = "range-fire-style";
    style.innerHTML = `
      .range-fire {
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        border-radius: 9999px;
        background: linear-gradient(90deg, #27272a, #3f3f46);
        outline: none;
      }
      .range-fire:hover { filter: brightness(1.05); }
      .range-fire:focus { box-shadow: 0 0 0 3px rgba(250,204,21,0.25); }
      .range-fire::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px; height: 16px;
        border-radius: 9999px;
        background: #facc15;
        border: 2px solid #0a0a0a;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.4);
        cursor: pointer;
      }
      .range-fire::-moz-range-thumb {
        width: 16px; height: 16px;
        border-radius: 9999px;
        background: #facc15;
        border: 2px solid #0a0a0a;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.4);
        cursor: pointer;
      }
      .range-fire::-moz-range-track {
        height: 6px; border-radius: 9999px; background: #3f3f46;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const initial = Number(plan?.initial) || 0;
  const monthly = Number(plan?.monthly) || 0;
  const rate = Number(plan?.rate) || 0;
  const years = Math.max(1, Number(plan?.years) || 30);
  const goal = useMemo(() => goalFromPlan(plan), [plan]);

  const baseSeries = useMemo(
    () => simulateSeries({ initial, monthly, rate, years }),
    [initial, monthly, rate, years]
  );
  const lowSeries = useMemo(
    () => simulateSeries({ initial, monthly, rate: rate - rateDeltaPct, years }),
    [initial, monthly, rate, years, rateDeltaPct]
  );
  const highSeries = useMemo(
    () => simulateSeries({ initial, monthly, rate: rate + rateDeltaPct, years }),
    [initial, monthly, rate, years, rateDeltaPct]
  );

  const moreContrib = useMemo(
    () =>
      simulateSeries({
        initial,
        monthly: monthly * (1 + monthlyDeltaPct / 100),
        rate,
        years,
      }),
    [initial, monthly, rate, years, monthlyDeltaPct]
  );
  const lessContrib = useMemo(
    () =>
      simulateSeries({
        initial,
        monthly: monthly * (1 - monthlyDeltaPct / 100),
        rate,
        years,
      }),
    [initial, monthly, rate, years, monthlyDeltaPct]
  );

  const xs = useMemo(
    () => Array.from({ length: baseSeries.length }, (_, i) => i),
    [baseSeries]
  );

  const [yearsInvested, setYearsInvested] = useState(0);
  useEffect(() => {
    setYearsInvested((y) => clamp(y, 0, years));
  }, [years]);

  const expectedAt = baseSeries[clamp(yearsInvested, 0, years)] || 0;
  const deltaAbs = (Number(currentValue) || 0) - expectedAt;
  const deltaPct = expectedAt > 0 ? (deltaAbs / expectedAt) * 100 : 0;

  // ===== KLUCZ: desktop bez zmian, mobile ma własny viewBox =====
  const vbW = isMobile ? 420 : 700; // desktop = 700 (jak było)
  const vbH = Math.max(240, Number(height) || 340);

  const pad = isMobile ? 46 : 54;
  const shiftX = isMobile ? 18 : 24;

  const axisFont = isMobile ? 12 : 11;
  const axisSmallFont = isMobile ? 11 : 11;

  const scaler = useMemo(
    () =>
      createScaler({
        xs,
        ys: [
          ...baseSeries,
          ...lowSeries,
          ...highSeries,
          ...moreContrib,
          ...lessContrib,
        ],
        width: vbW,
        height: vbH,
        pad,
        shiftX,
      }),
    [xs, baseSeries, lowSeries, highSeries, moreContrib, lessContrib, vbW, vbH, pad, shiftX]
  );

  function pathFromSeries(series) {
    return series
      .map(
        (y, i) =>
          `${i === 0 ? "M" : "L"} ${scaler.x(xs[i]).toFixed(1)} ${scaler
            .y(y)
            .toFixed(1)}`
      )
      .join(" ");
  }

  function areaBetween(low, high) {
    const up = high.map(
      (y, i) => `L ${scaler.x(xs[i]).toFixed(1)} ${scaler.y(y).toFixed(1)}`
    );
    const down = [...low].reverse().map((y, i) => {
      const xi = xs.length - 1 - i;
      return `L ${scaler.x(xs[xi]).toFixed(1)} ${scaler.y(y).toFixed(1)}`;
    });
    return `M ${scaler.x(xs[0]).toFixed(1)} ${scaler.y(high[0]).toFixed(
      1
    )} ${up.join(" ")} ${down.join(" ")} Z`;
  }

  // ====== HOVER (mouse + touch) ======
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  function pickIdxFromClientX(clientX) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const pxSvg = (clientX - rect.left) * (vbW / rect.width);

    let best = 0;
    let bestDist = Infinity;
    xs.forEach((x, idx) => {
      const dx = Math.abs(scaler.x(x) - pxSvg);
      if (dx < bestDist) {
        bestDist = dx;
        best = idx;
      }
    });
    return best;
  }

  function onMouseMove(e) {
    const idx = pickIdxFromClientX(e.clientX);
    if (idx == null) return;
    setHoverIdx(idx);
  }

  function onTouchMove(e) {
    const t = e.touches?.[0];
    if (!t) return;
    const idx = pickIdxFromClientX(t.clientX);
    if (idx == null) return;
    setHoverIdx(idx);
  }

  function onLeave() {
    setHoverIdx(null);
  }

  const xTicks = useMemo(() => {
    const arr = [];
    for (let y = 0; y <= years; y += 5) arr.push(y);
    if (!arr.includes(years)) arr.push(years);
    return arr;
  }, [years]);

  const yTicks = useMemo(() => {
    const levels = [];
    for (let i = 0; i <= 4; i++) levels.push((scaler.maxY / 4) * i);
    return levels;
  }, [scaler.maxY]);

  const hitIndex = useMemo(
    () => firstHitIndex(baseSeries, goal),
    [baseSeries, goal]
  );

  // tooltip format: desktop pełne kwoty (jak było), mobile kompaktowo (żeby się mieściło)
  const fmtTooltip = isMobile ? fmtPLNCompact : fmtPLN;

  return (
    <div className="space-y-3">
      {/* nagłówek + legenda */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-300 font-medium">
          Cel postępu i wariancja
        </div>
        <div className="flex items-center gap-6 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block w-4 h-[3px] rounded-full"
              style={{ background: "#facc15" }}
            />
            Różne stopy zwrotu (±{rateDeltaPct} pp)
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block w-4 h-[3px] rounded-full"
              style={{ background: "#a1a1aa" }}
            />
            Różne wpłaty (±{monthlyDeltaPct}%)
          </span>
        </div>
      </div>

      {/* wykres */}
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbW} ${vbH}`}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/40"
          role="img"
          aria-label="Wykres planu i wariantów"
          onMouseMove={onMouseMove}
          onMouseLeave={onLeave}
          onTouchStart={onTouchMove}
          onTouchMove={onTouchMove}
          onTouchEnd={onLeave}
        >
          <defs>
            <clipPath id="progress-clip">
              <rect x={scaler.x0} y={scaler.y0} width={scaler.w} height={scaler.h} />
            </clipPath>
            <filter id="dot-halo" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="1.3"
                floodColor="#000"
                floodOpacity="0.85"
              />
            </filter>
          </defs>

          {/* Y */}
          {yTicks.map((val, i) => {
            const y = scaler.y(val);
            const label = fmtPLNCompact(val);

            const boxW = isMobile ? 58 : 50;
            const boxH = isMobile ? 18 : 16;
            const tx = scaler.x0 - 12 - boxW;
            const ty = y - boxH / 2;

            return (
              <g key={i}>
                <line
                  x1={scaler.x0}
                  x2={scaler.x0 + scaler.w}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                />
                <rect
                  x={tx}
                  y={ty}
                  width={boxW}
                  height={boxH}
                  rx="3"
                  ry="3"
                  fill="rgba(10,10,10,0.9)"
                />
                <text
                  x={scaler.x0 - 14}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={axisSmallFont}
                  fill="#a1a1aa"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* X */}
          {xTicks.map((yr, i) => {
            const x = scaler.x(yr);
            return (
              <g key={i}>
                <line
                  x1={x}
                  x2={x}
                  y1={scaler.y0}
                  y2={scaler.y0 + scaler.h}
                  stroke="rgba(255,255,255,0.04)"
                />
                <text
                  x={x}
                  y={scaler.y0 + scaler.h + 18}
                  textAnchor="middle"
                  fontSize={axisFont}
                  fill="#71717a"
                >
                  {yr}
                </text>
              </g>
            );
          })}

          <g clipPath="url(#progress-clip)">
            {/* pasmo low/high */}
            <path d={areaBetween(lowSeries, highSeries)} fill="rgba(250,204,21,0.16)" />

            {/* linie stóp */}
            <path
              d={pathFromSeries(lowSeries)}
              stroke="rgba(245,158,11,0.75)"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathFromSeries(highSeries)}
              stroke="rgba(245,158,11,0.75)"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathFromSeries(baseSeries)}
              stroke="#facc15"
              strokeWidth="3.0"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* przerywane: wpłaty */}
            <path
              d={pathFromSeries(moreContrib)}
              stroke="rgba(161,161,170,0.95)"
              strokeWidth="1.7"
              strokeDasharray="6 4"
              fill="none"
            />
            <path
              d={pathFromSeries(lessContrib)}
              stroke="rgba(161,161,170,0.95)"
              strokeWidth="1.7"
              strokeDasharray="6 4"
              fill="none"
            />

            {/* linia suwaka + kropka bazowa */}
            {Number.isFinite(yearsInvested) && yearsInvested >= 0 && yearsInvested <= years && (
              <>
                <line
                  x1={scaler.x(yearsInvested)}
                  x2={scaler.x(yearsInvested)}
                  y1={scaler.y0}
                  y2={scaler.y0 + scaler.h}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="4 4"
                />
                <g filter="url(#dot-halo)">
                  <circle
                    cx={scaler.x(yearsInvested)}
                    cy={scaler.y(baseSeries[yearsInvested])}
                    r="5.5"
                    fill="#facc15"
                  />
                </g>
              </>
            )}

            {/* tooltip */}
            {hoverIdx != null && (() => {
const margin = 10;

// szerokość tooltipa dopasowana do pola wykresu (żeby nie wychodził poza clipPath)
const boxW = isMobile ? Math.min(260, Math.max(200, scaler.w - 12)) : 240;
// trochę wyższy na mobile, bo mamy 5 linii tekstu
const boxH = isMobile ? 96 : 88;

const hx = scaler.x(xs[hoverIdx]);
const hy = scaler.y(baseSeries[hoverIdx]);

let tx = hx + margin;
let ty = hy - (boxH + margin);

// najpierw standardowe „przerzucanie” lewo/prawo i góra/dół
if (tx + boxW > scaler.x0 + scaler.w - 2) tx = hx - boxW - margin;
if (ty < scaler.y0) ty = scaler.y0 + 4;
if (ty + boxH > scaler.y0 + scaler.h) ty = scaler.y0 + scaler.h - boxH - 4;

// KLUCZ: dociskamy tooltip do środka pola wykresu, żeby clipPath go nie ucinał
tx = clamp(tx, scaler.x0 + 4, scaler.x0 + scaler.w - boxW - 4);
ty = clamp(ty, scaler.y0 + 4, scaler.y0 + scaler.h - boxH - 4);

const small = isMobile ? 10 : 11;


              return (
                <g>
                  <circle cx={hx} cy={hy} r="4.8" fill="#facc15" />
                  <g transform={`translate(${tx}, ${ty})`}>
                    <rect rx="8" ry="8" width={boxW} height={boxH} fill="rgba(9,9,11,0.96)" stroke="#3f3f46" />
                    <text x="10" y="18" fontSize="12" fill="#e4e4e7">Rok: {hoverIdx}</text>
                    <text x="10" y="36" fontSize="11" fill="#facc15">Plan: {fmtTooltip(baseSeries[hoverIdx])}</text>
                    <text x="10" y="52" fontSize="11" fill="#e4e4e7">Ty: {fmtTooltip(currentValue)}</text>

                    {/* WRACAMY do formy jak było: 1 linia = 1 zakres */}
                    <text x="10" y="68" fontSize={small} fill="#a1a1aa">
                      Zakres stóp: {fmtTooltip(lowSeries[hoverIdx])} – {fmtTooltip(highSeries[hoverIdx])}
                    </text>
                    <text x="10" y="84" fontSize={small} fill="#a1a1aa">
                      Wpłaty ±{monthlyDeltaPct}%: {fmtTooltip(lessContrib[hoverIdx])} – {fmtTooltip(moreContrib[hoverIdx])}
                    </text>
                  </g>
                </g>
              );
            })()}
          </g>

          {/* podpisy osi */}
          <text
            x={scaler.x0 + scaler.w / 2}
            y={vbH - 6}
            textAnchor="middle"
            fontSize={axisFont}
            fill="#71717a"
          >
            Lata
          </text>
          <text
            x={16}
            y={vbH / 2}
            transform={`rotate(-90,16,${vbH / 2})`}
            textAnchor="middle"
            fontSize={axisFont}
            fill="#71717a"
          >
            Wartość portfela [PLN]
          </text>
        </svg>
      </div>

      {/* suwak */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-zinc-400 w-36">Ile lat inwestujesz?</div>
        <input
          type="range"
          min={0}
          max={years}
          step={1}
          value={yearsInvested}
          onChange={(e) => setYearsInvested(Number(e.target.value))}
          className="range-fire flex-1"
        />
        <div className="text-xs text-zinc-300 tabular w-10 text-right">
          {yearsInvested}
        </div>
      </div>

      {/* kafle */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CardKpi
          label={`Wariant niski (stopa -${rateDeltaPct} pp)`}
          value={fmtPLN(lowSeries.at(-1))}
        />
        <CardKpi label={`Plan (koniec horyzontu)`} value={fmtPLN(baseSeries.at(-1))} />
        <CardKpi
          label={`Wariant wysoki (stopa +${rateDeltaPct} pp)`}
          value={fmtPLN(highSeries.at(-1))}
        />
        <CardKpi label="Bieżący kapitał" value={fmtPLN(currentValue)} />
      </div>

      {/* podsumowanie */}
      <div
        className={[
          "rounded-lg border p-3 text-sm",
          deltaAbs >= 0
            ? "border-emerald-700/40 bg-emerald-900/10 text-emerald-200"
            : "border-rose-700/40 bg-rose-900/10 text-rose-200",
        ].join(" ")}
      >
        {deltaAbs >= 0 ? "Powyżej planu" : "Poniżej planu"} o{" "}
        <b className="tabular">{fmtPLN(Math.abs(deltaAbs))}</b> (
        <span className="tabular">{Math.abs(deltaPct).toFixed(1)}%</span>) po{" "}
        <b className="tabular">{yearsInvested}</b>{" "}
        {yearsInvested === 1 ? "roku" : yearsInvested < 5 ? "latach" : "latach"}.
        {goal > 0 && (
          <>
            {" "}
            Cel: <b className="tabular">{fmtPLN(goal)}</b> —{" "}
            <b>
              {Number.isFinite(hitIndex)
                ? toYMFromYears(hitIndex)
                : "nieosiągnięty w horyzoncie"}
            </b>
            .
          </>
        )}
      </div>
    </div>
  );
}

/* ====== KPI card ====== */
function CardKpi({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 flex flex-col">
      <div className="text-[11px] text-zinc-400 leading-tight">{label}</div>
      <div className="mt-1 text-zinc-100 text-lg font-semibold tabular">
        {value}
      </div>
    </div>
  );
}
