// src/app/niezaleznosc-finansowa/page.js
// Server Component — metadata działa poprawnie
import Link from "next/link";

export const metadata = {
  title: "Niezależność finansowa (FIRE) – jak ją osiągnąć?",
  description:
    "Dowiedz się, jak obliczyć, ile potrzebujesz, by osiągnąć niezależność finansową (FIRE). Użyj darmowego kalkulatora i sprawdź swoje cele inwestycyjne.",
  alternates: {
    canonical: "https://finasfera.pl/niezaleznosc-finansowa",
  },
  openGraph: {
    title: "Niezależność finansowa (FIRE) – jak ją osiągnąć? | Finasfera",
    description:
      "Poznaj zasady FIRE i policz, kiedy możesz przestać pracować dzięki pasywnym dochodom z inwestycji.",
    url: "https://finasfera.pl/niezaleznosc-finansowa",
    type: "article",
  },
};

export default function NiezaleznoscFinansowaPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold mb-4">
        Niezależność finansowa (FIRE)
      </h1>
      <p className="text-zinc-300 mb-6">
        Ruch <strong>FIRE</strong> (Financial Independence, Retire Early) polega
        na budowaniu kapitału, który pozwala żyć z inwestycji, bez konieczności
        pracy zawodowej. Sprawdź, jak szybko możesz osiągnąć swój cel.
      </p>

      {/* FIX: <a> → <Link> dla spójnego routingu Next.js */}
      <Link
        href="/fire-path"
        className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-500 transition-colors"
      >
        Otwórz kalkulator FIRE
      </Link>

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-3">
          Jak obliczyć niezależność finansową?
        </h2>
        <ul className="list-disc pl-6 text-zinc-300 space-y-2">
          <li>Oblicz roczne wydatki potrzebne do życia.</li>
          <li>
            Pomnóż tę kwotę przez 25 – to przybliżony kapitał potrzebny do FIRE
            (reguła 4%).
          </li>
          <li>
            Skorzystaj z naszego kalkulatora, by zobaczyć tempo dojścia do
            celu.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold mb-4">
          Narzędzia Finasfera dla inwestorów FIRE
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="font-semibold text-zinc-100 mb-1">
              Kalkulator FIRE
            </h3>
            <p className="text-sm text-zinc-400 mb-3">
              Oblicz, kiedy osiągniesz wolność finansową przy swoich wpłatach i
              stopie zwrotu.
            </p>
            <Link href="/" className="text-yellow-400 text-sm font-medium hover:underline">
              Uruchom kalkulator →
            </Link>
          </article>
          <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="font-semibold text-zinc-100 mb-1">
              Symulacja Monte Carlo
            </h3>
            <p className="text-sm text-zinc-400 mb-3">
              Przetestuj swój portfel na historyczne krachy i sprawdź, czy
              Twoja emerytura jest bezpieczna.
            </p>
            <Link
              href="/symulacja-monte-carlo"
              className="text-emerald-400 text-sm font-medium hover:underline"
            >
              Uruchom symulację →
            </Link>
          </article>
        </div>
      </section>

      <section aria-label="FAQ – niezależność finansowa" className="mt-10">
        <h2 className="text-xl font-semibold mb-4">
          Najczęstsze pytania (FAQ)
        </h2>
        <details className="mb-3 border border-zinc-800 rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-zinc-200">
            Co oznacza skrót FIRE?
          </summary>
          <p className="text-zinc-300 mt-2">
            <strong>FIRE</strong> to skrót od{" "}
            <em>Financial Independence, Retire Early</em> — niezależność
            finansowa i możliwość wcześniejszej emerytury. Chodzi o
            zgromadzenie kapitału wystarczającego, by żyć z jego odsetek.
          </p>
        </details>
        <details className="mb-3 border border-zinc-800 rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-zinc-200">
            Ile potrzebuję, by osiągnąć FIRE?
          </summary>
          <p className="text-zinc-300 mt-2">
            Zazwyczaj przyjmuje się <strong>25× rocznych wydatków</strong>,
            inwestując w aktywa przynoszące ok. 4% rocznie po inflacji. Np. przy
            60&nbsp;000&nbsp;zł rocznych wydatków cel FIRE to
            1&nbsp;500&nbsp;000&nbsp;zł.
          </p>
        </details>
        <details className="mb-3 border border-zinc-800 rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-zinc-200">
            Jak szybko mogę osiągnąć FIRE?
          </summary>
          <p className="text-zinc-300 mt-2">
            Tempo zależy głównie od stopy oszczędności (% dochodu, który
            odkładasz). Przy 50% stopy oszczędności można osiągnąć FIRE w ok.
            17 lat. Użyj{" "}
            <Link href="/" className="text-yellow-400 hover:underline">
              naszego kalkulatora
            </Link>
            , by zobaczyć własny harmonogram.
          </p>
        </details>
      </section>
    </main>
  );
}
