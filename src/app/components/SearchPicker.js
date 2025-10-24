"use client";
import { useEffect, useRef, useState } from "react";

/* ===== formatery ===== */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 2 })
    .format(Math.round((v ?? 0) * 100) / 100);
const priceCell = (p, loading=false) => (loading ? "…" : (p == null || !Number.isFinite(p) || p <= 0 ? "—" : fmtPLN(p)));

/* ===== utils ===== */
const norm = (s = "") =>
  String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
function useDebouncedValue(value, delay = 280) {
  const [v, setV] = useState(value);
  useEffect(() => { const h = setTimeout(() => setV(value), delay); return () => clearTimeout(h); }, [value, delay]);
  return v;
}

/* Uzupełnianie symboli pod providerów (GPW/USA) */
function ensurePairMappings(pairIn = {}) {
  const out = { ...pairIn };
  const y = String(out.yahoo || "").toUpperCase().trim();
  if (y.endsWith(".WA")) { out.yahoo = y; out.stooq = out.stooq || y.slice(0, -3).toLowerCase(); out.finnhub = out.finnhub || y; out.currency = out.currency || "PLN"; }
  if (!out.stooq && /^[A-Z.\-]{1,10}$/.test(y) && !y.includes(".")) { out.yahoo = y; out.stooq = `${y.toLowerCase()}.us`; out.finnhub = out.finnhub || y; out.currency = out.currency || "USD"; }
  return out;
}

/* Fallback katalog z public/… tylko gdy API nic nie zwróci */
async function loadLocalCatalogFallback() {
  const paths = ["/data/catalog.json", "/catalog.json", "/companies.json"];
  for (const u of paths) { try { const r = await fetch(u, { cache: "no-store" }); if (r.ok) return await r.json(); } catch {} }
  return [];
}

/**
 * props:
 *  - selected: { name?, yahoo, stooq, finnhub?, currency? } | null
 *  - onSelect: (pair) => void
 *  - onClear: () => void
 */
