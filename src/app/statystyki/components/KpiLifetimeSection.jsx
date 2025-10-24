"use client";
import { fmtPLN, fmtPct } from "./fmt";

export default function KpiLifetimeSection({
  axisDailyAllLength,
  portfolioCAGR_LIFETIME,
  lastValueNow,
  firstNonZeroAll,
  mddLifetime,
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">
            Śr. roczna stopa zwrotu (CAGR)
            <span className="opacity-60"> {axisDailyAllLength - 1 < 365 ? "• nieannualizowane <1R" : ""}</span>
          </div>
          <div className={`text-3xl font-semibold tabular-nums ${portfolioCAGR_LIFETIME >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {fmtPct((portfolioCAGR_LIFETIME || 0) * 100)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">Wartość portfela (teraz)</div>
          <div className="text-3xl font-semibold tabular-nums">{fmtPLN(lastValueNow)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">Całkowity zysk (od startu)</div>
          <div className={`text-3xl font-semibold tabular-nums ${(lastValueNow - firstNonZeroAll) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {fmtPLN(lastValueNow - firstNonZeroAll)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">Max Drawdown (od startu)</div>
          <div className="text-3xl font-semibold tabular-nums text-red-400">
            {fmtPct((mddLifetime || 0) * 100)}
          </div>
        </div>
      </div>
    </section>
  );
}
