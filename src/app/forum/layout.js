// src/app/forum/layout.js
// FIX: Rozbudowane metadata z description i openGraph
export const metadata = {
  title: "Forum inwestorów FIRE — dyskusje i pytania",
  description:
    "Forum społeczności Finasfera — zadawaj pytania o inwestowanie, FIRE i wolność finansową. Dyskusje, analizy i porady od innych inwestorów.",
  alternates: {
    canonical: "https://finasfera.pl/forum",
  },
  openGraph: {
    title: "Forum inwestorów FIRE — Finasfera",
    description:
      "Dołącz do społeczności inwestorów FIRE. Zadawaj pytania, dziel się doświadczeniem i ucz się od innych.",
    url: "https://finasfera.pl/forum",
    type: "website",
  },
};

export default function ForumLayout({ children }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      {/* Pasek sekcji forum */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/50">
        <div className="mx-auto max-w-6xl px-4 py-2.5 text-sm text-zinc-400">
          Strefa społeczności — dyskusje, pytania, analizy
        </div>
      </div>

      {/* Właściwa treść podstron forum */}
      <div className="mt-4">{children}</div>
    </div>
  );
}
