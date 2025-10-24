"use client";

import { useAuth } from "../components/AuthProvider";

export default function AuthGate({ children }) {
  let auth = { user: null, loading: false };
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

  if (!user) {
    // Użytkownik niezalogowany – pokaż komunikat i przycisk
    return (
      <main className="mx-auto max-w-md px-4 py-24">
        <div className="card">
          <div className="card-inner text-center">
            <h1 className="h2 mb-2">Zaloguj się</h1>
            <p className="muted mb-6">
              Aby zobaczyć swoją ścieżkę FIRE, musisz być zalogowany.
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
              className="btn-primary w-full"
            >
              Zaloguj się
            </button>

            <p className="mt-3 text-xs text-zinc-500">
              Po zalogowaniu zostaniesz automatycznie przeniesiony do tej strony.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Zalogowany — wpuszczamy dalej
  return children;
}
