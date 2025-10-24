// File: src/app/components/DeletePortfolioMenuItem.jsx
"use client";

import { useCallback, useState, useEffect } from "react";
import {
  safeDeletePortfolio,
  countAllPortfolios,
} from "../../lib/portfolioStore";

/**
 * Pozycja w dropdownie: "Usuń portfel…"
 * - root (null) => czyści główny
 * - named (string) => usuwa portfel
 * - dba, by został min. 1 portfel
 */
export default function DeletePortfolioMenuItem({
  uid,
  portfolioId,
  onAfterDelete,
  className = "",
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [canDelete, setCanDelete] = useState(true);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const total = await countAllPortfolios(uid);
        if (ok) setCanDelete(total > 1);
      } catch {
        if (ok) setCanDelete(true);
      }
    })();
    return () => { ok = false; };
  }, [uid]);

  const handleDelete = useCallback(async () => {
    if (isBusy) return;

    if (!canDelete) {
      alert("Musi pozostać co najmniej jeden portfel.");
      return;
    }

    const isRoot = portfolioId == null;
    const msg = isRoot
      ? "Wyczyścić główny portfel? Operacja nieodwracalna."
      : "Usunąć ten portfel? Operacja nieodwracalna.";

    if (!confirm(msg)) return;

    try {
      setIsBusy(true);
      const res = await safeDeletePortfolio(uid, portfolioId);
      if (!res.deleted) {
        alert(res.reason || "Nie udało się usunąć.");
        return;
      }
      onAfterDelete?.(res.nextId ?? null);
    } catch (e) {
      console.error(e);
      alert("Błąd podczas usuwania/oczyszczania portfela.");
    } finally {
      setIsBusy(false);
    }
  }, [uid, portfolioId, canDelete, isBusy, onAfterDelete]);

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isBusy || !canDelete}
      className={[
        "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-zinc-800/70",
        isBusy || !canDelete ? "opacity-60 cursor-not-allowed" : "",
        className,
      ].join(" ")}
    >
      {isBusy ? "Usuwanie…" : "Usuń portfel…"}
    </button>
  );
}
