"use client";

import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Bezpiecznie tylko w przeglądarce
    try {
      const consent = window.localStorage.getItem("cookiesAccepted");
      if (!consent) setVisible(true);
    } catch (_) {
      // ignoruj
    }
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem("cookiesAccepted", "true");
    } catch (_) {
      // ignoruj
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 w-full z-[9999] border-t border-zinc-800"
      role="region"
      aria-label="Powiadomienie o cookies"
    >
      <div className="bg-zinc-900/95 backdrop-blur px-4 py-3 text-sm text-zinc-200 flex flex-col md:flex-row items-center justify-center gap-3">
        <span className="text-center">
          Używamy plików cookies w celu zapewnienia poprawnego działania serwisu i analizy ruchu.{" "}
          <a href="/cookies" className="underline text-yellow-400 hover:text-yellow-300">
            Dowiedz się więcej
          </a>
        </span>
        <button
          onClick={accept}
          className="shrink-0 rounded-lg px-4 py-2 bg-yellow-400 text-black font-medium hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          Rozumiem
        </button>
      </div>
    </div>
  );
}
