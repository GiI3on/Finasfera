"use client";
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts";

export default function CumReturnChart({ rangeKey, cumCurve }) {
  return (
    <section className="card mt-4">
      <div className="card-inner">
        <h3 className="h2 mb-2">Skumulowana stopa zwrotu (zakres: {rangeKey})</h3>
        <div className="w-full h-64">
          <ResponsiveContainer>
            <LineChart data={cumCurve}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="t" tick={{ fontSize: 12 }} minTickGap={28} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Number(v||0).toFixed(0)}%`} width={60} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} labelFormatter={(l) => l} />
              <Line type="monotone" dataKey="cum" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
