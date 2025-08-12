"use client";

import { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 })
    .format(Math.round(v || 0));

const MONTHS = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
const fmtTickDate = (iso) => {
  // iso = YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  const mm = MONTHS[(m - 1) % 12];
  if (d === 1) return `${mm} ${y}`;    // 1 dzień miesiąca → "maj 2025"
  return `${d} ${mm}`;                 // w środku miesiąca → "14 lip"
};

export default function PortfolioChart({ seriesBySymbol = {}, height = 220 }) {
  const data = useMemo(() => {
    const dates = new Set();
    Object.values(seriesBySymbol).forEach(({ history }) => (history || []).forEach(p => dates.add(p.t)));
    const allDates = Array.from(dates).sort();
    const out = allDates.map(d => {
      let total = 0;
      for (const key in seriesBySymbol) {
        const { history, shares } = seriesBySymbol[key] || {};
        const p = (history || []).find(x => x.t === d);
        if (p) total += (p.close || 0) * (shares || 0);
      }
      return { t: d, total };
    }).filter(p => Number.isFinite(p.total));
    return out;
  }, [seriesBySymbol]);

  if (!data.length) {
    return <div className="h-[220px] grid place-items-center text-sm text-zinc-400/70">Dodaj pozycję, aby zobaczyć wykres.</div>;
  }

  const min = Math.min(...data.map(d => d.total));
  const max = Math.max(...data.map(d => d.total));
  const head = Math.max(1, max * 0.06);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="portFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#facc15" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#facc15" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="t" tick={{ fill: "#a1a1aa", fontSize: 12 }} tickFormatter={fmtTickDate} />
          <YAxis
            domain={[Math.max(0, min - head), max + head]}
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            tickFormatter={fmtPLN}
            width={76}
          />
          <Tooltip
            labelFormatter={(d)=>`Data: ${d}`}
            formatter={(v)=>[fmtPLN(v),"Wartość portfela"]}
            contentStyle={{ background: "rgba(24,24,27,0.95)", border: "1px solid rgba(63,63,70,0.7)", borderRadius: 10, padding: "8px 10px", color: "#e4e4e7" }}
          />
          <Area dataKey="total" type="monotone" stroke="#facc15" strokeWidth={2} fill="url(#portFill)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