export default function SearchPicker({ selected, onSelect, onClear, placeholder }) {
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q);
  const [rows, setRows] = useState([]);          // {name,yahoo,stooq,finnhub,currency,exchangeName,price?}
  const [prices, setPrices] = useState({});      // key -> price (PLN)
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const acRef = useRef(null);
  const wrapRef = useRef(null);

  // zamykanie po kliknięciu poza
  useEffect(() => {
    function onDocClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // GŁÓWNE ŹRÓDŁO: /api/search (łączenie ręcznych + Yahoo). Fallback: public/data/catalog.json
  useEffect(() => {
    (async () => {
      const qRaw = debounced.trim();
      if (qRaw.length < 2) { setRows([]); setPrices({}); return; }

      setLoading(true);
      if (acRef.current) acRef.current.abort();
      const ac = new AbortController();
      acRef.current = ac;

      // 1) Spróbuj API
      let list = [];
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(qRaw)}`, { cache: "no-store", signal: ac.signal });
        if (r.ok) list = await r.json();
      } catch {}

      // 2) Jeśli API puste -> fallback lokalny (proste filtrowanie)
      if (!Array.isArray(list) || list.length === 0) {
        const all = await loadLocalCatalogFallback();
        const nq = norm(qRaw);
        list = (Array.isArray(all) ? all : []).filter((c) => {
          const nName = norm(c.name || "");
          const nTick = norm(c.yahoo || c.ticker || "");
          const nAliases = (c.aliases || []).map(norm);
          return nTick.includes(nq) || nName.includes(nq) || nAliases.some(a => a.includes(nq));
        }).slice(0, 20).map((c) => ({
          name: c.name, yahoo: c.yahoo || c.ticker || "", stooq: c.stooq, finnhub: c.finnhub,
          currency: c.currency, exchangeName: c.exchange_name || c.exchange || "", price: null,
        }));
      }

      // 3) Normalizacja + ustaw ceny wstępne (z API mamy już price w PLN)
      const cleaned = (Array.isArray(list) ? list : []).map((it, i) => ({
        __i: i,
        name: it.name,
        yahoo: it.yahoo || it.ticker || "",
        stooq: it.stooq || null,
        finnhub: it.finnhub || null,
        currency: it.currency || null,
        exchangeName: it.exchangeName || it.exchange_name || it.exchange || "",
        price: Number.isFinite(it.price) ? Number(it.price) : null,   // PLN z /api/search
      }));
      setRows(cleaned);

      // 4) Map cen: od razu ustaw to co przyszło z API,
      //    a dla brakujących dociągnij (max 12) przez /api/quote
      const initialPrices = {};
      for (const it of cleaned) {
        const key = it.yahoo || it.name;
        if (Number.isFinite(it.price)) initialPrices[key] = it.price;
      }
      setPrices(initialPrices);

      const need = cleaned.filter(it => !Number.isFinite(it.price)).slice(0, 12);
      if (need.length) {
        const quotePairs = await Promise.all(
          need.map(async (it) => {
            const pair = ensurePairMappings({ name: it.name, yahoo: it.yahoo, stooq: it.stooq, finnhub: it.finnhub, currency: it.currency });
            try {
              const q = await fetch("/api/quote", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ pair }),
                cache: "no-store",
                signal: ac.signal,
              }).then((r) => (r.ok ? r.json() : null));
              const key = it.yahoo || it.name;
              const price = q?.pricePLN ?? (q?.currency === "PLN" ? q?.price ?? null : null);
              return [key, price];
            } catch {
              return [it.yahoo || it.name, null];
            }
          })
        );
        setPrices((prev) => ({ ...prev, ...Object.fromEntries(quotePairs) }));
      }

      setLoading(false);
    })();

    return () => { if (acRef.current) acRef.current.abort(); };
  }, [debounced]);

  const selectRow = (it) => {
    const pair = ensurePairMappings({ name: it.name, yahoo: it.yahoo, stooq: it.stooq, finnhub: it.finnhub, currency: it.currency });
    onSelect?.(pair);
    setQ(""); setRows([]); setOpen(false);
  };

  const clear = () => { setQ(""); setRows([]); setPrices({}); onClear?.(); setOpen(false); };
  const hasSelection = !!selected;

  return (
    <div ref={wrapRef} className="relative">
      {/* input z pigułką wybranej spółki */}
      <div className="relative">
        {hasSelection ? (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2 rounded-md bg-zinc-800 px-2 py-1 text-sm">
            <span className="font-medium">{selected?.name || selected?.yahoo}</span>
            <span className="text-zinc-400">({selected?.yahoo || "—"})</span>
            <button type="button" aria-label="Wyczyść" className="ml-1 rounded px-1 text-zinc-400 hover:text-zinc-200" onClick={clear}>×</button>
          </div>
        ) : null}

        <input
          className={["input h-11 w-full pr-3", hasSelection ? "pl-[220px]" : "pl-3"].join(" ")}
          placeholder={placeholder || "Wyszukaj spółkę lub ETF (np. Orlen, CD Projekt, TSLA...)"}
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        />
      </div>

      {/* dropdown z cenami po prawej */}
      {open && q && rows.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-80 overflow-auto rounded-lg border border-zinc-700 bg-zinc-900/95 shadow-xl">
          <ul>
            {rows.map((it) => {
              const key = it.yahoo || it.name;
              const p = prices[key];
              const hasTicker = !!(it.yahoo || it.stooq);
              return (
                <li
                  key={`${it.yahoo || "NA"}__${it.exchangeName || ""}__${it.name}`}
                  className={["flex items-center justify-between gap-3 px-3 py-2 cursor-pointer",
                    hasTicker ? "hover:bg-zinc-800/60" : "opacity-60 cursor-not-allowed"].join(" ")}
                  onClick={() => hasTicker && selectRow(it)}
                  title={hasTicker ? "" : "Brak tickera – wybierz pozycję z symbolem"}
                >
                  <div className="min-w-0">
                    <div className="truncate">
                      <span className="font-medium">{it.name}</span>{" "}
                      {it.yahoo ? <span className="text-zinc-400">({it.yahoo})</span> : <span className="text-zinc-600">(brak tickera)</span>}
                    </div>
                    <div className="text-xs text-zinc-400">{it.exchangeName}</div>
                  </div>
                  <div className="ml-4 shrink-0 tabular-nums text-right w-[100px]">
                    {priceCell(p, loading && !Number.isFinite(p))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* brak wyników */}
      {open && q && rows.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-400">
          Nie znaleziono. Spróbuj pełnej nazwy, tickera (np. <b>PKN.WA</b>) lub innego słowa kluczowego.
        </div>
      )}
    </div>
  );
}
