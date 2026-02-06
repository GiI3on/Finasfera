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
import { useEffect, useMemo, useRef, useState } from "react";

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
const fmtYAxis = (v) => fmtCompactPL(v);

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

/* Równy, „ładny” rozkład lat */
function pickYearTicks(minYear, maxYear) {
  const span = Math.max(1, maxYear - minYear);
  const target = span > 20 ? 5 : 8;
  let step = Math.max(1, Math.round(span / target));
  const candidates = [1, 2, 3, 4, 5, 10];
  const best = candidates.find((k) => span % k === 0 && k >= step);
  if (best) step = best;

  const ticks = [];
  for (let y = minYear; y <= maxYear; y += step) ticks.push(y);
  if (ticks[ticks.length - 1] !== maxYear) ticks.push(maxYear);
  return ticks;
}

/* Wykrywanie telefonu/tabletu */
function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setIsTouch(!!mq.matches);

    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return isTouch;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* Wyciąga clientX/clientY z eventu (touch / mouse / pointer) */
function getClientPoint(e) {
  const ne = e?.nativeEvent ?? e;
  const t = ne?.touches?.[0] ?? ne?.changedTouches?.[0];
  if (t) return { cx: t.clientX, cy: t.clientY };
  if (typeof ne?.clientX === "number" && typeof ne?.clientY === "number") return { cx: ne.clientX, cy: ne.clientY };
  return null;
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

  /* Interaktywna legenda */
  const [show, setShow] = useState({ cap: true, contrib: true });
  const toggle = (k) => setShow((s) => ({ ...s, [k]: !s[k] }));

  const isTouch = useIsTouch();
  const wrapRef = useRef(null);
  const tipRef = useRef(null);

  const [tapTip, setTapTip] = useState(null); // { index, x, y }
  const [tipSize, setTipSize] = useState({ w: 230, h: 120 });

  const tapped = tapTip ? data[tapTip.index] : null;

  // mierzymy realny rozmiar dymka (żeby clamp był idealny)
  useEffect(() => {
    if (!isTouch || !tapTip) return;
    const el = tipRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r?.width && r?.height) setTipSize({ w: r.width, h: r.height });
  }, [isTouch, tapTip, show.cap, show.contrib]);

  // zamknij tooltip po kliknięciu poza wykresem (mobile)
  useEffect(() => {
    if (!isTouch || !tapTip) return;

    const handler = (e) => {
      const el = wrapRef.current;
      if (!el) return;
      if (!el.contains(e.target)) setTapTip(null);
    };

    document.addEventListener("pointerdown", handler, { passive: true });
    document.addEventListener("touchstart", handler, { passive: true });
    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("pointerdown", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("mousedown", handler);
    };
  }, [isTouch, tapTip]);

  // jak przełączasz serie – schowaj dymek
  useEffect(() => {
    setTapTip(null);
  }, [show.cap, show.contrib, isTouch]);

  // ✅ najważniejszy fix: bierzemy pozycję z activeCoordinate lub z eventu
  const handleChartTap = (state, e) => {
    if (!isTouch) return;

    const idx = state?.activeTooltipIndex;

    if (idx == null || idx < 0) {
      setTapTip(null);
      return;
    }

    const el = wrapRef.current;
    const rect = el?.getBoundingClientRect();
    const w = rect?.width || 0;
    const h = rect?.height || 0;

    // 1) najlepsze: activeCoordinate z recharts
    let x = state?.activeCoordinate?.x;
    let y = state?.activeCoordinate?.y;

    // 2) fallback: policz z eventu
    if (!(typeof x === "number" && typeof y === "number")) {
      const p = getClientPoint(e);
      if (p && rect) {
        x = p.cx - rect.left;
        y = p.cy - rect.top;
      }
    }

    // 3) ostateczny fallback (ale już prawie nie powinien się zdarzyć)
    if (!(typeof x === "number" && typeof y === "number")) {
      x = w / 2;
      y = h / 2;
    }

    x = clamp(x, 0, w);
    y = clamp(y, 0, h);

    setTapTip({ index: idx, x, y });
  };

  if (!hasData) {
    return (
      <div className={`grid place-items-center h-full min-h-[220px] rounded-xl bg-zinc-900/40 ring-1 ring-zinc-700/50 ${className}`}>
        <p className="text-sm text-zinc-500 text-center px-4">
          Podaj dane i kliknij „Sprawdź swoją drogę”
        </p>
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

  const rect = wrapRef.current?.getBoundingClientRect();
  const W = rect?.width || 0;
  const H = rect?.height || 0;

  const PAD = 10;
  const tipW = tipSize.w || 230;
  const tipH = tipSize.h || 120;

  const x = tapTip?.x ?? 0;
  const y = tapTip?.y ?? 0;

  const placeAbove = y > tipH + 24;

  const left = W ? clamp(x, tipW / 2 + PAD, W - tipW / 2 - PAD) : x;

  const top = (() => {
    if (!W || !H) return y;

    if (placeAbove) {
      // dymek nad punktem (top to punkt zaczepienia)
      return clamp(y - 10, tipH + PAD, H - PAD);
    }
    // dymek pod punktem (top to górna krawędź dymka)
    return clamp(y + 12, PAD, H - tipH - PAD);
  })();

  const transform = placeAbove ? "translate(-50%, -100%)" : "translate(-50%, 0)";

  return (
    <>
      <style jsx global>{`
        .recharts-wrapper, .recharts-surface, .recharts-layer { outline: none !important; }
      `}</style>

      <figure
        className={`w-full h-full flex flex-col rounded-xl bg-transparent ${className}`}
        style={{ touchAction: "pan-y" }}
      >
        <figcaption className="px-2 pb-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400 select-none shrink-0">
          <Legend label="Kapitał" color={COL_CAPITAL} active={show.cap} onClick={() => toggle("cap")} />
          <Legend label="Suma wpłat" color={COL_CONTRIB} dash active={show.contrib} onClick={() => toggle("contrib")} />
          <span className="ml-auto hidden sm:block text-zinc-600">{title}</span>
        </figcaption>

        <div ref={wrapRef} className="flex-1 min-h-0 w-full relative" aria-label={title}>
          {/* MOBILE tooltip przy punkcie */}
          {isTouch && tapTip && tapped && (
            <>
              {/* punkt zaznaczenia (już nie będzie na środku, tylko tam gdzie tapniesz) */}
              <div
                className="absolute z-[190] w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_0_3px_rgba(250,204,21,0.18)]"
                style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
              />

              <div
                ref={tipRef}
                className="absolute z-[200] max-w-[78vw] w-[230px] rounded-[12px] border border-zinc-700/70 bg-zinc-900/95 px-3 py-2 text-xs text-zinc-200 shadow-2xl"
                style={{ left, top, transform }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* strzałka */}
                <div
                  className="absolute left-1/2 w-3 h-3 bg-zinc-900/95 border border-zinc-700/70 rotate-45"
                  style={{
                    transform: "translateX(-50%) rotate(45deg)",
                    top: placeAbove ? "auto" : -6,
                    bottom: placeAbove ? -6 : "auto",
                  }}
                />

                <div className="flex items-start justify-between gap-2 relative">
                  <div className="text-zinc-300">
                    <span className="text-zinc-400">Rok:</span> {tapped.label}
                  </div>
                  <button
                    type="button"
                    className="w-6 h-6 -mr-1 -mt-1 rounded-full bg-zinc-800/70 text-zinc-300 hover:text-white grid place-items-center"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTapTip(null);
                    }}
                    aria-label="Zamknij"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-2 space-y-1 relative">
                  {show.cap && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <span className="inline-block w-3 h-[2px]" style={{ background: COL_CAPITAL }} />
                        Kapitał
                      </div>
                      <div className="text-zinc-100 font-medium">{fmtPLN(tapped.cap)}</div>
                    </div>
                  )}

                  {show.contrib && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <span className="inline-block w-3 h-[2px]" style={{ borderTop: `2px dashed ${COL_CONTRIB}` }} />
                        Suma wpłat
                      </div>
                      <div className="text-zinc-100 font-medium">{fmtPLN(tapped.contrib)}</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 0, bottom: 0, left: -10 }}
              onClick={handleChartTap}   // 👈 tu recharts poda state + event
              onTouchStart={handleChartTap} // 👈 dodatkowo, dla pewności na mobile
            >
              <defs>
                <linearGradient id="capFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COL_CAPITAL} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={COL_CAPITAL} stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />

              <XAxis
                type="number"
                dataKey="year"
                domain={[minYear, maxYear]}
                ticks={xTicks}
                tickFormatter={(v) => String(v)}
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickMargin={8}
                padding={{ left: 10, right: 10 }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                type="number"
                ticks={ticks}
                domain={[niceMin, niceMax]}
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickFormatter={fmtYAxis}
                width={40}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />

              {/* DESKTOP: normalny tooltip na hover */}
              {!isTouch && (
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.16)" }}
                  contentStyle={{
                    background: "rgba(24,24,27,0.95)",
                    border: "1px solid rgba(63,63,70,0.7)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    color: "#e4e4e7",
                    fontSize: "12px",
                    lineHeight: "1.4",
                  }}
                  wrapperStyle={{ zIndex: 100 }}
                  labelFormatter={(_, payload) => `Rok: ${payload?.[0]?.payload?.label ?? ""}`}
                  formatter={(val, name, ctx) => {
                    const map = { cap: "Kapitał", contrib: "Suma wpłat" };
                    const label = map[ctx.dataKey] ?? name;
                    return [fmtPLN(val), label];
                  }}
                />
              )}

              {show.cap && (
                <Area
                  type="monotone"
                  dataKey="cap"
                  stroke={COL_CAPITAL}
                  strokeWidth={2}
                  strokeLinecap="round"
                  fill="url(#capFill)"
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1000}
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
                  isAnimationActive={true}
                  animationDuration={1000}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </>
  );
}

/* Element legendy */
function Legend({ label, color, dash = false, active = true, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border border-transparent ${
        active ? "bg-zinc-800/60 opacity-100" : "opacity-50 hover:bg-zinc-800/30"
      }`}
      title={active ? "Kliknij, aby ukryć" : "Kliknij, aby pokazać"}
    >
      <span
        className="inline-block"
        style={{
          width: 16,
          height: 0,
          borderTop: `2px ${dash ? "dashed" : "solid"} ${color}`,
        }}
      />
      <span>{label}</span>
    </button>
  );
}
