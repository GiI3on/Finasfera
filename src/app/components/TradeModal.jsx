"use client";

import { useEffect, useMemo, useState } from "react";
import SearchPicker from "./SearchPicker";

const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" })
    .format(Number.isFinite(v) ? v : 0);

export default function TradeModal({
  open,
  onClose,
  defaultPair = null,
  cashBalancePLN = 0,
  onSubmit,
}) {
  const [pair, setPair] = useState(defaultPair);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [feePct, setFeePct] = useState("");
  const [feeAbs, setFeeAbs] = useState("");
  const [verifyPrice, setVerifyPrice] = useState(false);
  const [autoTopUp, setAutoTopUp] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setPair(defaultPair || null);
      setDate(new Date().toISOString().slice(0, 10));
      setShares("");
      setPrice("");
      setFeePct("");
      setFeeAbs("");
      setVerifyPrice(false);
      setAutoTopUp(true);
      setNote("");
    }
  }, [open, defaultPair]);

  const valuePLN = useMemo(() => {
    const s = Number(shares || 0);
    const p = Number(price || 0);
    return s > 0 && p > 0 ? s * p : 0;
  }, [shares, price]);

  const feePLN = useMemo(() => {
    const fAbs = Number(feeAbs || 0);
    const fPct = Number(feePct || 0);
    return Math.max(0, fAbs + (valuePLN * fPct) / 100);
  }, [valuePLN, feePct, feeAbs]);

  const totalNeed = valuePLN + feePLN;
  const willAutotopup = autoTopUp && totalNeed > cashBalancePLN;
  const missing = Math.max(0, totalNeed - cashBalancePLN);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-1/2 top-6 w-[min(720px,95vw)] -translate-x-1/2 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-lg font-semibold">Kup walory do portfela</h2>
          <button className="text-zinc-400 hover:text-zinc-200" onClick={onClose}>✕</button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-2">
          {/* Stan konta */}
          <div className="col-span-2">
            <label className="text-sm text-zinc-400">Stan konta</label>
            <div className="mt-1 h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 flex items-center">
              <span className="font-medium">{fmtPLN(cashBalancePLN)}</span>
              {willAutotopup && (
                <span className="ml-auto text-sm text-yellow-300">
                  auto-zasilenie: +{fmtPLN(missing)}
                </span>
              )}
            </div>
          </div>

          {/* Walor */}
          <div className="col-span-2">
            <label className="text-sm text-zinc-400">Wybierz walor</label>
            <div className="mt-1">
              <SearchPicker selected={pair} onSelect={setPair} onClear={() => setPair(null)} />
            </div>
          </div>

          {/* Data / godzina uproszczone – tylko data */}
          <div>
            <label className="text-sm text-zinc-400">Data</label>
            <input
              type="date"
              className="mt-1 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Jednostki */}
          <div>
            <label className="text-sm text-zinc-400">Liczba jednostek</label>
            <input
              className="mt-1 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-right"
              inputMode="decimal"
              placeholder="Wpisz liczbę jednostek"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
            />
          </div>

          {/* Cena */}
          <div>
            <label className="text-sm text-zinc-400">Cena (PLN)</label>
            <input
              className="mt-1 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-right"
              inputMode="decimal"
              placeholder="Wpisz cenę"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <label className="mt-2 flex select-none items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                className="accent-yellow-500"
                checked={verifyPrice}
                onChange={(e) => setVerifyPrice(e.target.checked)}
              />
              Zweryfikuj cenę
            </label>
          </div>

          {/* Prowizja */}
          <div>
            <label className="text-sm text-zinc-400">Prowizja</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <input
                className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-right"
                inputMode="decimal"
                placeholder="%"
                value={feePct}
                onChange={(e) => setFeePct(e.target.value)}
              />
              <input
                className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-right"
                inputMode="decimal"
                placeholder="Wartość (PLN)"
                value={feeAbs}
                onChange={(e) => setFeeAbs(e.target.value)}
              />
            </div>
          </div>

          {/* Wartość + auto-zasilenie */}
          <div>
            <label className="text-sm text-zinc-400">Wartość</label>
            <div className="mt-1 h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 flex items-center justify-between">
              <span className="text-zinc-200">{fmtPLN(valuePLN)}</span>
              <span className="text-sm text-zinc-400">
                Razem: <b>{fmtPLN(totalNeed)}</b> (z prowizją {fmtPLN(feePLN)})
              </span>
            </div>
            <label className="mt-2 flex select-none items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                className="accent-yellow-500"
                checked={autoTopUp}
                onChange={(e) => setAutoTopUp(e.target.checked)}
              />
              Dodaj wpłatę (auto-zasilenie) gdy zabraknie środków
            </label>
          </div>

          {/* Komentarz */}
          <div className="col-span-2">
            <label className="text-sm text-zinc-400">Komentarz</label>
            <input
              className="mt-1 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3"
              placeholder="Wpisz komentarz do operacji"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-4 py-3">
          <button className="btn h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-5 hover:bg-zinc-800" onClick={onClose}>
            Anuluj
          </button>
          <button
            className="btn-primary h-10 rounded-lg px-6"
            onClick={() => {
              if (!pair?.yahoo || !shares || !price) return;
              onSubmit?.({
                pair,
                date,
                shares: Number(shares),
                price: Number(price),
                feePct: Number(feePct || 0),
                feeAbs: Number(feeAbs || 0),
                verifyPrice,
                autoTopUp,
                note,
              });
              onClose();
            }}
          >
            Kup
          </button>
        </div>
      </div>
    </div>
  );
}
