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
        <h3 className="h2 mb-3">Skład portfela</h3>

        <div className="rounded-xl ring-1 ring-zinc-800/60 overflow-hidden">
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

            <thead className="text-zinc-400 text-xs uppercase tracking-wider">
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

                      <td className="py-3 pr-2 text-right">
                        <button
                          className="text-zinc-400 hover:text-zinc-200 underline decoration-zinc-700/80 underline-offset-4"
                          onClick={() => onToggle?.(g.key)}
                        >
                          {open ? "Zwiń" : "Szczegóły"}
                        </button>
                      </td>
                    </tr>

                    {open && (
                      <tr className="border-t border-zinc-800/60">
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
                                        Cofnij zakup
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
