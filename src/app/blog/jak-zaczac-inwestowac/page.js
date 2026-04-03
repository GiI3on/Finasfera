import Link from "next/link";

export const metadata = {
  title: "Jak zacząć inwestować w Polsce od 500 zł | Finasfera",
  description: "Przewodnik dla młodego inwestora. Dowiedz się, jak wykorzystać procent składany, ETF-y i konta IKE/IKZE do budowania niezależności finansowej.",
  keywords: ["jak zacząć inwestować", "inwestowanie od 500 zł", "fundusze ETF", "procent składany", "IKE IKZE", "początkujący inwestor"],
};

export default function ArticlePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/blog" className="inline-flex items-center text-sm text-zinc-400 hover:text-yellow-400 mb-8 transition-colors">
        ← Wróć do listy artykułów
      </Link>

      <header className="mb-12">
        <div className="flex items-center text-zinc-500 text-sm gap-4 mb-4">
          <span className="text-yellow-500 font-medium bg-yellow-500/10 px-2 py-1 rounded">Podstawy Inwestowania</span>
          <span>Kwiecień 2026</span>
          <span>•</span>
          <span>8 min czytania</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-zinc-100 mb-6 leading-tight">
          Jak zacząć inwestować w Polsce: Przewodnik dla młodego inwestora z kapitałem od 500 zł
        </h1>
        <p className="text-xl text-zinc-400 leading-relaxed">
          Wielu moich rówieśników myśli, że giełda to miejsce zarezerwowane dla panów w drogich garniturach, którzy operują milionami. „Mam tylko 500 złotych miesięcznie, co ja za to kupię?” – pytają. Prawda jest taka, że dzisiaj próg wejścia w świat finansów jest najniższy w historii. Masz 20, 23 czy 27 lat? Masz coś, czego nie kupi żaden miliarder po sześćdziesiątce: czas.
        </p>
      </header>

      <article className="prose prose-invert prose-zinc max-w-none text-zinc-300 leading-relaxed space-y-8">
        <p>
          Twoje 500 złotych miesięcznie, dzięki matematyce i cierpliwości, może stać się potężnym kapitałem. W Finasferze wierzymy w liczby, nie w obietnice, więc przeanalizujmy, jak realnie zacząć budować swoją niezależność w polskich realiach.
        </p>

        <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mt-12">
          1. Pułapka „zbyt małego kapitału” – dlaczego 500 zł to potęga?
        </h2>
        <p>
          Zacznijmy od konkretu. Jeśli odkładasz 500 PLN miesięcznie i chowasz je do przysłowiowej skarpety, po 30 latach masz 180 000 PLN. Jednak jeśli te same pieniądze zainwestujesz ze średnioroczną stopą zwrotu na poziomie 7% (historyczna średnia szerokiego rynku akcji), po 30 latach na Twoim koncie widnieje ponad 600 000 PLN.
        </p>

        {/* --- WYKRES 1: Procent Składany --- */}
        <div className="my-10 w-full flex justify-center">
          <img 
            src="/wykres-fire.png" 
            alt="Wykres procentu składanego" 
            className="w-full h-auto rounded-2xl border border-zinc-800 shadow-xl"
          />
        </div>

        <p>
          Widzisz tę różnicę? To ponad <strong>400 tysięcy złotych wypracowane przez procent składany</strong>. Inwestowanie to nie jest „pomnażanie pieniędzy” w jeden wieczór. To sadzenie dębu. Czekanie, aż „będziesz mieć więcej pieniędzy”, jest najdroższym błędem. Każdy rok zwłoki kosztuje Cię dziesiątki tysięcy złotych z przyszłych zysków.
        </p>

        <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mt-12">
          2. Fundamenty: Zanim kupisz pierwszą akcję
        </h2>
        <p>
          Zanim rzucisz się na głęboką wodę GPW, musisz mieć suchy ląd, na który wrócisz in razie burzy. Inwestorzy, którzy odnoszą sukcesy, zawsze zaczynają od dwóch rzeczy: bezpieczeństwa i optymalizacji podatkowej.
        </p>
        <p>
          Pierwszym krokiem jest budowa <strong>poduszki finansowej</strong>. To kwota (zazwyczaj 3-6 Twoich miesięcznych wydatków), która leży na bezpiecznym koncie. Drugim krokiem jest wybór „opakowania” dla Twoich inwestycji: <strong className="text-yellow-400">IKE (Indywidualne Konto Emerytalne)</strong> oraz <strong className="text-yellow-400">IKZE (Indywidualne Konto Zabezpieczenia Emerytalnego)</strong>. Pozwalają one legalnie uniknąć 19% podatku Belka.
        </p>

        {/* --- GRAFIKA 2: PIRAMIDA FINANSOWA --- */}
        <div className="my-10 w-full flex justify-center">
          <img 
            src="/piramida.png" 
            alt="Piramida Niezależności Finansowej" 
            className="w-full max-w-lg h-auto rounded-2xl border border-zinc-800 shadow-xl"
          />
        </div>

        <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mt-12">
          3. Strategia „Taniej Pizzy” – czym są fundusze ETF?
        </h2>
        <p>
          Skoro masz już 500-2000 PLN, jak je ulokować, żeby nie zjadły Cię prowizje? Kupowanie pojedynczych akcji przy małych kwotach bywa ryzykowne i drogie. Tutaj wchodzą fundusze <strong className="text-yellow-400">ETF (Exchange Traded Funds)</strong>. Wyobraź sobie, że chcesz zjeść pizzę, na której jest 500 różnych składników. Zamiast kupować każdą pieczarkę i szynkę osobno, kupujesz jeden gotowy kawałek, który zawiera w sobie mikroskopijne cząstki wszystkiego.
        </p>

        {/* USUNIĘTO: Miejsce na grafikę ETF */}

        <h3 className="text-xl font-semibold text-zinc-200 mt-6">Dlaczego ETF-y są idealne na start?</h3>
        <ul className="space-y-3 mt-4 text-zinc-300">
          <li><strong className="text-zinc-100">Niskie koszty:</strong> Płacisz ułamek procenta za zarządzanie rocznie, co przy małym kapitale ma ogromne znaczenie.</li>
          <li><strong className="text-zinc-100">Dywersyfikacja:</strong> Jeden zakup to współwłasność setek, a nawet tysięcy firm na całym świecie.</li>
          <li><strong className="text-zinc-100">Prostota:</strong> Inwestujesz w rozwój światowej gospodarki (np. S&P 500 lub MSCI World), a nie w losy jednej, wybranej firmy.</li>
        </ul>

        {/* --- CTA Z REKLAMĄ SKANERA --- */}
        <div className="my-16 p-8 md:p-10 border border-zinc-800 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600"></div>

          <h3 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-4 mt-4">Przetestuj Swój Scenariusz z Żuberkiem AI</h3>
          <p className="text-zinc-400 mb-8 max-w-xl text-lg">
            Wiesz już, od czego zacząć, ale czy wiesz, jak ocenić ryzyko Twoich pierwszych inwestycji? Użyj naszego skanera wspieranego przez Sztuczną Inteligencję, aby prześwietlić portfel.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-3 px-8 rounded-xl transition-all border border-zinc-700">
              Kalkulator FIRE
            </Link>
            <Link href="/skaner-ai" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(250,204,21,0.2)]">
              Skaner AI
            </Link>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mt-12">
          4. Gdzie założyć konto maklerskie w Polsce?
        </h2>
        <p>
          Jako młody inwestor musisz bezwzględnie patrzeć na koszty transakcyjne. Jeśli Twój broker pobiera 19 PLN za każdy zakup, a Ty wpłacasz 500 PLN, to na samym starcie tracisz prawie 4% kapitału. W Polsce masz dwie główne drogi:
        </p>
        <ul className="space-y-4 mt-4">
          <li className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
            <strong className="text-zinc-100 block mb-1">Tradycyjne biura maklerskie (np. mBank, DM BOŚ)</strong>
            Idealne do prowadzenia kont IKE/IKZE oraz kupowania akcji z polskiej giełdy (GPW). Minusem bywają wyższe prowizje na rynkach zagranicznych.
          </li>
          <li className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
            <strong className="text-zinc-100 block mb-1">Nowocześni brokerzy (np. XTB)</strong>
            XTB to prężnie działający polski dom maklerski o zasięgu globalnym. Bardzo popularny wśród inwestorów ze względu na 0% prowizji na akcje i ETF-y (do 100 tys. EUR obrotu miesięcznie). Pozwala to kupować nawet po jednej jednostce (lub ułamku) funduszu bez zbędnych kosztów.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mt-12">
          5. Bezpieczna przystań: Obligacje skarbowe
        </h2>
        <p>
          Nie każdy ma żołądek ze stali. Jeśli boisz się spadków giełdowych, Twoim najlepszym przyjacielem są Polskie Obligacje Skarbowe, szczególnie te indeksowane inflacją (np. EDO). Inwestorzy często stosują tzw. drabinę obligacyjną, czyli kupują obligacje w regularnych odstępach czasu, by co jakiś czas wygasała część kapitału, dając dostęp do gotówki i niwelując ryzyko stóp procentowych.
        </p>

        <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mt-12">
          6. Ryzyko i Skaner AI – jak nie dać się emocjom?
        </h2>
        <p>
          Inwestowanie to w 10% matematyka i w 90% psychologia. Największym wrogiem Twoich pieniędzy nie jest krach, ale strach i chciwość. Kiedy rynek rośnie, wszyscy czują się jak geniusze. Ale to w czasie bessy hartują się prawdziwi inwestorzy.
        </p>
        <p>
          Zamiast ufać intuicji lub „ekspertom” z mediów społecznościowych, korzystaj z twardych danych. Nasz <strong>Skaner AI (Żuberek)</strong> pomoże Ci przeanalizować fundamenty spółki i ocenić ryzyko, zanim zainwestujesz ciężko zarobione pieniądze. Traktuj go jak chłodnego, pozbawionego emocji analityka.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 my-10 shadow-lg">
          <h3 className="text-xl font-bold text-zinc-100 mt-0 mb-6 flex items-center gap-3">
            {/* USUNIĘTO: span z emotką */}
            Praktyczny plan działania (Checklista)
          </h3>
          <ul className="space-y-4 list-none pl-0 m-0">
            <li className="flex items-start gap-3">
              <span className="text-yellow-400 font-bold mt-0.5 whitespace-nowrap shrink-0">Krok 1:</span>
              <span className="text-zinc-300">Zbuduj 2000-5000 zł poduszki bezpieczeństwa. Zabezpiecz tyły.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-yellow-400 font-bold mt-0.5 whitespace-nowrap shrink-0">Krok 2:</span>
              <span className="text-zinc-300">Otwórz konto IKE w wybranym domu maklerskim, by chronić zyski przed podatkiem.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-yellow-400 font-bold mt-0.5 whitespace-nowrap shrink-0">Krok 3:</span>
              <span className="text-zinc-300">Ustaw zlecenie stałe – traktuj inwestowanie jak rachunek do zapłacenia samemu sobie na początku miesiąca.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-yellow-400 font-bold mt-0.5 whitespace-nowrap shrink-0">Krok 4:</span>
              <span className="text-zinc-300">Kupuj regularnie tanie ETF-y na szeroki rynek (np. globalne akcje).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-yellow-400 font-bold mt-0.5 whitespace-nowrap shrink-0">Krok 5:</span>
              <span className="text-zinc-300">Ignoruj codzienne szumy informacyjne i spadki. Czas pracuje dla Ciebie.</span>
            </li>
          </ul>
        </div>

        <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mt-12">
          FAQ – Najczęściej zadawane pytania
        </h2>
        
        <ul className="space-y-6 mt-6 pl-0 list-none">
          <li className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/50">
            <strong className="text-zinc-100 block text-lg mb-2 text-yellow-500">1. Czy 500 zł miesięcznie to nie za mało, żeby opłacało się inwestować?</strong>
            <p className="m-0 text-zinc-300">
              Absolutnie nie. Przy zerowych prowizjach u nowoczesnych brokerów, każda, nawet najmniejsza kwota pracuje. Kluczem jest regularność, która pozwala uśredniać ceny zakupu (tzw. Dollar Cost Averaging) i budować potężny kapitał dzięki magii procentu składanego w długim terminie.
            </p>
          </li>
          <li className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/50">
            <strong className="text-zinc-100 block text-lg mb-2 text-yellow-500">2. Co jest lepsze na początek: akcje czy obligacje?</strong>
            <p className="m-0 text-zinc-300">
              To zależy od Twojego celu. Jeśli budujesz kapitał na 20-30 lat z myślą o wolności finansowej (FIRE), fundamentem powinny być akcje (najlepiej przez szerokie ETF-y), które historycznie pokonują inflację. Jeśli planujesz zakup mieszkania za 3-4 lata, giełda jest zbyt ryzykowna – bezpieczniejszym wyborem będą obligacje skarbowe.
            </p>
          </li>
          <li className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/50">
            <strong className="text-zinc-100 block text-lg mb-2 text-yellow-500">3. Czy muszę codziennie sprawdzać notowania giełdowe?</strong>
            <p className="m-0 text-zinc-300">
              Nie! Strategia pasywna (oparta o ETF-y) zakłada, że sprawdzasz swój portfel zaledwie raz na miesiąc lub kwartał, wyłącznie po to, by dokonać kolejnego zakupu. Częste zaglądanie na konto w telefonie sprzyja emocjonalnym, błędnym decyzjom. Inwestowanie powinno być nudne.
            </p>
          </li>
        </ul>

        <p className="text-xs text-zinc-600 italic mt-12 border-t border-zinc-900 pt-6 text-center">
          Treść ma charakter wyłącznie edukacyjny i nie stanowi porady inwestycyjnej w rozumieniu przepisów prawa. Inwestowanie wiąże się z ryzykiem utraty kapitału. Nie podejmuj decyzji finansowych na podstawie tekstów w internecie.
        </p>

      </article>
    </main>
  );
}