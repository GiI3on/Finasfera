"use client";
import { fmtPLN, fmtPct } from "./fmt";

export default function KpiPeriodSection({
  rangeKey,
  periodReturnPct,
  dailyChangePct,
  dailyProfitPLN,
  monthsPlusMinus,
  winRate,
  volAnn,
  sharpeAnn,
  rfAnnual,
  rfAsOf,
}) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-4">
      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">Zwrot w okresie <span className="opacity-60">({rangeKey})</span></div>
          <div className={`text-3xl font-semibold tabular-nums ${periodReturnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {fmtPct(periodReturnPct)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">Zmiana dzienna <span className="opacity-60">({rangeKey})</span></div>
          <div className={`text-3xl font-semibold tabular-nums ${dailyChangePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {fmtPct(dailyChangePct)}
          </div>
          <div className="text-xs text-zinc-400">Czysty dzienny zwrot</div>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">Zysk dzienny <span className="opacity-60">({rangeKey})</span></div>
          <div className={`text-3xl font-semibold tabular-nums ${dailyProfitPLN >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {fmtPLN(dailyProfitPLN)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">Miesiące + / − <span className="opacity-60">({rangeKey})</span></div>
          <div className="text-3xl font-semibold tabular-nums">
            <span className="text-emerald-400">{monthsPlusMinus.plus}</span>
            {" / "}
            <span className="text-red-400">{monthsPlusMinus.minus}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">Skuteczność dni <span className="opacity-60">({rangeKey})</span></div>
          <div className="text-3xl font-semibold tabular-nums">{fmtPct((winRate || 0) * 100)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">Zmienność roczna <span className="opacity-60">({rangeKey})</span></div>
          <div className="text-3xl font-semibold tabular-nums">
            {fmtPct((volAnn || 0) * 100)}
          </div>
          <div className="text-xs text-zinc-400">Odchylenie dzienne × √252</div>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">Sharpe <span className="opacity-60">({rangeKey}, RF=WIRON 1M)</span></div>
          <div className="text-3xl font-semibold tabular-nums">
            {Number.isFinite(sharpeAnn) ? sharpeAnn.toFixed(2) : "—"}
          </div>
          <div className="text-xs text-zinc-400">
            RF (rocznie): {(rfAnnual * 100).toFixed(2)}%{rfAsOf ? ` · ${rfAsOf}` : ""}
          </div>
        </div>
      </div>
    </section>
  );
}
