"use client";
import React, { useEffect, useState } from "react";

export default function SearchPicker({ selected, onSelect, onClear }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (selected) { setRes([]); setOpen(false); return; }
    const id = setTimeout(async () => {
      const term = q.trim();
      if (!term) { setRes([]); return; }
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`).then(r => r.json());
        setRes(Array.isArray(r) ? r : []);
        setOpen(true);
      } catch {
        setRes([]); setOpen(false);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [q, selected]);

  return (
    <div className="relative">
      <input
        className="input h-11 pr-10 w-full"
        placeholder="Wyszukaj spółkę (np. Orlen, CD Projekt…)"
        value={selected ? `${selected.name} (${selected.yahoo})` : q}
        readOnly={!!selected}
        onChange={e => setQ(e.target.value)}
        onFocus={() => !selected && res.length > 0 && setOpen(true)}
      />
      {selected && (
        <button
          type="button"
          onClick={() => { onClear(); setQ(""); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-0.5 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700/60"
          aria-label="Wyczyść"
        >
          ×
        </button>
      )}
      {open && !selected && res.length > 0 && (
        <div className="absolute left-0 right-0 top-[110%] z-20 bg-zinc-900/95 border border-zinc-700/70 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
          {res.map(item => (
            <button
              key={item.yahoo}
              className="w-full text-left px-3 py-2 hover:bg-zinc-800/70"
              onClick={() => { onSelect(item); setOpen(false); }}
            >
              {item.name} <span className="text-zinc-400">({item.yahoo})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
