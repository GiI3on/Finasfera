// src/app/portfel-inwestycyjny/page.js
export const metadata = {
  title: "Portfel inwestycyjny online – śledzenie wyników i alokacji | Finasfera",
  description:
    "Śledź wyniki swojego portfela inwestycyjnego: akcje, ETF-y, obligacje, waluty. Automatyczne wykresy i postęp realizacji celów.",
  alternates: { canonical: "https://finasfera.pl/portfel-inwestycyjny" },
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
    </main>
  );
}
