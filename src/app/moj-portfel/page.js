"use client";

import AuthGate from "../fire-path/AuthGate";
import dynamic from "next/dynamic";

// parasol: złapie export default albo nazwany
const PortfolioScreen = dynamic(
  () => import("../components/PortfolioScreen").then(m => m.default ?? m.PortfolioScreen),
  { ssr: false }
);

export default function Page() {
  return (
    <AuthGate>
      <PortfolioScreen title="Mój Portfel" />
    </AuthGate>
  );
}
