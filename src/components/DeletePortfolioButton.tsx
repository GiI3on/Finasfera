// File: src/components/DeletePortfolioButton.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  safeDeletePortfolio,
  countAllPortfolios,
} from "../lib/portfolioStore";

type Props = {
  /** UID zalogowanego użytkownika (przekaż np. user.uid) */
  uid: string;
  /** null => portfel główny (root), string => portfel nazwany */
  portfolioId: string | null;
  /** Wywołaj po udanym usunięciu, żeby przełączyć kontekst UI */
  onAfterDelete?: (nextId: string | null) => void;
  /** Opcjonalnie: klasa do stylowania przycisku */
  className?: string;
};

/**
 * Przycisk "Usuń/Wyczyść portfel":
 * - pozwala usunąć KAŻDY portfel (również główny), ale zawsze musi pozostać co najmniej jeden
 * - dla portfela głównego wykonuje "wyczyszczenie" (usunięcie pozycji i przepływów)
 * - dla nazwanego usuwa wszystko wraz z dokumentem portfela
 */
export default function DeletePortfolioButton({
  uid,
  portfolioId,
  onAfterDelete,
  className = "",
}: Props) {
  const [isBusy, setIsBusy] = useState(false);
  const [canDelete, setCanDelete] = useState(true);
  const isRoot = portfolioId == null;

  // Teksty UI
  const label = useMemo(
    () => (isRoot ? "Wyczyść główny" : "Usuń portfel"),
    [isRoot]
  );
  const confirmText = useMemo(
    () =>
      isRoot
        ? "Na pewno chcesz WYCZYŚCIĆ główny portfel? Usunie to wszystkie pozycje i przepływy gotówkowe. Operacja jest nieodwracalna."
        : "Na pewno chcesz USUNĄĆ ten portfel wraz ze wszystkimi pozycjami i przepływami? Operacja jest nieodwracalna.",
    [isRoot]
  );

  // Sprawdź, czy w ogóle możemy pozwolić na usunięcie (musi zostać min. 1 portfel)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const total = await countAllPortfolios(uid);
        if (!alive) return;
        setCanDelete(total > 1);
      } catch {
        setCanDelete(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  const handleClick = useCallback(async () => {
    if (isBusy) return;
    if (!canDelete) {
      alert(
        "Musi pozostać co najmniej jeden portfel. Najpierw utwórz/przełącz na inny i usuń ten."
      );
      return;
    }
    if (!confirm(confirmText)) return;

    try {
      setIsBusy(true);
      const res = await safeDeletePortfolio(uid, portfolioId);
      if (!res.deleted) {
        alert(res.reason || "Nie udało się usunąć. Spróbuj ponownie.");
        return;
      }
      onAfterDelete?.(res.nextId ?? null);
    } catch (e: any) {
      console.error("DeletePortfolioButton error:", e);
      alert(e?.message || "Wystąpił błąd podczas usuwania.");
    } finally {
      setIsBusy(false);
    }
  }, [uid, portfolioId, isBusy, canDelete, confirmText, onAfterDelete]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy || !canDelete}
      title={
        !canDelete
          ? "Zablokowane: musi pozostać co najmniej jeden portfel"
          : isRoot
          ? "Wyczyść główny portfel"
          : "Usuń portfel"
      }
      className={[
        "px-3 py-1.5 rounded-lg border text-sm transition",
        isBusy || !canDelete
          ? "opacity-60 cursor-not-allowed bg-zinc-800 border-zinc-700 text-zinc-400"
          : "bg-red-900/30 border-red-700/60 text-red-300 hover:bg-red-900/50",
        className,
      ].join(" ")}
      aria-busy={isBusy}
    >
      {isBusy ? "Pracuję…" : label}
    </button>
  );
}
