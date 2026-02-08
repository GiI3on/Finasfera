"use client";
import { Fragment } from "react";
import CompanyLogo from "./CompanyLogo";

// formatery
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(v)) ? Number(v) : 0);
const fmtPct = (v) => `${Number(v || 0).toFixed(2)}%`;

// skracanie nazw
const SHORT_NAME_MAX = 20;
function shortDisplayName(name = "", symbol = "") {
  const raw = String(name || "").trim();
  if (raw.length <= SHORT_NAME_MAX) return raw;

  const cleaned = raw
    .replace(/\b(Spółka Akcyjna|Spolka Akcyjna|S\.A\.|SA|Inc\.?|Incorporated|Corporation|Corp\.?|Company|Co\.?|Limited|Ltd\.?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (cleaned.length <= SHORT_NAME_MAX) return cleaned;

  const words = cleaned.split(/\s+/);
  let out = "";
  for (const w of words) {
    const cand = (out ? out + " " : "") + w;
    if (cand.length > SHORT_NAME_MAX) break;
    out = cand;
  }
  if (out.length >= 6) return out;

  const acronym = words.map((w) => w[0]).join("").toUpperCase();
  if (acronym.length >= 2 && acronym.length <= SHORT_NAME_MAX) return acronym;

  const tick = String(symbol || "").toUpperCase();
  if (tick) return tick.slice(0, SHORT_NAME_MAX);
  return cleaned.slice(0, SHORT_NAME_MAX - 1) + "…";
}

export default function PortfolioTable({ groups, expanded, onToggle, onOpenFix }) {
  return (
    <section className="card">
      <div className="card-inner">
        <h3 className="h2 mb-4">Skład portfela</h3>

        {/* --- WIDOK MOBILNY (KARTY) --- */}
        <div className="md:hidden space-y-4">
          {groups.map((g) => {
             const open = expanded.has(g.key);
             const gainUp = g.gain >= 0;
             // Na mobile używamy prostszych kolorów dla zysku/straty
             const gainColor = gainUp ? "text-emerald-400" : "text-red-400";

             return (
               <div key={g.key} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
                 {/* Nagłówek Karty: Logo + Nazwa + Cena aktualna */}
                 <div className="flex items-start justify-between mb-3">
                   <div className="flex items-center gap-3">
                     <CompanyLogo symbol={g.pair?.yahoo} name={g.name} size={32} className="shrink-0 rounded-md" />
                     <div>
                       <div className="font-semibold text-zinc-100 text-sm leading-tight">
                         {shortDisplayName(g.name, g.pair?.yahoo)}
                       </div>
                       <div className="text-xs text-zinc-500 font-mono mt-0.5">
                         {g.pair?.yahoo || "—"}
                       </div>
                     </div>
                   </div>
                   <div className="text-right">
                     <div className="text-sm font-medium text-zinc-200">
                        {Number.isFinite(g.price) && g.price > 0 ? fmtPLN(g.price) : "—"}
                     </div>
                     <div className="text-[10px] text-zinc-500 uppercase">Aktualna</div>
                   </div>
                 </div>

                 {/* Siatka danych (Grid) */}
                 <div className="grid grid-cols-2 gap-3 py-3 border-t border-zinc-800/50">
                    <div>
                        <span className="text-xs text-zinc-500 block">Wartość</span>
                        <span className="text-base font-medium text-zinc-200">{fmtPLN(g.value)}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-zinc-500 block">Zysk/Strata</span>
                        <span className={`text-base font-medium ${gainColor}`}>
                            {fmtPLN(g.gain)} <span className="text-xs opacity-80">({fmtPct(g.gainPct)})</span>
                        </span>
                    </div>
                    <div>
                        <span className="text-xs text-zinc-500 block">Posiadane akcje</span>
                        <span className="text-sm text-zinc-300">{g.totalShares} szt.</span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-zinc-500 block">Śr. cena zakupu</span>
                        <span className="text-sm text-zinc-300">{fmtPLN(g.avgBuy)}</span>
                    </div>
                 </div>

                 {/* Przycisk rozwijania szczegółów */}
                 <button 
                    onClick={() => onToggle?.(g.key)}
                    className="w-full mt-2 py-2 text-xs font-medium text-zinc-400 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800/50 transition-colors flex items-center justify-center gap-1"
                 >
                    {open ? "Ukryj transakcje" : "Pokaż transakcje"}
                    <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
                 </button>

                 {/* Szczegóły transakcji (Mobile) */}
                 {open && (
                   <div className="mt-3 space-y-2 pl-2 border-l-2 border-zinc-800">
                     {g.lots.map((lot) => (
                       <div key={lot.id} className="bg-black/20 p-2 rounded text-sm flex justify-between items-center">
                          <div>
                            <div className="text-zinc-300">
                                {lot.buyDate ? new Date(lot.buyDate).toLocaleDateString("pl-PL") : "—"}
                            </div>
                            <div className="text-xs text-zinc-500">
                                {lot.shares} szt. po {fmtPLN(lot.buyPrice || 0)}
                            </div>
                          </div>
                          <button
                            className="text-xs text-yellow-500/80 hover:text-yellow-400 px-2 py-1"
                            onClick={() => onOpenFix?.(lot, g)}
                          >
                            Edytuj
                          </button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             );
          })}
        </div>


        {/* --- WIDOK DESKTOP (TABELA) - widoczny tylko od md w górę --- */}
        <div className="hidden md:block rounded-xl ring-1 ring-zinc-800/60 overflow-hidden">
          <table className="w-full text-base table-fixed">
            <colgroup>
              <col style={{ width: "36%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "4%" }} />
            </colgroup>

            <thead className="text-zinc-400 text-xs uppercase tracking-wider bg-zinc-900/20">
              <tr>
                <th className="text-left py-3 pl-4 pr-3">Spółka</th>
                <th className="text-right py-3 px-3">Śr. cena</th>
                <th className="text-right py-3 px-3">Akcje</th>
                <th className="text-right py-3 px-3">Kurs</th>
                <th className="text-right py-3 px-3">Wartość</th>
                <th className="text-right py-3 px-3">Zysk/Strata</th>
                <th className="w-[1%] py-3 pr-2"></th>
              </tr>
            </thead>

            <tbody className="text-lg align-middle">
              {groups.map((g) => {
                const open = expanded.has(g.key);
                const gainUp = g.gain >= 0;
                const gainBadge = gainUp
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20"
                  : "bg-red-500/15 text-red-300 ring-1 ring-red-500/20";

                return (
                  <Fragment key={g.key}>
                    <tr className="group border-t border-zinc-800/80 hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 pl-4 pr-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-200 ring-1 ring-zinc-800/70 shrink-0"
                            aria-expanded={open}
                            title={open ? "Zwiń" : "Szczegóły"}
                            onClick={() => onToggle?.(g.key)}
                          >
                            <span className={`transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>▸</span>
                          </button>

                          <CompanyLogo symbol={g.pair?.yahoo} name={g.name} size={24} className="shrink-0" />

                          <div className="min-w-0 max-w-full flex items-center gap-2">
                            <span className="block truncate" title={g.name}>
                              {shortDisplayName(g.name, g.pair?.yahoo)}
                            </span>
                            <span className="shrink-0 inline rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-800/70 text-zinc-300 ring-1 ring-zinc-700">
                              {g.pair?.yahoo || "—"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums">{fmtPLN(g.avgBuy)}</td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums">{g.totalShares}</td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums">
                        {Number.isFinite(g.price) && g.price > 0 ? fmtPLN(g.price) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums">{fmtPLN(g.value)}</td>

                      <td className="py-3 px-3 text-right">
                        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-sm ${gainBadge}`}>
                          <span className="whitespace-nowrap tabular-nums">{fmtPLN(g.gain)}</span>
                          <span className="whitespace-nowrap tabular-nums opacity-80">({fmtPct(g.gainPct)})</span>
                        </span>
                      </td>

                      {/* ✅ USUNIĘTO "Szczegóły/Zwiń" z prawej strony (zostaje tylko strzałka po lewej) */}
                      <td className="py-3 pr-2 text-right"></td>
                    </tr>

                    {open && (
                      <tr className="border-t border-zinc-800/60 bg-zinc-950/30">
                        <td colSpan={7} className="py-3 px-4">
                          <div className="rounded-xl bg-zinc-950/60 ring-1 ring-zinc-800/60 p-4">
                            <div className="text-zinc-400 text-sm mb-3">Zakupy ({g.lots.length})</div>

                            <table className="w-full text-sm table-fixed">
                              <colgroup>
                                <col style={{ width: "35%" }} />
                                <col style={{ width: "20%" }} />
                                <col style={{ width: "20%" }} />
                                <col style={{ width: "20%" }} />
                                <col style={{ width: "5%" }} />
                              </colgroup>
                              <thead className="text-zinc-400 text-xs uppercase tracking-wider">
                                <tr>
                                  <th className="text-left pb-2">Data</th>
                                  <th className="text-right pb-2">Cena (PLN)</th>
                                  <th className="text-right pb-2">Akcje</th>
                                  <th className="text-right pb-2">Wartość</th>
                                  <th className="w-[1%] pb-2"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {g.lots.map((lot, i) => (
                                  <tr
                                    key={lot.id}
                                    className={`border-t border-zinc-800/40 ${i % 2 === 1 ? "bg-zinc-900/30" : ""}`}
                                  >
                                    <td className="py-2">
                                      {lot.buyDate
                                        ? new Date(lot.buyDate).toLocaleDateString("pl-PL")
                                        : "—"}
                                    </td>
                                    <td className="py-2 text-right whitespace-nowrap tabular-nums">{fmtPLN(lot.buyPrice || 0)}</td>
                                    <td className="py-2 text-right whitespace-nowrap tabular-nums">{lot.shares}</td>
                                    <td className="py-2 text-right whitespace-nowrap tabular-nums">
                                      {fmtPLN((Number(lot.buyPrice) || 0) * (Number(lot.shares) || 0))}
                                    </td>
                                    <td className="py-2 text-right">
                                      <button
                                        className="text-yellow-300 hover:text-yellow-200"
                                        onClick={() => onOpenFix?.(lot, g)}
                                      >
                                        Edytuj
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
