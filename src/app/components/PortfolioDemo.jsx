"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import PortfolioTable from "./PortfolioTable";
import { useAuth } from "./AuthProvider";

/* ====== MAŁE FORMATERY ====== */

const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const fmtPct = (v) => `${Number(v || 0).toFixed(2)}%`;

/* ====== STATYCZNE METRYKI DEMO ====== */
/* liczby zbliżone do Twojego realnego portfela, ale „zamrożone” */

const DEMO_TOTAL_VALUE = 22336.36; // suma wartości wszystkich spółek
const DEMO_DAY_PROFIT = 210.55; // przykładowy dzienny zysk
const DEMO_TOTAL_GAIN = 3066.32; // łączny zysk w PLN

/* ====== WYKRES: jak może rosnąć portfel w czasie ====== */

const DEMO_CHART = [
  { year: "2021", value: 6000 },
  { year: "2022", value: 9000 },
  { year: "2023", value: 12000 },
  { year: "2024", value: 18000 },
  { year: "2025", value: DEMO_TOTAL_VALUE },
];

/* ====== GRUPY DEMO POD `PortfolioTable` ======
   Struktura jak w prawdziwym portfelu:
   key, name, pair, lots, totalShares, avgBuy, price, value, gain, gainPct
*/

const DEMO_GROUPS = [
  {
    key: "PKN",
    name: "PKNORLEN",
    pair: { yahoo: "PKN.WA" },
    totalShares: 59.472,
    avgBuy: 57.07,
    price: 95.19,
    value: 5661.14,
    gain: 2267.31,
    gainPct: 66.81,
    lots: [
      {
        id: "demo-pkn-1",
        name: "PKNORLEN",
        shares: 59.472,
        buyPrice: 57.07,
        buyDate: "2025-01-05",
        pair: { yahoo: "PKN.WA" },
      },
    ],
  },
  {
    key: "NVDA",
    name: "NVIDIA Corporation",
    pair: { yahoo: "NVDA.DE" },
    totalShares: 5,
    avgBuy: 604.77,
    price: 667.66,
    value: 3338.31,
    gain: 314.44,
    gainPct: 10.4,
    lots: [
      {
        id: "demo-nvda-1",
        name: "NVIDIA Corporation",
        shares: 5,
        buyPrice: 604.77,
        buyDate: "2024-01-10",
        pair: { yahoo: "NVDA.DE" },
      },
    ],
  },
  {
    key: "XTB",
    name: "XTB",
    pair: { yahoo: "XTB.WA" },
    totalShares: 43,
    avgBuy: 68.39,
    price: 69.24,
    value: 2977.32,
    gain: 36.54,
    gainPct: 1.24,
    lots: [
      {
        id: "demo-xtb-1",
        name: "XTB",
        shares: 43,
        buyPrice: 68.39,
        buyDate: "2025-02-12",
        pair: { yahoo: "XTB.WA" },
      },
    ],
  },
  {
    key: "KRU",
    name: "KRUK",
    pair: { yahoo: "KRU.WA" },
    totalShares: 6,
    avgBuy: 449.33,
    price: 463.40,
    value: 2780.40,
    gain: 84.40,
    gainPct: 3.13,
    lots: [
      {
        id: "demo-kru-1",
        name: "KRUK",
        shares: 6,
        buyPrice: 449.33,
        buyDate: "2025-03-03",
        pair: { yahoo: "KRU.WA" },
      },
    ],
  },
  {
    key: "ACWI",
    name: "iShares MSCI ACWI",
    pair: { yahoo: "ISAC.L" },
    totalShares: 6,
    avgBuy: 348.07,
    price: 385.80,
    value: 2314.81,
    gain: 126.42,
    gainPct: 10.84,
    lots: [
      {
        id: "demo-acwi-1",
        name: "iShares MSCI ACWI",
        shares: 6,
        buyPrice: 348.07,
        buyDate: "2024-11-05",
        pair: { yahoo: "ISAC.L" },
      },
    ],
  },
  {
    key: "CDR",
    name: "CD PROJEKT",
    pair: { yahoo: "CDR.WA" },
    totalShares: 20,
    avgBuy: 146.94,
    price: 147.88,
    value: 2957.54,
    gain: 18.77,
    gainPct: 0.6,
    lots: [
      {
        id: "demo-cdr-1",
        name: "CD PROJEKT",
        shares: 20,
        buyPrice: 146.94,
        buyDate: "2024-02-15",
        pair: { yahoo: "CDR.WA" },
      },
    ],
  },
  {
    key: "IWDA",
    name: "ETF MSCI World (IWDA)",
    pair: { yahoo: "IWDA.AS" },
    totalShares: 6,
    avgBuy: 348.07,
    price: 384.47,
    value: 2306.84,
    gain: 218.44,
    gainPct: 10.5,
    lots: [
      {
        id: "demo-iwda-1",
        name: "ETF MSCI World (IWDA)",
        shares: 6,
        buyPrice: 348.07,
        buyDate: "2023-11-05",
        pair: { yahoo: "IWDA.AS" },
      },
    ],
  },
];

