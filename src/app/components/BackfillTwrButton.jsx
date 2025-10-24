"use client";
import { useState } from "react";
import { backfillMissingBuyFlows } from "../../lib/portfolioStore";

export default function BackfillTwrButton({ uid, portfolioId, className = "" }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy || !uid}
      onClick={async () => {
        try {
          setBusy(true);
          const created = await backfillMissingBuyFlows(uid, portfolioId || null);
          alert(
            created > 0
              ? `Dopisano ${created} brakujących transakcji "buy".`
              : "Brak brakujących 'buy' – wszystko OK."
          );
          // jeśli wykres nie odświeża się "na żywo":
          // location.reload();
        } finally {
          setBusy(false);
        }
      }}
      className={
        "px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 disabled:opacity-50 " +
        className
      }
      title='Dopisz brakujące "buy" dla poprawnego TWR'
    >
      {busy ? "Naprawiam…" : 'Napraw TWR (dopisz "buy")'}
    </button>
  );
}
