export const faqData = {
  // ==========================================
  // 1. SYMULATOR CELU I STRONA GŁÓWNA
  // ==========================================
  "/": [
    {
      id: "fire-start",
      question: "Zaczynam od zera – co wpisać?",
      answer: `
        <p>Po prostu wpisz <b>0</b>! Każdy kiedyś zaczynał.</p>
        <p>Skup się na polu "Wpłaty miesięczne" – to Twoja najważniejsza broń na początku. Nawet 200 zł czy 500 zł co miesiąc robi ogromną różnicę, gdy działa magia procentu składanego.</p>
      `,
    },
    {
      id: "fire-rate",
      question: "Skąd wziąć stopę zwrotu (7% czy 10%)?",
      answer: `
        <p>Nominalnie (czyli przed odjęciem inflacji) amerykańska giełda historycznie rośnie o około 9-10% rocznie.</p>
        <ul>
          <li>Jeśli inwestujesz wszystko w globalne akcje, <b>8-9%</b> to bardzo sensowne, realistyczne założenie.</li>
          <li>Jeśli jesteś ostrożny i masz w portfelu obligacje lub lokaty, wpisz raczej <b>5-7%</b>.</li>
        </ul>
        <p>Lepiej założyć odrobinę mniej i się miło zaskoczyć za kilkanaście lat!</p>
      `,
    },
    {
      id: "fire-multiplier",
      question: "O co chodzi z mnożnikiem 25x?",
      answer: `
        <p>To fundament tzw. <b>Reguły 4%</b>. Naukowcy dawno temu policzyli, że jeśli uzbierasz kapitał równy 25-krotności Twoich rocznych wydatków, możesz z niego co roku wypłacać 4%, a pieniędzy z ogromnym prawdopodobieństwem nigdy Ci nie zabraknie.</p>
        <p>Jeśli wydajesz rocznie 60 000 zł, to po prostu mnożymy to razy 25 i bum – Twój cel do wolności to 1,5 miliona złotych.</p>
      `,
    },
    {
      id: "fire-indexation",
      question: "Czym jest ta indeksacja wpłat?",
      answer: `
        <p>To opcja dla ambitnych. Domyślnie (gdy zostawisz 0%), kalkulator zakłada, że co roku Twoje wpłaty będą rosły tylko o wskaźnik inflacji (czyli realnie odkładasz cały czas tyle samo).</p>
        <p>Jeśli wpiszesz tu np. <b>3%</b>, mówisz maszynie: "Hej, co roku na pewno dostanę podwyżkę i postaram się odłożyć o 3% <i>więcej</i> niż rok temu". To ustawienie potrafi potężnie przyspieszyć Twoją drogę do celu.</p>
      `,
    },
    {
      id: "fire-inflation-result",
      question: "Czy ten wynik uwzględnia inflację?",
      answer: `
        <p>Tak! I to nasza największa duma. Pobieramy prognozy wprost z NBP i od razu odcinamy inflację od Twoich zysków.</p>
        <p>Dzięki temu kwota, którą widzisz na końcu wykresu, to pieniądze o <b>dzisiejszej</b> sile nabywczej. Nie musisz się martwić, że za te wirtualne miliony w 2050 roku kupisz ledwie bochenek chleba.</p>
      `,
    },
    {
      id: "fire-tax",
      question: "A co z podatkiem Belki?",
      answer: `
        <p>Tutaj zakładamy nieco optymistycznie, że opakowujesz swoje inwestycje w konta emerytalne (IKE lub IKZE), dzięki czemu legalnie nie płacisz 19% podatku Belki.</p>
        <p>Jeśli jednak inwestujesz na zwykłym koncie maklerskim, urealnij swój wynik: obniż swoją oczekiwaną stopę zwrotu o około 1 do 1.5 punktu procentowego.</p>
      `
    }
  ],

  "/symulator-celu": [
    { id: "fire-start", question: "Zaczynam od zera – co wpisać?", answer: "<p>Wpisz 0. Skup się na regularnych wpłatach miesięcznych!</p>" },
    { id: "fire-rate", question: "Jaką stopę zwrotu założyć?", answer: "<p>Dla portfela akcyjnego 8-9%, dla mieszanego 5-7% nominalnie.</p>" },
    { id: "fire-multiplier", question: "O co chodzi z mnożnikiem 25x?", answer: "<p>To Reguła 4%. 25-krotność rocznych kosztów życia to zazwyczaj kwota dająca pełną wolność finansową.</p>" },
    { id: "fire-inflation-result", question: "Co z inflacją?", answer: "<p>Wszystkie wyniki widzisz w dzisiejszych złotówkach. Kalkulator odcina inflację (dane NBP) od Twojego wyniku.</p>" }
  ],

  // ==========================================
  // 2. ETAPY WOLNOŚCI
  // ==========================================
  "/fire-path": [
    {
      id: "stages-diff",
      question: "Czym różnią się te trzy zakładki?",
      answer: `
        <p>To taka mapa drogowa życia finansowego:</p>
        <ul>
          <li><b>Podstawy:</b> Jesteś tutaj, by uciec z długów konsumenckich i zbudować małą poduszkę awaryjną (np. na naprawę pralki).</li>
          <li><b>Stabilizacja:</b> Budujesz prawdziwą Poduszkę Finansową, czyli masz z czego żyć przez rok bez pracy.</li>
          <li><b>Inwestowanie:</b> Masz już spokój ducha, więc nadwyżki kapitału wędrują na giełdę, by zarabiały same na siebie (zmierzasz do FIRE).</li>
        </ul>
      `,
    },
    {
      id: "stages-minifire",
      question: "Co to jest Mini-FIRE?",
      answer: `
        <p>Mini-FIRE (w USA często nazywane Barista FIRE) to genialny moment luzu. Twój kapitał uciekł już tak do przodu, że sam opłaca Twoje najbardziej podstawowe rachunki (np. jedzenie i czynsz).</p>
        <p>Nie musisz już zaharowywać się w korporacji na pełen etat. Możesz pracować na pół etatu na luzie, albo założyć niepewny, ale pasjonujący biznes, bo wiesz, że pod most nie trafisz.</p>
      `,
    },
    {
      id: "stages-checklists",
      question: "Jak odhaczać zadania z checklisty?",
      answer: `
        <p>Klikaj je śmiało! Traktuj to jak swoją osobistą tablicę motywacyjną.</p>
        <p>Kiedy załatwisz coś w "realu" (np. zamkniesz drogą kartę kredytową albo wreszcie otworzysz IKE), wchodzisz tu, klikasz ptaszka i z uśmiechem na ustach idziesz dalej.</p>
      `,
    },
    {
      id: "stages-sync",
      question: "Skąd aplikacja wie, jaki mam postęp?",
      answer: `
        <p>Widzisz napis "Zsynchronizowano z chmurą"? To oznacza, że aplikacja jest mądra. Zaciąga kwoty i postępy prosto z Twojego "Portfela Inwestycyjnego".</p>
        <p>Nie musisz wklepywać tych samych liczb w pięciu różnych miejscach. Dodasz akcje w portfelu – pasek etapu w FIRE sam podskoczy.</p>
      `,
    }
  ],

  // ==========================================
  // 3. ŚLEDZENIE AKCJI (Portfel)
  // ==========================================
  "/moj-portfel": [
    {
      id: "port-add",
      question: "Jak dodać spółkę lub ETF do portfela?",
      answer: `
        <p>Kliknij w przycisk dodawania aktywa. Musisz znać <b>Ticker</b> (to taki krótki symbol, pod którym spółka występuje na giełdzie, np. AAPL dla Apple, albo CDR dla CD Projekt).</p>
        <p>Wpisujesz ticker, datę, cenę zakupu i ilość sztuk. O pobranie aktualnej ceny z giełdy martwimy się my.</p>
        <p><b>💡 Kluczowa sprawa – Pamiętnik Inwestora:</b> Zawsze przy zakupie dodaj krótką notatkę, *dlaczego* kupujesz daną akcję. W przyszłości nasz Skaner AI odczyta ten pamiętnik i sprawdzi, czy Twoje pierwotne założenia wciąż mają sens!</p>
      `,
    },
    {
      id: "port-multiple",
      question: "Mogę mieć osobno IKE i zwykłe konto?",
      answer: `
        <p>Jasne! Nikt nie trzyma wszystkiego w jednym worku. W aplikacji możesz stworzyć całkowicie osobne portfele – jeden nazwiesz "Konto IKE", drugi "Zwykły Makler", trzeci "Ryzykowne krypto".</p>
        <p>Każdy portfel będzie miał swoje własne statystyki, ale na głównym ekranie zsumujemy je dla Ciebie w jeden wielki wynik.</p>
      `,
    },
    {
      id: "port-csv",
      question: "Jak zaimportować historię z pliku CSV?",
      answer: `
        <p>Jeśli masz już kilkadziesiąt transakcji, wklepywanie tego ręcznie to koszmar. Możesz użyć wbudowanego importera.</p>
        <p>Wyciągnij plik z historią od swojego brokera (np. XTB, mBank). Plik zazwyczaj zawiera datę, ticker, typ (kup/sprzedaj), cenę i ilość. Jeśli kolumny u brokera nazywają się trochę inaczej, nasz system pozwoli Ci je odpowiednio sparować przed wgraniem.</p>
      `,
    },
    {
      id: "port-avg-price",
      question: "Co to jest Śr. cena zakupu?",
      answer: `
        <p>Jeśli kupiłeś 10 akcji po 100 zł, a miesiąc później kolejne 10 akcji, ale już po 200 zł, to w sumie masz 20 akcji, a Twoja średnia cena to 150 zł.</p>
        <p>To po prostu cena, która mówi: "Zarobisz na tych akcjach, jeśli ich obecny rynkowy kurs wzbije się powyżej mojej średniej ceny zakupu".</p>
      `,
    },
    {
      id: "port-chart-jump",
      question: "Dlaczego wykres nagle skacze w górę/dół?",
      answer: `
        <p>Zwykle wini się rynek, ale gwałtowny "schodek" w górę na wykresie kapitału oznacza najczęściej, że po prostu przelałeś tego dnia nową gotówkę z wypłaty i kupiłeś akcje.</p>
        <p>Gwałtowny skok w dół to wypłata środków z konta inwestycyjnego z powrotem na rachunek bieżący.</p>
      `,
    }
  ],

  // ==========================================
  // 4. STATYSTYKI
  // ==========================================
  "/statystyki": [
    {
      id: "stat-cagr",
      question: "Co to jest ten CAGR?",
      answer: `
        <p><b>Skumulowany Roczny Wskaźnik Wzrostu.</b> Brzmi strasznie naukowo, ale to najważniejsza liczba dla inwestora.</p>
        <p>Odpowiada na proste pytanie: <i>"Gdybym te wszystkie moje giełdowe pieniądze zaniósł do banku na zwykłą lokatę, to jakie dokładnie oprocentowanie musiałaby mieć ta lokata, żeby wygenerować mi dzisiejszy wynik?"</i> Im wyższy CAGR, tym lepiej idzie Twoim inwestycjom.</p>
      `,
    },
    {
      id: "stat-twr",
      question: "Zwykły Zysk (%) kontra Zysk TWR?",
      answer: `
        <p>Zwykły procentowy zysk łatwo zepsuć. Jeśli masz 1000 zł, które rośnie genialnie o 50%, a na drugi dzień wpłacisz 100 000 zł, Twój średni zysk nagle spadnie niemal do zera.</p>
        <p><b>TWR (Time-Weighted Return)</b> to magiczny wskaźnik używany przez profesjonalistów. Odrzuca on wpływ Twoich wpłat i wypłat gotówki. Mówi brutalną prawdę o tym, jak dobre są Twoje wybory spółek – niezależnie od grubości portfela.</p>
      `,
    },
    {
      id: "stat-maxdd",
      question: "Co to jest Max Drawdown?",
      answer: `
        <p>Mierzy to Twoje nerwy ze stali. Pokazuje, ile najwięcej stracił Twój portfel od swojego historycznego szczytu do najgłębszego dołka w badanym okresie.</p>
        <p>Jeśli widzisz tam -25%, oznacza to, że w pewnym momencie wyparowała jedna czwarta Twojego wirtualnego majątku. To normalne! Na giełdzie nie da się rosnąć po linii prostej.</p>
      `,
    },
    {
      id: "stat-sharpe",
      question: "Wskaźnik Sharpe'a: dobra czy zła liczba?",
      answer: `
        <p>Mówi o tym, czy Twoje ryzyko na giełdzie w ogóle Ci się opłaca.</p>
        <ul>
          <li><b>Powyżej 1.0:</b> Rewelacja! Dużo zarabiasz, mało buja portfelem.</li>
          <li><b>Pomiędzy 0.0 a 1.0:</b> Zarabiasz, ale musisz znosić stres związany z wahaniami cen.</li>
          <li><b>Poniżej 0 (ujemny!):</b> Fatalnie. To znaczy, że Twój misternie tkany portfel zarabia obecnie <i>mniej</i> niż dałyby totalnie bezpieczne obligacje rządowe.</li>
        </ul>
      `,
    },
    {
      id: "stat-benchmark",
      question: "Po co te Benchmarki?",
      answer: `
        <p>Benchmark to "lustro". Zawsze powinieneś porównywać swój portfel z darmowym i prostym rynkiem. Dlaczego?</p>
        <p>Jeśli spędzasz przed wykresem 10 godzin w tygodniu i zarabiasz 10% rocznie, a nic nie robiący leniuszek, który kupił sobie jeden ETF na amerykańskie firmy (S&P 500) zarabia 15%... to chyba czas przestać uważać się za Wilka z Wall Street, prawda?</p>
      `,
    },
    {
      id: "stat-empty",
      question: "Moje statystyki są puste – dlaczego?",
      answer: `
        <p>Wskaźniki giełdowe nienawidzą braku danych. Aby matematyka zadziałała (zwłaszcza TWR czy Odchylenie Standardowe), musimy mieć historię Twojego portfela dłuższą niż kilka dni i musisz rzetelnie wpisać daty swoich transakcji.</p>
        <p>Jeśli dodasz całą historię portfela z datą "wczoraj", statystyki wariancji po prostu nie będą miały z czego się policzyć.</p>
      `,
    }
  ],

  // ==========================================
  // 5. SKANER AI (Żuberek)
  // ==========================================
  "/skaner-ai": [
    {
      id: "scan-age",
      question: "Po co pytacie o mój wiek na start?",
      answer: `
        <p>Twój horyzont czasowy to najważniejsza dana dla analityka. Jeśli masz 25 lat, sztuczna inteligencja klepnie Cię po plecach za posiadanie w 100% agresywnego portfela, bo przed emeryturą masz czas, by odrobić na luzie 3 globalne kryzysy.</p>
        <p>Ale jeśli masz 60 lat, ten sam portfel dostanie od AI potężne ostrzeżenie – wtedy chronienie kapitału (np. obligacjami) staje się ważniejsze niż maksymalny zysk.</p>
      `,
    },
    {
      id: "scan-risk",
      question: "Tolerancja ryzyka – nie wiem, co kliknąć.",
      answer: `
        <p>Bądź ze sobą do bólu szczery. Pamiętasz pandemię w 2020 roku, gdy giełdy na świecie tąpnęły o ponad 30%?</p>
        <p>Jeśli wtedy przerażony sprzedałeś wszystkie akcje, ratując co się da – masz niską tolerancję. Jeśli uznałeś to za wspaniałą promocję i zacząłeś dokupować ile wlezie – jesteś agresywnym graczem. Wybierz odpowiednio!</p>
      `,
    },
    {
      id: "scan-score",
      question: "Co oznacza wynik 56/100 na raporcie?",
      answer: `
        <p>To nie jest ocena Twojej genialności, ani tego ile zarobisz. Żuberek punktuje wyłącznie Twoje **bezpieczeństwo i dywersyfikację**.</p>
        <p>Wynik 100 oznacza, że masz idealnie rozproszony kapitał, jesteś zabezpieczony przed bankructwem jednego sektora i masz bezpieczną poduszkę. Wynik poniżej 60 to czerwona flaga – prawdopodobnie wsadziłeś połowę oszczędności w jedną, ulubioną firmę albo zapomniałeś o gotówce.</p>
      `,
    },
    {
      id: "scan-diary",
      question: "Czym jest ten Audyt Pamiętnika Inwestora?",
      answer: `
        <p>To wspaniałe narzędzie treningowe. Pamiętnik Inwestora to miejsce, w którym piszesz krótką notatkę, *dlaczego* kupiłeś akcje danej firmy (np. "wierzę, że ten nowy lek wypali w przyszłym roku").</p>
        <p>AI po upływie tego czasu przeczyta Twoje obietnice i sprawdzi obecne dane rynkowe. Jeśli firma leku nie wypuściła, a jej akcje spadają, Żuberek delikatnie zapyta: "Hej, argumenty zniknęły, a Ty nadal to trzymasz?".</p>
      `,
    },
    {
      id: "scan-advice",
      question: "Czy AI radzi mi, co kupić?",
      answer: `
        <p><b>Zdecydowanie NIE.</b> Żuberek jest asystentem analitycznym, a nie doradcą finansowym. </p>
        <p>Jego zadaniem jest wyłapać Twoje luki w logice, błędy poznawcze (np. zbytni optymizm wobec polskiej branży IT) czy groźną koncentrację w portfelu. Podsuwa Ci twarde liczby, ale przyciski "kup" i "sprzedaj" na swoim koncie maklerskim zawsze naciskasz Ty sam na własne ryzyko.</p>
      `,
    },
    {
      id: "scan-source",
      question: "Skąd AI wie, jakie spółki trzymam?",
      answer: `
        <p>Skaner łączy się w locie z Twoją zakładką "Śledzenie Akcji". Pobiera listę Twoich aktywów, ich wagi procentowe i zyski. Żadne z tych danych nie trafiają tam ręcznie – wszystko idzie z jednego, wgranego przez Ciebie portfela głównego.</p>
      `,
    }
  ],

  // ==========================================
  // 6. FORUM I EDUKACJA
  // ==========================================
  "/forum": [
    {
      id: "forum-tabs",
      question: "Aktywne vs Najnowsze vs Najciekawsze?",
      answer: `
        <p>W <b>Najnowszych</b> sortujemy wątki chronologicznie – od tych dopiero co założonych przez użytkowników.</p>
        <p>W <b>Aktywnych</b> wątek wyskakuje na samą górę, nawet jeśli powstał rok temu, ale ktoś dosłownie minutę temu na niego odpisał.</p>
        <p>Z kolei <b>Najciekawsze</b> to śmietanka – posty z największą liczbą polubień i merytorycznej dyskusji od społeczności.</p>
      `,
    },
    {
      id: "forum-badge",
      question: "O co chodzi z odznaką Nowicjusz przy moim imieniu?",
      answer: `
        <p>To nasz system reputacji, tzw. grywalizacja! Założenie fajnego tematu, pomocne odpowiedzi czy zdobywanie serduszek dodają Ci punktów doświadczenia.</p>
        <p>Z czasem Twój pasek postępu dobije do pełna, a Ty zmienisz rangę na "Inwestora", by w końcu dumnie błyszczeć na pomarańczowo jako "Weteran FIRE".</p>
      `,
    },
    {
      id: "forum-privacy",
      question: "Czy moje pytania nie są tu widoczne z nazwiska?",
      answer: `
        <p>Finanse lubią ciszę. W społeczności Finasfery występujesz pod pseudonimem (tzw. nickiem), który sam konfigurujesz po rejestracji w panelu użytkownika.</p>
        <p>Zachęcamy do otwartych dyskusji, ale nigdy nie podawaj numerów kont, haseł do brokerów ani nie wstawiaj screenów z danymi wrażliwymi!</p>
      `,
    }
  ],
  
  "/blog": [
    {
      id: "edu-start",
      question: "Od którego artykułu powinienem zacząć?",
      answer: `
        <p>Zdecydowanie od wpisu pt. <b>"Jak zacząć inwestować w Polsce od 500 zł"</b>.</p>
        <p>To nasz sztandarowy poradnik. Rozprawia się z mitami, pokazuje magię procentu składanego, tłumaczy czym są ETFy (i dlaczego to one są Twoim przyjacielem) oraz gdzie otworzyć najtańsze konto u polskiego brokera.</p>
      `,
    },
    {
      id: "edu-categories",
      question: "Czy macie jakieś kategorie tekstów?",
      answer: `
        <p>Tak! Jeśli widzisz nad tytułem żółty napis "Przewodnik" albo "Analiza", to jest to klikalny tag. Śmiało w niego kliknij, a my zaserwujemy Ci listę wyłącznie z artykułami z tego konkretnego "koszyka".</p>
      `,
    }
  ]
};