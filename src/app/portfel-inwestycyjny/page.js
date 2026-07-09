// src/app/portfel-inwestycyjny/page.js
import SeoLandingSection from "../components/SeoLandingSection";

export const metadata = {
  title: "Portfel inwestycyjny online – śledzenie wyników i alokacji | Finasfera",
  description:
    "Śledź wyniki swojego portfela inwestycyjnego: akcje, ETF-y, obligacje, waluty. Automatyczne wykresy i postęp realizacji celów.",
  alternates: { canonical: "https://finasfera.pl/portfel-inwestycyjny" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Portfel inwestycyjny online | Finasfera",
    description:
      "Śledź wyniki swojego portfela: akcje, ETF-y, obligacje. Automatyczne wykresy i alokacja.",
    url: "https://finasfera.pl/portfel-inwestycyjny",
    type: "website",
    images: [
      {
        url: "https://finasfera.pl/og-image.png",
        width: 1200,
        height: 630,
        alt: "Portfel inwestycyjny online — Finasfera",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfel inwestycyjny online | Finasfera",
    description:
      "Śledź wyniki portfela, alokację i postęp realizacji celów finansowych.",
    images: ["https://finasfera.pl/og-image.png"],
  },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold mb-4">Portfel inwestycyjny</h1>
      <p className="text-zinc-300 mb-6">
        Dodaj swoje aktywa, śledź wartość portfela i alokację w czasie rzeczywistym.
        Zobacz, jak blisko jesteś realizacji swoich celów finansowych.
      </p>

      <a href="/moj-portfel" className="inline-block rounded bg-emerald-600 px-4 py-2 text-white">
        Otwórz mój portfel
      </a>

      <SeoLandingSection
        title="Jak śledzić portfel inwestycyjny online?"
        description="Aplikacja do śledzenia portfela inwestycyjnego Finasfera to bezpłatne narzędzie, które agreguje wszystkie Twoje aktywa w jednym miejscu — akcje, ETF-y, obligacje, waluty i gotówkę. Zamiast ręcznie prowadzić arkusz kalkulacyjny, wszystko liczy się automatycznie."
        features={[
          {
            icon: "📊",
            title: "Wartość portfela w czasie rzeczywistym",
            body: "Aplikacja łączy się z danymi rynkowymi i na bieżąco aktualizuje wartość każdej pozycji. Widzisz aktualną wycenę portfela, dzienny zysk/stratę oraz całkowity wynik od początku inwestowania.",
          },
          {
            icon: "🥧",
            title: "Alokacja aktywów i dywersyfikacja",
            body: "Wykres kołowy pokazuje procentowy udział każdego aktywa, sektora i klasy aktywów. Łatwo sprawdzisz, czy Twój portfel jest odpowiednio zdywersyfikowany i czy nie masz zbyt dużej koncentracji w jednej spółce.",
          },
          {
            icon: "📈",
            title: "Stopa zwrotu TWR (Time-Weighted Return)",
            body: "W przeciwieństwie do prostego liczenia zysku, wskaźnik TWR eliminuje wpływ wpłat i wypłat na wynik. Dzięki temu możesz rzetelnie porównać swoje wyniki z benchmarkami (np. S&P 500 czy WIG20).",
          },
          {
            icon: "🎯",
            title: "Postęp realizacji celów FIRE",
            body: "Określ swój cel finansowy (np. FIRE number = 25x rocznych wydatków) i śledź postęp jego realizacji. Aplikacja wyświetla, ile brakuje Ci do wolności finansowej i szacuje datę osiągnięcia celu.",
          },
          {
            icon: "💰",
            title: "Dywidendy i historia transakcji",
            body: "Rejestruj wypłacone dywidendy, śledzisz miesięczny cashflow z portfela i dokładną historię wszystkich transakcji — zakupów, sprzedaży, wpłat gotówki i dywidend.",
          },
          {
            icon: "🔒",
            title: "Prywatność i bezpieczeństwo",
            body: "Twoje dane portfelowe są szyfrowane i nigdy nie trafiają do stron trzecich. Aplikacja wymaga logowania przez Google i jest dostępna tylko dla Ciebie — nie masz połączenia z rachunkiem maklerskim, więc nie ma ryzyka nieautoryzowanych transakcji.",
          },
        ]}
        faq={[
          {
            q: "Jak dodać akcje i ETF-y do portfela Finasfera?",
            a: "Po zalogowaniu wejdź w zakładkę 'Mój Portfel'. Kliknij przycisk dodawania transakcji, wyszukaj ticker (np. VUAA.DE lub CDPROJECT), wpisz liczbę kupionych akcji, cenę zakupu i datę transakcji. Aplikacja automatycznie pobierze aktualne notowania z giełdy.",
          },
          {
            q: "Czy aplikacja obsługuje polskie akcje z GPW?",
            a: "Tak. Aplikacja obsługuje akcje notowane na Giełdzie Papierów Wartościowych w Warszawie (GPW), wszystkie popularne ETF-y europejskie (Xetra, LSE, Euronext) oraz akcje z NYSE i NASDAQ. Wyceny są automatycznie przeliczane na PLN.",
          },
          {
            q: "Czym TWR różni się od prostego wyliczenia zysku?",
            a: "Prosty zysk liczy: (wartość końcowa - wpłacony kapitał) / wpłacony kapitał. Problem w tym, że jeśli wpłaciłeś dużą kwotę akurat przed spadkami lub po wzrostach, wynik jest zaburzony przez Twoje decyzje o timing, nie przez rynek. TWR (Time-Weighted Return) eliminuje ten efekt, pokazując 'czysty' wynik zarządzania portfelem, porównywalny z wynikami funduszy inwestycyjnych.",
          },
          {
            q: "Czy mogę śledzić kilka osobnych portfeli (np. IKE, IKZE, zwykłe)?",
            a: "Tak. Aplikacja obsługuje wiele portfeli w ramach jednego konta. Możesz śledzić oddzielnie portfel IKE, IKZE i zwykły rachunek maklerski, a widok zbiorczy pokaże sumaryczną wartość wszystkich portfeli.",
          },
        ]}
        cta={{ label: "Otwórz mój portfel →", href: "/moj-portfel" }}
      />
    </main>
  );
}
