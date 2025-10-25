// src/app/niezaleznosc-finansowa/page.js
export const metadata = {
  title: "Niezależność finansowa (FIRE) – jak ją osiągnąć? | Finasfera",
  description:
    "Dowiedz się, jak obliczyć, ile potrzebujesz, by osiągnąć niezależność finansową (FIRE). Użyj darmowego kalkulatora i sprawdź swoje cele.",
  alternates: { canonical: "https://finasfera.pl/niezaleznosc-finansowa" },
  openGraph: {
    title: "Niezależność finansowa – Finasfera",
    description:
      "Poznaj zasady FIRE i policz, kiedy możesz przestać pracować dzięki pasywnym dochodom.",
    url: "https://finasfera.pl/niezaleznosc-finansowa",
  },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold mb-4">Niezależność finansowa (FIRE)</h1>
      <p className="text-zinc-300 mb-6">
        Ruch <strong>FIRE</strong> (Financial Independence, Retire Early) polega
        na budowaniu kapitału, który pozwala żyć z inwestycji, bez konieczności pracy
        zawodowej. Sprawdź, jak szybko możesz osiągnąć swój cel.
      </p>

      <a href="/fire-path" className="inline-block rounded bg-emerald-600 px-4 py-2 text-white">
        Otwórz kalkulator FIRE
      </a>

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Jak obliczyć niezależność finansową?</h2>
        <ul className="list-disc pl-6 text-zinc-300">
          <li>Oblicz roczne wydatki potrzebne do życia.</li>
          <li>Pomnóż tę kwotę przez 25 – to przybliżony kapitał potrzebny do FIRE.</li>
          <li>Skorzystaj z naszego kalkulatora, by zobaczyć tempo dojścia do celu.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">FAQ</h2>
        <details className="mb-2"><summary>Co oznacza FIRE?</summary>
          <p className="text-zinc-300">Financial Independence, Retire Early – czyli niezależność finansowa i możliwość wcześniejszej emerytury.</p>
        </details>
        <details className="mb-2"><summary>Ile potrzebuję, by osiągnąć FIRE?</summary>
          <p className="text-zinc-300">Zazwyczaj przyjmuje się 25× rocznych wydatków, inwestując w aktywa przynoszące 4% rocznie.</p>
        </details>
      </section>
    </main>
  );
}
