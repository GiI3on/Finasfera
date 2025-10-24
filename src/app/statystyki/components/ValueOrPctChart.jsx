"use client";
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, AreaChart, Area, LineChart, Line, Legend } from "recharts";
import { getBenchColor } from "../../../lib/benchmarks";
import { fmtPLN } from "./fmt";

export default function ValueOrPctChart({ valueMode, chartSeries, benchSeries }) {
  return (
    <section className="card mb-4">
      <div className="card-inner">
        <h3 className="h2 mb-2">
          {valueMode === "PLN" ? "Wartość portfela (PLN)" : "Zmiana od początku zakresu (%)"}
        </h3>
        <div className="w-full h-72">
          <ResponsiveContainer>
            {valueMode === "PLN" ? (
              <AreaChart data={chartSeries.data}>
                <defs>
                  <linearGradient id="valFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopOpacity={0.35} />
                    <stop offset="100%" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="t" tick={{ fontSize: 12 }} minTickGap={28} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => new Intl.NumberFormat("pl-PL").format(v)} width={70} />
                <Tooltip formatter={(v) => fmtPLN(v)} labelFormatter={(l) => l} />
                <Area type="monotone" dataKey="value" strokeWidth={2.5} fillOpacity={1} fill="url(#valFill)" />
                {Object.keys(benchSeries).length > 0 &&
                  Object.keys(benchSeries).map((k) => (
                    <Line key={k} type="monotone" dataKey={k} strokeWidth={2} dot={false} stroke={getBenchColor(k)} />
                  ))}
                <Legend />
              </AreaChart>
            ) : (
              <LineChart data={chartSeries.data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="t" tick={{ fontSize: 12 }} minTickGap={28} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Number(v||0).toFixed(0)}%`} width={60} />
                <Tooltip formatter={(v) => v == null ? "—" : `${Number(v).toFixed(2)}%`} labelFormatter={(l) => l} />
                <Line type="monotone" dataKey="valuePct" strokeWidth={2.5} dot={false} />
                {Object.keys(benchSeries).length > 0 &&
                  Object.keys(benchSeries).map((k) => (
                    <Line key={k} type="monotone" dataKey={`${k}Pct`} strokeWidth={2} dot={false} stroke={getBenchColor(k)} />
                  ))}
                <Legend />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
