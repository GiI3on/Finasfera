// src/app/statystyki/layout.jsx
// FIX: Dodano openGraph, twitter i pełne metadata SEO
export const metadata = {
  title: "Statystyki Portfela Inwestycyjnego i Wyniki",
  description:
    "Szczegółowe statystyki Twoich inwestycji. Sprawdź najlepsze i najgorsze spółki, historię dywidend, alokację kapitału i stopę zwrotu Time-Weighted Return (TWR).",
  alternates: {
    canonical: "https://finasfera.pl/statystyki",
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Statystyki Portfela Inwestycyjnego | Finasfera",
    description:
      "Analizuj swój portfel: stopy zwrotu, dywidendy, alokacja, porównanie z S&P 500.",
    url: "https://finasfera.pl/statystyki",
    type: "website",
    images: [
      {
        url: "https://finasfera.pl/og-image.png",
        width: 1200,
        height: 630,
        alt: "Statystyki portfela inwestycyjnego — Finasfera",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Statystyki Portfela Inwestycyjnego | Finasfera",
    description:
      "Analizuj stopy zwrotu, dywidendy i alokację swojego portfela.",
    images: ["https://finasfera.pl/og-image.png"],
  },
};

export default function StatystykiLayout({ children }) {
  return <>{children}</>;
}
