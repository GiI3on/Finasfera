"use client";
import { useMemo, useState } from "react";

/**
 * BenchSelector
 * - wyszukiwalny multi-select w dropdownie
 * - grupy: Akcje / Obligacje / Stopy i inflacja
 * props:
 *  - benches: [{key,label,kind}]
 *  - selected: string[]
 *  - onChange: (string[]) => void
 *  - colors: Record<key,color>
 *  - cagrByKey: Record<key, number>   // 0.042 = 4.2%
 *  - errByKey: Record<key, true>
 */
export default function BenchSelector({
  benches = [],
  selected = [],
  onChange,
  colors = {},
  cagrByKey = {},
  errByKey = {},
  title = "Benchmark",
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const out = {
      stocks: [],
      bonds: [],
      rates: [],
    };
    for (const b of benches) {
      if (b.kind === "yahoo") {
        // heurystyka: obligacje po nazwie
        if ((b.label || "").toLowerCase().includes("bond")) out.bonds.push(b);
        else out.stocks.push(b);
      } else {
        out.rates.push(b);
      }
    }
    // filtr szukajki
    const filt = (arr) =>
      arr.filter((x) =>
        (x.label || "").toLowerCase().includes(q.trim().toLowerCase())
      );
    return {
      stocks: filt(out.stocks),
      bonds: filt(out.bonds),
      rates: filt(out.rates),
    };
  }, [benches, q]);

  const toggle = (key) => {
    const set = new Set(selected);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    onChange(Array.from(set));
  };

  const setAll = (arrKeys) => onChange(Array.from(new Set(arrKeys.concat(selected))));
  const clearAll = () => onChange([]);

  const fmtPct = (x) =>
    Number.isFinite(x) ? `${(x * 100).toFixed(2)}%` : "";

  const Section = ({ title, items }) => (
    <div className="mb-3">
      <div className="text-xs uppercase tracking-wide text-zinc-400 mb-1">{title}</div>
      <div className="space-y-1">
        {items.map((b) => {
          const active = selected.includes(b.key);
          const err = !!errByKey[b.key];
          const cagr = cagrByKey[b.key];
          return (
            <label
              key={b.key}
              className={[
                "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer",
                active ? "bg-zinc-800" : "hover:bg-zinc-900",
              ].join(" ")}
            >
              <input
                type="checkbox"
                className="accent-yellow-500"
                checked={active}
                onChange={() => toggle(b.key)}
              />
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: colors[b.key] || "#9ca3af" }}
              />
              <span className="flex-1 text-sm text-zinc-100">{b.label}</span>
              {err ? (
                <span className="text-xs text-red-400">!</span>
              ) : (
                <span className="text-xs text-zinc-400">{fmtPct(cagr)}</span>
              )}
            </label>
          );
        })}
        {items.length === 0 && (
          <div className="px-2 py-1 text-sm text-zinc-500">Brak wyników…</div>
        )}
      </div>
    </div>
  );

  const allKeysVisible = useMemo(
    () => [
      ...grouped.stocks.map((b) => b.key),
      ...grouped.bonds.map((b) => b.key),
      ...grouped.rates.map((b) => b.key),
    ],
    [grouped]
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 hover:bg-zinc-800"
      >
        {title}
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-96 rounded-xl border border-zinc-700 bg-zinc-950 shadow-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Szukaj benchmarku…"
              className="flex-1 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-sm outline-none"
            />
            <button
              onClick={() => setAll(allKeysVisible)}
              className="text-xs px-2 py-1 rounded border border-zinc-700 hover:bg-zinc-900"
              title="Zaznacz wszystkie z widocznej listy"
            >
              Zaznacz
            </button>
            <button
              onClick={clearAll}
              className="text-xs px-2 py-1 rounded border border-zinc-700 hover:bg-zinc-900"
              title="Wyczyść wybór"
            >
              Wyczyść
            </button>
          </div>

          <div className="max-h-80 overflow-auto pr-1">
            <Section title="Akcje / ETF" items={grouped.stocks} />
            <Section title="Obligacje" items={grouped.bonds} />
            <Section title="Stopy i inflacja" items={grouped.rates} />
          </div>

          <div className="flex justify-end pt-2 border-t border-zinc-800">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-md bg-zinc-200 text-black hover:bg-white text-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
