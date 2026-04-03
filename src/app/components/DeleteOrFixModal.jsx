"use client";
import { useMemo, useState } from "react";
import { updateHoldingNote } from "../../lib/portfolioStore";

const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(v)) ? Number(v) : 0);

export default function DeleteOrFixModal({
  uid,            // <-- DODANE (aby wiedzieć u jakiego usera zapisać tezę)
  portfolioId,    // <-- DODANE 
  open,
  onClose,
  lot,          
  group,        
  onUndoError,  
}) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Stan do edycji tezy
  const [thesisText, setThesisText] = useState(lot?.note || "");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedOk, setNoteSavedOk] = useState(false);

  const preview = useMemo(() => {
    if (!lot) return null;
    const shares = Number(lot.shares) || 0;
    const price  = Number(lot.buyPrice) || 0;
    const meta   = lot.meta || {};
    const cost   = shares * price;

    return {
      grossPaid: cost,
      fee: Number(meta.fee) || 0,
      topupMode: meta.topupMode || "none",         
      topupAmount: Number(meta.topupAmount) || 0,  
      txnId: meta.txnId || lot.id,
    };
  }, [lot]);

  if (!open || !lot) return null;

  const symbol = lot?.pair?.yahoo || group?.pair?.yahoo || group?.name || "—";

  async function handleConfirmDelete() {
    if (submitting) return;
    try {
      setSubmitting(true);
      await onUndoError?.(lot, preview);
      setDone(true);
      setTimeout(() => {
        setSubmitting(false);
        setDone(false);
        onClose?.();
      }, 1100);
    } catch (e) {
      setSubmitting(false);
    }
  }

  // NOWA FUNKCJA: Zapis tezy bez usuwania transakcji
  async function handleSaveNote() {
    if (!uid || savingNote) return;
    try {
      setSavingNote(true);
      await updateHoldingNote(uid, portfolioId, lot.id, thesisText);
      setNoteSavedOk(true);
      setTimeout(() => {
        setSavingNote(false);
        setNoteSavedOk(false);
        onClose?.(); // Zamykamy modal po sukcesie zapisu tezy
      }, 1000);
    } catch (e) {
      setSavingNote(false);
      console.error("Błąd zapisu tezy:", e);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 text-zinc-100 shadow-xl ring-1 ring-zinc-800">
        
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold">
            Edycja transakcji <span className="text-zinc-400 font-normal">({symbol})</span>
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
        <div className="px-5 py-4 space-y-6">
          
          {/* Info o transakcji */}
          <div className="text-sm text-zinc-300 bg-zinc-800/30 p-3 rounded-lg border border-zinc-800/50">
             Zakup z dnia: <span className="font-medium text-white">{lot.buyDate ? new Date(lot.buyDate).toLocaleDateString("pl-PL") : "—"}</span><br/>
             Ilość: <span className="font-medium text-white">{lot.shares}</span> · 
             Cena jedn.: <span className="font-medium text-white">{fmtPLN(lot.buyPrice || 0)}</span>
          </div>

          {/* SEKACJA: EDYCJA TEZY */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block font-medium">Teza inwestycyjna (Pamiętnik)</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-200 outline-none focus:border-yellow-500 transition-colors min-h-[100px] resize-y"
              placeholder="Wpisz dlaczego kupiłeś te akcje..."
              value={thesisText}
              onChange={(e) => setThesisText(e.target.value)}
            />
            <div className="flex justify-end mt-2">
              <button
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
                onClick={handleSaveNote}
                disabled={savingNote}
              >
                {savingNote ? "Zapisywanie..." : noteSavedOk ? "Zapisano" : "Zapisz tezę"}
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-800 my-2" />

          {/* SEKACJA: USUNIĘCIE TRANSAKCJI (Danger Zone) */}
          <div>
            <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
              Całkowite cofnięcie transakcji
            </h4>
            <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-4">
              <p className="text-xs text-red-200/70 mb-3">
                Kliknięcie poniższego przycisku całkowicie usunie ten zapis i przywróci saldo gotówki do stanu sprzed zakupu (zwrot: <strong className="text-red-200">{fmtPLN(preview?.grossPaid || 0)}</strong>).
              </p>
              <button
                className="w-full px-3 py-2 rounded-lg bg-red-950/50 border border-red-900/50 text-red-400 text-sm font-medium hover:bg-red-900/80 hover:text-red-300 transition-colors disabled:opacity-50"
                onClick={handleConfirmDelete}
                disabled={submitting}
              >
                {submitting ? "Trwa cofanie..." : done ? "Usunięto" : "Usuń bezpowrotnie ten zakup"}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}