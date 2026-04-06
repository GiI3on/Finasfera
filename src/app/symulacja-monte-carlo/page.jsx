// src/app/symulacja-monte-carlo/page.jsx
"use client";

import { useState, useRef, useEffect } from "react";
import InputPanel from "../components/monteCarlo/InputPanel";
import ResultsPanel from "../components/monteCarlo/ResultsPanel";
import Link from "next/link";

export default function MonteCarloPage() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState(null);
  const [lastInputs, setLastInputs] = useState(null);
  
  const workerRef = useRef(null);

  const initializeWorker = () => {
    if (workerRef.current) {
        workerRef.current.terminate();
    }
    workerRef.current = new Worker(new URL("../../workers/monteCarlo.worker.ts", import.meta.url));
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'COMPLETE') {
        setResults(e.data.payload);
        setIsCalculating(false);
      } else if (e.data.type === 'ERROR') {
        alert("Błąd przetwarzania danych: " + e.data.payload.message);
        setIsCalculating(false);
      }
    };
  };

  useEffect(() => {
    initializeWorker();
    return () => workerRef.current?.terminate(); 
  }, []);

  const handleSimulate = (inputs) => {
    setIsCalculating(true);
    setResults(null);
    setLastInputs(inputs);
    
    initializeWorker();
    workerRef.current?.postMessage(inputs);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Jak obliczyć swoją emeryturę z giełdy i ZUS?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Aby bezpiecznie obliczyć swoją emeryturę z inwestycji oraz składek ZUS, należy użyć zaawansowanych algorytmów analitycznych. Pozwalają one przetestować portfel na tysiące historycznych scenariuszy rynkowych i oszacować gwarantowaną siłę nabywczą w przyszłości."
        }
      },
      {
        "@type": "Question",
        "name": "Dlaczego zwykły kalkulator emerytalny ZUS to za mało?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Kalkulator emerytalny ZUS prognozuje wyłącznie świadczenia państwowe, które z powodu demografii wyniosą ułamek dzisiejszych zarobków. Nie uwzględnia on budowania prywatnego kapitału, siły procentu składanego ani wcześniejszego przejścia na emeryturę."
        }
      },
      {
        "@type": "Question",
        "name": "Co daje inwestowanie 500 zł miesięcznie na emeryturę?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Dzięki mechanizmowi procentu składanego, regularne odkładanie nawet 500 zł miesięcznie przez 30 lat może zbudować kapitał rzędu kilkuset tysięcy złotych, wielokrotnie przekraczający sumę samych wpłat."
        }
      },
      {
        "@type": "Question",
        "name": "Co to jest Symulacja Monte Carlo w finansach?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Symulacja Monte Carlo to zaawansowany algorytm stosowany przez instytucje finansowe. Zamiast zakładać stały wzrost gospodarki w linii prostej, symuluje tysiące losowych ścieżek pełnych zysków i spadków, aby znaleźć najbezpieczniejszą kwotę wypłaty z kapitału."
        }
      }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main className="max-w-7xl mx-auto px-4 py-12 pb-32">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-white">Kalkulator <span className="text-yellow-500">Bezpiecznej Emerytury</span></h1>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
            Zamiast zgadywać ile będziesz otrzymywać na starość, pozwól naszym algorytmom wyliczyć precyzyjną kwotę. Silnik uwzględnia prognozy państwowe z ZUS, historyczne załamania rynków oraz siłę procentu składanego.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative mb-24">
          <div className="lg:col-span-4 lg:sticky lg:top-6 z-10 bg-zinc-950/80 backdrop-blur-md rounded-xl">
            <InputPanel 
              currentPortfolioValue={0} 
              onSimulate={handleSimulate} 
              isCalculating={isCalculating} 
            />
          </div>
          
          <div className="lg:col-span-8">
            {!results && !isCalculating && (
              <div className="h-[600px] border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500 p-8 text-center bg-zinc-900/10">
                <h3 className="text-xl font-bold text-zinc-300 mb-2 mt-4">System analityczny gotowy</h3>
                <p className="max-w-md">Wpisz swój obecny wiek, ewentualny kapitał i zarobki po lewej stronie. Narzędzie wykorzysta analizę 1000 życiowych wariantów, by z całą pewnością określić Twoje zabezpieczenie finansowe.</p>
              </div>
            )}

            {isCalculating && (
              <div className="h-[600px] border border-yellow-500/30 bg-yellow-900/10 rounded-2xl flex flex-col items-center justify-center text-yellow-500">
                <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                <p className="text-lg font-bold animate-pulse tracking-wide uppercase">Analiza Danych w Toku...</p>
                <p className="text-xs text-yellow-500/60 mt-2">Testowanie portfela pod kątem zmienności gospodarki</p>
              </div>
            )}

            {results && !isCalculating && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <ResultsPanel results={results} inputs={lastInputs} />
              </div>
            )}
          </div>
        </div>

        {/* SPÓJNA SEKCJA EDUKACYJNA */}
        <section className="border-t border-zinc-800 pt-20 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6">Przewodnik: Jak mądrze zaplanować swoją emeryturę?</h2>
            <p className="text-zinc-400 text-lg max-w-3xl mx-auto leading-relaxed">
              Darmowe kalkulatory internetowe pokazują piękne, ale nierealne wykresy. Zobacz, jak przejąć kontrolę nad swoimi finansami, dlaczego nie powinieneś polegać wyłącznie na państwie i jak instytucje finansowe obliczają prawdziwe bezpieczeństwo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            
            <div className="bg-zinc-800/30 p-8 rounded-2xl border border-zinc-700/50">
              <h3 className="text-xl font-bold text-yellow-500 mb-4">Dlaczego kalkulator ZUS to za mało?</h3>
              <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                Większość opiera swoją przyszłość na jednym filarze: Zakładzie Ubezpieczeń Społecznych. Problem w tym, że przy dzisiejszej demografii, prognozowana <strong>stopa zastąpienia</strong> (stosunek emerytury do ostatniej pensji) drastycznie spada. 
              </p>
              <p className="text-zinc-300 leading-relaxed text-sm">
                Dla osób dzisiaj 30-letnich, państwowa emerytura może wynieść zaledwie 20-30% obecnych zarobków. System ostrzega, ale nie pomaga zasypać tej dziury w budżecie. Zbudowanie własnego kapitału to nie luksus, lecz konieczność.
              </p>
            </div>

            <div className="bg-zinc-800/30 p-8 rounded-2xl border border-zinc-700/50">
              <h3 className="text-xl font-bold text-emerald-400 mb-4">Co zmieni inwestowanie 500 zł miesięcznie?</h3>
              <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                Prawdziwą siłą finansów nie jest startowy kapitał, lecz czas i <strong>magia procentu składanego</strong>.
              </p>
              <ul className="space-y-3 text-zinc-400 text-sm mb-4">
                <li className="flex items-start">
                  <span className="text-yellow-500 mr-2 font-bold">✓</span>
                  Odkładając 500 zł na zwykłe konto przez 30 lat, uzbierasz równo 180 000 zł.
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2 font-bold">✓</span>
                  Inwestując je w szeroki rynek giełdowy, Twój kapitał może urosnąć do kilkuset tysięcy złotych dzięki zyskom, które generują kolejne zyski.
                </li>
              </ul>
            </div>

            <div className="bg-zinc-800/30 p-8 rounded-2xl border border-zinc-700/50">
              <h3 className="text-xl font-bold text-white mb-4">Czym jest Wcześniejsza Emerytura (FIRE)?</h3>
              <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                Ruch <strong>FIRE</strong> (Financial Independence, Retire Early) to strategia, której celem jest wolność finansowa przed ustawowym wiekiem emerytalnym.
              </p>
              <p className="text-zinc-300 leading-relaxed text-sm">
                Inwestorzy FIRE inwestują nadwyżki finansowe w szerokie fundusze. Gdy kapitał osiągnie około 25-krotność rocznych wydatków, utrzymują się z odsetek. Nasz kalkulator potrafi sprawdzić, czy Twój plan jest odporny na przyszłe wstrząsy gospodarcze.
              </p>
            </div>

            <div className="bg-zinc-800/30 p-8 rounded-2xl border border-zinc-700/50">
              <h3 className="text-xl font-bold text-yellow-500 mb-4">Matematyczne kłamstwo "średniej"</h3>
              <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                Większość kalkulatorów zakłada tzw. stopę liniową. Pytają Cię o zysk i co roku idealnie dodają np. 7%. <strong>Gospodarka tak nie działa.</strong> 
              </p>
              <p className="text-zinc-300 leading-relaxed text-sm">
                Na giełdzie zdarzają się tąpnięcia. Jeśli na początku emerytury trafisz na wielki krach (tzw. <em>Sequence of Return Risk</em>), stracisz większość kapitału, zanim rynek się odbije. Proste kalkulatory ignorują to ryzyko, rysując fałszywy obraz bezpieczeństwa.
              </p>
            </div>

            <div className="bg-zinc-800/30 p-8 rounded-2xl border border-zinc-700/50">
              <h3 className="text-xl font-bold text-white mb-4">Sekret Banków: Symulacja Monte Carlo</h3>
              <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                Zamiast rysować jedną, ładną linię, nasz algorytm korzysta z matematyki instytucji finansowych z Wall Street. 
              </p>
              <p className="text-zinc-300 leading-relaxed text-sm">
                Tworzy on <strong>1000 całkowicie losowych wariantów przyszłości</strong>. Wrzuca tam historyczne krachy, recesje i długotrwałe hossy. Otrzymujesz kwotę, która jest bezpieczna w przygniatającej większości tych trudnych scenariuszy, a nie tylko wtedy, gdy rynki rosną.
              </p>
            </div>

            <div className="bg-zinc-800/30 p-8 rounded-2xl border border-zinc-700/50">
              <h3 className="text-xl font-bold text-emerald-400 mb-4">Jak algorytm czyta inflację?</h3>
              <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                Wszystkie wyniki, które generuje dla Ciebie nasza aplikacja, pokazują <strong>Realną Siłę Nabywczą</strong>.
              </p>
              <p className="text-zinc-300 leading-relaxed text-sm">
                Algorytm na bieżąco odcina wskaźnik inflacji od Twoich zysków. Dzięki temu kwota, którą widzisz w podsumowaniu, to pieniądz dzisiejszy. Nie musisz martwić się, że za wyświetlone wirtualne miliony za 30 lat kupisz zaledwie bochenek chleba.
              </p>
            </div>

          </div>

          <div className="mt-8 text-center bg-black/40 border border-yellow-500/20 p-10 rounded-3xl">
            <h3 className="text-2xl font-black text-white mb-4">Chcesz zrozumieć, jak samodzielnie zacząć?</h3>
            <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
              Przygotowaliśmy obszerny poradnik krok po kroku, który tłumaczy jak otworzyć darmowe konto inwestycyjne i bezpiecznie budować majątek od zera.
            </p>
            <Link href="/blog/jak-zaczac-inwestowac" className="inline-block px-8 py-4 bg-yellow-500 text-black text-sm font-black uppercase tracking-widest rounded-xl hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/10">
              Przejdź do poradnika dla początkujących
            </Link>
          </div>
        </section>

      </main>
    </>
  );
}