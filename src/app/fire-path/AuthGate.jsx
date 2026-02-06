"use client";

import { useAuth } from "../components/AuthProvider";

export default function AuthGate({ children }) {
  let auth = { user: null, loading: false, signIn: async () => {} };
  try {
    auth = useAuth?.() || auth;
  } catch {
    /* ignore */
  }

  const { user, loading, signIn } = auth;

  if (loading) {
    // Prosty skeleton podczas ładowania
    return (
      <main className="mx-auto max-w-7xl px-4 pb-24">
        <div className="mt-16 space-y-4">
          <div className="h-10 w-64 bg-zinc-800/60 rounded animate-pulse" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="h-[380px] bg-zinc-900/40 border border-zinc-800 rounded animate-pulse" />
            <div className="h-[380px] bg-zinc-900/40 border border-zinc-800 rounded animate-pulse" />
          </div>
          <div className="h-[420px] bg-zinc-900/40 border border-zinc-800 rounded animate-pulse" />
        </div>
      </main>
    );
  }

  // 🔓 NIEZALOGOWANY → widok DEMO + normalna strona pod spodem
  if (!user) {
    return (
      <>
        <section className="mx-auto max-w-7xl px-4 mt-8">
          <div className="card">
            <div className="card-inner text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-xs mb-3">
                DEMO
              </div>

              <h2 className="h2 mb-2">Etapy Wolności — wersja demo</h2>

              <p className="muted text-sm max-w-2xl mx-auto">
                Poniżej widzisz przykładowy podgląd „Etapów Wolności”. Po
                zalogowaniu podłączymy Twoje prawdziwe portfele i postęp.
              </p>

              <button
                onClick={() => {
                  try {
                    signIn?.();
                  } catch (e) {
                    console.error("Błąd logowania:", e);
                    alert("Nie udało się uruchomić logowania.");
                  }
                }}
                className="btn-primary inline-flex px-5 py-2 text-sm mt-4"
              >
                Zaloguj się i zobacz swoje dane
              </button>

              <p className="mt-3 text-xs text-zinc-500">
                Po zalogowaniu automatycznie zobaczysz dane z Twojego konta.
              </p>
            </div>
          </div>
        </section>

        {/* tu renderuje się normalna strona /fire-path */}
        {children}
      </>
    );
  }

  // 🔐 ZALOGOWANY — pełny widok
  return children;
}
