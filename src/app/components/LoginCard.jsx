// src/app/components/LoginCard.js
"use client";
import { useAuth } from "./AuthProvider";

export default function LoginCard() {
  const { signIn } = useAuth();
  return (
    <div className="card max-w-xl mx-auto">
      <div className="card-inner text-center">
        <h2 className="h2 mb-2">Wymagane logowanie</h2>
        <p className="muted mb-4">Zaloguj się, aby zobaczyć i zapisać swój portfel.</p>
        <button className="btn-primary" onClick={signIn}>Zaloguj przez Google</button>
      </div>
    </div>
  );
}
