// src/app/components/monteCarlo/ResultsPanel.jsx
"use client";

import SpaghettiChart from "./SpaghettiChart";

export default function ResultsPanel({ results, inputs }) {
  if (!results) return null;

  const fmtPLN = (v) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);
  
  // Logika kolorowania wskaźnika sukcesu
  let gaugeColor = "text-red-500";
  let statusText = "RYZYKOWNY PLAN";
  if (results.successRate >= 60) { gaugeColor = "text-yellow-500"; statusText = "WYMAGA UWAGI"; }
  if (results.successRate >= 85) { gaugeColor = "text-green-500"; statusText = "BEZPIECZNA STREFA"; }

  return (
    <div className="space-y-8 p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800">
      
      {/* Główny Wskaźnik Sukcesu */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Szansa na przetrwanie kapitału</h2>
        <div className={`text-6xl font-black my-4 ${gaugeColor}`}>
          {results.successRate.toFixed(1)}%
        </div>
        <p className={`text-sm font-bold uppercase tracking-widest ${gaugeColor}`}>{statusText}</p>
        <p className="text-sm text-zinc-500 mt-2">
          W {Math.round(results.successRate * 10)} na {results.simulationCount} zbadanych wszechświatów rynkowych, Twoje pieniądze przetrwały cały horyzont.
        </p>
      </div>

      {/* 3 Karty Wartości Końcowej */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black/50 p-5 rounded-xl border border-zinc-800 text-center">
          <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Pesymistycznie (10%)</div>
          <div className="text-xl font-bold text-red-400">{fmtPLN(results.p10FinalValue)}</div>
        </div>
        <div className="bg-yellow-500/10 p-5 rounded-xl border border-yellow-500/30 text-center">
          <div className="text-xs text-yellow-500 uppercase font-bold mb-1">Typowy Wynik (Mediana)</div>
          <div className="text-2xl font-black text-yellow-400">{fmtPLN(results.medianFinalValue)}</div>
        </div>
        <div className="bg-black/50 p-5 rounded-xl border border-zinc-800 text-center">
          <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Optymistycznie (90%)</div>
          <div className="text-xl font-bold text-green-400">{fmtPLN(results.p90FinalValue)}</div>
        </div>
      </div>

      {/* Wykres */}
      <SpaghettiChart results={results} totalYears={inputs.totalYears} accumulationYears={inputs.accumulationYears} />

      {/* Zastrzeżenie prawne i metodologiczne */}
      <div className="text-[10px] text-zinc-500 border-l-2 border-yellow-500/50 pl-3 mt-8 bg-black/40 p-3 rounded-r-lg">
        <strong>Nota metodologiczna:</strong> Powyższe wyniki wygenerowano w czasie {results.computationTimeMs}ms za pomocą stochastycznego modelu matematycznego wykorzystującego Ucięty Rozkład t-Studenta. W przeciwieństwie do standardowych kalkulatorów bankowych, ten model naturalnie symuluje zjawisko "grubych ogonów" (ekstremalnych krachów). Wyniki stanowią wyłącznie materiał edukacyjny.
      </div>
    </div>
  );
}