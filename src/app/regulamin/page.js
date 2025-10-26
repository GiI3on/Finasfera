export const metadata = {
  title: "Regulamin | Finasfera",
  description: "Regulamin korzystania z serwisu Finasfera.pl",
};

export default function RegulaminPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-zinc-200 leading-relaxed">
      <h1 className="text-2xl font-bold mb-6 text-yellow-400">Regulamin serwisu Finasfera.pl</h1>

      <p className="mb-4">
        Niniejszy regulamin określa zasady korzystania z serwisu <strong>Finasfera.pl</strong> („Serwis”),
        w tym z forum, kont użytkowników i narzędzi udostępnianych w Serwisie. Korzystając z Serwisu,
        akceptujesz postanowienia niniejszego regulaminu.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">1. Charakter Serwisu</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>Serwis ma charakter edukacyjno-informacyjny dotyczący inwestowania i metodologii FIRE.</li>
        <li>Serwis jest obecnie w fazie testowej (beta). Funkcjonalność może ulegać zmianom.</li>
        <li>Treści w Serwisie <strong>nie stanowią</strong> rekomendacji inwestycyjnych ani porad finansowych, podatkowych lub prawnych.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">2. Konto użytkownika</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>Założenie konta wymaga podania prawdziwego adresu e-mail. Użytkownik odpowiada za poufność swoich danych logowania.</li>
        <li>Administrator może czasowo zablokować lub usunąć konto w przypadku naruszenia regulaminu lub bezpieczeństwa.</li>
        <li>Użytkownik może w każdej chwili zażądać usunięcia konta (szczegóły w Polityce prywatności).</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">3. Treści użytkowników (forum, komentarze)</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>Użytkownik ponosi pełną odpowiedzialność za publikowane treści.</li>
        <li>Zakazane są treści bezprawne, wulgarne, obraźliwe, naruszające prawa autorskie, zachęcające do nienawiści, przemocy lub spamu.</li>
        <li>Administrator ma prawo moderować, ukrywać lub usuwać treści oraz ograniczać dostęp do funkcji forum.</li>
        <li>Publikując treści, udzielasz Serwisowi niewyłącznej, nieodpłatnej licencji na ich wyświetlanie w ramach Serwisu.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">4. Zasady korzystania z narzędzi i danych</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>Wyniki kalkulatorów i statystyk mają charakter orientacyjny i mogą zawierać uproszczenia.</li>
        <li>Wyniki historyczne nie gwarantują wyników przyszłych.</li>
        <li>Zakazane jest nadużywanie API, scrapowanie danych i działania obciążające infrastrukturę Serwisu.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">5. Odpowiedzialność</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>Serwis jest udostępniany „tak jak jest” (as-is). Administrator nie gwarantuje nieprzerwanego działania ani zgodności z oczekiwaniami.</li>
        <li>Administrator nie ponosi odpowiedzialności za decyzje inwestycyjne podjęte na podstawie treści Serwisu ani za szkody wynikłe z ich wykorzystania.</li>
        <li>Serwis może zawierać odnośniki do zewnętrznych stron — Administrator nie odpowiada za ich treść.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">6. Zgłaszanie naruszeń (copyright/treści)</h2>
      <p className="mb-4">
        Jeśli uważasz, że treści w Serwisie naruszają prawo lub Twoje prawa autorskie, skontaktuj się:
        <br />
        <a href="mailto:kontakt.finasfera@gmail.com" className="text-yellow-400 underline">
          kontakt.finasfera@gmail.com
        </a>{" "}
        (opisz dokładnie naruszenie, podaj link i podstawę roszczenia). Zgłoszenia będą rozpatrywane niezwłocznie
        w trybie „notice &amp; takedown”.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">7. Prywatność i cookies</h2>
      <p className="mb-4">
        Zasady przetwarzania danych i wykorzystywania cookies opisuje{" "}
        <a href="/polityka-prywatnosci" className="text-yellow-400 underline">Polityka prywatności</a> oraz{" "}
        <a href="/cookies" className="text-yellow-400 underline">Polityka cookies</a>.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">8. Dostępność, zmiany usług i kont premium</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>Administrator może modyfikować lub wycofywać funkcje Serwisu, w tym wprowadzić wersję komercyjną (subskrypcję premium).</li>
        <li>Zmiany funkcji nie wpływają na ważność niniejszego regulaminu. O istotnych zmianach użytkownicy zostaną poinformowani w Serwisie.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3 text-yellow-300">9. Postanowienia końcowe</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>Prawem właściwym jest prawo polskie. Ewentualne spory rozstrzyga właściwy sąd powszechny.</li>
        <li>Regulamin może być okresowo aktualizowany. Data ostatniej aktualizacji znajduje się poniżej.</li>
        <li>Kontakt w sprawach Serwisu:{" "}
          <a href="mailto:kontakt.finasfera@gmail.com" className="text-yellow-400 underline">
            kontakt.finasfera@gmail.com
          </a>.
        </li>
      </ul>

      <p className="mt-6 text-sm text-zinc-500">Ostatnia aktualizacja: październik 2025 r.</p>
    </main>
  );
}
