// File: src/components/StatsCompositionSection.jsx
"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

/* === formatery === */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);

const fmtPct = (v) => `${(Number(v) || 0).toFixed(1)}%`;

/* === paleta === */
const SLICE_COLORS = [
  "#60a5fa", // niebieski
  "#22c55e", // zielony
  "#f59e0b", // żółty
  "#ef4444", // czerwony
  "#a78bfa", // fiolet
  "#06b6d4", // cyjan
  "#f472b6", // róż
  "#16a34a", // zieleń2
  "#93c5fd", // jasny nieb.
  "#fb923c", // pomarańcz
];

const TABS = [
  { key: "instruments", label: "Instrumenty" },
  { key: "classes",     label: "Klasy" },
  { key: "sectors",     label: "Sektory" },
  { key: "countries",   label: "Kraje" },
];

/**
 * props:
 * - groups: [{ key, name, pair, value }]
 *   gdzie pair może mieć np. { country, sector, assetClass, … }
 * - totalValue: liczba (wartość portfela „teraz”)
 * - title?: string (domyślnie: "Skład portfela")
 * - taxonomyBySymbol?: { [symbolUpper]: { sector, country, class } }
 */
export default function StatsCompositionSection({
  groups = [],
  totalValue = 0,
  title = "Skład portfela",
  taxonomyBySymbol = null,
}) {
  const [activeTab, setActiveTab] = useState("instruments");
  const [activeIndex, setActiveIndex] = useState(null);

  // sumy i sanity
  const tv = Number(totalValue) || groups.reduce((a, g) => a + (Number(g?.value) || 0), 0);

  // helpery do pobierania pól z fallbackami
  const getFromTaxonomy = (symU) =>
    (taxonomyBySymbol && taxonomyBySymbol[symU]) || null;

  const getCountry = (g) => {
    const symU = String(g?.key || g?.pair?.yahoo || g?.name || "").toUpperCase();
    return (
      getFromTaxonomy(symU)?.country ||
      g?.pair?.country ||
      "Inne"
    );
  };

  const getSector = (g) => {
    const symU = String(g?.key || g?.pair?.yahoo || g?.name || "").toUpperCase();
    return (
      getFromTaxonomy(symU)?.sector ||
      g?.pair?.sector ||
      "Inne"
    );
  };

  const getClass = (g) => {
    const symU = String(g?.key || g?.pair?.yahoo || g?.name || "").toUpperCase();
    const raw =
      getFromTaxonomy(symU)?.class ||
      g?.pair?.assetClass ||
      g?.pair?.class ||
      "Inne";
    const s = String(raw).toLowerCase();
    if (["equity", "stock", "akcje"].includes(s)) return "Akcje";
    if (["bond", "obligacje", "fixedincome"].includes(s)) return "Obligacje";
    if (["etf", "fund", "fundusz"].includes(s)) return "ETF/Fundusz";
    if (["cash", "gotowka"].includes(s)) return "Gotówka";
    if (["commodity", "surowce"].includes(s)) return "Surowce";
    return capitalize(raw);
  };

  function capitalize(x) {
    const s = String(x || "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // budowa datasetów dla zakładek
  const dataByTab = useMemo(() => {
    const sumBy = (getKey, getLabel = (k) => k) => {
      const m = new Map();
      for (const g of groups) {
        const k = getKey(g) || "Inne";
        const cur = Number(g?.value) || 0;
        if (!m.has(k)) m.set(k, 0);
        m.set(k, m.get(k) + cur);
      }
      const arr = Array.from(m.entries()).map(([k, v]) => ({
        key: k,
        name: getLabel(k),
        value: v,
        pct: tv > 0 ? (v / tv) * 100 : 0,
      }));
      arr.sort((a, b) => (b.value || 0) - (a.value || 0));
      const MAX = 8;
      if (arr.length > MAX) {
        const head = arr.slice(0, MAX - 1);
        const tail = arr.slice(MAX - 1);
        const restVal = tail.reduce((a, x) => a + x.value, 0);
        const restPct = tv > 0 ? (restVal / tv) * 100 : 0;
        head.push({ key: "__OTHER__", name: "Inne", value: restVal, pct: restPct });
        return head;
      }
      return arr;
    };

    return {
      instruments: sumBy(
        (g) => String(g?.name || g?.key || "").trim() || "Instrument",
        (k) => k
      ),
      classes: sumBy(
        (g) => getClass(g),
        (k) => k
      ),
      sectors: sumBy(
        (g) => getSector(g),
        (k) => k
      ),
      countries: sumBy(
        (g) => getCountry(g),
        (k) => k
      ),
    };
  }, [groups, tv, taxonomyBySymbol]);

  const data = dataByTab[activeTab] || [];

  // tooltip
  const tooltipContent = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0]?.payload || {};
    return (
      <div className="rounded-md border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-sm text-zinc-100 shadow-lg">
        <div className="font-medium">{p?.name || "—"}</div>
        <div className="opacity-80">{fmtPct(p?.pct)}</div>
        <div className="opacity-80">{fmtPLN(p?.value)}</div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="card-inner">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="h2">{title}</h3>

          {/* zakładki */}
          <div className="inline-flex gap-1 rounded-lg border border-zinc-700 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={[
                  "px-2.5 py-1.5 rounded-md text-sm",
                  activeTab === t.key
                    ? "bg-zinc-100 text-black"
                    : "bg-transparent text-zinc-200 hover:bg-zinc-800",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ważne: items-stretch → równe kolumny; większa wysokość pie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* wykres kołowy */}
          <div className="w-full h-[420px] md:h-[460px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={115}
                  paddingAngle={1}
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((entry, i) => {
                    const color = SLICE_COLORS[i % SLICE_COLORS.length];
                    const isActive = i === activeIndex;
                    return (
                      <Cell
                        key={`cell-${i}`}
                        fill={color}
                        stroke={isActive ? "#ffffff" : "#0b0b0b"}
                        strokeWidth={isActive ? 2 : 1}
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={tooltipContent} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-400">
                <tr className="border-b border-zinc-800">
                  <th className="py-2 text-left">Kategoria</th>
                  <th className="py-2 text-right">Udział</th>
                  <th className="py-2 text-right">Wartość</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const color = SLICE_COLORS[i % SLICE_COLORS.length];
                  return (
                    <tr
                      key={row.key || row.name || i}
                      className="border-b border-zinc-800/70 hover:bg-zinc-900/40"
                    >
                      <td className="py-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                          style={{ background: color }}
                        />
                        <span className="align-middle">{row.name}</span>
                      </td>
                      <td className="py-2 text-right tabular-nums">{fmtPct(row.pct)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtPLN(row.value)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="py-2 text-zinc-300">Razem</td>
                  <td className="py-2 text-right text-zinc-300 tabular-nums">
                    {fmtPct(100)}
                  </td>
                  <td className="py-2 text-right text-zinc-300 tabular-nums">
                    {fmtPLN(tv)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
