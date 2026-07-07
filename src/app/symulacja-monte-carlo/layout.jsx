// src/app/symulacja-monte-carlo/layout.jsx
// FIX: Dodano openGraph, twitter i pełne metadata SEO
export const metadata = {
  title: "Kalkulator Emerytalny — Symulacja Monte Carlo",
  description:
    "Zaawansowany kalkulator emerytalny z symulacją Monte Carlo. Sprawdź prognozę ZUS, uwzględnij inflację i przetestuj swój portfel inwestycyjny na historyczne krachy giełdowe.",
  alternates: {
    canonical: "https://finasfera.pl/symulacja-monte-carlo",
  },
  openGraph: {
    title: "Kalkulator Emerytalny — Symulacja Monte Carlo | Finasfera",
    description:
      "Sprawdź prognozę ZUS, przetestuj portfel na historyczne krachy i zaplanuj bezpieczną emeryturę.",
    url: "https://finasfera.pl/symulacja-monte-carlo",
    type: "website",
    images: [
      {
        url: "https://finasfera.pl/og-image.png",
        width: 1200,
        height: 630,
        alt: "Symulacja Monte Carlo emerytura — Finasfera",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kalkulator Emerytalny — Symulacja Monte Carlo | Finasfera",
    description:
      "Przetestuj swój portfel na historyczne krachy i zaplanuj bezpieczną emeryturę.",
    images: ["https://finasfera.pl/og-image.png"],
  },
};

export default function MonteCarloLayout({ children }) {
  return <>{children}</>;
}
