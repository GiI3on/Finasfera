"use client";
import BenchmarksManagerInline from "./BenchmarksManagerInline";
import { BENCHES, getBenchColor } from "../../../lib/benchmarks";

export default function BenchmarksBar({
  selectedBenches,
  setSelectedBenches,
  customDefs,
  onAddCustom,
  benchCAGR,
  benchMeta,
  rangeKey,
  chartSeries,       // { mode, data }
  benchSeries,       // { [key]: aligned[] }
  valueSeriesChart,  // do eksportu wartości
  showMgr,
  setShowMgr,
}) {
  return (
    <section className="flex items-center flex-wrap gap-2 mb-2">
      <span className="muted text-sm">Benchmark:</span>

      {selectedBenches.map((k) => {
        const def = BENCHES.find((b) => b.key === k);
        const custom = customDefs.find((d) => d.key === k);
        const label = custom?.label || def?.label || k;
        return (
          <span
            key={k}
            className="px-2.5 py-1.5 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-100 text-sm inline-flex items-center gap-2"
            title={[
              Number.isFinite(benchCAGR[k]) ? `CAGR (${rangeKey}): ${(benchCAGR[k]*100).toFixed(2)}%` : (benchMeta[k]?.noData ? "Brak danych" : ""),
              benchMeta[k]?.used ? `Źródło: ${benchMeta[k]?.used}` : "",
              benchMeta[k]?.disclaimer ? benchMeta[k]?.disclaimer : "",
            ].filter(Boolean).join(" • ")}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: getBenchColor(k) }} />
            {label}
            {benchMeta[k]?.noData ? <span className="text-orange-300">⚠︎</span> : null}
            <button
              className="ml-1 text-zinc-400 hover:text-zinc-200"
              onClick={() => setSelectedBenches((prev) => prev.filter((x) => x !== k))}
              aria-label={`Usuń ${label}`}
            >
              ✕
            </button>
          </span>
        );
      })}

      <button
        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 hover:bg-zinc-800"
        onClick={() => setShowMgr(true)}
      >
        Zmień benchmarki…
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 hover:bg-zinc-800"
          onClick={() => {
            const rows = [
              ["date", "portfolio_value_pln"],
              ...valueSeriesChart.map((p) => [p.t, String(p.value)]),
            ];
            const csv = rows.map((r) => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "portfolio_values.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Eksport wartości (CSV)
        </button>

        <button
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 hover:bg-zinc-800"
          onClick={() => {
            const keys = Object.keys(benchSeries);
            const header = ["date", ...keys.map((k) => `${k}_pct`)];
            const rows = [header];
            for (const row of chartSeries.data) {
              const r = [row.t];
              for (const k of keys) r.push(row[`${k}Pct`] == null ? "" : Number(row[`${k}Pct`]).toFixed(4));
              rows.push(r);
            }
            const csv = rows.map((r) => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "benchmarks_pct.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Eksport benchmarków (CSV)
        </button>
      </div>

      <BenchmarksManagerInline
        open={showMgr}
        onClose={() => setShowMgr(false)}
        selected={selectedBenches}
        onChange={setSelectedBenches}
        onAddCustom={onAddCustom}
      />
    </section>
  );
}
