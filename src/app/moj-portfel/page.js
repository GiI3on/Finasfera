"use client";

import AuthGate from "../fire-path/AuthGate";
import PortfolioScreen from "../components/PortfolioScreen";

export default function Page() {
  return (
    <AuthGate>
      <PortfolioScreen title="Mój Portfel" />
    </AuthGate>
  );
}
