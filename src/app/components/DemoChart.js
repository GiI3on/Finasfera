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
  Legend,
} from "recharts";

// ====== surowe dane indeksowe (100 = punkt startu) ======
const RAW_SERIES = [
  { year: "2019", demo: 100, spx: 100 },
  { year: "2020", demo: 112, spx: 108 },
  { year: "2021", demo: 140, spx: 121 },
  { year: "2022", demo: 118, spx: 115 },
  { year: "2023", demo: 155, spx: 132 },
];

// przeliczamy na zmianę % od 2019
const DEMO_DATA = RAW_SERIES.map((row, idx) => {
  if (idx === 0) {
    return { t: row.year, demo: 0, spx: 0 };
  }
  const baseDemo = RAW_SERIES[0].demo;
  const baseSpx = RAW_SERIES[0].spx;

  const demoPct = (row.demo / baseDemo - 1) * 100;
  const spxPct = (row.spx / baseSpx - 1) * 100;

  return {
    t: row.year,
    demo: Number.isFinite(demoPct) ? demoPct : 0,
    spx: Number.isFinite(spxPct) ? spxPct : 0,
  };
});

// mała pomocnicza domena dla osi Y (trochę zapasu na górze/dole)
function getYDomain(data) {
  if (!data || !data.length) return [-10, 40];
  let min = Infinity;
  let max = -Infinity;
  for (const d of data) {
    min = Math.min(min, d.demo, d.spx);
    max = Math.max(max, d.demo, d.spx);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [-10, 40];
  const pad = Math.max(5, (max - min) * 0.15);
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}

export default function DemoChart({ height = 220 }) {
  // liczymy domenę wewnątrz komponentu, żeby mieć max do formatowania ticków
  const yDomain = getYDomain(DEMO_DATA);
  const maxY = yDomain[1];

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={DEMO_DATA}
          margin={{ top: 24, right: 16, left: 0, bottom: 28 }}
        >
          {/* gradient pod „Portfel demo” */}
          <defs>
            <linearGradient id="demoFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#facc15" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#facc15" stopOpacity={0.04} />
            </linearGradient>
          </defs>

          {/* delikatna siatka */}
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />

          {/* Oś X – lata */}
          <XAxis
            dataKey="t"
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
          />

          {/* Oś Y – % (bez napisu na najwyższym ticku) */}
          <YAxis
            domain={yDomain}
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            tickFormatter={(v) =>
              v >= maxY ? "" : `${Number(v || 0).toFixed(0)}%`
            }
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
            width={50}
          />

          {/* Czytelna legenda */}
          <Legend
            verticalAlign="top"
            align="left"
            iconType="circle"
            wrapperStyle={{
              paddingLeft: 32,
              paddingTop: 2,
              fontSize: 11,
              color: "#e4e4e7",
            }}
            formatter={(value) =>
              value === "demo" ? "Portfel demo" : "S&P 500 (indeks)"
            }
          />

          {/* Custom tooltip – ładny balonik z wartościami */}
          <Tooltip
            cursor={{ stroke: "rgba(250,204,21,0.5)", strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              const demo = payload.find((p) => p.dataKey === "demo");
              const spx = payload.find((p) => p.dataKey === "spx");

              return (
                <div
                  style={{
                    background: "rgba(24,24,27,0.96)",
                    border: "1px solid rgba(63,63,70,0.8)",
                    borderRadius: 10,
                    padding: "8px 10px",
                    color: "#e4e4e7",
                    fontSize: 12,
                    boxShadow: "0 12px 35px rgba(0,0,0,0.6)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 4,
                      color: "#f9fafb",
                    }}
                  >
                    {label}
                  </div>
                  {demo && (
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "999px",
                          background: "#facc15",
                        }}
                      />
                      <span>Portfel demo:</span>
                      <strong>{demo.value.toFixed(1)}%</strong>
                    </div>
                  )}
                  {spx && (
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "999px",
                          background: "#4ade80",
                        }}
                      />
                      <span>S&amp;P 500 (indeks):</span>
                      <strong>{spx.value.toFixed(1)}%</strong>
                    </div>
                  )}
                </div>
              );
            }}
          />

          {/* Portfel demo – żółta linia z wypełnieniem */}
          <Area
            type="monotone"
            dataKey="demo"
            stroke="#facc15"
            strokeWidth={2.4}
            fill="url(#demoFill)"
            dot={{ r: 3, strokeWidth: 1.5, stroke: "#0f172a", fill: "#facc15" }}
            activeDot={{
              r: 4.5,
              strokeWidth: 2,
              stroke: "#fbbf24",
              fill: "#0f172a",
            }}
            isAnimationActive={true}
            animationDuration={700}
            animationEasing="ease-out"
          />

          {/* S&P 500 – zielona linia */}
          <Line
            type="monotone"
            dataKey="spx"
            stroke="#4ade80"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 1.5, stroke: "#022c22", fill: "#4ade80" }}
            activeDot={{
              r: 4.5,
              strokeWidth: 2,
              stroke: "#22c55e",
              fill: "#022c22",
            }}
            isAnimationActive={true}
            animationDuration={700}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* disclaimer pod wykresem */}
      <p className="mt-1 text-[10px] text-zinc-500 text-right">
        Dane wyłącznie poglądowe – nie stanowią rekomendacji inwestycyjnej.
      </p>
    </div>
  );
}
