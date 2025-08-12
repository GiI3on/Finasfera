"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import LoginCard from "../components/LoginCard";
import PortfolioChart from "../components/PortfolioChart";
import SearchPicker from "../components/SearchPicker";

import {
  listenHoldings,
  addHolding as fsAdd,
  removeHolding as fsDel,
} from "../lib/portfolioStore";

/* ====== Formatery: PLN i % (zawsze 2 miejsca po przecinku) ====== */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v || 0);

const fmtPct = (v) => `${Number(v || 0).toFixed(2)}%`;

/* ====== Wyszukiwarka spółek (API: /api/search) ====== */
function SearchBox({ onPick }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState([]);

  useEffect(() => {
    const id = setTimeout(async () => {
      const term = q.trim();
      if (!term) return setRes([]);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`).then((r) => r.json());
        setRes(Array.isArray(r) ? r : []);
      } catch {
        setRes([]);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="relative">
      <input
        className="input w-full"
        placeholder="Wyszukaj spółkę (np. Orlen, CD Projekt…)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {res.length > 0 && (
        <div className="absolute left-0 right-0 top-[110%] z-20 bg-zinc-900/95 border border-zinc-700/70 rounded-lg overflow-hidden">
          {res.map((r) => (
            <button
              key={r.yahoo}
              className="w-full text-left px-3 py-2 hover:bg-zinc-800/70"
              onClick={() => {
                onPick(r);
                setQ("");
                setRes([]);
              }}
            >
              {r.name} <span className="text-zinc-400">({r.yahoo})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


export default function PortfolioPage() {
  const { user, signOut } = useAuth();

  /* ====== Lokalny cache pozycji (gdy niezalogowany) ====== */
  const [localHoldings, setLocalHoldings] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("holdings") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("holdings", JSON.stringify(localHoldings));
    }
  }, [localHoldings]);

  /* ====== Firestore po zalogowaniu ====== */
  const [fsHoldings, setFsHoldings] = useState(null); // null=brak/niegotowe
  useEffect(() => {
    if (!user) {
      setFsHoldings(null);
      return;
    }
    const unsub = listenHoldings(user.uid, (items) => setFsHoldings(items));
    return () => unsub();
  }, [user]);

  /* Jedno źródło prawdy do UI */
  const holdings = user ? fsHoldings ?? [] : localHoldings;

  /* ====== Quote & History (PLN-ready z API) ====== */
  const [quotes, setQuotes] = useState({}); // { id: { pricePLN, prevClosePLN, currency, ... } }
  const [series, setSeries] = useState({}); // { id: { history: [{t, close}], shares } }

  /* ====== Formularz dodawania ====== */
  const [form, setForm] = useState({ pair: null, shares: "", buyPrice: "", buyDate: "" });

  async function addHolding() {
    if (!form.pair || !form.shares) return;

    const baseItem = {
      name: form.pair.name,
      pair: { yahoo: form.pair.yahoo, stooq: form.pair.stooq },
      shares: Number(form.shares),
      buyPrice: Number(form.buyPrice || 0), // w PLN
      buyDate: form.buyDate || null,
    };

    if (user) {
      await fsAdd(user.uid, baseItem);
    } else {
      setLocalHoldings((h) => [{ id: crypto.randomUUID(), ...baseItem }, ...h]);
    }
    setForm({ pair: null, shares: "", buyPrice: "", buyDate: "" });
  }

  async function removeHolding(id) {
    if (user) {
      await fsDel(user.uid, id);
    } else {
      setLocalHoldings((x) => x.filter((y) => y.id !== id));
    }
  }

  /* -- QUOTES -- */
  useEffect(() => {
    (async () => {
      if (!holdings || holdings.length === 0) {
        setQuotes({});
        return;
      }
      const entries = await Promise.all(
        holdings.map(async (h) => {
          try {
            const q = await fetch("/api/quote", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ pair: h.pair }),
            }).then((r) => r.json());
            return [h.id, q];
          } catch {
            return [h.id, null];
          }
        })
      );
      setQuotes(Object.fromEntries(entries.filter(Boolean)));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(holdings)]);

  /* -- HISTORY -- */
  useEffect(() => {
    (async () => {
      if (!holdings || holdings.length === 0) {
        setSeries({});
        return;
      }
      const entries = await Promise.all(
        holdings.map(async (h) => {
          try {
            const hist = await fetch("/api/history", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ pair: h.pair, range: "1y", interval: "1d" }),
            }).then((r) => r.json());
            return [h.id, { history: Array.isArray(hist?.historyPLN) ? hist.historyPLN : [], shares: h.shares }];
          } catch {
            return [h.id, { history: [], shares: h.shares }];
          }
        })
      );
      setSeries(Object.fromEntries(entries));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(holdings)]);

  /* ====== Podsumowania (cur/cost/day/gain) ====== */
  const totals = useMemo(() => {
  let cur = 0, cost = 0, day = 0;

  for (const h of holdings) {
    // 1) Aktualna cena (PLN): z quote albo z ostatniej historii
    const q = quotes[h.id];
    const hist = series[h.id]?.history || []; // zakładam, że już w PLN
    const lastClose = hist.length ? hist[hist.length - 1].close : undefined;
    const price = Number.isFinite(q?.price) ? q.price : (Number.isFinite(lastClose) ? lastClose : 0);

    // 2) Dzienna zmiana z HISTORII: ostatnie 2 zamknięcia
    let dayDelta = 0;
    if (hist.length >= 2) {
      const prev = hist[hist.length - 2].close;
      if (Number.isFinite(prev) && Number.isFinite(lastClose)) {
        dayDelta = (lastClose - prev) * h.shares;
      }
    } else if (Number.isFinite(q?.prevClose) && Number.isFinite(q?.price)) {
      // fallback: quote (gdy historia za krótka)
      dayDelta = (q.price - q.prevClose) * h.shares;
    }

    const value = price * h.shares;
    const costBasis = (h.buyPrice || 0) * h.shares;

    cur  += value;
    cost += costBasis;
    day  += dayDelta;
  }

  return {
    cur,
    cost,
    day,
    gainAbs: cur - cost,
    gainPct: cost > 0 ? ((cur - cost) / cost) * 100 : 0,
  };
}, [holdings, quotes, series]);

  /* ====== UI stany początkowe ====== */
  if (user === undefined) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-24 text-center text-zinc-400">
        Ładowanie…
      </main>
    );
  }
  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-4 pb-24">
        <section className="text-center mt-8 mb-6">
          <h1 className="h1">Mój Portfel</h1>
        </section>
        <LoginCard />
      </main>
    );
  }

  /* ====== UI ====== */
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      {/* nagłówek */}
      <section className="text-center mt-8 mb-6">
        <h1 className="h1">Mój Portfel</h1>
        <p className="muted text-sm">
          Zalogowano jako {user.email} ·{" "}
          <button className="underline hover:text-zinc-200" onClick={signOut}>
            Wyloguj
          </button>
        </p>
      </section>

      {/* KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="card">
          <div className="card-inner">
            <div className="muted text-sm">Dzienny zysk</div>
            <div className={`text-3xl font-semibold ${totals.day >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmtPLN(totals.day)}
            </div>
            <div className={`${totals.day >= 0 ? "text-emerald-400/80" : "text-red-400/80"} text-xs`}>
              {fmtPct(totals.dayPct)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner">
            <div className="muted text-sm">Całkowity zysk</div>
            <div className={`text-3xl font-semibold ${totals.gainAbs >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmtPLN(totals.gainAbs)}
            </div>
            <div className={`${totals.gainAbs >= 0 ? "text-emerald-400/80" : "text-red-400/80"} text-xs`}>
              {fmtPct(totals.gainPct)}
            </div>
          </div>
        </div>
      </section>

{/* Dodawanie pozycji */}
<section className="card mb-4">
  <div className="card-inner">
    {/* Desktop: 5 kolumn o kontrolowanej szerokości; Mobile: 1 kolumna */}
    <div className="
      grid gap-3 items-center
      grid-cols-1
      md:[grid-template-columns:minmax(320px,1fr)_minmax(120px,180px)_minmax(140px,220px)_minmax(160px,220px)_minmax(140px,180px)]
    ">
      {/* 1) Wybór spółki */}
      <div>
        <SearchPicker
          selected={form.pair}
          onSelect={(pair) => setForm((f) => ({ ...f, pair }))}
          onClear={() => setForm((f) => ({ ...f, pair: null }))}
        />
      </div>

      {/* 2) Liczba akcji */}
      <input
        className="input h-11"
        placeholder="Liczba akcji"
        inputMode="numeric"
        value={form.shares}
        onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
      />

      {/* 3) Cena zakupu */}
      <input
        className="input h-11"
        placeholder="Cena zakupu (PLN)"
        inputMode="decimal"
        value={form.buyPrice}
        onChange={(e) => setForm((f) => ({ ...f, buyPrice: e.target.value }))}
      />

      {/* 4) Data zakupu */}
      <input
        className="input h-11"
        type="date"
        value={form.buyDate}
        onChange={(e) => setForm((f) => ({ ...f, buyDate: e.target.value }))}
      />

      {/* 5) Przyciski */}
      <div className="flex gap-2">
        <button
          className="btn-primary h-11 w-full"
          onClick={addHolding}
          disabled={!form.pair || !form.shares}
        >
          Dodaj
        </button>
      </div>
    </div>
  </div>
</section>




      {/* Wykres portfela */}
      <section className="card mb-4">
        <div className="card-inner">
          <h3 className="h2 mb-2">Wartość portfela (PLN)</h3>
          <PortfolioChart
            seriesBySymbol={Object.fromEntries(
              holdings.map((h) => [h.id, series[h.id] || { history: [], shares: h.shares }])
            )}
            height={240}
          />
        </div>
      </section>

      {/* Tabela pozycji */}
      <section className="card">
        <div className="card-inner">
          <table className="w-full text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="text-left pb-2">Spółka</th>
                <th className="text-right pb-2">Cena</th>
                <th className="text-right pb-2">Liczba akcji</th>
                <th className="text-right pb-2">Wartość</th>
                <th className="text-right pb-2">Zysk/Strata</th>
                <th className="text-right pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const q = quotes[h.id];
                const lastClose = (series[h.id]?.history || []).at(-1)?.close;
                const price = Number.isFinite(q?.pricePLN) ? q.pricePLN : lastClose ?? 0;
                const value = price * h.shares;
                const cost = (h.buyPrice || 0) * h.shares;
                const gain = value - cost;
                const gainPct = cost > 0 ? (gain / cost) * 100 : 0;

                return (
                  <tr key={h.id} className="border-t border-zinc-800">
                    <td className="py-2">
                      {h.name} <span className="text-zinc-500">({h.pair.yahoo})</span>
                    </td>
                    <td className="py-2 text-right">{fmtPLN(price)}</td>
                    <td className="py-2 text-right">{h.shares}</td>
                    <td className="py-2 text-right">{fmtPLN(value)}</td>
                    <td className={`py-2 text-right ${gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmtPLN(gain)} ({fmtPct(gainPct)})
                    </td>
                    <td className="py-2 text-right">
                      <button className="text-zinc-400 hover:text-red-400" onClick={() => removeHolding(h.id)}>
                        Usuń
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
