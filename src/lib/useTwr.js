// src/lib/useTwr.js
import { buildPortfolioValueSeries, aggregateCashflowsForTWR, computeTWR } from "./twr";

/**
 * Wejście:
 * - seriesById: { [id]: { history:[{t,close}], shares:number } }
 * - holdings:   [{ id, shares, buyDate }]
 * - cashOps:    [{ date, amount, excludeFromTWR? }]
 *
 * Wyjście:
 * - { twr, twrPct, daily, values, cfSignUsed?, start, end }
 */
export default function useTwr({ seriesById, holdings, cashOps }) {
  const values = buildPortfolioValueSeries({ seriesById, holdings });
  const cfMap  = aggregateCashflowsForTWR(cashOps);
  const { daily, twr, start, end } = computeTWR({ values, cashflows: cfMap });

  // Mostek do konsoli – żeby NIE pisać "cashOps" ręcznie w konsoli
  if (typeof window !== "undefined") {
    window.__dbg = { values, cashOps };
    // jednorazowy log – nie przeszkodzi w prod
    if (!window.__twrLoggedOnce) {
      window.__twrLoggedOnce = true;
      console.log("[TWR] debug snapshot", window.__dbg);
    }
  }

  return { twr, twrPct: twr * 100, daily, values, start, end };
}
