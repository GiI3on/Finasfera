"use client";

export default function PolitykaCookiesPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-zinc-200 leading-relaxed">
      <h1 className="text-2xl font-bold mb-6 text-yellow-400">
        Polityka plików cookies
      </h1>

      <p className="mb-4">
        Niniejsza Polityka plików cookies opisuje zasady wykorzystywania
        technologii cookies i podobnych narzędzi w serwisie{" "}
        <strong>Finasfera.pl</strong>.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        1. Czym są pliki cookies
      </h2>
      <p className="mb-4">
        Cookies (tzw. ciasteczka) to niewielkie pliki tekstowe zapisywane w
        urządzeniu końcowym użytkownika, które umożliwiają korzystanie z funkcji
        serwisu oraz pomagają analizować jego działanie.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        2. Rodzaje wykorzystywanych cookies
      </h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>Cookies techniczne – niezbędne do prawidłowego działania strony.</li>
        <li>
          Cookies analityczne – wykorzystywane do anonimowej analizy ruchu
          (np. Google Analytics).
        </li>
        <li>
          Cookies funkcjonalne – pozwalają zapamiętać preferencje użytkownika,
          np. motyw ciemny/jasny.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        3. Zarządzanie cookies
      </h2>
      <p className="mb-4">
        Użytkownik może w dowolnym momencie zmienić ustawienia dotyczące
        plików cookies w swojej przeglądarce internetowej – np. zablokować ich
        automatyczną obsługę lub usuwać zapisane pliki. Wyłączenie cookies może
        jednak ograniczyć niektóre funkcje serwisu.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        4. Narzędzia zewnętrzne
      </h2>
      <p className="mb-4">
        Serwis Finasfera.pl może korzystać z usług analitycznych lub hostingowych
        dostarczanych przez podmioty trzecie (np. Google, Vercel, Firebase),
        które mogą stosować własne cookies zgodnie ze swoimi politykami
        prywatności.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        5. Kontakt
      </h2>
      <p className="mb-4">
        W przypadku pytań dotyczących polityki cookies prosimy o kontakt na adres{" "}
        <a
          href="mailto:kontakt.finasfera@gmail.com"
          className="text-yellow-400 underline"
        >
          kontakt.finasfera@gmail.com
        </a>
        .
      </p>

      <p className="mt-6 text-sm text-zinc-500">
        Ostatnia aktualizacja: październik 2025 r.
      </p>
    </main>
  );
}
