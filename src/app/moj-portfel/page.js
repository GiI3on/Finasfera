"use client";

import dynamic from "next/dynamic";
import { useAuth } from "../components/AuthProvider";
import DemoPortfolio from "../components/PortfolioDemo";

// ekran prawdziwego portfela
const PortfolioScreen = dynamic(
  () =>
    import("../components/PortfolioScreen").then(
      (m) => m.default ?? m.PortfolioScreen
    ),
  { ssr: false }
);

export default function Page() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-center text-zinc-400">Ładowanie…</p>
      </main>
    );
  }

  // 🔓 NIEZALOGOWANY → widok DEMO
  if (!user) {
    return <DemoPortfolio />;
  }

  // 🔐 ZALOGOWANY → pełny ekran portfela
  return <PortfolioScreen title="Śledzenie Akcji" />;
}
