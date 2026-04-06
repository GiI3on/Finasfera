// src/app/symulacja-monte-carlo/page.jsx
"use client";

import { useState, useRef, useEffect } from "react";
import InputPanel from "../components/monteCarlo/InputPanel";
import ResultsPanel from "../components/monteCarlo/ResultsPanel";
// Import dla autouzupełniania z Firebase (na razie 0, docelowo podepniesz useAllPortfoliosPLN)

export default function MonteCarloPage() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState(null);
  const [lastInputs, setLastInputs] = useState(null);
  
  // Referencja trzymająca naszego pracownika w tle
  const workerRef = useRef(null);

  useEffect(() => {
    // Odpalamy Workera, jak tylko strona się załaduje
    workerRef.current = new Worker(new URL("../../workers/monteCarlo.worker.ts", import.meta.url));
    
    // Czekamy, aż Worker odeśle obliczone wyniki
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'COMPLETE') {
        setResults(e.data.payload);
        setIsCalculating(false);
      } else if (e.data.type === 'ERROR') {
        alert("Błąd: " + e.data.payload.message);
        setIsCalculating(false);
      }
    };

    return () => workerRef.current?.terminate(); // Sprzątamy przy wyjściu ze strony
  }, []);

  const handleSimulate = (inputs) => {
    setIsCalculating(true);
    setResults(null);
    setLastInputs(inputs);
    // Wysyłamy paczkę parametrów do wyliczenia
    workerRef.current?.postMessage(inputs);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-12 pb-32">
      <div className="text-center mb-10">
        <h1 className="h1 mb-4">Symulacja <span className="text-yellow-500">Monte Carlo</span></h1>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          Zbadaj odporność swojego portfela na skrajne wydarzenia. Testujemy 1000 alternatywnych rynków, opierając się na profesjonalnej metodyce największych banków inwestycyjnych.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 sticky top-6">
          <InputPanel 
            currentPortfolioValue={0} // tu w przyszłości dodasz wartość z hooka useAllPortfoliosPLN
            onSimulate={handleSimulate} 
            isCalculating={isCalculating} 
          />
        </div>
        
        <div className="lg:col-span-8">
          {/* Pusty stan na start */}
          {!results && !isCalculating && (
            <div className="h-[600px] border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500 p-8 text-center bg-zinc-900/10">
              <div className="text-5xl mb-6">🎲</div>
              <h3 className="text-xl font-bold text-zinc-300 mb-2">Twój portfel vs Wieloświat</h3>
              <p className="max-w-md">Ustaw parametry po lewej stronie i kliknij żółty przycisk, aby wygenerować 1000 równoległych wersji swojej przyszłości.</p>
            </div>
          )}

          {/* Stan ładowania (Web Worker mieli w tle) */}
          {isCalculating && (
            <div className="h-[600px] border border-yellow-500/30 bg-yellow-900/10 rounded-2xl flex flex-col items-center justify-center text-yellow-500">
              <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
              <p className="text-lg font-bold animate-pulse tracking-wide uppercase">Generowanie 1000 wszechświatów...</p>
              <p className="text-xs text-yellow-500/60 mt-2">Przeliczanie modelu t-Studenta</p>
            </div>
          )}

          {/* Gotowe wyniki */}
          {results && !isCalculating && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <ResultsPanel results={results} inputs={lastInputs} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}