// File: src/app/components/BenchmarksManager.jsx
"use client";

import { useMemo, useState } from "react";
import { BENCHES, getBenchColor } from "../../lib/benchmarks";

const MAX_SELECTED = 8;

const CATEGORIES = [
  { key: "pl",    label: "Polska",      keys: ["WIG","WIG20","WIG20TR","MWIG40","SWIG80"] },
  { key: "world", label: "Akcje świat", keys: ["SP500TR","ACWI","IWDA","MSCI_WORLD","IEMG","MSCI_EM"] },
  { key: "bond",  label: "Obligacje",   keys: ["AGGH","BND","TLT","TIP"] },
  { key: "alts",  label: "Złoto / Surowce / REIT", keys: ["GLD","DBC","VNQ"] },
  { key: "rf",    label: "Gotówka / RF", keys: ["RISKFREE"] },
];

const PRESETS = [
  { name: "Świat vs Polska", keys: ["ACWI","WIG20","WIG"] },
  { name: "Global 60/40",    keys: ["ACWI","AGGH"] },
  { name: "EM vs DM",        keys: ["MSCI_WORLD","MSCI_EM"] },
  { name: "Multi-asset",     keys: ["ACWI","AGGH","GLD","DBC","VNQ"] },
];

export default function BenchmarksManager({ open, onClose, selected = [], onChange }) {
  const [local, setLocal] = useState(selected || []);

  const toggle = (k) => {
    setLocal((prev) => {
      if (prev.includes(k)) return prev.filter((x) => x !== k);
      if (prev.length >= MAX_SELECTED) return prev; // limit
      return [...prev, k];
    });
  };

  const isOverLimit = local.length > MAX_SELECTED;

  const applyPreset = (keys) => {
    setLocal((prev) => {
      const merged = Array.from(new Set([...(prev || []), ...keys]));
      return merged.slice(0, MAX_SELECTED);
    });
  };

  const listByCat = useMemo(() => {
    const map = new Map(BENCHES.map((b) => [b.key, b]));
    return CATEGORIES.map((c) => ({
      ...c,
      items: c.keys.map((k) => map.get(k)).filter(Boolean),
    }));
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 text-zinc-100 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Wybierz benchmarki</h3>
          <button className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600" onClick={onClose}>Zamknij</button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-sm"
              onClick={() => applyPreset(p.keys)}
              title={p.keys.join(", ")}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {listByCat.map((cat) => (
            <div key={cat.key}>
              <div className="text-xs uppercase tracking-wider text-zinc-400 mb-2">{cat.label}</div>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((b) => {
                  const active = local.includes(b.key);
                  return (
                    <button
                      key={b.key}
                      onClick={() => toggle(b.key)}
                      className={[
                        "px-3 py-1.5 rounded-full border text-sm flex items-center gap-2",
                        active ? "bg-zinc-200 text-black border-zinc-300" : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: getBenchColor(b.key) }} />
                      {b.label}
                      {active ? <span className="ml-1 opacity-70">✓</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Wybrane: <span className="text-zinc-100">{local.length}</span> / {MAX_SELECTED}
            {isOverLimit ? <span className="text-red-400 ml-2">Przekroczono limit</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
              onClick={() => setLocal([])}
            >
              Wyczyść
            </button>
            <button
              className="px-3 py-1.5 rounded-lg bg-yellow-600 text-black hover:bg-yellow-500 border border-yellow-500"
              onClick={() => { onChange?.(local.slice(0, MAX_SELECTED)); onClose?.(); }}
            >
              Zastosuj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
