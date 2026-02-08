"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

/* ====== formatery ====== */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(v)) ? Number(v) : 0);

const fmtPLN2 = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(v)) ? Number(v) : 0);

const fmtPct2 = (v) => `${Number(v || 0).toFixed(2)}%`;

function currentYM() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function isMapLike(x) {
  return x && typeof x.get === "function";
}

/* ✅ wykrycie mobile (pointer coarse) + fallback na touch */
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasTouch =
      typeof navigator !== "undefined" && (navigator.maxTouchPoints || 0) > 0;

    const mq = window.matchMedia ? window.matchMedia("(pointer: coarse)") : null;

    const update = () => {
      const mqCoarse = mq ? !!mq.matches : false;
      setCoarse(mqCoarse || hasTouch);
    };

    update();

    if (mq) {
      if (mq.addEventListener) mq.addEventListener("change", update);
      else mq.addListener(update);
      return () => {
        if (mq.removeEventListener) mq.removeEventListener("change", update);
        else mq.removeListener(update);
      };
    }
  }, []);
  return coarse;
}

/* ====== Tooltip ====== */
function TooltipContent({ active, payload, label, mode, onClose }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const isPosMonth = (mode === "PCT" ? Number(row.pct) : Number(row.pnl)) >= 0;

  const monthVal = mode === "PCT" ? fmtPct2(row.pct) : fmtPLN2(row.pnl);

  const best = mode === "PCT" ? row.bestR : row.bestDay;
  const worst = mode === "PCT" ? row.worstR : row.worstDay;

  const bestVal =
    mode === "PCT" ? fmtPct2((best?.r || 0) * 100) : fmtPLN2(best?.pnl || 0);

  const worstVal =
    mode === "PCT" ? fmtPct2((worst?.r || 0) * 100) : fmtPLN2(worst?.pnl || 0);

  const bestHint = isPosMonth ? "największy zysk" : "najmniejsza strata";
  const worstHint = "największa strata";

  return (
    <div className="relative rounded-xl border border-zinc-700 bg-zinc-950/95 px-4 py-3 text-sm text-zinc-100 shadow-lg max-w-[88vw] sm:max-w-none break-words">
      {/* X — mobile */}
      {typeof onClose === "function" ? (
        <button
          type="button"
          className="sm:hidden absolute top-2 right-2 w-9 h-9 grid place-items-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200 active:scale-[0.98]"
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

      <div className="text-base font-semibold mb-2 pr-10">{label}</div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-6">
        <span className="text-zinc-300">
          {mode === "PCT" ? "Zwrot miesiąca" : "Wynik miesiąca"}
        </span>
        <span className="tabular-nums text-base font-semibold">{monthVal}</span>
      </div>

      <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-6">
        <span className="text-zinc-300">
          Najlepszy dzień <span className="text-zinc-500">({bestHint})</span>
        </span>
        <span className="tabular-nums">
          {best?.t ? `${best.t} • ` : ""}
          <span className="font-semibold">{bestVal}</span>
        </span>
      </div>

      <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-6">
        <span className="text-zinc-300">
          Najgorszy dzień <span className="text-zinc-500">({worstHint})</span>
        </span>
        <span className="tabular-nums">
          {worst?.t ? `${worst.t} • ` : ""}
          <span className="font-semibold">{worstVal}</span>
        </span>
      </div>

      {row.isCurrent ? (
        <div className="mt-2 text-xs text-zinc-400">
          Bieżący miesiąc (niepełny) — pokazany jaśniej
        </div>
      ) : null}
    </div>
  );
}

export default function MonthlyPnLBarChart({
  title = "Zyski/Straty miesięczne",
  axisDays = [],
  valuesAligned = [],
  cashPerDay = null,
  dailyReturns = null,
  defaultRange = "1R",
  defaultMode = "PLN",
  rangeOptions = null,
}) {
  const isCoarse = useCoarsePointer();

  // ✅ mobile: tap = przypnij tooltip, tap inny słupek = przełącz, tap tło = zamknij
  const [pinned, setPinned] = useState(null); // {label, payload}

  const PRESETS = useMemo(
    () => [
      { k: "6M", label: "6M" },
      { k: "YTD", label: "YTD" },
      { k: "1R", label: "1R" },
      { k: "3L", label: "3L" },
      { k: "MAX", label: "MAX" },
    ],
    []
  );

  const allowed = useMemo(() => {
    if (Array.isArray(rangeOptions) && rangeOptions.length) return rangeOptions;
    return PRESETS.map((x) => x.k);
  }, [rangeOptions, PRESETS]);

  const presetButtons = useMemo(
    () => PRESETS.filter((x) => allowed.includes(x.k)),
    [PRESETS, allowed]
  );

  const lockedRange = presetButtons.length <= 1;

  const [range, setRange] = useState(() => {
    const init = allowed.includes(defaultRange) ? defaultRange : allowed[0] || "1R";
    return init;
  });
  const [mode, setMode] = useState(defaultMode);

  useEffect(() => {
    const next = allowed.includes(range) ? range : allowed[0] || "1R";
    if (next !== range) setRange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed.join("|")]);

  // ✅ po zmianie trybu/zakresu zamknij przypięty tooltip
  useEffect(() => {
    setPinned(null);
  }, [mode, range]);

  const ymNow = useMemo(() => currentYM(), []);

  const monthly = useMemo(() => {
    const days = Array.isArray(axisDays) ? axisDays : [];
    if (!days.length) return [];

    const vMap = new Map(
      (valuesAligned || [])
        .map((p) => [p?.t, Number(p?.value) || 0])
        .filter(([t]) => !!t)
    );

    const firstPosDay = days.find((d) => (vMap.get(d) ?? 0) > 0);
    if (!firstPosDay) return [];
    const startIdx = Math.max(1, days.indexOf(firstPosDay));

    const rByDay = new Map();
    if (Array.isArray(dailyReturns)) {
      for (const x of dailyReturns) {
        const t = x?.t;
        if (!t) continue;
        rByDay.set(t, Number(x?.r) || 0);
      }
    }

    const cfGet = (d) => {
      if (!cashPerDay) return 0;
      if (isMapLike(cashPerDay)) return Number(cashPerDay.get(d) || 0) || 0;
      return Number(cashPerDay[d] || 0) || 0;
    };

    const daily = [];
    for (let i = startIdx; i < days.length; i++) {
      const t = days[i];
      const prev = days[i - 1];
      if (!t || !prev) continue;

      const Vprev = vMap.get(prev) ?? 0;
      const Vt = vMap.get(t) ?? 0;

      const r = rByDay.has(t) ? (Number(rByDay.get(t)) || 0) : null;

      let pnl = 0;
      if (r != null) pnl = (Number(Vprev) || 0) * (Number(r) || 0);
      else {
        const cf = cfGet(t);
        pnl = (Vt - Vprev - cf) || 0;
      }

      daily.push({
        t,
        pnl,
        r: r != null ? r : (Vprev > 0 ? pnl / Vprev : 0),
      });
    }

    const byMonth = new Map();
    const init = (ym) => ({
      ym,
      pnl: 0,
      retMult: 1,
      bestDay: { t: null, pnl: 0 },
      worstDay: { t: null, pnl: 0 },
      bestR: { t: null, r: 0 },
      worstR: { t: null, r: 0 },
      isCurrent: ym === ymNow,
      _has: false,
    });

    for (const d of daily) {
      const ym = String(d.t || "").slice(0, 7);
      if (!ym) continue;

      if (!byMonth.has(ym)) byMonth.set(ym, init(ym));
      const m = byMonth.get(ym);

      const pnl = Number(d.pnl) || 0;
      const r = Number(d.r) || 0;

      m.pnl += pnl;
      m.retMult *= 1 + r;

      if (!m._has) {
        m.bestDay = { t: d.t, pnl };
        m.worstDay = { t: d.t, pnl };
        m.bestR = { t: d.t, r };
        m.worstR = { t: d.t, r };
        m._has = true;
        continue;
      }

      if (pnl > (Number(m.bestDay.pnl) || 0)) m.bestDay = { t: d.t, pnl };
      if (pnl < (Number(m.worstDay.pnl) || 0)) m.worstDay = { t: d.t, pnl };

      if (r > (Number(m.bestR.r) || 0)) m.bestR = { t: d.t, r };
      if (r < (Number(m.worstR.r) || 0)) m.worstR = { t: d.t, r };
    }

    const arr = Array.from(byMonth.values())
      .map((m) => ({
        ym: m.ym,
        pnl: m.pnl,
        pct: (m.retMult - 1) * 100,
        bestDay: m.bestDay,
        worstDay: m.worstDay,
        bestR: m.bestR,
        worstR: m.worstR,
        isCurrent: m.isCurrent,
      }))
      .sort((a, b) => String(a.ym).localeCompare(String(b.ym)));

    if (!arr.length) return arr;

    const takeLast = (n) => (arr.length <= n ? arr : arr.slice(arr.length - n));

    if (range === "6M") return takeLast(6);
    if (range === "1R") return takeLast(12);
    if (range === "3L") return takeLast(36);
    if (range === "YTD") {
      const y = String(new Date().getFullYear());
      return arr.filter((m) => String(m.ym).startsWith(y + "-"));
    }
    return arr;
  }, [axisDays, valuesAligned, cashPerDay, dailyReturns, range, ymNow]);

  const colors = useMemo(
    () => ({
      pos: "#22c55e",
      neg: "#ef4444",
      posLight: "#86efac",
      negLight: "#fca5a5",
    }),
    []
  );

  const dataKey = mode === "PCT" ? "pct" : "pnl";

  // ✅ pewny handler tapnięcia słupka (działa na mobile bez hover)
  const handleBarTap = (row, index, evt) => {
    if (!isCoarse) return;
    try {
      evt?.stopPropagation?.();
    } catch {}

    if (!row) return;

    setPinned((prev) => {
      const same = prev?.label === row.ym;
      if (same) return null;
      return {
        label: row.ym,
        payload: [{ payload: row }],
      };
    });
  };

  return (
    <section className="card mt-4">
      <div className="card-inner !p-2 sm:!p-5">
        <h3 className="h2 mb-2">{title}</h3>

        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400">
              {lockedRange ? "Zakres" : "Sterowanie wykresem"}
            </span>

            {lockedRange ? (
              <span className="px-2.5 py-1 rounded-lg border text-xs sm:text-sm bg-yellow-600/70 border-yellow-500 text-black">
                {presetButtons[0]?.label || range || "1R"}
              </span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {presetButtons.map((x) => (
                  <button
                    key={x.k}
                    onClick={() => setRange(x.k)}
                    className={[
                      "px-2.5 py-1 rounded-lg border text-xs sm:text-sm",
                      range === x.k
                        ? "bg-yellow-600/70 border-yellow-500 text-black"
                        : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                    ].join(" ")}
                    aria-pressed={range === x.k}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <div className="inline-flex rounded-lg overflow-hidden border border-zinc-700">
              {[
                { k: "PLN", label: "PLN" },
                { k: "PCT", label: "%" },
              ].map((x) => (
                <button
                  key={x.k}
                  onClick={() => setMode(x.k)}
                  className={[
                    "px-3 py-1.5 text-xs sm:text-sm",
                    mode === x.k
                      ? "bg-yellow-600/70 text-black"
                      : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
                  ].join(" ")}
                  aria-pressed={mode === x.k}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ✅ mobile: przypinany tooltip */}
        <div
          className="relative w-full h-64 sm:h-72"
          style={{ touchAction: "pan-y" }}
          onClick={() => {
            if (isCoarse && pinned) setPinned(null); // tap na tło zamyka
          }}
        >
          {isCoarse && pinned ? (
            <div
              className="absolute left-1/2 -translate-x-1/2 top-4 z-[70]"
              onClick={(e) => {
                e.stopPropagation(); // klik w tooltip nie zamyka
              }}
            >
              <TooltipContent
                active
                payload={pinned.payload}
                label={pinned.label}
                mode={mode}
                onClose={() => setPinned(null)}
              />
            </div>
          ) : null}

          <ResponsiveContainer>
            <BarChart data={monthly} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="ym" tick={{ fontSize: 11 }} minTickGap={14} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 11 }}
                width={70}
                tickFormatter={(v) =>
                  mode === "PCT"
                    ? `${Number(v || 0).toFixed(0)}%`
                    : new Intl.NumberFormat("pl-PL").format(v)
                }
              />
              <ReferenceLine y={0} stroke="#ffffff" strokeOpacity={0.15} />

              {/* desktop: normalny tooltip */}
              {!isCoarse ? (
                <Tooltip
                  wrapperStyle={{ zIndex: 60, outline: "none" }}
                  allowEscapeViewBox={{ x: false, y: false }}
                  content={(props) => <TooltipContent {...props} mode={mode} onClose={null} />}
                />
              ) : null}

              <Bar
                dataKey={dataKey}
                radius={[6, 6, 6, 6]}
                onClick={handleBarTap}
              >
                {monthly.map((m, idx) => {
                  const val = Number(m[dataKey]) || 0;
                  const isPos = val >= 0;
                  const fill = m.isCurrent
                    ? isPos
                      ? colors.posLight
                      : colors.negLight
                    : isPos
                    ? colors.pos
                    : colors.neg;
                  return <Cell key={`c-${idx}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 text-[11px] text-zinc-400">
          Sposób liczenia (PLN): suma{" "}
          <span className="tabular-nums">r(t) × V(t-1)</span> (czysty wynik rynkowy, bez wpłat/zakupów)
        </div>
      </div>
    </section>
  );
}
