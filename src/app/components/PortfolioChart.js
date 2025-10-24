"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
} from "recharts";

/* ===== formatery ===== */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(Math.round(v || 0));

const MONTHS_SHORT = [
  "sty", "lut", "mar", "kwi", "maj", "cze",
  "lip", "sie", "wrz", "paź", "lis", "gru",
];
const MONTHS_NOM = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];

function formatAxisTick(iso, longRange) {
  const [y, m, d] = iso.split("-").map(Number);
  const mmShort = MONTHS_SHORT[(m - 1 + 12) % 12];
  return longRange ? `${mmShort} ${y}` : `${d} ${mmShort}`;
}
function formatTooltipLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const mmNom = MONTHS_NOM[(m - 1 + 12) % 12];
  const dd = String(d).padStart(2, "0");
  return `${dd} ${mmNom} ${y}`;
}

/**
 * props:
 *  - seriesBySymbol: { [id]: { history: [{t, close}], shares } }  // znormalizowane do wspólnej osi dni
 *  - height?: number
 *  - longRange?: boolean
 *  - overlays?: Array<{ key: string, label?: string, color?: string, series: {t,close}[] }>
 */
export default function PortfolioChart({
  seriesBySymbol = {},
  height = 260,
  longRange = false,
  overlays = [],
}) {
  /* =======================
     1) PORTFEL (PLN) — suma
     z forward-fill’em i
     bez wiodących zer
     ======================= */
  const baseData = useMemo(() => {
    // zbierz wszystkie daty z już znormalizowanych serii
    const dates = new Set();
    Object.values(seriesBySymbol).forEach(({ history }) =>
      (history || []).forEach((p) => p?.t && dates.add(p.t))
    );
    const allDates = Array.from(dates).sort();
    if (!allDates.length) return [];

    // policz surową sumę (bez fill’a)
    const raw = allDates.map((d) => {
      let total = 0;
      for (const key in seriesBySymbol) {
        const { history, shares } = seriesBySymbol[key] || {};
        const p = (history || []).find((x) => x.t === d);
        if (p && Number.isFinite(p.close) && Number.isFinite(shares)) {
          total += p.close * shares;
        }
      }
      return { t: d, total: Number.isFinite(total) ? total : 0 };
    });

    // odetnij wiodące zera (przed pierwszą realną wartością portfela)
    let firstIdx = 0;
    while (firstIdx < raw.length && !(raw[firstIdx].total > 0)) firstIdx++;
    const trimmed = raw.slice(firstIdx);

    // forward-fill: jeżeli w środku trafia się „0” (dziura w danych danego dnia),
    // użyj ostatniej znanej wartości portfela
    const out = [];
    let last = 0;
    for (const row of trimmed) {
      if (row.total > 0) {
        last = row.total;
        out.push(row);
      } else if (last > 0) {
        out.push({ t: row.t, total: last });
      }
      // jeżeli last==0 i row.total==0 — pomijamy
    }

    return out;
  }, [seriesBySymbol]);

  /* =======================
     2) BENCHMARKI – normalizacja
     do 100 i doszycie do bazowej
     siatki dat
     ======================= */
  const mergedData = useMemo(() => {
    const result = baseData.map((d) => ({ ...d }));
    if (!result.length) return result;

    const idxByDate = new Map();
    result.forEach((row, i) => idxByDate.set(row.t, i));

    overlays.forEach((ov, i) => {
      if (!ov?.series?.length) return;

      let base = null;
      for (const p of ov.series) {
        const c = Number(p?.close);
        if (Number.isFinite(c) && c > 0) { base = c; break; }
      }
      if (!base) return;

      const norm = ov.series
        .filter((p) => p?.t && Number.isFinite(p?.close))
        .map((p) => ({ t: p.t, v: (p.close / base) * 100 }));

      const key = `ov_${i}`;
      norm.forEach(({ t, v }) => {
        const rowIdx = idxByDate.get(t);
        if (rowIdx != null) result[rowIdx][key] = v;
      });
    });

    return result;
  }, [baseData, overlays]);

  const hasData = mergedData.length > 0;
  const min = hasData ? Math.min(...mergedData.map((d) => d.total)) : 0;
  const max = hasData ? Math.max(...mergedData.map((d) => d.total)) : 1;
  const head = hasData ? Math.max(1, max * 0.06) : 1;

  const ovColors = ["#60a5fa", "#34d399"]; // SPX, WIG20 itd.

  return (
    <div style={{ height }}>
      {!hasData ? (
        <div className="h-full grid place-items-center text-sm text-zinc-400/70">
          Dodaj pozycję, aby zobaczyć wykres.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mergedData} margin={{ top: 10, right: 12, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="portFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#facc15" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#facc15" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.06)" />

            <XAxis
              dataKey="t"
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickFormatter={(iso) => formatAxisTick(iso, longRange)}
              minTickGap={22}
            />

            {/* Oś PLN (lewa) */}
            <YAxis
              domain={[Math.max(0, min - head), max + head]}
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickFormatter={fmtPLN}
              width={76}
              yAxisId="left"
            />

            {/* Oś % (prawa) dla benchmarków */}
            <YAxis
              orientation="right"
              yAxisId="right"
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              width={50}
              tickFormatter={(v) => `${Number(v || 0).toFixed(0)}%`}
              domain={["dataMin - 5", "dataMax + 5"]}
            />

            <Tooltip
              labelFormatter={(iso) => formatTooltipLabel(iso)}
              formatter={(v, name) => {
                if (String(name).startsWith("ov_")) {
                  return [`${Number(v).toFixed(1)}%`, "Benchmark"];
                }
                return [fmtPLN(v), "Wartość portfela"];
              }}
              contentStyle={{
                background: "rgba(24,24,27,0.95)",
                border: "1px solid rgba(63,63,70,0.7)",
                borderRadius: 10,
                padding: "8px 10px",
                color: "#e4e4e7",
              }}
            />

            {/* PORTFEL */}
            <Area
              dataKey="total"
              yAxisId="left"
              type="monotone"
              stroke="#facc15"
              strokeWidth={2}
              fill="url(#portFill)"
              dot={false}
            />

            {/* BENCHMARKI */}
            {overlays.map((ov, i) => (
              <Line
                key={ov?.key ?? `ov_${i}`}
                type="monotone"
                dataKey={`ov_${i}`}
                yAxisId="right"
                stroke={ov?.color || ovColors[i % ovColors.length]}
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
