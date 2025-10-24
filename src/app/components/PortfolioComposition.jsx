"use client";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { buildComposition } from "../../lib/analytics/composition";

const PALETTE = [
  "#60a5fa", "#22c55e", "#f59e0b", "#a78bfa", "#06b6d4",
  "#ef4444", "#10b981", "#f472b6", "#94a3b8",
];

const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
  }).format(v || 0);

const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;

export default function PortfolioComposition({
  groups = [],
  totalValue = 0,
  metaBySymbol = {},
}) {
  const [mode, setMode] = useState("symbol");
  const [activeIndex, setActiveIndex] = useState(null);

  const dataSymbol = useMemo(
    () => buildComposition(groups, { mode: "symbol", totalValue, topN: 9, metaBySymbol }),
    [groups, totalValue, metaBySymbol]
  );
  const dataAssetClass = useMemo(
    () => buildComposition(groups, { mode: "assetClass", totalValue, topN: 9, metaBySymbol }),
    [groups, totalValue, metaBySymbol]
  );
  const dataCountry = useMemo(
    () => buildComposition(groups, { mode: "country", totalValue, topN: 9, metaBySymbol }),
    [groups, totalValue, metaBySymbol]
  );
  const dataSector = useMemo(
    () => buildComposition(groups, { mode: "sector", totalValue, topN: 9, metaBySymbol }),
    [groups, totalValue, metaBySymbol]
  );

  const active =
    mode === "assetClass" ? dataAssetClass :
    mode === "sector"     ? dataSector     :
    mode === "country"    ? dataCountry    :
                            dataSymbol;

  const rows = active.rows;
  const chartData = rows.map((r, idx) => ({
    name: r.label,
    value: Number(r.value) || 0,
    pct: Number(r.pct) || 0,
    color: PALETTE[idx % PALETTE.length],
  }));

  return (
    <section className="card">
      <div className="card-inner">
        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
          <h3 className="h2">Skład portfela</h3>
          <div className="inline-flex rounded-lg overflow-hidden border border-zinc-700">
            {[
              { k: "symbol",     l: "Instrumenty" },
              { k: "assetClass", l: "Klasy" },
              { k: "sector",     l: "Sektory" },
              { k: "country",    l: "Kraje" },
            ].map((b) => (
              <button
                key={b.k}
                onClick={() => { setMode(b.k); setActiveIndex(null); }}
                className={[
                  "px-3 py-1.5 text-sm",
                  mode === b.k
                    ? "bg-yellow-600/70 text-black"
                    : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
                ].join(" ")}
              >
                {b.l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* wykres – duży i czytelny */}
          <div className="w-full h-72">
            <ResponsiveContainer>
              <PieChart aria-label="Skład portfela – wykres kołowy">
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  onMouseEnter={(_, idx) => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.color}
                      stroke={idx === activeIndex ? "#facc15" : "#1f2937"}
                      strokeWidth={idx === activeIndex ? 3 : 1}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                {/* DARK tooltip – jasny tekst, ciemne tło */}
                <Tooltip
                  formatter={(v, n, p) => [
                    `${fmtPLN(v)} (${fmtPct(p?.payload?.pct)})`,
                    p?.payload?.name,
                  ]}
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: 10,
                    color: "#e5e7eb",
                    padding: "8px 10px",
                    boxShadow: "0 8px 24px rgba(0,0,0,.45)",
                  }}
                  labelStyle={{ color: "#e5e7eb", marginBottom: 4 }}
                  itemStyle={{ color: "#e5e7eb" }}
                  wrapperStyle={{ outline: "none" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* tabela */}
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-400">
                <tr>
                  <th className="text-left font-normal py-1.5">Kategoria</th>
                  <th className="text-right font-normal py-1.5">Udział</th>
                  <th className="text-right font-normal py-1.5">Wartość</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.key} className="border-t border-zinc-800">
                    <td className="py-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                        style={{ background: PALETTE[idx % PALETTE.length] }}
                      />
                      {r.label}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{fmtPct(r.pct)}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmtPLN(r.value)}</td>
                  </tr>
                ))}
                <tr className="border-t border-zinc-800">
                  <td className="py-1.5 font-medium">Razem</td>
                  <td className="py-1.5 text-right tabular-nums font-medium">{fmtPct(100)}</td>
                  <td className="py-1.5 text-right tabular-nums font-medium">{fmtPLN(totalValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
