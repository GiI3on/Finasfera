export default function HomeSeoSections() {
  return (
    <section className="mx-auto mt-10 grid max-w-6xl gap-6 px-4">
      {/* Niezależność finansowa */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xl font-semibold">Niezależność finansowa (FIRE) w praktyce</h2>
        <p className="mt-2 text-zinc-300">
          FIRE to prosty cel: zbudować kapitał, który pozwoli utrzymać się z zysków z inwestycji.
          Nie chodzi o „szybkie triki”, tylko o rozsądny plan, regularne wpłaty i długi horyzont.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href="/niezaleznosc-finansowa" className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white">
            Dowiedz się więcej
          </a>
          <a href="/fire-path" className="rounded border border-emerald-600/40 px-3 py-1.5 text-sm">
            Otwórz kalkulator FIRE
          </a>
        </div>
      </div>

      {/* Jak zacząć inwestować małe kwoty */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xl font-semibold">Jak zacząć inwestować małe kwoty</h2>
        <p className="mt-2 text-zinc-300">
          Nie potrzebujesz dużych pieniędzy, żeby wystartować. Klucz to stała wpłata (np. 200–500 zł
          miesięcznie) i trzymanie się planu. Procent składany robi resztę.
        </p>
        <ul className="mt-3 list-disc pl-5 text-zinc-300">
          <li>Ustal stałą wpłatę i trzymaj się jej.</li>
          <li>Rozważ ETF-y lub proste strategie pasywne.</li>
          <li>Buduj poduszkę bezpieczeństwa zanim zwiększysz ryzyko.</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href="/kalkulator-inwestycyjny" className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white">
            Kalkulator inwestycyjny
          </a>
          <a href="/portfel-inwestycyjny" className="rounded border border-emerald-600/40 px-3 py-1.5 text-sm">
            Portfel inwestycyjny online
          </a>
        </div>
      </div>

      {/* Kalkulator inwestycyjny – jak korzystać */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xl font-semibold">Kalkulator inwestycyjny — jak z niego korzystać</h2>
        <p className="mt-2 text-zinc-300">
          Wpisz kapitał startowy, miesięczne wpłaty, oczekiwaną stopę zwrotu i (opcjonalnie) inflację.
          Zobaczysz, jak wygląda wzrost kapitału w czasie — w wartościach nominalnych i realnych.
        </p>
        <ul className="mt-3 list-disc pl-5 text-zinc-300">
          <li>Procent składany działa najlepiej przy regularnych wpłatach.</li>
          <li>Inflacja obniża siłę nabywczą — warto porównywać wyniki „na dzisiejsze pieniądze”.</li>
        </ul>
        <div className="mt-3">
          <a href="/kalkulator-inwestycyjny" className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white">
            Otwórz kalkulator
          </a>
        </div>
      </div>

      {/* Jak policzyć, kiedy osiągniesz FIRE */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xl font-semibold">Jak policzyć, kiedy osiągniesz FIRE</h2>
        <p className="mt-2 text-zinc-300">
          Przybliżona zasada to ok. <strong>25× rocznych wydatków</strong>. Nasz kalkulator FIRE
          pokazuje ścieżkę dojścia do celu przy Twoich założeniach: stopie zwrotu, inflacji i wpłatach.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href="/fire-path" className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white">
            Policz swoją ścieżkę FIRE
          </a>
          <a href="/forum" className="rounded border border-emerald-600/40 px-3 py-1.5 text-sm">
            Dołącz do dyskusji na forum
          </a>
        </div>
      </div>

      {/* FAQ (na stronie – widoczne dla ludzi) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h3 className="text-lg font-semibold">Najczęstsze pytania</h3>
        <details className="mt-3">
          <summary className="cursor-pointer text-emerald-300">Czym jest niezależność finansowa?</summary>
          <p className="mt-2 text-zinc-300">
            To moment, w którym zyski z inwestycji pokrywają Twoje stałe wydatki. Pracujesz, bo chcesz,
            a nie dlatego, że musisz.
          </p>
        </details>
        <details className="mt-3">
          <summary className="cursor-pointer text-emerald-300">Czy kalkulator uwzględnia inflację?</summary>
          <p className="mt-2 text-zinc-300">
            Tak. Możesz dodać inflację, aby zobaczyć wyniki w cenach stałych — to urealnia plan.
          </p>
        </details>
        <details className="mt-3">
          <summary className="cursor-pointer text-emerald-300">Od czego zacząć inwestowanie małych kwot?</summary>
          <p className="mt-2 text-zinc-300">
            Od poduszki bezpieczeństwa i regularnych wpłat. Później dokładamy proste, niskokosztowe instrumenty.
          </p>
        </details>
      </div>

      {/* FAQ JSON-LD dla rich results w Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Czym jest niezależność finansowa?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "To moment, w którym zyski z inwestycji pokrywają Twoje wydatki. Pracujesz z wyboru, a nie z konieczności.",
                },
              },
              {
                "@type": "Question",
                name: "Czy kalkulator uwzględnia inflację?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "Tak. Możesz dodać inflację, aby zobaczyć wyniki w wartościach realnych, co urealnia plan oszczędzania i inwestowania.",
                },
              },
              {
                "@type": "Question",
                name: "Jak zacząć inwestować małe kwoty?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "Zacznij od stałej, miesięcznej wpłaty i budowy poduszki bezpieczeństwa. Następnie dodaj proste, niskokosztowe instrumenty (np. ETF).",
                },
              },
            ],
          }),
        }}
      />
    </section>
  );
}
