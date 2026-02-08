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

/* ====== WYKRES: jak może rosnąć portfel w czasie ======
   ✅ Bardziej „falujący” jak na Twoim rysunku (wzrost + korekty).
   Uwaga: XAxis używa teraz klucza "t" (YYYY-MM) żeby mieć więcej punktów.
*/

const DEMO_CHART = [
  { t: "2021-01", value: 6000 },
  { t: "2021-03", value: 7200 },
  { t: "2021-05", value: 8200 },
  { t: "2021-07", value: 7800 },
  { t: "2021-09", value: 9200 },
  { t: "2021-11", value: 8800 },

  { t: "2022-01", value: 9500 },
  { t: "2022-03", value: 10300 },
  { t: "2022-05", value: 11000 },
  { t: "2022-07", value: 9800 }, // korekta
  { t: "2022-09", value: 10800 },
  { t: "2022-11", value: 11600 },

  { t: "2023-01", value: 12000 },
  { t: "2023-03", value: 12800 },
  { t: "2023-05", value: 12300 }, // korekta
  { t: "2023-07", value: 13400 },
  { t: "2023-09", value: 12900 }, // korekta
  { t: "2023-11", value: 14500 },

  { t: "2024-01", value: 15000 },
  { t: "2024-03", value: 16200 },
  { t: "2024-05", value: 17600 },
  { t: "2024-07", value: 16800 }, // korekta
  { t: "2024-09", value: 18600 },
  { t: "2024-11", value: 17800 }, // korekta

  { t: "2025-01", value: 19500 },
  { t: "2025-03", value: 20500 },
  { t: "2025-05", value: 19800 }, // korekta
  { t: "2025-07", value: 21200 },
  { t: "2025-09", value: 20650 }, // korekta
  { t: "2025-11", value: 21850 },
  { t: "2025-12", value: DEMO_TOTAL_VALUE },
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
    price: 463.4,
    value: 2780.4,
    gain: 84.4,
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
    price: 385.8,
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
      {/* NAGŁÓWEK + CTA DO LOGOWANIA */}
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

      {/* KPI NA GÓRZE (✅ mniejsze kafelki na telefonie) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="card">
          <div className="card-inner !p-4 sm:!p-6">
            <div className="muted text-xs sm:text-sm">Wartość portfela (demo)</div>
            <div className="text-2xl sm:text-3xl font-semibold tabular-nums leading-tight">
              {fmtPLN(DEMO_TOTAL_VALUE)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner !p-4 sm:!p-6">
            <div className="muted text-xs sm:text-sm">Dzienny wynik (demo)</div>
            <div className="text-2xl sm:text-3xl font-semibold tabular-nums leading-tight">
              {fmtPLN(DEMO_DAY_PROFIT)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner !p-4 sm:!p-6">
            <div className="muted text-xs sm:text-sm">Całkowity zysk (demo)</div>
            <div className="text-2xl sm:text-3xl font-semibold tabular-nums text-emerald-400 leading-tight">
              {fmtPLN(DEMO_TOTAL_GAIN)}
            </div>
            <div className="text-[11px] sm:text-xs text-emerald-400/80 tabular-nums leading-tight">
              {fmtPct(
                (DEMO_TOTAL_GAIN / (DEMO_TOTAL_VALUE - DEMO_TOTAL_GAIN)) * 100
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
                  <linearGradient id="demoPortfelFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#facc15" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#facc15" stopOpacity={0.04} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />

                <XAxis
                  dataKey="t"
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  tickFormatter={(v) => String(v || "").slice(0, 4)}
                  minTickGap={28}
                />

                <YAxis
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  tickFormatter={(v) => fmtPLN(v).replace(",00 zł", " zł")}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  width={80}
                />

                <Tooltip
                  formatter={(v) => fmtPLN(v)}
                  labelFormatter={(label) => `Okres: ${String(label)}`}
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
                  dot={false}
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

      {/* TABELA POZYCJI DEMO */}
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
            onOpenFix={() => {}}
          />

          <p className="mt-3 text-[11px] text-zinc-500">
            Łączna wartość portfela demo to około {fmtPLN(DEMO_TOTAL_VALUE)}, z
            czego {fmtPLN(DEMO_TOTAL_GAIN)} to zysk (ok.{" "}
            {fmtPct(
              (DEMO_TOTAL_GAIN / (DEMO_TOTAL_VALUE - DEMO_TOTAL_GAIN)) * 100
            )}
            ). Dane służą wyłącznie celom edukacyjnym.
          </p>
        </div>
      </section>
    </main>
  );
}
