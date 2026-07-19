"use client";

/**
 * components/XtbImportButton.jsx
 * ---------------------------------------------------------------------------
 * Przycisk + modal do importu raportu XTB (.xlsx) do aktualnie wybranego
 * portfela. Renderowany OBOK istniejącego ImportHistoryButton/AddTransactionButton
 * — nic z obecnej logiki nie jest ruszane, to czysto dodatkowy komponent.
 *
 * v3 — naprawiony prawdziwy bug (na podstawie realnego portfolioStore.js):
 *
 *   addHolding(uid, a, b, c) w Twoim kodzie rozpoznaje, czy podałeś
 *   portfolioId, PO LICZBIE argumentów (czy `c` jest zdefiniowane), a nie
 *   po typie. Wywołanie z 3 argumentami — addHolding(uid, portfolioId, dane)
 *   — było więc mylnie odczytywane jako addHolding(uid, ITEM=portfolioId,
 *   OPTS=dane): portfolioId ginął (zapis leciał do domyślnego, nieprzypisanego
 *   folderu), a "dane" trafiały jako opcje, więc realny holding miał
 *   shares=0. Zero błędu, bo Firestore zapis i tak przyjmował — stąd
 *   "Import zakończony" bez żadnego holdingu w widocznym portfelu.
 *
 *   POPRAWKA: wołamy addHolding(uid, portfolioId, dane, opts) — zawsze
 *   4 argumenty, nawet gdy opts = {}.
 *
 *   Przy okazji: Twój addHolding wspiera importBatchId (i pary
 *   importSignature/importFileHash) oraz masz gotowe removeBatchById() do
 *   kasowania całego importu jedną komendą — więc każdy zapis (holding +
 *   operacja gotówkowa) tagujemy wspólnym importBatchId i dorzucamy przycisk
 *   "Cofnij import" na ekranie końcowym.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseXtbFile } from "../../lib/xtbImporter";
import {
  addCashOperation,
  addHolding,
  removeBatchById,
} from "../../lib/portfolioStore";

const LOG = (...args) => console.log("[XTB import]", ...args);

function makeImportBatchId(accountNumber) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `xtb-${accountNumber || "acc"}-${Date.now()}-${rand}`;
}

async function runInChunks(items, worker, chunkSize = 15) {
  const results = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const settled = await Promise.allSettled(chunk.map(worker));
    results.push(...settled);
  }
  return results;
}

const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);

export default function XtbImportButton({ uid, portfolioId }) {
  // Portal do document.body wolno wywołać dopiero po zamontowaniu w przeglądarce.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("pick"); // pick | loading | preview | importing | done
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [savedCounts, setSavedCounts] = useState({
    holdingsOk: 0,
    holdingsTotal: 0,
    cashOk: 0,
    cashTotal: 0,
  });
  const [lastBatchId, setLastBatchId] = useState(null);
  const [undoing, setUndoing] = useState(false);
  const inputRef = useRef(null);

  const reset = () => {
    setStep("pick");
    setParsed(null);
    setError("");
    setProgress({ done: 0, total: 0 });
    setSavedCounts({ holdingsOk: 0, holdingsTotal: 0, cashOk: 0, cashTotal: 0 });
    setLastBatchId(null);
    setUndoing(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    LOG("wybrano plik:", file.name, `${(file.size / 1024).toFixed(1)} KB`);
    setError("");
    setStep("loading"); // natychmiastowy feedback

    try {
      const buf = await file.arrayBuffer();
      const result = await parseXtbFile(buf);
      LOG("sparsowano:", {
        accountNumber: result.accountNumber,
        accountType: result.accountType,
        holdings: result.holdings.length,
        cashOperations: result.cashOperations.length,
        warnings: result.warnings,
      });

      if (!result.holdings.length && !result.cashOperations.length) {
        setError(
          "Plik został odczytany, ale nie znaleziono w nim żadnych danych do zaimportowania."
        );
        setStep("pick");
        return;
      }

      setParsed(result);
      setStep("preview");
    } catch (e) {
      console.error("[XTB import] BŁĄD parsowania:", e);
      setError(
        e?.message ||
          "Nie udało się odczytać pliku. Sprawdź, czy to raport XTB (.xlsx) z arkuszami 'Cash Operations' i 'Closed Positions'."
      );
      setStep("pick");
    }
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!parsed || !uid) return;

    const batchId = makeImportBatchId(parsed.accountNumber);
    setLastBatchId(batchId);
    LOG(
      "rozpoczynam zapis do Firestore. batchId=",
      batchId,
      "| portfolioId=",
      JSON.stringify(portfolioId),
      "|",
      parsed.holdings.length,
      "holdings +",
      parsed.cashOperations.length,
      "cashOps"
    );

    setStep("importing");
    const total = parsed.holdings.length + parsed.cashOperations.length;
    setProgress({ done: 0, total });

    let doneCount = 0;
    const bump = () => setProgress((p) => ({ ...p, done: ++doneCount }));

    const holdingResults = await runInChunks(parsed.holdings, async (h) => {
      // eslint-disable-next-line no-unused-vars
      const { sourceTicker, sourceOpId, ...holdingData } = h;
      // ⬇️ 4 argumenty — to jest ta poprawka. Bez opts (nawet pustego {})
      // addHolding myśli, że nie podałeś portfolioId.
      await addHolding(uid, portfolioId, holdingData, { importBatchId: batchId });
      bump();
    });

    const cashResults = await runInChunks(parsed.cashOperations, async (c) => {
      await addCashOperation(uid, portfolioId, { ...c, importBatchId: batchId });
      bump();
    });

    const holdingsOk = holdingResults.filter((r) => r.status === "fulfilled").length;
    const cashOk = cashResults.filter((r) => r.status === "fulfilled").length;
    setSavedCounts({
      holdingsOk,
      holdingsTotal: parsed.holdings.length,
      cashOk,
      cashTotal: parsed.cashOperations.length,
    });

    const failed = [...holdingResults, ...cashResults].filter(
      (r) => r.status === "rejected"
    );
    if (failed.length) {
      console.error(
        "[XTB import] Błędy zapisu (pierwsze 3):",
        failed.slice(0, 3).map((f) => f.reason)
      );
      setError(
        `${failed.length} z ${total} pozycji NIE zapisało się — szczegóły w konsoli pod tagiem [XTB import].`
      );
    } else {
      LOG("zapis zakończony bez błędów:", { holdingsOk, cashOk, batchId });
    }
    setStep("done");
  }, [parsed, uid, portfolioId]);

  const handleUndo = useCallback(async () => {
    if (!lastBatchId || !uid) return;
    setUndoing(true);
    try {
      LOG("cofam import, batchId=", lastBatchId);
      await removeBatchById(uid, portfolioId, lastBatchId);
      setSavedCounts({ holdingsOk: 0, holdingsTotal: 0, cashOk: 0, cashTotal: 0 });
      setLastBatchId(null);
      setError("");
      LOG("import cofnięty");
    } catch (e) {
      console.error("[XTB import] Błąd cofania importu:", e);
      setError("Nie udało się cofnąć importu — szczegóły w konsoli.");
    } finally {
      setUndoing(false);
    }
  }, [lastBatchId, uid, portfolioId]);

  if (!uid) return null;

  const button = (
    <button
      onClick={() => {
        reset();
        setOpen(true);
      }}
      className="px-3 py-1.5 rounded-lg border text-sm bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 transition-colors"
      title="Zaimportuj historię z raportu XTB (.xlsx)"
    >
      Importuj z XTB
    </button>
  );

  const modalContent = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4"
      onClick={() => step !== "importing" && setOpen(false)}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Import z XTB</h3>
          {step !== "importing" && (
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-200 text-xl leading-none"
            >
              ×
            </button>
          )}
        </div>

        {step === "pick" && (
          <div>
            <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
              Wybierz plik <code className="text-yellow-400">.xlsx</code>{" "}
              wygenerowany przez XTB (Historia rachunku → Eksportuj). Dane
              trafią do portfela, który masz teraz wybrany w przełączniku
              portfeli. Każde konto XTB (np. IKE i konto standardowe)
              eksportuj i importuj osobno — do odpowiadającego mu portfela w
              Finasferze.
            </p>
            {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="block w-full text-sm text-zinc-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-yellow-600 file:text-black file:font-medium file:cursor-pointer hover:file:bg-yellow-500 cursor-pointer"
            />
          </div>
        )}

        {step === "loading" && (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-yellow-500 mb-3" />
            <p className="text-zinc-400 text-sm">
              Wczytuję i analizuję plik… (zwykle 1–2 sekundy)
            </p>
          </div>
        )}

        {step === "preview" && parsed && (
          <div>
            <div className="text-sm text-zinc-300 mb-3 space-y-1">
              <div>
                Konto:{" "}
                <span className="text-white font-medium">
                  {parsed.accountNumber || "?"}
                </span>{" "}
                <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {parsed.accountType === "IKE" ? "IKE" : "standardowe"}
                </span>
              </div>
              <div>
                Otwarte pozycje:{" "}
                <span className="text-white font-medium">
                  {parsed.holdings.length}
                </span>{" "}
                ({parsed.summary?.tickerCount ?? 0} spółek/ETF-ów) — łączny
                koszt{" "}
                <span className="text-white font-medium">
                  {fmtPLN(parsed.summary?.totalOpenCostPLN)}
                </span>
              </div>
              <div>
                Operacje gotówkowe (wpłaty, dywidendy, odsetki…):{" "}
                <span className="text-white font-medium">
                  {parsed.cashOperations.length}
                </span>
              </div>
            </div>

            {parsed.warnings?.length > 0 && (
              <div className="mb-3 rounded-lg border border-yellow-600/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-300 max-h-28 overflow-y-auto space-y-0.5">
                {parsed.warnings.map((w, i) => (
                  <div key={i}>⚠ {w}</div>
                ))}
              </div>
            )}

            {parsed.holdings.length > 0 && (
              <div className="max-h-56 overflow-y-auto border border-zinc-800 rounded-lg mb-4">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-900 text-zinc-400 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium">
                        Instrument
                      </th>
                      <th className="text-right px-2 py-1.5 font-medium">
                        Ilość
                      </th>
                      <th className="text-right px-2 py-1.5 font-medium">
                        Śr. cena (PLN)
                      </th>
                      <th className="text-right px-2 py-1.5 font-medium">
                        Data zakupu
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.holdings.map((h, i) => (
                      <tr key={i} className="border-t border-zinc-900">
                        <td className="px-2 py-1 text-zinc-200">
                          {h.name}{" "}
                          <span className="text-zinc-500">
                            ({h.sourceTicker})
                          </span>
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums text-zinc-300">
                          {h.shares}
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums text-zinc-300">
                          {Number(h.buyPrice || 0).toFixed(2)}
                        </td>
                        <td className="px-2 py-1 text-right text-zinc-400">
                          {h.buyDate || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-900"
              >
                Wybierz inny plik
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 px-3 py-2 rounded-lg bg-yellow-600 text-black font-medium text-sm hover:bg-yellow-500"
              >
                Importuj do portfela
              </button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="text-center py-8">
            <div className="text-zinc-300 text-sm mb-3">
              Importowanie… {progress.done}/{progress.total}
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-200"
                style={{
                  width: `${
                    progress.total ? (progress.done / progress.total) * 100 : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <div
              className={`text-3xl mb-2 ${
                error ? "text-yellow-400" : "text-emerald-400"
              }`}
            >
              {error ? "⚠" : "✓"}
            </div>
            <p className="text-zinc-200 text-sm mb-3">Import zakończony.</p>

            <div className="text-sm text-left bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 mb-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Pozycje (holdings):</span>
                <span
                  className={
                    savedCounts.holdingsOk === savedCounts.holdingsTotal
                      ? "text-emerald-400"
                      : "text-red-400 font-medium"
                  }
                >
                  {savedCounts.holdingsOk} / {savedCounts.holdingsTotal}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Operacje gotówkowe:</span>
                <span
                  className={
                    savedCounts.cashOk === savedCounts.cashTotal
                      ? "text-emerald-400"
                      : "text-red-400 font-medium"
                  }
                >
                  {savedCounts.cashOk} / {savedCounts.cashTotal}
                </span>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs mb-3 leading-relaxed">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              {lastBatchId && (savedCounts.holdingsOk + savedCounts.cashOk) > 0 && (
                <button
                  onClick={handleUndo}
                  disabled={undoing}
                  className="flex-1 px-3 py-2 rounded-lg border border-red-800 text-red-400 text-sm hover:bg-red-950 disabled:opacity-50"
                  title="Usuwa wszystkie pozycje i operacje gotówkowe zapisane w tym imporcie"
                >
                  {undoing ? "Cofam…" : "Cofnij import"}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 text-sm hover:bg-zinc-700"
              >
                Zamknij
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {button}
      {mounted && open && createPortal(modalContent, document.body)}
    </>
  );
}
