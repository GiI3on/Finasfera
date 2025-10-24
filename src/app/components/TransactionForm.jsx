// src/app/components/TransactionForm.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addHolding,
  sellPosition,
  addDeposit,
  addWithdrawal,
  listenCashBalance,
} from "../../lib/portfolioStore";

/* ==== helpers ==== */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" })
    .format(Number(v || 0));

const toNum = (v) => Number(String(v ?? "0").replace(",", ".")) || 0;

/* ==== komponent ==== */
export default function TransactionForm({
  uid,
  portfolioId,            // ⬅️ NOWE: id bieżącego portfela (może być null dla głównego)
  onClose,
  onSaved,
  onDone,
}) {
  // typ transakcji
  const [type, setType] = useState("Kupno"); // Kupno | Sprzedaż | Wpłata | Wypłata
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // walor + podpowiedzi
  const [query, setQuery] = useState("");
  const [suggests, setSuggests] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [pair, setPair] = useState(null); // { yahoo, name, currency?, display }

  // ilość / cena / waluta
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [ccy, setCcy] = useState("PLN");
  const [fx, setFx] = useState(1);

  // prowizja
  const [feeMode, setFeeMode] = useState("brak"); // brak | kwota | %
  const [feeVal, setFeeVal] = useState("");

  // doładowanie przy kupnie
  const [topUpMode, setTopUpMode] = useState("brak"); // brak | pełna | różnica
  const [topUp, setTopUp] = useState("0");

  // saldo gotówki (live)
  const [balance, setBalance] = useState(0);

  // komunikaty
  const [error, setError] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");

  // zakończenie (obsłuży dowolny z trzech propsów)
  function finish() {
    if (onDone) onDone();
    else if (onSaved) onSaved();
    else if (onClose) onClose();
  }

  /* ==== saldo gotówki – PER PORTFEL ==== */
  useEffect(() => {
    if (!uid) return;
    const unsub = listenCashBalance(
      uid,
      portfolioId ?? null,              // ⬅️ klucz: saldo z wybranego portfela
      ({ balance }) => setBalance(Number(balance) || 0)
    );
    return () => unsub?.();
  }, [uid, portfolioId]);               // ⬅️ portfolioId w deps

  /* ==== FX ==== */
  useEffect(() => {
    if (ccy === "PLN") { setFx(1); return; }
    // jeśli nie masz endpointu FX — zostaw 1 (bezpieczny fallback)
    setFx(1);
  }, [ccy, date]);

  /* ==== podpowiedzi waloru (bezpieczne; działa nawet jak /api/lookup nie istnieje) ==== */
  const canPickAsset = type === "Kupno" || type === "Sprzedaż";
  useEffect(() => {
    if (!canPickAsset) return;
    if (!query || query.trim().length < 2) { setSuggests([]); return; }
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/lookup?q=${encodeURIComponent(query.trim())}`);
        const j = await r.json();
        setSuggests(j?.items || []);
        setShowSug(true);
      } catch {
        setSuggests([]); // brak endpointu = po prostu brak listy
      }
    }, 200);
    return () => clearTimeout(id);
  }, [query, canPickAsset]);

  /* ==== obliczenia ==== */
  const qtyN = toNum(qty);
  const priceN = toNum(price);
  const pricePLN = ccy === "PLN" ? priceN : priceN * (Number(fx) || 1);

  const gross = qtyN * pricePLN;

  const fee =
    feeMode === "kwota" ? toNum(feeVal)
      : feeMode === "%" ? (gross * toNum(feeVal)) / 100
      : 0;

  const totalBuy  = Math.max(0, gross + fee);
  const totalSell = Math.max(0, gross - fee);

  const proposedTopUp =
    type !== "Kupno" ? 0 :
    topUpMode === "pełna" ? totalBuy :
    topUpMode === "różnica" ? Math.max(0, totalBuy - balance) : 0;

  useEffect(() => {
    if (type !== "Kupno") setTopUp("0");
    else if (topUpMode === "brak") setTopUp("0");
    else setTopUp(String(Math.round((proposedTopUp + Number.EPSILON) * 100) / 100));
  }, [type, topUpMode, proposedTopUp]);

  /* ==== weryfikacja ceny z /api/quote ==== */
  async function verifyPrice() {
    try {
      setVerifyMsg("Sprawdzam…");
      const r = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pair }),
      });
      const j = r.ok ? await r.json() : null;
      const p = Number(j?.pricePLN ?? j?.price ?? NaN);
      if (Number.isFinite(p) && p > 0) {
        setPrice(String(p));
        setCcy("PLN");
        setVerifyMsg("Pobrano cenę z API.");
      } else {
        setVerifyMsg("Brak prawidłowej ceny w API.");
      }
    } catch {
      setVerifyMsg("Brak prawidłowej ceny w API.");
    }
  }

  /* ==== zapis ==== */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (type === "Wpłata") {
      const v = toNum(price);
      if (v <= 0) return setError("Podaj dodatnią kwotę wpłaty.");
      await addDeposit(uid, portfolioId ?? null, { amount: v, date, note: "Wpłata gotówki" });  // ⬅️ portfolioId
      return finish();
    }

    if (type === "Wypłata") {
      const v = toNum(price);
      if (v <= 0) return setError("Podaj dodatnią kwotę wypłaty.");
      await addWithdrawal(uid, portfolioId ?? null, { amount: v, date, note: "Wypłata gotówki" }); // ⬅️ portfolioId
      return finish();
    }

    // Kupno / Sprzedaż
    if (canPickAsset && !pair?.yahoo) return setError("Wybierz spółkę/ETF z listy.");
    if (qtyN <= 0 || priceN <= 0)  return setError("Podaj dodatnie: ilość i cenę.");

    if (type === "Kupno") {
      if (topUpMode === "brak" && balance < totalBuy) {
        return setError(
          `Brak środków: potrzeba ${fmtPLN(totalBuy)}, saldo ${fmtPLN(balance)}. ` +
          `Wybierz „pełna kwota zakupu” lub „tylko różnica”.`
        );
      }

      const topUpVal =
        topUpMode === "pełna" ? totalBuy :
        topUpMode === "różnica" ? Math.max(0, totalBuy - balance) :
        toNum(topUp);

      await addHolding(
        uid,
        portfolioId ?? null,  // ⬅️ KLUCZ: zapis do bieżącego portfela
        {
          name: pair?.name || pair?.yahoo || query || "—",
          pair: { yahoo: pair?.yahoo, currency: ccy },
          shares: qtyN,
          buyPrice: pricePLN,
          buyDate: date,
        },
        { autoTopUp: false, topUp: topUpVal }
      );

      return finish();
    }

    if (type === "Sprzedaż") {
      await sellPosition(uid, portfolioId ?? null, {  // ⬅️ portfolioId
        yahoo: pair?.yahoo,
        qty: qtyN,
        price: pricePLN,
        date,
        note: "Sprzedaż",
      });
      return finish();
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* saldo */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
        <div className="text-zinc-400">Saldo gotówki</div>
        <div className="text-lg font-semibold">{fmtPLN(balance)}</div>
      </div>

      {/* typ + data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="muted text-sm">Typ</label>
          <select className="input w-full" value={type} onChange={(e) => setType(e.target.value)}>
            <option>Kupno</option>
            <option>Sprzedaż</option>
            <option>Wpłata</option>
            <option>Wypłata</option>
          </select>
        </div>
        <div>
          <label className="muted text-sm">Data</label>
          <div className="relative">
            <input type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-yellow-400">🗓️</span>
          </div>
        </div>
      </div>

      {/* walor + podpowiedzi */}
      {(type === "Kupno" || type === "Sprzedaż") && (
        <div className="relative">
          <label className="muted text-sm">Walor</label>
          <div className="flex gap-2">
            <input
              className="input w-full"
              placeholder="Wyszukaj spółkę lub ETF (np. PZU, Orlen, TSLA...)"
              value={pair?.display || query}
              onFocus={() => setShowSug(true)}
              onChange={(e) => { setPair(null); setQuery(e.target.value); }}
            />
            <button
              type="button"
              className="px-3 rounded-lg border border-zinc-700 hover:bg-zinc-800"
              onClick={verifyPrice}
            >
              Zweryfikuj cenę
            </button>
          </div>
          {!!verifyMsg && <div className="text-xs text-zinc-400 pt-1">{verifyMsg}</div>}

          {showSug && suggests.length > 0 && (
            <div
              className="absolute z-10 mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 shadow-lg max-h-64 overflow-auto"
              onMouseLeave={() => setShowSug(false)}
            >
              {suggests.map((s) => (
                <button
                  key={s.symbol}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-800"
                  onClick={() => {
                    setPair({
                      yahoo: s.symbol,
                      name: s.name,
                      currency: s.currency || "PLN",
                      display: `${s.name} (${s.symbol})`,
                    });
                    setQuery("");
                    setCcy(s.currency || "PLN");
                    setShowSug(false);
                  }}
                  type="button"
                >
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-zinc-400">{s.symbol} · {s.exchange}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ilość / cena / waluta lub kwota */}
      {(type === "Kupno" || type === "Sprzedaż") ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="muted text-sm">Ilość</label>
            <input className="input w-full" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="np. 10" />
          </div>
          <div className="sm:col-span-2 grid grid-cols-[1fr_auto_auto] gap-2">
            <div>
              <label className="muted text-sm">Cena</label>
              <input className="input w-full" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="np. 123,45" />
            </div>
            <div>
              <label className="muted text-sm">Waluta</label>
              <select className="input" value={ccy} onChange={(e) => setCcy(e.target.value)}>
                <option>PLN</option>
                <option>EUR</option>
                <option>USD</option>
              </select>
            </div>
            <div className="self-end text-xs text-zinc-400 pb-1">
              {ccy !== "PLN" && <>Kurs {ccy}/PLN ≈ <span className="text-zinc-200">{fx.toFixed(4)}</span></>}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className="muted text-sm">Kwota (PLN)</label>
          <input className="input w-full" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="np. 1000" />
        </div>
      )}

      {/* prowizja + podsumowanie */}
      {(type === "Kupno" || type === "Sprzedaż") && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-zinc-700 p-3">
              <div className="text-xs text-zinc-400">Wartość (ilość × cena)</div>
              <div className="font-semibold">{fmtPLN(gross)}</div>
            </div>

            <div className="rounded-lg border border-zinc-700 p-3">
              <div className="text-xs text-zinc-400">Prowizja</div>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={feeMode==="brak"} onChange={()=>setFeeMode("brak")} /> brak
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={feeMode==="kwota"} onChange={()=>setFeeMode("kwota")} /> kwota
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={feeMode==="%" } onChange={()=>setFeeMode("%")} /> %
                </label>
              </div>
              {(feeMode === "kwota" || feeMode === "%") && (
                <input className="input mt-2" inputMode="decimal"
                       placeholder={feeMode==="kwota" ? "np. 5,00" : "np. 0,39"}
                       value={feeVal} onChange={(e)=>setFeeVal(e.target.value)} />
              )}
            </div>

            <div className="rounded-lg border border-zinc-700 p-3">
              <div className="text-xs text-zinc-400">{type === "Kupno" ? "Razem do zapłaty" : "Wpływ netto"}</div>
              <div className="font-semibold">{type === "Kupno" ? fmtPLN(totalBuy) : fmtPLN(totalSell)}</div>
            </div>
          </div>

          {type === "Kupno" && (
            <div className="rounded-lg border border-zinc-700 p-3">
              <div className="text-sm text-zinc-400 mb-2">Doładowanie konta</div>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={topUpMode==="brak"} onChange={()=>setTopUpMode("brak")} /> brak
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={topUpMode==="pełna"} onChange={()=>setTopUpMode("pełna")} /> pełna kwota zakupu
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={topUpMode==="różnica"} onChange={()=>setTopUpMode("różnica")} /> tylko różnica
                </label>
              </div>

              <div className="grid grid-cols-[1fr_auto] items-end gap-3 mt-2">
                <div>
                  <div className="text-sm text-zinc-400 mb-1">Kwota doładowania (PLN)</div>
                  <input className="input w-full" inputMode="decimal" value={topUp} onChange={(e)=>setTopUp(e.target.value)} />
                </div>
                <div className="text-sm text-zinc-400">
                  Proponowane: <span className="text-zinc-200">{fmtPLN(proposedTopUp)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* błąd */}
      {!!error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 text-red-200 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {/* akcje */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <button type="button" className="px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800" onClick={finish}>
          Wyczyść / Zamknij
        </button>
        <button type="submit" className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400">
          Zapisz transakcję
        </button>
      </div>
    </form>
  );
}
