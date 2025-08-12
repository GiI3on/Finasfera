"use client";

import { PieChart, Pie, Cell } from "recharts";

export default function FireProgress({ percent }) {
  const data = [
    { name: "Postęp", value: percent },
    { name: "Brakujące", value: Math.max(0, 100 - percent) },
  ];
  const COLORS = ["#facc15", "#27272a"];

  return (
    <div className="flex flex-col items-center">
      <PieChart width={160} height={160}>
        <Pie
          data={data}
          dataKey="value"
          startAngle={90}
          endAngle={-270}
          innerRadius={60}
          outerRadius={80}
          stroke="none"
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx]} />
          ))}
        </Pie>
      </PieChart>
      <p className="text-sm mt-2">{percent}% z celu FIRE</p>
    </div>
  );
}
