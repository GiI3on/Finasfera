// src/app/kalkulator-inwestycyjny/page.js
export const metadata = {
  title: "Kalkulator inwestycyjny – procent składany i inflacja | Finasfera",
  description:
    "Oblicz zysk z inwestycji z uwzględnieniem procentu składanego, wpłat cyklicznych i inflacji. Darmowy kalkulator inwestycyjny Finasfera.",
  alternates: { canonical: "https://finasfera.pl/kalkulator-inwestycyjny" },
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
    </main>
  );
}
