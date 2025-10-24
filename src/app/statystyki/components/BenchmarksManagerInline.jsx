"use client";
import { useEffect, useState } from "react";
import { BENCHES, getBenchColor } from "../../../lib/benchmarks";

export default function BenchmarksManagerInline({
  open,
  onClose,
  selected = [],
  onChange,
  onAddCustom,
}) {
  const MAX_SELECTED = 8;

  const CATEGORIES = [
    { key: "pl",    label: "Polska",      keys: ["WIG20","MWIG40","SWIG80"] },
    { key: "world", label: "Akcje świat", keys: ["SP500TR","ACWI","IWDA","MSCI_WORLD","IEMG","MSCI_EM"] },
    { key: "bond",  label: "Obligacje",   keys: ["AGGH","BND","TLT","TIP"] },
    { key: "alts",  label: "Złoto/Surowce/REIT", keys: ["GLD","DBC","VNQ"] },
    { key: "rf",    label: "Gotówka/RF",  keys: ["RISKFREE"] },
  ];

  const PRESETS = [
    { name: "Świat vs Polska", keys: ["ACWI","WIG20"] },
    { name: "Global 60/40",    keys: ["ACWI","AGGH"] },
    { name: "EM vs DM",        keys: ["MSCI_WORLD","MSCI_EM"] },
    { name: "Multi-asset",     keys: ["ACWI","AGGH","GLD","DBC","VNQ"] },
  ];

  const [local, setLocal] = useState(selected || []);
  const [custom, setCustom] = useState("");

  useEffect(() => { setLocal(selected || []); }, [selected]);

  const toggle = (k) => {
    setLocal((prev) =>
      prev.includes(k)
        ? prev.filter((x) => x !== k)
        : (prev.length >= MAX_SELECTED ? prev : [...prev, k])
    );
  };
  const applyPreset = (keys) => {
    setLocal((prev) => Array.from(new Set([...(prev || []), ...keys])).slice(0, MAX_SELECTED));
  };

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
            <button key={p.name}
              className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-sm"
              onClick={() => applyPreset(p.keys)}
              title={p.keys.join(", ")}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <div className="text-xs uppercase tracking-wider text-zinc-400 mb-2">{cat.label}</div>
              <div className="flex flex-wrap gap-2">
                {cat.keys.map((k) => {
                  const def = BENCHES.find((b) => b.key === k);
                  const active = local.includes(k);
                  return (
                    <button key={k}
                      onClick={() => toggle(k)}
                      className={[
                        "px-3 py-1.5 rounded-full border text-sm flex items-center gap-2",
                        active ? "bg-zinc-200 text-black border-zinc-300" : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: getBenchColor(k) }} />
                      {def?.label || k}
                      {active ? <span className="ml-1 opacity-70">✓</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-zinc-700 pt-4">
          <div className="text-sm text-zinc-300 mb-2">Dodaj dowolny ticker (Yahoo):</div>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 outline-none focus:ring-2 focus:ring-yellow-600"
              placeholder="np. SPY, IWDA.AS, ^GSPC, AAPL"
              value={custom}
              onChange={(e) => setCustom(e.target.value.toUpperCase().trim())}
            />
            <button
              className="px-3 py-2 rounded-lg bg-yellow-600 text-black hover:bg-yellow-500 border border-yellow-500"
              onClick={() => { if (!custom) return; onAddCustom?.(custom); setCustom(""); }}
            >
              Dodaj
            </button>
          </div>
          <div className="text-xs text-zinc-500 mt-2">Wskazówka: dla indeksów Yahoo używaj prefiksu „^” (np. ^GSPC).</div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-zinc-400">Wybrane: <span className="text-zinc-100">{local.length}</span> / 8</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600" onClick={() => setLocal([])}>Wyczyść</button>
            <button
              className="px-3 py-1.5 rounded-lg bg-yellow-600 text-black hover:bg-yellow-500 border border-yellow-500"
              onClick={() => { onChange?.(local.slice(0, 8)); onClose?.(); }}
            >
              Zastosuj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