export default function DemoPortfolio() {
  const { signIn } = useAuth();
  const [expanded, setExpanded] = useState(() => new Set());

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      {/* NAGŁÓWEK + CTA DO LOGOWANIA (przeniesione tutaj, żeby był od razu widoczny) */}
      <section className="text-center mt-8 mb-6">
        <h1 className="h1">Śledzenie Akcji — portfel demo</h1>
        <p className="muted text-sm max-w-xl mx-auto">
          To jest przykładowy portfel pokazujący, jak działa analiza w
          Finasferze. Dane są statyczne i służą wyłącznie celom poglądowym –
          Twoje realne wyniki będą zależeć od konkretnych inwestycji.
        </p>
        <button
          onClick={signIn}
          className="btn-primary inline-flex px-5 py-2 text-sm mt-4"
        >
          Zaloguj się i dodaj swój portfel
        </button>
      </section>

      {/* KPI NA GÓRZE */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="card-inner">
            <div className="muted text-sm">Wartość portfela (demo)</div>
            <div className="text-3xl font-semibold tabular-nums">
              {fmtPLN(DEMO_TOTAL_VALUE)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner">
            <div className="muted text-sm">Dzienny wynik (demo)</div>
            <div className="text-3xl font-semibold tabular-nums">
              {fmtPLN(DEMO_DAY_PROFIT)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner">
            <div className="muted text-sm">Całkowity zysk (demo)</div>
            <div className="text-3xl font-semibold tabular-nums text-emerald-400">
              {fmtPLN(DEMO_TOTAL_GAIN)}
            </div>
            <div className="text-xs text-emerald-400/80 tabular-nums">
              {fmtPct(
                (DEMO_TOTAL_GAIN /
                  (DEMO_TOTAL_VALUE - DEMO_TOTAL_GAIN)) *
                  100
              )}
            </div>
          </div>
        </div>
      </section>

      {/* WYKRES PORTFELA */}
      <section className="card mb-6">
        <div className="card-inner">
          <h2 className="h2 mb-2">Jak może rosnąć portfel w czasie</h2>

          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={DEMO_CHART}
                margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient
                    id="demoPortfelFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#facc15"
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="100%"
                      stopColor="#facc15"
                      stopOpacity={0.04}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />

                <XAxis
                  dataKey="year"
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                />

                <YAxis
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  tickFormatter={(v) =>
                    fmtPLN(v).replace(",00 zł", " zł")
                  }
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  width={80}
                />

                <Tooltip
                  formatter={(v) => fmtPLN(v)}
                  contentStyle={{
                    background: "rgba(24,24,27,0.96)",
                    border: "1px solid rgba(63,63,70,0.8)",
                    borderRadius: 10,
                    padding: "8px 10px",
                    color: "#e4e4e7",
                    fontSize: 11,
                    boxShadow: "0 12px 35px rgba(0,0,0,0.6)",
                  }}
                  labelStyle={{ fontWeight: 600, color: "#f9fafb" }}
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#facc15"
                  strokeWidth={2.4}
                  fill="url(#demoPortfelFill)"
                  dot={{
                    r: 3,
                    strokeWidth: 1.5,
                    stroke: "#0f172a",
                    fill: "#facc15",
                  }}
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
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-2 text-[11px] text-zinc-500">
            Dane mają charakter poglądowy i nie stanowią rekomendacji
            inwestycyjnej ani doradztwa inwestycyjnego. Wyniki historyczne nie
            gwarantują podobnych wyników w przyszłości.
          </p>
        </div>
      </section>

      {/* TABELA POZYCJI DEMO – ten sam komponent co po zalogowaniu */}
      <section className="card">
        <div className="card-inner">
          <h2 className="h2 mb-2">Skład portfela (demo)</h2>
          <p className="muted text-sm mb-4">
            To tylko ilustracyjny podział portfela. Po zalogowaniu zobaczysz
            swoje prawdziwe pozycje, ale układ tej tabeli będzie dokładnie taki
            sam.
          </p>

          <PortfolioTable
            groups={DEMO_GROUPS}
            expanded={expanded}
            onToggle={(key) => {
              const next = new Set(expanded);
              next.has(key) ? next.delete(key) : next.add(key);
              setExpanded(next);
            }}
            // w trybie demo nie cofamy transakcji – no-op
            onOpenFix={() => {}}
          />

          <p className="mt-3 text-[11px] text-zinc-500">
            Łączna wartość portfela demo to około {fmtPLN(DEMO_TOTAL_VALUE)}, z
            czego {fmtPLN(DEMO_TOTAL_GAIN)} to zysk (ok.{" "}
            {fmtPct(
              (DEMO_TOTAL_GAIN /
                (DEMO_TOTAL_VALUE - DEMO_TOTAL_GAIN)) *
                100
            )}
            ). Dane służą wyłącznie celom edukacyjnym.
          </p>
        </div>
      </section>
    </main>
  );
}
