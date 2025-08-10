"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(Math.round(v || 0));

export default function FireChart({ labels = [], capital = [], contributions = [], goal }) {
  const data = {
    labels, // same lata jako stringi: ["2026","2027",...]
    datasets: [
      {
        label: "Kapitał",
        data: capital,
        borderColor: "#facc15",
        backgroundColor: "rgba(250, 204, 21, 0.08)",
        pointRadius: 0,
        tension: 0.25,
        fill: true,
      },
      {
        label: "Suma wpłat",
        data: contributions,
        borderColor: "rgba(212,212,216,0.8)",
        borderDash: [2, 4],
        pointRadius: 0,
        fill: false,
      },
      ...(goal
        ? [
            {
              label: "Cel",
              data: labels.map(() => goal),
              borderColor: "rgba(250, 204, 21, 0.7)",
              borderDash: [6, 6],
              pointRadius: 0,
            },
          ]
        : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#d4d4d8" },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${fmtPLN(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        // kategoria = same lata
        ticks: { color: "#a1a1aa", maxRotation: 0, autoSkip: true },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
      y: {
        ticks: {
          color: "#a1a1aa",
          callback: (v) =>
            new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(v) + " zł",
        },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
  };

  return <Line data={data} options={options} />;
}
