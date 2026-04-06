// src/app/components/monteCarlo/InputPanel.jsx
"use client";
import { useState, useEffect } from "react";
import { PRESETS } from "../../../lib/monteCarlo/presets";
import { useAuth } from "../AuthProvider";

export default function InputPanel({ currentPortfolioValue, onSimulate, isCalculating }) {
  const { user, signIn } = useAuth();
  const [isFireMode, setIsFireMode] = useState(false);

  // Blokada: Jeśli jest tryb FIRE i użytkownik nie jest zalogowany
  const isLocked = isFireMode && !user;

  const [initialCapital, setInitialCapital] = useState(currentPortfolioValue || 0);
  const [monthlyContribution, setMonthlyContribution] = useState(0);
  const [currentNetIncome, setCurrentNetIncome] = useState(8000);
  const [currentAge, setCurrentAge] = useState(30);
  const [fireAge, setFireAge] = useState(60);
  const [maxAge, setMaxAge] = useState(85);
  
  const [activePreset, setActivePreset] = useState("MODERATE");
  const [customReturn, setCustomReturn] = useState(PRESETS.MODERATE.annualReturn * 100);
  const [customVol, setCustomVol] = useState(PRESETS.MODERATE.annualVolatility * 100);
  
  const [errorMsg, setErrorMsg] = useState("");

  // Style dla zablokowanych inputów
  const inputClass = `w-full bg-black border rounded-lg px-3 py-2 transition-colors ${isLocked ? 'border-zinc-800 text-zinc-600 cursor-not-allowed' : 'border-zinc-700 text-white'}`;
  const inputEmerald = `w-full bg-black border rounded-lg px-3 py-2 transition-colors ${isLocked ? 'border-emerald-900/20 text-emerald-900 cursor-not-allowed' : 'border-emerald-900/50 text-white'}`;
  const inputYellow = `w-full bg-black border rounded-lg px-3 py-2 transition-colors ${isLocked ? 'border-yellow-900/20 text-yellow-900 cursor-not-allowed' : 'border-yellow-900/50 text-white'}`;

  useEffect(() => {
    if (currentPortfolioValue > 0 && !isLocked) setInitialCapital(currentPortfolioValue);
  }, [currentPortfolioValue, isLocked]);

  // AUTOMATYCZNE GENEROWANIE DEMO DLA NIEZALOGOWANYCH
  useEffect(() => {
    if (isFireMode && !user) {
      setCurrentAge(30);
      setCurrentNetIncome(8000);
      setMonthlyContribution(1000);
      setInitialCapital(20000);
      setFireAge(60);
      setMaxAge(85);

      onSimulate({
        initialCapital: 20000,
        monthlyContribution: 1000,
        currentAge: 30,
        fireAge: 60,
        retirementAge: 65,
        maxAge: 85,
        currentNetIncome: 8000,
        inflationRate: 0.025,
        annualReturn: PRESETS.MODERATE.annualReturn,
        annualVolatility: PRESETS.MODERATE.annualVolatility,
        simulationCount: 1000,
        annualFees: 0.002,
        isStandardMode: false,
        isDemo: true // Flaga dla Panelu Wyników
      });
    }
  }, [isFireMode, user]);

  function handlePresetChange(key) {
    if (isLocked) return;
    setActivePreset(key);
    setCustomReturn(PRESETS[key].annualReturn * 100);
    setCustomVol(PRESETS[key].annualVolatility * 100);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isLocked) {
      signIn();
      return;
    }

    setErrorMsg("");

    const age = Number(currentAge);
    const finalFireAge = isFireMode ? Number(fireAge) : 65; 
    const finalMaxAge = isFireMode ? Number(maxAge) : 90;
    const finalReturn = isFireMode ? Number(customReturn) / 100 : PRESETS.MODERATE.annualReturn;
    const finalVol = isFireMode ? Number(customVol) / 100 : PRESETS.MODERATE.annualVolatility;

    if (finalFireAge <= age) {
      setErrorMsg("Wiek zakończenia pracy musi być wyższy niż Twój obecny wiek.");
      return;
    }
    if (finalMaxAge <= finalFireAge) {
      setErrorMsg("Horyzont symulacji musi być wyższy niż wiek przejścia na emeryturę.");
      return;
    }

    onSimulate({
      initialCapital: Number(initialCapital),
      monthlyContribution: Number(monthlyContribution),
      currentAge: age,
      fireAge: finalFireAge,
      retirementAge: 65,
      maxAge: finalMaxAge,
      currentNetIncome: Number(currentNetIncome),
      inflationRate: 0.025,
      annualReturn: finalReturn,
      annualVolatility: finalVol,
      simulationCount: 1000,
      annualFees: 0.002,
      isStandardMode: !isFireMode,
      isDemo: false
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      <div className="flex p-1 bg-black border border-zinc-800 rounded-lg">
        <button
          type="button"
          onClick={() => {
             setIsFireMode(false);
             setMonthlyContribution(0);
             if (!currentPortfolioValue) setInitialCapital(0);
          }}
          className={`flex-1 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md transition-all ${!isFireMode ? 'bg-zinc-800 text-yellow-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Standardowa Emerytura
        </button>
        <button
          type="button"
          onClick={() => {
             setIsFireMode(true);
             if (Number(monthlyContribution) === 0 && user) setMonthlyContribution(1000);
             if (Number(initialCapital) === 0 && user) setInitialCapital(20000);
          }}
          className={`flex-1 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md transition-all relative ${isFireMode ? 'bg-zinc-800 text-yellow-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Wczesna Emerytura (FIRE)
          {!user && (
             <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded-full shadow-lg">PRO</span>
          )}
        </button>
      </div>

      <div className={`bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 ${isLocked ? 'opacity-80' : ''}`}>
        <h3 className="text-yellow-500 font-bold text-sm uppercase mb-4">1. Dane systemowe (ZUS)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col justify-end">
            <label className="text-xs text-zinc-400 mb-1">Twój wiek</label>
            <input type="number" disabled={isLocked} className={inputClass} value={currentAge} onChange={(e) => setCurrentAge(e.target.value)} />
          </div>
          <div className="flex flex-col justify-end">
            <label className="text-xs text-zinc-400 mb-1 min-h-[16px]">Obecne zarobki netto</label>
            <input type="number" disabled={isLocked} className={inputClass} value={currentNetIncome} onChange={(e) => setCurrentNetIncome(e.target.value)} />
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 mt-3 leading-tight border-l-2 border-zinc-700 pl-2">
          Powyższe dane posłużą do wyliczenia Twojej gwarantowanej emerytury z systemu państwowego.
        </p>
      </div>

      <div className={`bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 ${isLocked ? 'opacity-80' : ''}`}>
        <h3 className="text-yellow-500 font-bold text-sm uppercase mb-4">2. Oszczędności prywatne</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col justify-end">
            <label className="text-[11px] text-emerald-400 mb-2">Miesięczna dopłata (Opcjonalnie)</label>
            <input type="number" disabled={isLocked} className={inputEmerald} value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} />
          </div>
          <div className="flex flex-col justify-end">
            <label className="text-[11px] text-zinc-400 mb-2">Obecny kapitał (Opcjonalnie)</label>
            <input type="number" disabled={isLocked} className={inputClass} value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} />
          </div>
        </div>

        {isFireMode && (
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-zinc-800/50 animate-in fade-in">
            <div className="flex flex-col justify-end">
              <label className="text-[11px] text-zinc-300 mb-2">Wiek przejścia na FIRE</label>
              <input type="number" disabled={isLocked} className={inputYellow} value={fireAge} onChange={(e) => setFireAge(e.target.value)} />
            </div>
            <div className="flex flex-col justify-end">
              <label className="text-[11px] text-zinc-300 mb-2 flex items-center justify-between">
                  <span>Horyzont życia</span>
              </label>
              <input type="number" disabled={isLocked} className={inputClass} value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {isFireMode && (
        <div className={`bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 animate-in fade-in slide-in-from-top-4 ${isLocked ? 'opacity-80' : ''}`}>
          <h3 className="text-yellow-500 font-bold text-sm uppercase mb-4">3. Strategia rynkowa</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(PRESETS)
              .filter(key => key !== "CUSTOM" && PRESETS[key].label !== "Własny")
              .map((key) => (
              <button 
                key={key} 
                type="button" 
                disabled={isLocked}
                onClick={() => handlePresetChange(key)} 
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  isLocked ? "bg-zinc-950 text-zinc-700 border border-zinc-800 cursor-not-allowed" 
                  : activePreset === key ? "bg-yellow-500 text-black font-bold" 
                  : "bg-black border border-zinc-700 text-zinc-400"
                }`}
              >
                {PRESETS[key].label}
              </button>
            ))}
          </div>
          <p className={`text-[10px] italic ${isLocked ? 'text-zinc-700' : 'text-zinc-500'}`}>{PRESETS[activePreset].description}</p>
        </div>
      )}

      {errorMsg && !isLocked && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      <button 
        type={isLocked ? "button" : "submit"} 
        onClick={isLocked ? signIn : undefined}
        disabled={isCalculating && !isLocked} 
        className={`w-full py-4 rounded-xl text-lg font-black uppercase transition-all ${
          isLocked ? "bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02] shadow-[0_0_20px_rgba(37,99,235,0.2)]" 
          : isCalculating ? "bg-zinc-800 text-zinc-500" 
          : "bg-yellow-500 text-black hover:bg-yellow-400 hover:scale-[1.02]"
        }`}
      >
        {isLocked ? "Zaloguj się, by odblokować" : isCalculating ? "Analiza danych w toku..." : "Oblicz Moją Emeryturę"}
      </button>
      
      {!isFireMode && (
        <p className="text-center text-[10px] text-zinc-600 mt-2">
          Tryb standardowy analizuje świadczenie ZUS oraz wsparcie bezpiecznego portfela oszczędnościowego.
        </p>
      )}
    </form>
  );
}