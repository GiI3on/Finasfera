// src/app/kalkulator-inwestycyjny/page.js
import SeoLandingSection from "../components/SeoLandingSection";

export const metadata = {
  title: "Kalkulator inwestycyjny – procent składany i inflacja | Finasfera",
  description:
    "Oblicz zysk z inwestycji z uwzględnieniem procentu składanego, wpłat cyklicznych i inflacji. Darmowy kalkulator inwestycyjny Finasfera.",
  alternates: { canonical: "https://finasfera.pl/kalkulator-inwestycyjny" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Kalkulator inwestycyjny – Finasfera",
    description:
      "Policz wzrost kapitału i procent składany. Uwzględnij inflację i wpłaty cykliczne.",
    url: "https://finasfera.pl/kalkulator-inwestycyjny",
  },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold mb-4">Kalkulator inwestycyjny</h1>
      <p className="text-zinc-300 mb-6">
        Sprawdź, jak rośnie Twój kapitał w czasie. Nasz kalkulator inwestycyjny
        Finasfera pokazuje realne tempo wzrostu z uwzględnieniem inflacji i
        wpłat cyklicznych.
      </p>

      <a href="/fire-path" className="inline-block rounded bg-emerald-600 px-4 py-2 text-white">
        Otwórz kalkulator
      </a>

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Jak korzystać z kalkulatora</h2>
        <ul className="list-disc pl-6 text-zinc-300">
          <li>Wpisz kapitał początkowy i miesięczne wpłaty.</li>
          <li>Ustaw stopę zwrotu oraz inflację.</li>
          <li>Odczytaj prognozowany wzrost inwestycji w czasie.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Najczęstsze pytania</h2>
        <details className="mb-2"><summary>Jak działa procent składany?</summary>
          <p className="text-zinc-300">Odsetki są dopisywane do kapitału, dzięki czemu każda kolejna stopa zwrotu działa na większą kwotę.</p>
        </details>
        <details className="mb-2"><summary>Czy kalkulator uwzględnia inflację?</summary>
          <p className="text-zinc-300">Tak, możesz dodać roczną stopę inflacji i porównać wartość realną kapitału.</p>
        </details>
      </section>

      <SeoLandingSection
        title="Jak działa kalkulator inwestycyjny Finasfera?"
        description="Nasz darmowy kalkulator inwestycyjny pozwala obliczyć przyszłą wartość kapitału z uwzględnieniem procentu składanego, regularnych wpłat i inflacji. To profesjonalne narzędzie dostępne bezpłatnie — bez rejestracji."
        features={[
          {
            icon: "📈",
            title: "Procent składany",
            body: "Mechanizm procentu składanego sprawia, że zyski generują kolejne zyski. Już 500 zł miesięcznie przez 30 lat, przy stopie zwrotu 7%, daje ponad 600 000 zł — trzykrotnie więcej niż sama suma wpłat.",
          },
          {
            icon: "🔄",
            title: "Wpłaty cykliczne (DCA)",
            body: "Strategia Dollar Cost Averaging (DCA) polega na regularnym inwestowaniu stałej kwoty. Kupujesz więcej jednostek podczas spadków i mniej podczas wzrostów, uśredniając cenę nabycia w czasie.",
          },
          {
            icon: "📉",
            title: "Inflacja i realna stopa zwrotu",
            body: "Kalkulator przelicza nominalną stopę zwrotu na wartość realną — czyli Twoją faktyczną siłę nabywczą. Jeśli zarabiasz 7% rocznie, a inflacja wynosi 3%, realna stopa zwrotu to około 4%.",
          },
          {
            icon: "🇵🇱",
            title: "Polskie realia: podatek Belki",
            body: "W Polsce zyski kapitałowe podlegają 19% podatkowi Belki. Inwestując przez konto IKE lub IKZE, możesz legalnie uniknąć tej opłaty — co w perspektywie 30 lat oszczędza setki tysięcy złotych.",
          },
          {
            icon: "🎯",
            title: "Horyzont inwestycyjny",
            body: "Czas to najważniejszy zasób inwestora. Każdy rok zwłoki kosztuje Cię dziesiątki tysięcy złotych zysku z procentu składanego. Kalkulator pokazuje, jak dramatyczne różnice robi nawet 5 lat wcześniejszego startu.",
          },
          {
            icon: "⚖️",
            title: "Kapitał początkowy vs. wpłaty",
            body: "Nie musisz zaczynać z dużą kwotą. Stałe miesięczne wpłaty (nawet 200–300 zł) w długim horyzoncie czasowym budują większy majątek niż jednorazowy duży zastrzyk kapitału bez kontynuacji.",
          },
        ]}
        faq={[
          {
            q: "Jaka stopa zwrotu jest realistyczna dla długoterminowego inwestora?",
            a: "Historyczna średnia roczna stopa zwrotu szerokiego rynku akcji (np. S&P 500) to około 7–10% nominalnie. Konserwatywnemu inwestorowi zalecamy przyjęcie 5–7% — po uwzględnieniu inflacji i podatków. Dla portfela mieszanego (akcje + obligacje) realistyczne jest 4–6%.",
          },
          {
            q: "Czy kalkulator uwzględnia podatek od zysków kapitałowych?",
            a: "Podstawowa wersja kalkulatora pokazuje wartość brutto. Aby uwzględnić podatek Belki (19%), odejmij go od rocznej stopy zwrotu lub skorzystaj z kont IKE/IKZE, które pozwalają inwestować bez tego podatku.",
          },
          {
            q: "Ile muszę odkładać miesięcznie, żeby uzbierać 1 milion złotych?",
            a: "Przy stopie zwrotu 7% rocznie: jeśli zaczniesz w wieku 25 lat, wystarczy około 550 zł miesięcznie, by osiągnąć milion złotych w wieku 60 lat. Czekając do 35. roku życia, musisz odkładać już ponad 1 100 zł miesięcznie, by osiągnąć ten sam cel.",
          },
          {
            q: "Jak wybrać fundusz ETF jako narzędzie inwestycyjne?",
            a: "ETF (Exchange Traded Fund) to koszyk akcji lub obligacji kupowany jak jedna akcja. Najtańsze ETF-y na indeksy (np. S&P 500, MSCI World) mają opłaty zarządzania poniżej 0,2% rocznie. To zdecydowanie lepsza opcja niż tradycyjne TFI pobierające 1–2% rocznie.",
          },
        ]}
        cta={{ label: "Uruchom kalkulator FIRE →", href: "/fire-path" }}
      />
    </main>
  );
}
