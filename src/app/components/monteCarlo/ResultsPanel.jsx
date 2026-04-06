// src/app/components/monteCarlo/ResultsPanel.jsx
"use client";
import SpaghettiChart from "./SpaghettiChart";
import Link from "next/link";

export default function ResultsPanel({ results, inputs }) {
  if (!results) return null;

  const fmtPLN = (v) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);
  
  const safe = results.safeMonthlyWithdrawal;
  const median = results.medianMonthlyWithdrawal;
  const optimistic = results.optimisticMonthlyWithdrawal;
  const zusPension = results.zusPension;
  const retirementDuration = inputs.maxAge - inputs.fireAge;
  
  const hasBridgingPhase = inputs.fireAge < 65;
  const isZeroSavings = median === 0;
  const isStandardMode = inputs.isStandardMode;
  const isDemo = inputs.isDemo;

  // WIDOK 1: SCENARIUSZ SZOKOWY (Brak oszczędności, tylko ZUS)
  if (isZeroSavings && !isDemo) {
    const dropPercent = Math.round((1 - (zusPension / inputs.currentNetIncome)) * 100);

    return (
      <div className="space-y-6 p-8 bg-zinc-900/40 rounded-2xl border border-red-900/30">
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Bolesna prawda o Twojej emeryturze</h2>
          <p className="text-zinc-400">Nasz algorytm nie wykrył żadnego prywatnego kapitału. Zostajesz sam na sam z systemem państwowym.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-xl bg-black/40 border border-zinc-800 flex flex-col justify-center items-center text-center">
            <span className="text-sm text-zinc-500 uppercase font-bold tracking-widest mb-2">Twoje obecne życie</span>
            <span className="text-4xl font-black text-zinc-300">{fmtPLN(inputs.currentNetIncome)}</span>
            <span className="text-xs text-zinc-500 mt-2">Miesięcznie na rękę</span>
          </div>

          <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/20 flex flex-col justify-center items-center text-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-red-500"></div>
            <span className="text-sm text-red-500/70 uppercase font-bold tracking-widest mb-2">Prognoza ZUS na starość</span>
            <span className="text-4xl font-black text-red-400">{fmtPLN(zusPension)}</span>
            <span className="text-xs text-red-500/50 mt-2">Miesięcznie (dzisiejsza siła nabywcza)</span>
          </div>
        </div>

        <div className="bg-red-950/20 border border-red-900/30 p-6 rounded-xl text-center mt-4">
          <p className="text-lg text-zinc-300">
            Twój poziom życia spadnie o <span className="text-red-400 font-black text-2xl">{dropPercent}%</span> z dnia na dzień.
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            Powyższa kwota to wszystko, na co możesz liczyć z państwowego systemu, biorąc pod uwagę prognozy demograficzne.
          </p>
        </div>

        <div className="pt-8 border-t border-zinc-800/50">
          <h3 className="text-lg font-bold text-yellow-500 mb-4 text-center">Jak to zmienić? Zrób szybki test.</h3>
          <p className="text-zinc-400 text-sm text-center mb-6 leading-relaxed max-w-2xl mx-auto">
            Wpisz w formularzu po lewej stronie zaledwie <strong>500 zł</strong> w polu "Miesięczna dopłata" i kliknij Oblicz ponownie. Zobacz, jak zadziała siła systematycznego oszczędzania i procentu składanego.
          </p>
          
          <div className="flex justify-center">
            <Link href="/blog/jak-zaczac-inwestowac" className="px-6 py-3 bg-zinc-800 text-white text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700">
              Przeczytaj poradnik: Jak zacząć inwestować w Polsce?
            </Link>
          </div>
        </div>

      </div>
    );
  }

  // WIDOK 2: TRYB STANDARDOWY (Dla laika - proste liczby, zero wykresów)
  if (isStandardMode) {
    return (
      <div className="space-y-6 p-8 bg-zinc-900/40 rounded-2xl border border-zinc-800">
        <div className="text-center mb-8">
          <h2 className="text-xl font-medium text-zinc-400 uppercase tracking-widest mb-2">Prognoza Twojej Emerytury</h2>
          <p className="text-zinc-500 text-sm">Realna wartość pieniądza przeliczona na dzisiejsze warunki</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="bg-black/40 border border-yellow-500/30 p-8 rounded-2xl text-center min-w-[300px] shadow-[0_0_30px_rgba(234,179,8,0.05)]">
            <span className="text-5xl font-black text-yellow-500">{fmtPLN(median)}</span>
            <p className="text-xs text-zinc-400 mt-3 uppercase tracking-wider">Łącznie miesięcznie na rękę</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 p-5 rounded-xl border border-zinc-800/50 flex justify-between items-center">
            <div>
              <p className="text-sm text-zinc-400 font-bold">Gwarantowany ZUS</p>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Państwowa podstawa</p>
            </div>
            <span className="text-xl font-bold text-zinc-300">~{fmtPLN(zusPension)}</span>
          </div>
          <div className="bg-black/30 p-5 rounded-xl border border-emerald-900/30 flex justify-between items-center">
            <div>
              <p className="text-sm text-emerald-500/80 font-bold">Prywatne oszczędności</p>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Wynik z Twoich wpłat</p>
            </div>
            <span className="text-xl font-bold text-emerald-500">+{fmtPLN(Math.max(0, median - zusPension))}</span>
          </div>
        </div>

        <div className="mt-8 bg-zinc-950/50 border border-zinc-800 p-6 rounded-xl text-center">
          <p className="text-sm font-bold text-zinc-300 mb-2">
            A co w przypadku załamania gospodarki?
          </p>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xl mx-auto">
            Nasz system poddał Twój plan rygorystycznym testom na wypadek historycznych kryzysów. 
            W najgorszym możliwym scenariuszu, Twój kapitał z inwestycji wraz z ZUS-em nadal zapewni Ci łącznie ok. <strong className="text-zinc-300">{fmtPLN(safe)}</strong> miesięcznie.
          </p>
        </div>
      </div>
    );
  }

  // WIDOK 3: PEŁNY WIDOK FIRE (Dla zaawansowanych inwestorów i Demo)
  const safeTarget = Math.max(safe, zusPension);
  const medianTarget = Math.max(median, zusPension);
  const optimisticTarget = Math.max(optimistic, zusPension);

  return (
    <div className="space-y-8 p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800 relative">
      
      {/* BANER DEMO DLA NIEZALOGOWANYCH */}
      {isDemo && (
        <div className="bg-blue-900/20 border border-blue-500/30 p-5 rounded-2xl text-center relative z-20 backdrop-blur-sm">
          <h3 className="text-blue-400 font-black uppercase tracking-widest text-sm mb-1">Tryb Pokazowy (Wersja Demo)</h3>
          <p className="text-zinc-400 text-xs max-w-2xl mx-auto">
            Poniższa symulacja została wygenerowana dla przykładowych danych (30 lat, dopłata 1000 zł). Zaloguj się za darmo, aby odblokować ten tryb, wprowadzić własne wartości i precyzyjnie wyliczyć swoją drogę do wolności.
          </p>
        </div>
      )}
      
      <div className={`bg-black/40 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden ${isDemo ? 'opacity-80 grayscale-[20%]' : ''}`}>
        <h2 className="text-lg text-zinc-400 font-medium mb-6 text-center uppercase tracking-widest">
            Docelowa Emerytura (Po 65. roku życia)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col justify-between">
            <div>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Scenariusz Pesymistyczny</p>
                <p className="text-xs text-zinc-400 mb-3">Ochrona rynkowa</p>
            </div>
            <div className="text-3xl font-black text-emerald-400 mb-2">{fmtPLN(safeTarget)}</div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
                Minimalny gwarantowany budżet połączony ze świadczeniem ZUS.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-yellow-500/10 border border-yellow-500/40 scale-105 shadow-xl shadow-yellow-500/5 flex flex-col justify-between z-10">
            <div>
                <p className="text-[11px] text-yellow-500 font-bold uppercase tracking-widest mb-1">Scenariusz Spodziewany</p>
                <p className="text-xs text-zinc-300 mb-3">Normalny rozwój</p>
            </div>
            <div className="text-4xl font-black text-white mb-2">{fmtPLN(medianTarget)}</div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
                Najbardziej prawdopodobna kwota Twojej stabilnej starości.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-col justify-between">
            <div>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Scenariusz Optymistyczny</p>
                <p className="text-xs text-zinc-400 mb-3">Wieloletnia hossa</p>
            </div>
            <div className="text-3xl font-black text-blue-400 mb-2">{fmtPLN(optimisticTarget)}</div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
                Maksymalny budżet w przypadku dobrej passy gospodarczej.
            </p>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isDemo ? 'opacity-80' : ''}`}>
        
        {hasBridgingPhase ? (
          <div className="bg-zinc-800/20 p-5 rounded-xl border border-zinc-800 flex flex-col justify-between">
            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-3">Wczesna Emerytura (Wiek {inputs.fireAge} - 65)</div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-zinc-400">Budżet pomostowy:</span>
              <span className="text-lg font-bold text-white">{fmtPLN(median)} <span className="text-[10px] text-zinc-500 font-normal ml-1">/ mies.</span></span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-2">
              Okres przed 65. rokiem życia finansujesz całkowicie z własnych oszczędności, co obniża początkowy budżet.
            </span>
          </div>
        ) : (
          <div className="bg-zinc-800/20 p-5 rounded-xl border border-zinc-800 flex flex-col justify-between">
            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-3">Brak Fazy Pomostowej</div>
            <span className="text-sm text-zinc-400">Przechodzisz na emeryturę w wieku {inputs.fireAge} lat, uzyskując od razu prawo do świadczeń państwowych.</span>
          </div>
        )}
        
        <div className="bg-zinc-800/20 p-5 rounded-xl border border-zinc-800 flex flex-col justify-between">
          <div className="text-[10px] text-zinc-500 uppercase font-bold mb-3">Składowe docelowe (Po 65. roku życia)</div>
          
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-zinc-400">Gwarantowany ZUS:</span>
            <span className="text-sm font-bold text-emerald-400">~{fmtPLN(zusPension)}</span>
          </div>
          
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-zinc-400">Prywatne nadwyżki z portfela:</span>
            <span className="text-sm font-bold text-white">+{fmtPLN(Math.max(0, median - zusPension))}</span>
          </div>
          
          <span className="text-[10px] text-zinc-500 mt-2">
            Gdy ZUS zaczyna wypłacać świadczenie, Twój portfel przestaje być jedynym źródłem utrzymania.
          </span>
        </div>
      </div>

      <div className={`space-y-4 ${isDemo ? 'opacity-80 grayscale-[20%]' : ''}`}>
        <div className="flex justify-between items-end">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Symulacja kapitału (Siła nabywcza)</h3>
            <span className="text-[10px] text-zinc-500 italic">Horyzont: {retirementDuration} lat wypłat</span>
        </div>
        
        <div className="bg-black/20 p-4 pb-6 rounded-xl border border-zinc-800 relative">
            <SpaghettiChart 
              results={results} 
              totalYears={results.totalYears} 
              accumulationYears={results.accumulationYears} 
              currentAge={inputs.currentAge} 
            />
            
            <div className="flex justify-between text-[10px] text-zinc-500 px-2 mt-10 font-medium uppercase tracking-wider">
              <span>Dzisiaj (Wiek: {inputs.currentAge})</span>
              <span>Start FIRE (Wiek: {inputs.fireAge})</span>
              <span>Koniec (Wiek: {inputs.maxAge})</span>
            </div>
        </div>
      </div>

      <div className="text-[10px] text-zinc-500 leading-relaxed bg-black/40 p-4 rounded-lg border-l-2 border-yellow-500">
        <strong>Skąd te wahania?</strong> Algorytmy testują Twój portfel na tysiącach losowych ścieżek historycznych. Widoczne linie pokazują, jak zachowa się Twój kapitał w zależności od sytuacji na świecie, gwarantując przewidywalność nawet w trudnych czasach.
      </div>
    </div>
  );
}