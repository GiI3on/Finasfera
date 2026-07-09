import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Jakie ETF-y kupić na XTB, mBank i BOŚ? Przewodnik po tickerach i podatkach (2026)",
  description: "Zgubiony w gąszczu tickerów? Sprawdź, jak znaleźć najpopularniejsze ETF-y na S&P 500 i cały świat u polskich brokerów. Poznaj różnice między Acc i Dist oraz kwestie walutowe.",
  alternates: {
    canonical: 'https://finasfera.pl/blog/jakie-etfy-kupic-xtb-mbank-bos',
  },
};

export default function EtfGuideArticle() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "headline": "Jakie ETF-y kupić na XTB, mBank i BOŚ? Przewodnik po tickerach i podatkach",
        "description": "Przewodnik dla początkujących inwestorów w Polsce. Wyjaśniamy tickery popularnych ETF-ów, różnice między akumulacją a dystrybucją oraz kwestie walutowe.",
        "author": {
          "@type": "Organization",
          "name": "Finasfera",
          "url": "https://finasfera.pl"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Finasfera",
          "logo": {
            "@type": "ImageObject",
            "url": "https://finasfera.pl/icon.png"
          }
        },
        "datePublished": "2026-07-09",
        "dateModified": "2026-07-09"
      }
    ]
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link 
        href="/blog" 
        className="inline-flex items-center text-sm font-medium text-zinc-400 hover:text-yellow-400 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Wróć do bazy wiedzy
      </Link>

      <article className="prose prose-invert prose-yellow max-w-none">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold text-yellow-950 bg-yellow-500 px-3 py-1 rounded-full uppercase tracking-wider">
              Podstawy Inwestowania
            </span>
            <span className="text-sm text-zinc-500">9 Lipca 2026 • 10 min czytania</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-100 leading-tight mb-6">
            Jakie ETF-y kupić na XTB, mBank i BOŚ? Przewodnik po tickerach i podatkach (2026)
          </h1>
        </header>

        <p className="text-xl text-zinc-300 font-light leading-relaxed mb-8">
          Założyłeś konto maklerskie. Jesteś gotowy, by zacząć inwestować, wpisujesz "S&P 500" w wyszukiwarkę swojego brokera i... wyskakuje Ci kilkanaście dziwnych skrótów. SXR8? VUAA? A może VUSA? Czym one się różnią i jak znaleźć ten właściwy u polskiego brokera? Rozwiejmy ten chaos krok po kroku.
        </p>
        
        <h2 className="text-2xl font-bold text-zinc-100 mt-12 mb-4">
          Czym jest ETF i dlaczego bije na głowę tradycyjne inwestowanie?
        </h2>
        <p className="text-zinc-400 mb-4 leading-relaxed">
          Zamiast kupować pojedyncze akcje (np. Apple, Microsoft czy Orlen) i zgadywać, która firma odniesie sukces, możesz kupić <strong>ETF (Exchange Traded Fund)</strong>. To swego rodzaju koszyk, który zawiera akcje setek lub tysięcy firm jednocześnie. Kupując jedną jednostkę ETF-a na indeks S&P 500, stajesz się współwłaścicielem 500 największych firm w USA.
        </p>
        <p className="text-zinc-400 mb-6 leading-relaxed">
          Dlaczego to historycznie najbardziej skuteczna forma długoterminowego inwestowania? Odpowiedzi dostarczają twarde dane z regularnie publikowanych raportów <strong>SPIVA</strong> (Standard & Poor's Indices Versus Active):
        </p>
        <ul className="text-zinc-400 mb-6 space-y-2">
          <li>W perspektywie 15-letniej <strong>ponad 90%</strong> aktywnie zarządzanych funduszy inwestycyjnych (czyli tych, gdzie "eksperci" ręcznie wybierają spółki) osiąga gorsze wyniki niż zwykły indeks S&P 500.</li>
          <li>ETF-y są pasywne, mechanicznie naśladują dany rynek. Dzięki temu nie potrzebują sztabu drogich analityków. Koszty zarządzania wynoszą zazwyczaj od 0.07% do 0.22% rocznie, podczas gdy tradycyjne fundusze TFI w Polsce potrafią pobierać nawet 2% rocznie. W skali 20 lat ta różnica w opłatach "zjada" ogromną część Twojego zysku.</li>
        </ul>

        <h2 className="text-2xl font-bold text-zinc-100 mt-12 mb-4">
          Kluczowe pojęcia: Acc, Dist i Waluty (zanim przejdziesz do tabeli)
        </h2>
        <p className="text-zinc-400 mb-6 leading-relaxed">
          Zanim zaczniesz kupować, musisz zrozumieć trzy parametry, które pojawiają się w nazwach funduszy ETF: Dostawcę, Typ (Acc/Dist) oraz Walutę.
        </p>

        <h3 className="text-xl font-bold text-zinc-200 mt-6 mb-2">1. Co oznacza Acc i Dist?</h3>
        <p className="text-zinc-400 mb-4 leading-relaxed">
          Gdy spółki znajdujące się w Twoim ETF-ie (np. Apple) wypłacają dywidendę, fundusz musi coś z nią zrobić.
        </p>
        <ul className="text-zinc-400 mb-6 space-y-2">
          <li><strong>Acc (Accumulating - Akumulujące):</strong> Fundusz za otrzymane z dywidend pieniądze automatycznie dokupuje więcej akcji wewnątrz funduszu. Cena Twojej jednostki ETF rośnie. Nie płacisz po drodze podatku Belki, a procent składany działa maksymalnie wydajnie. <strong>To najlepszy wybór dla osób budujących kapitał w Polsce.</strong></li>
          <li><strong>Dist (Distributing - Dystrybuujące):</strong> Fundusz przelewa gotówkę z dywidend bezpośrednio na Twoje konto maklerskie. W Polsce rodzi to obowiązek zapłacenia 19% podatku Belki od każdej takiej wypłaty, co spowalnia budowę majątku.</li>
        </ul>

        <h3 className="text-xl font-bold text-zinc-200 mt-6 mb-2">2. Dlaczego S&P 500 jest w tabeli kilka razy?</h3>
        <p className="text-zinc-400 mb-4 leading-relaxed">
          Indeks S&P 500 to tylko "przepis" na koszyk. Ten sam przepis może ugotować różny kucharz. W świecie ETF-ów tymi kucharzami są firmy inwestycyjne (Dostawcy), tacy jak <strong>iShares (BlackRock)</strong> czy <strong>Vanguard</strong>. Oba fundusze robią dokładnie to samo, mają podobne niskie koszty i osiągają niemal identyczne wyniki. Różnią się po prostu "marką" i tickerem.
        </p>

        <h3 className="text-xl font-bold text-zinc-200 mt-6 mb-2">3. Waluta aktywów a waluta notowania (Giełda)</h3>
        <p className="text-zinc-400 mb-6 leading-relaxed">
          To zagadnienie sprawia początkującym najwięcej problemów. Kupując S&P 500, inwestujesz w firmy amerykańskie, które zarabiają w dolarach (USD). Jednak europejscy brokerzy (jak XTB czy mBank) kupują te ETF-y na giełdach w Europie (np. Xetra we Frankfurcie, giełda w Amsterdamie), gdzie handel odbywa się w Euro (EUR). <br/><br/>
          <strong>Ważne:</strong> Waluta, w jakiej kupujesz ETF (np. EUR), to tylko opakowanie. Ostateczny wynik Twojej inwestycji zależy od tego, jak radzą sobie firmy w USA oraz od <strong>kursu Dolara do Złotówki (USD/PLN)</strong>, a nie od kursu Euro (EUR/PLN). Aby uniknąć opłat bankowych, upewnij się, że masz subkonto w walucie giełdy (np. w EUR) i wymieniasz na nie złotówki tanio (np. przez kantor internetowy), a nie po niekorzystnym kursie brokera.
        </p>

        <h2 className="text-2xl font-bold text-zinc-100 mt-12 mb-6">
          Najpopularniejsze ETF-y u polskich brokerów
        </h2>

        {/* Rozbudowana Tabela Tickerów */}
        <div className="overflow-x-auto my-8">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-200 border-b border-zinc-700 text-sm">
                <th className="p-3 font-semibold">Indeks (Rynek)</th>
                <th className="p-3 font-semibold">Dostawca</th>
                <th className="p-3 font-semibold">Typ</th>
                <th className="p-3 font-semibold">Giełda<br/>(Waluta)</th>
                <th className="p-3 font-semibold text-yellow-400">Ticker na XTB</th>
                <th className="p-3 font-semibold text-blue-400">Ticker mBank / BOŚ</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300 text-sm">
              {/* S&P 500 - Acc - iShares */}
              <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                <td className="p-3"><strong>S&P 500</strong> (USA)</td>
                <td className="p-3">iShares</td>
                <td className="p-3 text-emerald-400 font-bold">Acc</td>
                <td className="p-3">Niemcy (EUR)</td>
                <td className="p-3 font-mono text-yellow-300">SXR8.DE</td>
                <td className="p-3 font-mono">SXR8 / CSPX</td>
              </tr>
              {/* S&P 500 - Acc - Vanguard */}
              <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                <td className="p-3"><strong>S&P 500</strong> (USA)</td>
                <td className="p-3">Vanguard</td>
                <td className="p-3 text-emerald-400 font-bold">Acc</td>
                <td className="p-3">Niemcy (EUR)</td>
                <td className="p-3 font-mono text-yellow-300">VUAA.DE</td>
                <td className="p-3 font-mono">VUAA</td>
              </tr>
              {/* S&P 500 - Dist - Vanguard */}
              <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors bg-zinc-900/10">
                <td className="p-3"><strong>S&P 500</strong> (USA)</td>
                <td className="p-3">Vanguard</td>
                <td className="p-3 text-red-400 font-bold">Dist</td>
                <td className="p-3">Niemcy (EUR)</td>
                <td className="p-3 font-mono text-yellow-300">VUSA.DE</td>
                <td className="p-3 font-mono">VUSA</td>
              </tr>
              {/* All-World - Acc - Vanguard */}
              <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors mt-2">
                <td className="p-3"><strong>FTSE All-World</strong> (Cały Świat)</td>
                <td className="p-3">Vanguard</td>
                <td className="p-3 text-emerald-400 font-bold">Acc</td>
                <td className="p-3">Niemcy (EUR)</td>
                <td className="p-3 font-mono text-yellow-300">VWCE.DE</td>
                <td className="p-3 font-mono">VWCE</td>
              </tr>
               {/* All-World - Dist - Vanguard */}
               <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors bg-zinc-900/10">
                <td className="p-3"><strong>FTSE All-World</strong> (Cały Świat)</td>
                <td className="p-3">Vanguard</td>
                <td className="p-3 text-red-400 font-bold">Dist</td>
                <td className="p-3">Niemcy (EUR)</td>
                <td className="p-3 font-mono text-yellow-300">VWRL.DE</td>
                <td className="p-3 font-mono">VWRL</td>
              </tr>
              {/* Developed World - Acc - iShares */}
              <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                <td className="p-3"><strong>MSCI World</strong> (Rynki Rozwinięte)</td>
                <td className="p-3">iShares</td>
                <td className="p-3 text-emerald-400 font-bold">Acc</td>
                <td className="p-3">Niemcy (EUR)</td>
                <td className="p-3 font-mono text-yellow-300">EUNL.DE</td>
                <td className="p-3 font-mono">IWDA / EUNL</td>
              </tr>
              {/* Emerging Markets - Acc - iShares */}
              <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                <td className="p-3"><strong>Emerging Markets</strong> (Rynki Wschodzące)</td>
                <td className="p-3">iShares</td>
                <td className="p-3 text-emerald-400 font-bold">Acc</td>
                <td className="p-3">Niemcy (EUR)</td>
                <td className="p-3 font-mono text-yellow-300">IS3N.DE</td>
                <td className="p-3 font-mono">IS3N / IEMA</td>
              </tr>
              {/* Nasdaq 100 - Acc - iShares */}
              <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                <td className="p-3"><strong>Nasdaq 100</strong> (Spółki Tech)</td>
                <td className="p-3">iShares</td>
                <td className="p-3 text-emerald-400 font-bold">Acc</td>
                <td className="p-3">Niemcy (EUR)</td>
                <td className="p-3 font-mono text-yellow-300">SXRV.DE</td>
                <td className="p-3 font-mono">SXRV / CNDX</td>
              </tr>
              {/* Global Bonds - Acc - iShares */}
              <tr className="hover:bg-zinc-900/30 transition-colors">
                <td className="p-3"><strong>Global Aggregate Bonds</strong> (Obligacje)</td>
                <td className="p-3">iShares</td>
                <td className="p-3 text-emerald-400 font-bold">Acc</td>
                <td className="p-3">Niemcy (EUR)</td>
                <td className="p-3 font-mono text-yellow-300">EUNA.DE</td>
                <td className="p-3 font-mono">EUNA / AGGH</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mt-2 text-center mb-12">
          Uwaga: Tickery u brokerów mogą ulegać drobnym zmianom. Zawsze sprawdzaj kod ISIN (unikalny identyfikator funduszu) w Dokumencie Kluczowych Informacji (KID).
        </p>

        <h2 className="text-2xl font-bold text-zinc-100 mt-12 mb-4">
          Pułapka Dywersyfikacji: S&P 500 + Cały Świat
        </h2>
        <p className="text-zinc-400 mb-6 leading-relaxed">
          Początkujący bardzo często popełniają błąd polegający na kupowaniu "wszystkiego co popularne". Myślą: <em>"Kupię S&P 500 dla zysków technologicznych i ETF All-World dla globalnego bezpieczeństwa"</em>. Niestety to błąd nazywany <strong>Overlapem</strong> (nakładaniem się na siebie portfeli).
        </p>

        {/* Wizualizacja Overlapu */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 my-8 flex flex-col md:flex-row items-center gap-8 justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-32 h-32 rounded-full border-4 border-yellow-500 flex items-center justify-center bg-yellow-500/10">
              <span className="text-yellow-400 font-bold text-xl">100% USA</span>
            </div>
            <span className="text-sm font-semibold text-zinc-300">ETF S&P 500</span>
          </div>
          <div className="hidden md:flex flex-col items-center">
            <span className="text-3xl text-zinc-600">+</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-32 h-32 rounded-full border-4 border-blue-500 flex items-center justify-center bg-blue-500/10 relative overflow-hidden">
              <div className="absolute bottom-0 w-full h-[30%] bg-zinc-800 border-t-2 border-zinc-700 flex items-center justify-center">
                <span className="text-xs font-semibold text-zinc-400">Inne 30%</span>
              </div>
              <div className="absolute top-0 w-full h-[70%] flex items-center justify-center">
                <span className="text-blue-400 font-bold text-xl">~70% USA</span>
              </div>
            </div>
            <span className="text-sm font-semibold text-zinc-300">ETF All-World</span>
          </div>
        </div>

        <p className="text-zinc-400 mb-6 leading-relaxed">
          Fundusze globalne (jak VWCE z tabeli wyżej) odwzorowują światowy rynek. Ponieważ amerykańskie korporacje są absolutnymi gigantami, USA stanowi około 60-70% wagi całego funduszu globalnego. Dokupując do niego S&P 500, sprawiasz, że Twój portfel staje się w ponad 85% zależny wyłącznie od rynku amerykańskiego. Nie dokładasz bezpieczeństwa – dokładasz ryzyka. Jeśli chcesz globalnej dywersyfikacji, po prostu kup sam ETF typu All-World.
        </p>

        <div className="mt-12 bg-zinc-950 border border-zinc-900 rounded-lg p-5 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-zinc-600 shrink-0 mt-1" />
          <p className="text-sm text-zinc-600 mb-0 leading-relaxed font-light">
            Zastrzeżenie prawne: Powyższa treść ma charakter wyłącznie edukacyjny i informacyjny. Nie stanowi porady inwestycyjnej ani rekomendacji w rozumieniu przepisów prawa. Inwestowanie na giełdzie wiąże się z ryzykiem utraty kapitału. Przed podjęciem decyzji dokładnie zapoznaj się z dokumentem Kluczowych Informacji (KID) danego funduszu.
          </p>
        </div>

      </article>
    </main>
  );
}