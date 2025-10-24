"use client";

/**
 * TwrKpi – gotowy kafelek KPI dla TWR.
 * Oczekuje:
 *  - seriesById: { [holdingId]: { history:[{t,close}], shares:number } }
 *  - holdings:   [{ id, shares, buyDate }]
 *  - cashOps:    [{ date, amount, excludeFromTWR? }]
 *
 * Użycie (w dowolnym ekranie, np. Statystyki):
 *   <TwrKpi seriesById={seriesMap} holdings={holdings} cashOps={cashOps} />
 */

import useTwr from "../../lib/useTwr";

export default function TwrKpi({
  seriesById = {},
  holdings = [],
  cashOps = [],
  label = "TWR (od YTD)",
}) {
  const { twrPct } = useTwr({ seriesById, holdings, cashOps });

  const color =
    twrPct >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <div className="card">
      <div className="card-inner">
        <div className="muted text-sm">{label}</div>
        <div className={`text-3xl font-semibold tabular-nums ${color}`}>
          {Number.isFinite(twrPct) ? `${twrPct.toFixed(2)}%` : "—"}
        </div>
      </div>
    </div>
  );
}
