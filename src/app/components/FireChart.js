"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useMemo, useState } from "react";

/* Kolory */
const COL_CAPITAL = "#facc15";
const COL_CONTRIB = "rgba(212,212,216,0.92)";

/* Formatery */
const fmtCompactPL = (v) =>
  Intl.NumberFormat("pl-PL", { notation: "compact", maximumFractionDigits: 1 }).format(
    Math.round(Number(v) || 0)
  );
const fmtPLN = (v) =>
  Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(
    Math.round(Number(v) || 0)
  );
const fmtYAxis = (v) => `${fmtCompactPL(v)}\u00A0zł`;

/* Ładne ticki osi Y */
function niceNum(range, round) {
  const exp = Math.floor(Math.log10(range || 1));
  const f = range / Math.pow(10, exp);
  let nf;
  if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * Math.pow(10, exp);
}
function niceScale(min, max, ticksDesired = 6) {
  const range = niceNum(Math.max(max - min, 1), false);
  const step = niceNum(range / (ticksDesired - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + 0.5 * step; v += step) ticks.push(v);
  return { niceMin, niceMax, ticks };
}

/* Równy, „ładny” rozkład lat (bez krótszego końca) */
function pickYearTicks(minYear, maxYear) {
  const span = Math.max(1, maxYear - minYear);
  const target = 8;
  let step = Math.max(1, Math.round(span / target));
  const candidates = [1, 2, 3, 4, 5, 6];
  const best = candidates.find((k) => span % k === 0 && k >= step);
  if (best) step = best;

  const ticks = [];
  for (let y = minYear; y <= maxYear; y += step) ticks.push(y);
  if (ticks[ticks.length - 1] !== maxYear) ticks.push(maxYear);
  return ticks;
}

export default function FireChart({
  labels = [],
  capital = [],
  contributions = [],
  className = "",
  height = 340,
  title = "Prognoza kapitału",
}) {
  /* Dane */
  const data = useMemo(() => {
    const len = Math.max(labels?.length || 0, capital?.length || 0, contributions?.length || 0);
    return Array.from({ length: len }, (_, i) => {
      const yearStr = String(labels?.[i] ?? "");
      const yearNum = Number(yearStr) || i;
      return {
        year: yearNum,
        label: yearStr || String(yearNum),
        cap: Number(capital?.[i] ?? 0),
        contrib: Number(contributions?.[i] ?? 0),
      };
    });
  }, [labels, capital, contributions]);

  const hasData = data.length > 0 && data.some((d) => d.cap || d.contrib);

  /* Interaktywna legenda (zostaje) */
  const [show, setShow] = useState({ cap: true, contrib: true });
  const toggle = (k) => setShow((s) => ({ ...s, [k]: !s[k] }));

  if (!hasData) {
    return (
      <div className={`grid place-items-center h-[220px] rounded-xl bg-zinc-900/40 ring-1 ring-zinc-700/50 ${className}`}>
        <p className="text-sm text-zinc-300/70">Podaj dane i kliknij „Oblicz”, aby zobaczyć wykres.</p>
      </div>
    );
  }

  /* Skale */
  const rawMax = Math.max(...data.map((d) => Math.max(d.cap, d.contrib)));
  const headroom = Math.max(1, rawMax * 0.06);
  const { niceMin, niceMax, ticks } = niceScale(0, rawMax + headroom, 6);

  /* Oś X */
  const minYear = data[0].year;
  const maxYear = data[data.length - 1].year;
  const xTicks = pickYearTicks(minYear, maxYear);

  return (
    <figure className={`w-full rounded-xl overflow-hidden bg-zinc-900/40 ring-1 ring-zinc-700/50 ${className}`}>
      {/* Nasza legenda z przełącznikami (zostaje) */}
      <figcaption className="px-3 pt-3 mb-2 flex items-center gap-6 text-xs text-zinc-300 select-none">
        <Legend label="Kapitał" color={COL_CAPITAL} active={show.cap} onClick={() => toggle("cap")} />
        <Legend label="Suma wpłat" color={COL_CONTRIB} dash active={show.contrib} onClick={() => toggle("contrib")} />
        <span className="ml-auto text-zinc-400/80">{title}</span>
      </figcaption>

      <div style={{ height }} aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 8 }}>
            <defs>
              <linearGradient id="capFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COL_CAPITAL} stopOpacity={0.18} />
                <stop offset="100%" stopColor={COL_CAPITAL} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.06)" />

            <XAxis
              type="number"
              dataKey="year"
              domain={[minYear, maxYear]}
              ticks={xTicks}
              tickFormatter={(v) => String(v)}
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickMargin={6}
              padding={{ left: 0, right: 0 }}
              allowDecimals={false}
            />

            <YAxis
              type="number"
              ticks={ticks}
              domain={[niceMin, niceMax]}
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickFormatter={fmtYAxis}
              width={58}
              allowDecimals={false}
            />

            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.16)" }}
              contentStyle={{
                background: "rgba(24,24,27,0.95)",
                border: "1px solid rgba(63,63,70,0.7)",
                borderRadius: 10,
                padding: "8px 10px",
                color: "#e4e4e7",
              }}
              wrapperStyle={{ zIndex: 30 }}
              labelFormatter={(_, payload) => `Rok: ${payload?.[0]?.payload?.label ?? ""}`}
              formatter={(val, name, ctx) => {
                const map = { cap: "Kapitał", contrib: "Suma wpłat" };
                const label = map[ctx.dataKey] ?? name;
                return [fmtPLN(val), label];
              }}
            />

            {show.cap && (
              <Area
                type="monotone"
                dataKey="cap"
                stroke={COL_CAPITAL}
                strokeWidth={2}
                strokeLinecap="round"
                fill="url(#capFill)"
                dot={false}
                isAnimationActive={false}
              />
            )}

            {show.contrib && (
              <Line
                type="monotone"
                dataKey="contrib"
                stroke={COL_CONTRIB}
                strokeWidth={2}
                strokeDasharray="6 6"
                strokeLinecap="round"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/* Element legendy (zostaje) */
function Legend({ label, color, dash = false, active = true, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 px-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/60 transition ${
        active ? "opacity-100" : "opacity-50"
      } hover:opacity-80`}
      title={active ? "Kliknij, aby ukryć" : "Kliknij, aby pokazać"}
    >
      <span
        className="inline-block align-middle"
        style={{
          width: 28,
          height: 0,
          borderTop: `2px ${dash ? "dashed" : "solid"} ${color}`,
        }}
      />
      <span className="align-middle">{label}</span>
    </button>
  );
}
