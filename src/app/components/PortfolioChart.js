"use client";

import { useEffect, useMemo, useState } from "react";
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

const fmtCompact = (v) =>
  new Intl.NumberFormat("pl-PL", {
    notation: "compact",
    maximumFractionDigits: 1,
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
  /* ===== MOBILE ONLY: lepsza czytelność (bez ruszania desktopu) ===== */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(!!mq.matches);
    apply();

    // Safari fallback
    if (mq.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else {
      mq.addListener(apply);
      return () => mq.removeListener(apply);
    }
  }, []);

  const effectiveHeight = isMobile ? Math.max(height, 300) : height;

  const axisFont = isMobile ? 13 : 12;
  const xMinTickGap = isMobile ? 32 : 22;

  const yTickFormatter = useMemo(() => {
    if (!isMobile) return fmtPLN;
    return (v) => fmtCompact(v); // krócej na telefonie: "25 tys."
  }, [isMobile]);

  /* =======================
     1) PORTFEL (PLN) — suma
     z forward-fill’em i
     bez wiodących zer
     ======================= */
  const baseData = useMemo(() => {
    const seriesEntries = Object.entries(seriesBySymbol || {});
    if (!seriesEntries.length) return [];

    // 1) zbierz wszystkie daty
    const dates = new Set();
    for (const [, s] of seriesEntries) {
      for (const p of s?.history || []) if (p?.t) dates.add(p.t);
    }
    const allDates = Array.from(dates).sort();
    if (!allDates.length) return [];

    // 2) zbuduj mapy date->close dla szybkiego lookup (bez .find O(n^2))
    const mapByKey = new Map();
    for (const [key, s] of seriesEntries) {
      const m = new Map();
      for (const p of s?.history || []) {
        if (!p?.t) continue;
        const c = Number(p.close);
        if (Number.isFinite(c)) m.set(p.t, c);
      }
      mapByKey.set(key, m);
    }

    // 3) policz sumę dla każdej daty
    const raw = allDates.map((d) => {
      let total = 0;
      for (const [key, s] of seriesEntries) {
        const shares = Number(s?.shares) || 0;
        if (!(shares > 0)) continue;
        const c = mapByKey.get(key)?.get(d);
        if (Number.isFinite(c)) total += c * shares;
      }
      return { t: d, total: Number.isFinite(total) ? total : 0 };
    });

    // 4) odetnij wiodące zera
    let firstIdx = 0;
    while (firstIdx < raw.length && !(raw[firstIdx].total > 0)) firstIdx++;
    const trimmed = raw.slice(firstIdx);

    // 5) forward-fill "dziur" w środku
    const out = [];
    let last = 0;
    for (const row of trimmed) {
      if (row.total > 0) {
        last = row.total;
        out.push(row);
      } else if (last > 0) {
        out.push({ t: row.t, total: last });
      }
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
        if (Number.isFinite(c) && c > 0) {
          base = c;
          break;
        }
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

  // Desktop: zostaje jak było (prawa oś istnieje nawet bez overlay)
  // Mobile: chowamy prawą oś, jeśli nie ma overlay -> więcej miejsca na wykres
  const showRightAxis = !isMobile || (Array.isArray(overlays) && overlays.length > 0);

  return (
    <div style={{ height: effectiveHeight }}>
      {!hasData ? (
        <div className="h-full grid place-items-center text-sm text-zinc-400/70">
          Dodaj pozycję, aby zobaczyć wykres.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={mergedData}
            margin={{
              top: isMobile ? 14 : 10,
              right: isMobile ? 10 : 12,
              left: isMobile ? 8 : 8,
              bottom: isMobile ? 10 : 0,
            }}
          >
            <defs>
              <linearGradient id="portFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#facc15" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#facc15" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />

            <XAxis
              dataKey="t"
              tick={{ fill: "#a1a1aa", fontSize: axisFont }}
              tickFormatter={(iso) => formatAxisTick(iso, longRange)}
              minTickGap={xMinTickGap}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            />

            {/* Oś PLN (lewa) */}
            <YAxis
              domain={[Math.max(0, min - head), max + head]}
              tick={{ fill: "#a1a1aa", fontSize: axisFont }}
              tickFormatter={yTickFormatter}
              width={isMobile ? 48 : 76}
              yAxisId="left"
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            />

            {/* Oś % (prawa) dla benchmarków */}
            {showRightAxis && (
              <YAxis
                orientation="right"
                yAxisId="right"
                tick={{ fill: "#a1a1aa", fontSize: axisFont }}
                width={isMobile ? 44 : 50}
                tickFormatter={(v) => `${Number(v || 0).toFixed(0)}%`}
                domain={["dataMin - 5", "dataMax + 5"]}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
              />
            )}

            <Tooltip
              labelFormatter={(iso) => formatTooltipLabel(iso)}
              formatter={(v, name) => {
                if (String(name).startsWith("ov_")) {
                  return [`${Number(v).toFixed(1)}%`, "Benchmark"];
                }
                return [fmtPLN(v), "Wartość portfela"];
              }}
              contentStyle={{
                background: "rgba(24,24,27,0.96)",
                border: "1px solid rgba(63,63,70,0.75)",
                borderRadius: 12,
                padding: isMobile ? "10px 12px" : "8px 10px",
                color: "#e4e4e7",
                fontSize: isMobile ? 12 : 12,
                lineHeight: 1.25,
                maxWidth: isMobile ? 260 : 320,
                whiteSpace: "normal",
                wordBreak: "break-word",
                boxShadow: "0 12px 35px rgba(0,0,0,0.55)",
              }}
              labelStyle={{
                fontWeight: 700,
                color: "#f9fafb",
                marginBottom: 6,
              }}
              itemStyle={{
                paddingTop: 2,
                paddingBottom: 2,
              }}
              wrapperStyle={{
                outline: "none",
              }}
            />

            {/* PORTFEL */}
            <Area
              dataKey="total"
              yAxisId="left"
              type="monotone"
              stroke="#facc15"
              strokeWidth={2.2}
              fill="url(#portFill)"
              dot={false}
              isAnimationActive={false}
            />

            {/* BENCHMARKI */}
            {showRightAxis &&
              overlays.map((ov, i) => (
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
