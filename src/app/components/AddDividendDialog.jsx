// src/app/components/AddDividendDialog.jsx
"use client";

import { useState, useMemo } from "react";
import { addDividendDetailed } from "../../lib/portfolioStore";

export default function AddDividendDialog({ uid, portfolioId, open, onClose }) {
  const [symbol, setSymbol] = useState("");
  const [gross, setGross] = useState("");
  const [wht, setWht] = useState("");
  const [currency, setCurrency] = useState("PLN");
  const [fxRate, setFxRate] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0,10));
  const [exDate, setExDate] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [note, setNote] = useState("");

  const netSrc = useMemo(() => {
    const g = Number(gross)||0;
    const t = Number(wht)||0;
    return g - t;
  }, [gross, wht]);

  const netPLN = useMemo(() => {
    const n = Number(netSrc)||0;
    const fx = Number(fxRate);
    if (currency === "PLN") return n;
    if (!(fx>0)) return 0;
    return n * fx;
  }, [netSrc, fxRate, currency]);

  if (!open) return null;

  async function submit(e) {
    e?.preventDefault?.();
    if (!uid) return;

    const payload = {
      symbol: symbol?.trim() || "",
      grossAmount: Number(gross)||0,
      withholdingTax: Number(wht)||0,
      netAmount: Number(netSrc)||0,
      currencySrc: currency || "PLN",
      fxRate: currency === "PLN" ? 1 : (Number(fxRate)||null),
      payDate,
      exDate: exDate || null,
      recordDate: recordDate || null,
      note: note?.trim() || null,
    };

    await addDividendDetailed(uid, portfolioId || null, payload);

    // reset i zamknięcie
    setSymbol(""); setGross(""); setWht(""); setCurrency("PLN"); setFxRate(""); setNote("");
    setExDate(""); setRecordDate("");
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-3">Dodaj dywidendę</h3>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Symbol</label>
              <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                     value={symbol} onChange={(e)=>setSymbol(e.target.value)} placeholder="np. KO / PZU.WA" />
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Data wypłaty (payDate)</label>
              <input type="date" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                     value={payDate} onChange={(e)=>setPayDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Brutto</label>
              <input type="number" step="0.01"
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                     value={gross} onChange={(e)=>setGross(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Podatek (WHT)</label>
              <input type="number" step="0.01"
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                     value={wht} onChange={(e)=>setWht(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Waluta</label>
              <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                     value={currency} onChange={(e)=>setCurrency(e.target.value.toUpperCase())} placeholder="PLN / USD / EUR" />
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Kurs FX (→ PLN)</label>
              <input type="number" step="0.0001"
                     disabled={currency==="PLN"}
                     className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 disabled:opacity-50"
                     value={fxRate} onChange={(e)=>setFxRate(e.target.value)} placeholder="np. 4.10" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Ex-date (opcjonalnie)</label>
              <input type="date" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                     value={exDate} onChange={(e)=>setExDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Record date (opcjonalnie)</label>
              <input type="date" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                     value={recordDate} onChange={(e)=>setRecordDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1">Notatka</label>
            <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                   value={note} onChange={(e)=>setNote(e.target.value)} placeholder="opcjonalnie" />
          </div>

          <div className="text-sm text-zinc-400">
            Netto (waluta): <span className="text-zinc-100 font-medium">{(Number(netSrc)||0).toFixed(2)} {currency}</span>
            {"  "}· Netto (PLN): <span className="text-zinc-100 font-medium">{(Number(netPLN)||0).toFixed(2)} PLN</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700" onClick={onClose}>Anuluj</button>
            <button type="submit" className="px-3 py-1.5 rounded-lg bg-yellow-500 text-black hover:bg-yellow-400">Dodaj</button>
          </div>
        </form>
      </div>
    </div>
  );
}
