"use client";

import Link from "next/link";

export default function ForumTeaser() {
  return (
    <section className="card mt-6">
      <div className="card-inner">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-yellow-400">Forum</h3>
            <p className="text-zinc-300">
              Dołącz do społeczności inwestorów FIRE, zadawaj pytania i dziel się
              doświadczeniem.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/forum" className="btn-primary">
              Wejdź na forum
            </Link>
            <Link
              href="/forum"
              className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              aria-label="Przejrzyj najnowsze wątki"
            >
              Najnowsze wątki →
            </Link>
          </div>
        </div>

        {/* mini-lista teaserów (na razie statyczna – później podmienimy na dane z bazy) */}
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
              <div className="mt-1 text-xs text-zinc-400">nowy • społeczność FIRE</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
