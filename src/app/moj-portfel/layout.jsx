// src/app/moj-portfel/layout.jsx
// FIX: Dodano openGraph, twitter i pełne metadata SEO
export const metadata = {
  title: "Darmowy Tracker Portfela Inwestycyjnego — Akcje i ETF",
  description:
    "Śledź swoje akcje i ETF-y w czasie rzeczywistym. Analizuj dywersyfikację, zyski i straty, historię transakcji i porównuj swój portfel z indeksem S&P 500.",
  alternates: {
    canonical: "https://finasfera.pl/moj-portfel",
  },
  openGraph: {
    title: "Darmowy Tracker Portfela Inwestycyjnego | Finasfera",
    description:
      "Śledź akcje i ETF w czasie rzeczywistym. Analizuj dywersyfikację i porównuj z S&P 500.",
    url: "https://finasfera.pl/moj-portfel",
    type: "website",
    images: [
      {
        url: "https://finasfera.pl/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tracker portfela inwestycyjnego — Finasfera",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Darmowy Tracker Portfela Inwestycyjnego | Finasfera",
    description:
      "Śledź akcje i ETF w czasie rzeczywistym i porównuj z S&P 500.",
    images: ["https://finasfera.pl/og-image.png"],
  },
};

export default function MojPortfelLayout({ children }) {
  return <>{children}</>;
}
