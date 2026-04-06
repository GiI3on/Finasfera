// src/app/components/monteCarlo/InputPanel.jsx
"use client";

import { useState, useEffect } from "react";
import { PRESETS } from "../../../lib/monteCarlo/presets";

export default function InputPanel({ currentPortfolioValue, onSimulate, isCalculating }) {
  // 1. Kapitał
  const [initialCapital, setInitialCapital] = useState(currentPortfolioValue || 0);
  
  // 2. Horyzont czasowy
  const [totalYears, setTotalYears] = useState(30);
  const [accumulationYears, setAccumulationYears] = useState(10);
  
  // 3. Przepływy
  const [monthlyContribution, setMonthlyContribution] = useState(2000);
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState(5000);
  
  // 4. Rynek (Preset)
  const [activePreset, setActivePreset] = useState("MODERATE");
  const [customReturn, setCustomReturn] = useState(PRESETS.MODERATE.annualReturn * 100);
  const [customVol, setCustomVol] = useState(PRESETS.MODERATE.annualVolatility * 100);
  
  // 5. Zaawansowane
  const [inflationRate, setInflationRate] = useState(2.5);
  const [simulationCount, setSimulationCount] = useState(1000);

  // Aktualizacja kapitału początkowego, gdy załaduje się z bazy (Firebase)
  useEffect(() => {
    if (currentPortfolioValue > 0 && initialCapital === 0) {
      setInitialCapital(currentPortfolioValue);
    }
  }, [currentPortfolioValue]);

  // Obsługa zmiany presetu
  function handlePresetChange(key) {
    setActivePreset(key);
    setCustomReturn(PRESETS[key].annualReturn * 100);
    setCustomVol(PRESETS[key].annualVolatility * 100);
  }

  // Funkcja wysyłająca dane do Głównego Ekranu (który odpali Workera)
  function handleSubmit(e) {
    e.preventDefault();
    
    // Zbieramy dane do naszego formatu MonteCarloInputs
    const inputs = {
      initialCapital: Number(initialCapital),
      totalYears: Number(totalYears),
      accumulationYears: Number(accumulationYears),
      monthlyContribution: Number(monthlyContribution),
      monthlyWithdrawal: Number(monthlyWithdrawal),
      inflationRate: Number(inflationRate) / 100,
      annualReturn: Number(customReturn) / 100,
      annualVolatility: Number(customVol) / 100,
      simulationCount: Number(simulationCount),
      annualFees: 0.002, // Stałe 0.2% dla ETF
    };

    onSimulate(inputs);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* KARTA 1: KAPITAŁ I CZAS */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-yellow-500 font-bold text-sm uppercase tracking-wider mb-4">1. Baza Planu</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm text-zinc-400 block mb-1">Obecny kapitał (PLN)</label>
            <input 
              type="number" 
              className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              min="0"
            />
            {currentPortfolioValue > 0 && (
              <span className="text-[10px] text-emerald-400 mt-1 block">Zassano z Twojego portfela</span>
            )}
          </div>
          <div>
            <label className="text-sm text-zinc-400 block mb-1">Za ile lat FIRE?</label>
            <input 
              type="number" 
              className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white"
              value={accumulationYears}
              onChange={(e) => setAccumulationYears(e.target.value)}
              min="0" max={totalYears}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 block mb-1">Łączny horyzont (lata)</label>
            <input 
              type="number" 
              className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white"
              value={totalYears}
              onChange={(e) => setTotalYears(e.target.value)}
              min="10" max="60"
            />
          </div>
        </div>
      </div>

      {/* KARTA 2: PRZEPŁYWY PIENIĘŻNE */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-yellow-500 font-bold text-sm uppercase tracking-wider mb-4">2. Przepływy Gotówkowe</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-black/40 rounded-lg border border-zinc-800/50">
            <label className="text-sm text-emerald-400 font-medium block mb-1">Miesięczna Dopłata (PLN)</label>
            <p className="text-[11px] text-zinc-500 mb-3">Tyle inwestujesz co miesiąc aż do przejścia na FIRE.</p>
            <input 
              type="number" 
              className="w-full bg-black border border-emerald-900/50 focus:border-emerald-500 rounded-lg px-3 py-2 text-white"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
            />
          </div>
          <div className="p-4 bg-black/40 rounded-lg border border-zinc-800/50">
            <label className="text-sm text-red-400 font-medium block mb-1">Miesięczne Wydatki na FIRE (PLN)</label>
            <p className="text-[11px] text-zinc-500 mb-3">Koszty życia na emeryturze (rosną co rok o inflację).</p>
            <input 
              type="number" 
              className="w-full bg-black border border-red-900/50 focus:border-red-500 rounded-lg px-3 py-2 text-white"
              value={monthlyWithdrawal}
              onChange={(e) => setMonthlyWithdrawal(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* KARTA 3: RYNEK */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-yellow-500 font-bold text-sm uppercase tracking-wider mb-4">3. Środowisko Rynkowe (Finasfera CMA)</h3>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(PRESETS).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handlePresetChange(key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activePreset === key 
                  ? "bg-yellow-500 text-black font-semibold" 
                  : "bg-black border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {PRESETS[key].label}
            </button>
          ))}
        </div>
        
        <p className="text-xs text-zinc-400 mb-4 h-8">{PRESETS[activePreset].description}</p>

        {activePreset === "CUSTOM" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-4 border border-yellow-900/30 bg-yellow-500/5 rounded-lg">
            <div>
              <label className="text-sm text-zinc-300 block mb-1">Średni roczny zwrot (%)</label>
              <input type="number" step="0.1" className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white" value={customReturn} onChange={(e) => setCustomReturn(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-zinc-300 block mb-1">Zmienność / Ryzyko (%)</label>
              <input type="number" step="0.1" className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white" value={customVol} onChange={(e) => setCustomVol(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* WIELKI PRZYCISK */}
      <button 
        type="submit" 
        disabled={isCalculating}
        className={`w-full py-4 rounded-xl text-lg font-black tracking-wide uppercase transition-all shadow-lg ${
          isCalculating 
            ? "bg-zinc-700 text-zinc-500 cursor-not-allowed" 
            : "bg-yellow-500 text-black hover:bg-yellow-400 hover:scale-[1.02] shadow-yellow-500/20"
        }`}
      >
        {isCalculating ? "Symuluję 1000 scenariuszy..." : "Uruchom Symulację Przyszłości 🚀"}
      </button>

    </form>
  );
}