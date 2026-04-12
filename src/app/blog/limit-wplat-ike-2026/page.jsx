import Link from "next/link";
import IkeJar from "../../components/IkeJar";
import IkeChart from "../../components/IkeChart";

export const metadata = {
  title: "Limit wpłat na IKE w 2026 roku – Przewodnik | Finasfera",
  description: "Limit wpłat na IKE w 2026 roku to ponad 28 tys. zł. Dowiedz się, dlaczego to sufit a nie podłoga, i jak zaoszczędzić ponad 260 tysięcy złotych na podatku Belki.",
  keywords: ["limit IKE 2026", "IKE czy IKZE", "podatek belki", "w co inwestować na IKE", "IKE obligacje", "Konto emerytalne"],
};

export default function ArticlePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/blog" className="inline-flex items-center text-sm text-zinc-400 hover:text-yellow-400 mb-8 transition-colors">
        ← Wróć do listy artykułów
      </Link>

      <header className="mb-12">
        <div className="flex items-center text-zinc-500 text-sm gap-4 mb-4">
          <span className="text-yellow-500 font-medium bg-yellow-500/10 px-2 py-1 rounded">IKE / IKZE</span>
          <span>14 Kwietnia 2026</span>
          <span>•</span>
          <span>7 min czytania</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-zinc-100 mb-6 leading-tight">
          Limit wpłat na IKE w 2026 roku – co oznaczają liczby dla młodego inwestora?
        </h1>
        <p className="text-xl text-zinc-400 leading-relaxed">
          Ustawa mówi jasno: każdego roku możesz wpłacić na IKE maksymalnie trzykrotność prognozowanego przeciętnego wynagrodzenia w gospodarce. Gospodarka rośnie, pensje rosną, więc rośnie też limit. W 2026 roku limit wpłat na IKE wyniesie szacunkowo <strong>28 260 zł</strong> (dokładną kwotę Ministerstwo oficjalnie potwierdza zawsze pod koniec poprzedzającego roku). To potężna kwota, dająca ogromne możliwości.
        </p>
      </header>

      <article className="prose prose-invert prose-zinc max-w-none text-zinc-300 leading-relaxed space-y-8">
        <p>
          Wielu młodych inwestorów czyta tę liczbę i od razu się zniechęca: „Przecież nie mam 28 tysięcy złotych, więc IKE nie jest dla mnie”. To gigantyczne nieporozumienie! Ten limit to sufit, a nie podłoga. Możesz założyć konto i wpłacać na nie 500 zł miesięcznie (co daje 6000 zł rocznie).
        </p>
        <p>
          Co więcej, wpłaty są całkowicie dobrowolne. W jednym miesiącu możesz wpłacić 1000 zł, w kolejnych trzech nic, a pod koniec roku dorzucić premię świąteczną. Jeśli nie wykorzystasz całego limitu 28 260 zł w 2026 roku, ta niewykorzystana pula po prostu przepada (nie przechodzi na kolejny rok), ale nic nie tracisz ze zgromadzonego już kapitału.
        </p>

        {/* --- GRAFIKA 1: Słoik --- */}
        <IkeJar />

        <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mt-12">
          Matematyka jest bezlitosna: IKE kontra zwykłe konto maklerskie
        </h2>
        <p>
          Żeby zrozumieć, o jakiej stawce mówimy, zróbmy symulację. Załóżmy, że masz 25 lat i decydujesz się inwestować 1000 zł miesięcznie (12 000 zł rocznie) przez najbliższe 35 lat. Przyjmujemy konserwatywną, historyczną stopę zwrotu z szerokiego rynku akcji na poziomie 7% rocznie.
        </p>
        
        <ul className="space-y-3 mt-4 text-zinc-300">
          <li><strong className="text-zinc-100">Zainwestowany kapitał:</strong> Wpłacasz łącznie 420 000 zł.</li>
          <li><strong className="text-zinc-100">Wartość portfela po 35 latach:</strong> Magia procentu składanego sprawia, że na Twoim koncie widnieje ok. 1 800 000 zł.</li>
          <li><strong className="text-zinc-100">Czysty zysk:</strong> Zarobiłeś z rynku 1 380 000 zł.</li>
        </ul>

        <p>
          A teraz najważniejsze. Jeśli inwestowałeś na zwykłym koncie maklerskim, Urząd Skarbowy odbierze Ci 19% od tego zysku. To oznacza, że oddajesz państwu <strong>ponad 262 000 zł!</strong> Za te pieniądze mógłbyś kupić porządną kawalerkę na wynajem lub luksusowe auto. Inwestując dokładnie te same kwoty, w te same instrumenty, ale w ramach „opakowania” IKE, całe 262 tysiące złotych zostaje w Twojej kieszeni.
        </p>

        {/* --- GRAFIKA 2: Wykres IKE vs Zwykłe --- */}
        <IkeChart />

        <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mt-12">
          Co „włożyć” do IKE? Trzy drogi dla początkujących
        </h2>
        <p>
          Kiedy już otworzysz IKE w odpowiedniej instytucji (zazwyczaj w domu maklerskim oferującym niskie prowizje), stajesz przed wyborem: co kupić? Inwestorzy w tej sytuacji często rozważają trzy popularne i sprawdzone historycznie ścieżki.
        </p>

        <ul className="space-y-6 mt-6">
          <li className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/50">
            <strong className="text-zinc-100 block mb-2 text-lg">1. Fundusze ETF na szeroki rynek (Fundament portfela)</strong>
            Dla większości osób pracujących na etat, które nie chcą spędzać godzin przed wykresami, najlepszym rozwiązaniem są globalne fundusze ETF (np. śledzące indeks MSCI World lub S&P 500). Kupując jednostkę takiego funduszu, automatycznie inwestujesz w kilkaset największych firm z całego świata. Dywidendy wypłacane przez te firmy w ramach IKE nie podlegają podatkowi Belki, co drastycznie przyspiesza efekt kuli śnieżnej.
          </li>
          <li className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/50">
            <strong className="text-zinc-100 block mb-2 text-lg">2. Polskie obligacje skarbowe (Bezpieczna przystań)</strong>
            Jeśli bardzo boisz się rynkowego ryzyka i spadków, świetnym wyborem jest IKE-Obligacje. Pozwala ono kupować np. dziesięcioletnie obligacje emerytalne (EDO) indeksowane inflacją. Jeśli chcesz sprawdzić, jak zoptymalizować terminy zapadalności takich papierów i zapewnić sobie płynność, przetestuj nasz Kreator Drabiny Obligacyjnej.
          </li>
          <li className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/50">
            <strong className="text-zinc-100 block mb-2 text-lg">3. Selekcja spółek dywidendowych (Dla zaawansowanych)</strong>
            Jeśli lubisz analizować rynek, możesz zbudować portfel polskich lub zagranicznych spółek wypłacających regularne dywidendy. Brak podatku sprawia, że co roku otrzymujesz 100% zysku do ponownego zainwestowania. Zanim jednak zaryzykujesz, przepuść wybrane firmy przez nasz <strong>Skaner AI (Żuberek)</strong>, by sprawdzić ich historyczną stabilność wypłat i ocenić matematyczne wskaźniki ryzyka.
          </li>
        </ul>

        {/* --- CTA Z REKLAMĄ SKANERA --- */}
        <div className="my-12 p-8 md:p-10 border border-zinc-800 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600"></div>
          <h3 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-4 mt-4">Nie kupuj w ciemno! Zbadaj ryzyko.</h3>
          <p className="text-zinc-400 mb-8 max-w-xl text-lg">
            Samo IKE to tylko narzędzie. Jeśli chcesz inwestować w konkretne spółki dywidendowe, musisz znać ich fundamenty. Użyj naszego skanera wspieranego przez Sztuczną Inteligencję, aby zminimalizować ryzyko.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/skaner-ai" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(250,204,21,0.2)]">
              Przetestuj Skaner AI
            </Link>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mt-12">
          Mity i pułapki, przez które tracisz pieniądze
        </h2>
        <p>
          Z kontem IKE wiąże się wiele krzywdzących mitów. To przez nie młodzi ludzie często odrzucają to narzędzie, skazując się na gorszą przyszłość finansową. Rozprawmy się z dwoma najczęstszymi.
        </p>

        <ul className="space-y-4 mt-4 list-none pl-0">
          <li className="border-l-4 border-red-500 pl-4 py-2">
            <strong className="text-zinc-100 block text-lg mb-1">Mit 1: "Zamrażam swoje pieniądze do 60. roku życia!"</strong>
            To absolutna bzdura i najczęstszy powód rezygnacji z IKE. Pieniądze na IKE są Twoją własnością i masz do nich dostęp w każdej chwili. Jeśli będziesz miał nagły wypadek za 5 lat, możesz wypłacić środki (to tzw. zwrot z IKE). Co się wtedy dzieje? Po prostu płacisz 19% podatku od zysków – czyli dokładnie tyle, ile zapłaciłbyś, inwestując od początku na zwykłym koncie. Masz darmową opcję: utrzymasz do emerytury to masz zysk bez podatku, wypłacisz wcześniej – nic nie tracisz względem standardowego rachunku.
          </li>
          <li className="border-l-4 border-red-500 pl-4 py-2 mt-6">
            <strong className="text-zinc-100 block text-lg mb-1">Mit 2: "Państwo na pewno mi to zabierze, jak kiedyś OFE"</strong>
            Trzeba głośno rozgraniczyć dwie rzeczy. OFE było częścią powszechnego systemu emerytalnego (czyli pieniędzmi publicznymi). IKE to Twój całkowicie prywatny rachunek, działający dokładnie tak samo jak Twoje konto w banku. Środki zgromadzone na IKE podlegają w 100% dziedziczeniu. W razie Twojej śmierci, pieniądze trafiają do wskazanych przez Ciebie osób bez konieczności płacenia podatku od spadków i darowizn.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mt-12">
          IKE czy IKZE? Krótkie rozstrzygnięcie dylematu
        </h2>
        <p>
          Zakładając konto, na pewno spotkasz się też z IKZE (Indywidualnym Kontem Zabezpieczenia Emerytalnego). Choć brzmią podobnie, mechanizm jest inny. Wpłaty na IKZE odliczasz od bieżącego dochodu (co daje Ci zwrot podatku PIT na wiosnę), ale przy wypłacie na starość płacisz zryczałtowany podatek 10%. W 2026 roku limit IKZE wynosi szacunkowo 11 304 zł dla osób na etacie i 16 956 zł dla przedsiębiorców.
        </p>
        <p>
          <strong>Co wybrać?</strong> Jeśli wpadasz w drugi próg podatkowy (32%) lub prowadzisz działalność gospodarczą, IKZE da Ci fenomenalne, natychmiastowe oszczędności. Jeśli jednak jesteś na początku drogi, zarabiasz poniżej 120 tysięcy złotych rocznie (próg 12%) lub zależy Ci na elastyczności i możliwości wyciągnięcia środków bez rygorystycznych potrąceń – IKE to bezapelacyjnie lepszy wybór na start.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 my-10 shadow-lg">
          <h3 className="text-xl font-bold text-zinc-100 mt-0 mb-6 flex items-center gap-3">
            Twoja checklista na 2026 rok: Od czego zacząć?
          </h3>
          <p className="text-zinc-400 mb-6 mt-0">Wiedza bez wdrożenia jest bezużyteczna. Aby przestać martwić się o przyszłość i zacząć działać, wykonaj te cztery proste kroki:</p>
          
          <ul className="space-y-4 list-none pl-0 m-0">
            <li className="flex items-start gap-3">
              <span className="text-yellow-400 font-bold mt-0.5 whitespace-nowrap shrink-0">1.</span>
              <span className="text-zinc-300"><strong className="text-zinc-100">Zbuduj poduszkę finansową:</strong> Miej odłożone koszty życia na 3-6 miesięcy na bezpiecznym koncie, zanim zaczniesz inwestować długoterminowo.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-yellow-400 font-bold mt-0.5 whitespace-nowrap shrink-0">2.</span>
              <span className="text-zinc-300"><strong className="text-zinc-100">Otwórz rachunek IKE w domu maklerskim:</strong> Unikaj kont w formie drogich funduszy inwestycyjnych (TFI) z wysokimi opłatami za zarządzanie. Szukaj prowizji na poziomie 0,2-0,3% za transakcję.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-yellow-400 font-bold mt-0.5 whitespace-nowrap shrink-0">3.</span>
              <span className="text-zinc-300"><strong className="text-zinc-100">Ustaw zlecenie stałe:</strong> Potraktuj przyszłego "siebie" jak rachunek, który musisz opłacić zaraz po wypłacie. Nawet 500 zł miesięcznie robi gigantyczną różnicę.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-yellow-400 font-bold mt-0.5 whitespace-nowrap shrink-0">4.</span>
              <span className="text-zinc-300"><strong className="text-zinc-100">Przelicz swój plan:</strong> Skorzystaj z twardych danych i symulacji. Zobacz, kiedy będziesz mógł powiedzieć "dość" i przestać pracować, używając naszego Kalkulatora FIRE.</span>
            </li>
          </ul>
          <p className="text-yellow-500 italic mt-6 mb-0 text-sm font-medium">Działaj z głową, ignoruj rynkowy szum i daj czasowi zrobić swoje. Twoje dzisiejsze oszczędności to kupowanie sobie wolności na przyszłość.</p>
        </div>

        <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2 mt-12">
          FAQ – Najczęściej zadawane pytania
        </h2>
        
        <ul className="space-y-6 mt-6 pl-0 list-none">
          <li className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/50">
            <strong className="text-zinc-100 block text-lg mb-2 text-yellow-500">1. Czy można mieć jednocześnie IKE i IKZE?</strong>
            <p className="m-0 text-zinc-300">
              Tak, przepisy pozwalają na posiadanie obu kont równocześnie. To doskonała strategia dla osób, które dysponują większym kapitałem (np. powyżej 39 tysięcy złotych rocznie w 2026 r.) i chcą maksymalnie zoptymalizować swoje podatki inwestycyjne.
            </p>
          </li>
          <li className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/50">
            <strong className="text-zinc-100 block text-lg mb-2 text-yellow-500">2. Czy w ramach IKE mogę inwestować na giełdach zagranicznych?</strong>
            <p className="m-0 text-zinc-300">
              Oczywiście. Większość dobrych domów maklerskich w Polsce, prowadzących rachunki IKE, pozwala na zakup instrumentów notowanych na rynkach zagranicznych, w tym popularnych ETF-ów z giełd we Frankfurcie, Londynie czy Paryżu.
            </p>
          </li>
          <li className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/50">
            <strong className="text-zinc-100 block text-lg mb-2 text-yellow-500">3. Czy ponoszę jakieś koszty prowadzenia konta IKE?</strong>
            <p className="m-0 text-zinc-300">
              Z reguły samo założenie i prowadzenie rachunku IKE w formie konta maklerskiego jest bezpłatne. Płacisz jedynie niewielkie prowizje maklerskie od zrealizowanych transakcji kupna/sprzedaży (najczęściej ułamek procenta od kwoty zlecenia). Należy unikać IKE oferowanych przez niektóre banki z ukrytymi, stałymi opłatami za zarządzanie.
            </p>
          </li>
        </ul>

        <p className="text-xs text-zinc-600 italic mt-12 border-t border-zinc-900 pt-6 text-center">
          Treść ma charakter wyłącznie edukacyjny i nie stanowi porady inwestycyjnej w rozumieniu przepisów prawa. Inwestowanie wiąże się z ryzykiem utraty kapitału.
        </p>

      </article>
    </main>
  );
}