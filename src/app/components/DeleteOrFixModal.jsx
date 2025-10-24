// File: src/app/components/DeleteOrFixModal.jsx
"use client";
import { useMemo, useState } from "react";

const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(v)) ? Number(v) : 0);

export default function DeleteOrFixModal({
  open,
  onClose,
  lot,          // { id, shares, buyPrice, buyDate, pair, meta? }
  group,        // { name, pair }
  onUndoError,  // async (lot, preview) => void
}) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const preview = useMemo(() => {
    if (!lot) return null;
    const shares = Number(lot.shares) || 0;
    const price  = Number(lot.buyPrice) || 0;
    const meta   = lot.meta || {};
    const cost   = shares * price;

    return {
      grossPaid: cost,
      fee: Number(meta.fee) || 0,
      topupMode: meta.topupMode || "none",         // 'none' | 'full' | 'diff'
      topupAmount: Number(meta.topupAmount) || 0,  // PLN
      txnId: meta.txnId || lot.id,
    };
  }, [lot]);

  if (!open || !lot) return null;

  const symbol = lot?.pair?.yahoo || group?.pair?.yahoo || group?.name || "—";

  async function handleConfirm() {
    if (submitting) return;
    try {
      setSubmitting(true);
      await onUndoError?.(lot, preview);
      setDone(true);
      // krótka pauza i zamknięcie
      setTimeout(() => {
        setSubmitting(false);
        setDone(false);
        onClose?.();
      }, 1100);
    } catch (e) {
      setSubmitting(false);
      // błąd jest już zalogowany w onUndoError; zostawiamy modal otwarty
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 text-zinc-100 shadow-xl ring-1 ring-zinc-800">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold">
            Cofnij zakup <span className="text-zinc-400">(anuluj błąd)</span>
          </h3>
          <button
            className="text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div className="px-5 py-4 space-y-4">
          <div className="text-sm text-zinc-400">
            Walor: <span className="text-zinc-200">{symbol}</span> · Data zakupu:{" "}
            <span className="text-zinc-200">
              {lot.buyDate ? new Date(lot.buyDate).toLocaleDateString("pl-PL") : "—"}
            </span>{" "}
            · Ilość: <span className="text-zinc-200">{lot.shares}</span> · Cena:{" "}
            <span className="text-zinc-200">{fmtPLN(lot.buyPrice || 0)}</span>
          </div>

          {/* żółty box – uproszczony komunikat */}
          <div className="rounded-xl border border-yellow-600/50 bg-yellow-900/20 p-4">
            <div className="font-medium text-yellow-200 mb-1">
              Co zostanie zrobione?
            </div>
            <ul className="text-sm text-yellow-100/90 space-y-1">
              <li>• Usuniemy ten zakup z listy.</li>
              <li>• Przywrócimy saldo gotówki do stanu sprzed transakcji.</li>
              <li>• Statystyki (TWR) pozostaną bez zmian.</li>
            </ul>

            {/* skrócone podsumowanie kwot */}
            <div className="mt-3 text-sm text-yellow-100/90 space-y-0.5">
              <div>Kwota zwrotu: <span className="font-semibold">{fmtPLN(preview?.grossPaid || 0)}</span></div>
              {preview?.topupMode !== "none" && (
                <div>Cofnięcie doładowania: <span className="font-semibold">-{fmtPLN(preview?.topupAmount || 0)}</span></div>
              )}
              <div>Data księgowania: <span className="font-semibold">
                {lot.buyDate ? new Date(lot.buyDate).toLocaleDateString("pl-PL") : "—"}
              </span></div>
            </div>
          </div>

          {/* ekran sukcesu */}
          {done && (
            <div className="rounded-xl bg-emerald-900/20 border border-emerald-600/40 p-3 text-emerald-300 text-sm">
              Zakup cofnięty ✔️
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
          <button
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
            onClick={onClose}
            disabled={submitting}
          >
            Anuluj
          </button>
          <button
            className="px-3 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 disabled:opacity-60"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Trwa cofanie…" : "Cofnij zakup"}
          </button>
        </div>
      </div>
    </div>
  );
}
