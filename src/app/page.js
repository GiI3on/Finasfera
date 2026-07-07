// src/app/page.js
// WAŻNE: Ten plik jest Server Component (brak "use client").
// Dzięki temu Next.js może poprawnie wstrzyknąć <title> i <meta> do HTML
// serwowanego robotom Google. Interaktywność jest przeniesiona do
// FireCalculatorClient (Client Component).

import Link from "next/link";
import FireCalculatorClient from "./components/FireCalculatorClient";

// ── Metadata dla strony głównej ──────────────────────────────────────────────
// UWAGA: metadata NIE działa w plikach z "use client".
// Przeniesienie kalkulatora do osobnego Client Component rozwiązuje ten problem.
export const metadata = {
  title: "Kalkulator FIRE i Wolność Finansowa — Finasfera.pl",
  description:
    "Darmowy kalkulator FIRE i niezależności finansowej. Oblicz kiedy osiągniesz wolność finansową, śledź portfel inwestycyjny i zaplanuj bezpieczną emeryturę.",
  alternates: {
    canonical: "https://finasfera.pl",
  },
  openGraph: {
    title: "Kalkulator FIRE i Wolność Finansowa — Finasfera.pl",
    description:
      "Darmowy kalkulator FIRE i niezależności finansowej. Oblicz kiedy osiągniesz wolność finansową, śledź portfel i zaplanuj emeryturę.",
    url: "https://finasfera.pl",
    siteName: "Finasfera",
    locale: "pl_PL",
    type: "website",
    images: [
      {
        url: "https://finasfera.pl/og-image.png",
        width: 1200,
        height: 630,
        alt: "Finasfera — Kalkulator FIRE i wolność finansowa",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kalkulator FIRE i Wolność Finansowa — Finasfera.pl",
    description:
      "Oblicz kiedy osiągniesz wolność finansową i zaplanuj bezpieczną emeryturę.",
    images: ["https://finasfera.pl/og-image.png"],
  },
};

// ── Strona (Server Component) ────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      {/* ── Hero / Nagłówek ────────────────────────────────────────────────── */}
      <section aria-label="Kalkulator FIRE – nagłówek" className="text-center mt-10 mb-6">
        <h1 className="h1">
          Kalkulator <span className="text-yellow-400 typewriter">FIRE</span>
        </h1>
        <p className="mt-2 muted">
          Zrób szybkie obliczenie i zobacz, jak blisko jesteś wolności
          finansowej.
        </p>
      </section>

      {/* ── Interaktywny kalkulator (Client Component) ──────────────────────── */}
      <FireCalculatorClient />

      {/* ── Sekcja edukacyjna (SSR – widoczna dla Google) ───────────────────── */}
      <section aria-label="Edukacja FIRE i inwestowanie" className="card mt-10">
        <div className="card-inner">
          <h2 className="h2 mb-4">Dowiedz się więcej o FIRE i metodologii</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="text-lg font-semibold text-zinc-100">
                Niezależność finansowa (FIRE) w praktyce
              </h3>
              <p className="muted mt-1">
                FIRE to prosty cel: zbudować kapitał, który utrzyma Twoje
                wydatki. Nie chodzi o „szybkie triki", tylko o sensowny plan,
                regularne wpłaty i długi horyzont.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/fire-path" className="btn-primary px-3 py-2">
                  Policz swoją ścieżkę
                </Link>
                <Link
                  href="/forum"
                  className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Zapytaj społeczność →
                </Link>
              </div>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="text-lg font-semibold text-zinc-100">
                Jak zacząć inwestować małe kwoty
              </h3>
              <p className="muted mt-1">
                Wystarczy stała wpłata (np. 200–500 zł miesięcznie) i trzymanie
                się planu. Procent składany robi robotę, a prosty portfel
                indeksowy to dobre pierwsze podejście.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/symulacja-monte-carlo"
                  className="btn-primary px-3 py-2"
                >
                  Kalkulator emerytalny
                </Link>
                <Link
                  href="/moj-portfel"
                  className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Portfel online
                </Link>
              </div>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="text-lg font-semibold text-zinc-100">
                Na czym polega FIRE?
              </h3>
              <p className="muted mt-1">
                Cel jest prosty: zbudować kapitał, który pozwoli Ci żyć z
                wypłat z portfela (np. ~4% rocznie) bez konieczności pracy
                zarobkowej. Klucz to <b>regularne wpłaty</b> i{" "}
                <b>długi horyzont</b>.
              </p>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="text-lg font-semibold text-zinc-100">
                Skąd 25× wydatków?
              </h3>
              <p className="muted mt-1">
                To prosta reguła: 25× rocznych wydatków ≈ kapitał, z którego
                możesz wypłacać ~4% rocznie. Nie jest to gwarancja, ale
                sensowny punkt orientacyjny, by złapać skalę celu.
              </p>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="text-lg font-semibold text-zinc-100">
                Jaką stopę zwrotu przyjąć?
              </h3>
              <p className="muted mt-1">
                Zacznij konserwatywnie (np. 4–7% rocznie). Wyższe wartości
                zwiększają optymizm w wyniku, ale Twoje wpłaty i czas są
                ważniejsze niż każda cyferka.
              </p>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="text-lg font-semibold text-zinc-100">
                Inflacja i realne stopy zwrotu
              </h3>
              <p className="muted mt-1">
                Kalkulator przelicza nominalne stopy zwrotu i indeksację wpłat
                na wartości realne, czyli w dzisiejszych złotówkach. Dzięki
                temu widzisz, jak naprawdę rośnie Twoja siła nabywcza, a nie
                tylko „napompowane" liczby.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ── Forum ───────────────────────────────────────────────────────────── */}
      <section aria-label="Forum inwestorów FIRE" className="card mt-8">
        <div className="card-inner">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-yellow-400">Forum</h2>
              <p className="text-zinc-300">
                Dołącz do społeczności inwestorów FIRE — zadawaj pytania i
                dziel się doświadczeniem.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/forum" className="btn-primary">
                Wejdź na forum
              </Link>
              <Link
                href="/forum"
                className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Najnowsze wątki →
              </Link>
            </div>
          </div>

          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              "Jak inwestować w ETF?",
              "Jak zjeść budżet domowy?",
              "Dziennik mojej drogi do FIRE",
            ].map((t, i) => (
              <li
                key={i}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/60"
              >
                <Link href="/forum" className="block truncate">
                  {t}
                </Link>
                <div className="mt-1 text-xs text-zinc-400">
                  społeczność FIRE
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
