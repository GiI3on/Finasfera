"use client";

import { useAuth } from "./AuthProvider";

export default function LoginCard() {
  const { signIn } = useAuth();

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <div className="card-inner text-center py-8">
          <h2 className="h2 mb-2">Wymagane logowanie</h2>
          <p className="muted mb-6">Zaloguj się, aby zobaczyć i zapisać swój portfel.</p>
          <button className="btn-primary h-11 px-5" onClick={signIn}>
            Zaloguj przez Google
          </button>
        </div>
      </div>
    </div>
  );
}
