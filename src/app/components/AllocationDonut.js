"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#facc15", "#22c55e", "#60a5fa", "#a78bfa", "#f472b6", "#fb7185"];

// heurystyka kraju po tickerze Yahoo
function inferRegion(yahoo) {
  if (!yahoo) return "Inne";
  const s = String(yahoo).toUpperCase();
  if (s.endsWith(".WA")) return "Polska";
  if (!s.includes(".")) return "USA"; // brak kropki -> zwykle USA
  const suf = s.split(".").pop();
  if (["DE","PA","MI","BR","AS","MC","VI","F"].includes(suf)) return "Europa";
  if (["L"].includes(suf)) return "UK";
  if (["TO","NE"].includes(suf)) return "Kanada";
  if (["HK"].includes(suf)) return "Hongkong";
  if (["SZ"].includes(suf)) return "Szwajcaria";
  if (["SA"].includes(suf)) return "Brazylia";
  return "Inne";
}

/**
 * props:
 *  - holdings: [{id, pair:{yahoo}, shares, buyPrice, ...}]
 *  - quotes:   { [id]: { pricePLN? } }
 *  - series:   { [id]: { history:[{t, close}], shares } } // fallback ceny
 */
export default function AllocationDonut({ holdings = [], quotes = {}, series = {} , height = 260 }) {
  // policz aktualną wartość pozycji i zsumuj po regionie
  const acc = new Map(); // region -> valuePLN
  for (const h of holdings) {
    const q = quotes[h.id];
    const hist = series[h.id]?.history || [];
    const last = hist.length ? hist[hist.length - 1].close : null;
    const price = Number.isFinite(q?.pricePLN) ? q.pricePLN : (Number.isFinite(last) ? last : 0);
    const val = price * (Number(h.shares) || 0);

    const region = inferRegion(h?.pair?.yahoo);
    acc.set(region, (acc.get(region) || 0) + val);
  }

  const data = Array.from(acc.entries())
    .map(([name, value]) => ({ name, value }))
    .filter(d => d.value > 0)
    .sort((a,b) => b.value - a.value);

  const total = data.reduce((s,d)=>s+d.value,0);

  if (!total) {
    return (
      <div className="h-[220px] grid place-items-center text-sm text-zinc-400/70">
        Brak danych do alokacji.
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, n) => [
              new Intl.NumberFormat("pl-PL",{style:"currency",currency:"PLN",maximumFractionDigits:0}).format(v),
              n
            ]}
            contentStyle={{
              background: "rgba(24,24,27,0.95)",
              border: "1px solid rgba(63,63,70,0.7)",
              borderRadius: 10,
              padding: "8px 10px",
              color: "#e4e4e7",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
