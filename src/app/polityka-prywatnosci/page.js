"use client";

export default function PolitykaPrywatnosciPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-zinc-200 leading-relaxed">
      <h1 className="text-2xl font-bold mb-6 text-yellow-400">
        Polityka prywatności
      </h1>

      <p className="mb-4">
        Niniejsza Polityka prywatności opisuje zasady przetwarzania danych
        osobowych oraz wykorzystywania plików cookies w serwisie{" "}
        <strong>Finasfera.pl</strong>.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        1. Administrator danych
      </h2>
      <p className="mb-4">
        Administratorem danych osobowych jest właściciel serwisu Finasfera.pl.
        W sprawach dotyczących danych osobowych można kontaktować się pod
        adresem e-mail:{" "}
        <a
          href="mailto:kontakt.finasfera@gmail.com"
          className="text-yellow-400 underline"
        >
          kontakt.finasfera@gmail.com
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        2. Zakres i cel przetwarzania danych
      </h2>
      <p className="mb-4">
        Serwis przetwarza wyłącznie dane niezbędne do prawidłowego działania
        strony, w tym: adres e-mail (w przypadku logowania), dane techniczne
        przesyłane automatycznie przez przeglądarkę (np. adres IP, typ
        przeglądarki, system operacyjny) oraz dane związane z aktywnością
        użytkownika w serwisie (np. treści publikowane na forum).
      </p>
      <p className="mb-4">
        Dane te są wykorzystywane w celach: utrzymania konta użytkownika,
        zapewnienia bezpieczeństwa serwisu, poprawy jakości usług oraz
        celach statystycznych i analitycznych.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        3. Podstawa prawna przetwarzania danych
      </h2>
      <p className="mb-4">
        Dane osobowe są przetwarzane zgodnie z art. 6 ust. 1 lit. a, b i f
        Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 (RODO),
        czyli na podstawie: zgody użytkownika, konieczności realizacji
        funkcjonalności serwisu lub uzasadnionego interesu administratora.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        4. Udostępnianie danych
      </h2>
      <p className="mb-4">
        Dane użytkowników mogą być przetwarzane z wykorzystaniem zewnętrznych
        usług, takich jak Firebase (Google) lub analityka ruchu (np. Google
        Analytics). W takim przypadku dane mogą być przekazywane do państw
        spoza Europejskiego Obszaru Gospodarczego (EOG) — wyłącznie podmiotom
        spełniającym wymogi RODO.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        5. Okres przechowywania danych
      </h2>
      <p className="mb-4">
        Dane osobowe są przechowywane przez okres niezbędny do realizacji
        celów, dla których zostały zebrane, a po tym czasie mogą być usuwane
        lub anonimizowane.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        6. Prawa użytkowników
      </h2>
      <p className="mb-4">
        Użytkownik ma prawo do: dostępu do swoich danych, ich sprostowania,
        usunięcia, ograniczenia przetwarzania, przeniesienia danych oraz
        wniesienia sprzeciwu wobec przetwarzania. W każdej chwili może też
        wycofać zgodę na przetwarzanie danych, kontaktując się na adres
        e-mail:{" "}
        <a
          href="mailto:kontakt.finasfera@gmail.com"
          className="text-yellow-400 underline"
        >
          kontakt.finasfera@gmail.com
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        7. Pliki cookies
      </h2>
      <p className="mb-4">
        Serwis wykorzystuje pliki cookies (tzw. ciasteczka) w celu zapewnienia
        prawidłowego działania strony, zapamiętania preferencji użytkownika
        oraz prowadzenia anonimowych statystyk odwiedzin. Użytkownik może w
        każdej chwili wyłączyć obsługę cookies w ustawieniach swojej
        przeglądarki.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">
        8. Zmiany w polityce prywatności
      </h2>
      <p className="mb-4">
        Administrator zastrzega sobie prawo do wprowadzania zmian w niniejszej
        Polityce prywatności. Aktualna wersja dokumentu jest zawsze dostępna na
        stronie{" "}
        <a
          href="https://finasfera.pl/polityka-prywatnosci"
          className="text-yellow-400 underline"
        >
          finasfera.pl/polityka-prywatnosci
        </a>
        .
      </p>

      <p className="mt-6 text-sm text-zinc-500">
        Ostatnia aktualizacja: październik 2025 r.
      </p>
    </main>
  );
}
