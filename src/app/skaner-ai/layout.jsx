// src/app/skaner-ai/layout.jsx
// FIX: Dodano openGraph, twitter i pełne metadata SEO
export const metadata = {
  title: "Audyt Portfela AI — Skaner Inwestycyjny",
  description:
    "Darmowy skaner AI, który w 30 sekund oceni dywersyfikację, ryzyko i spójność Twojego portfela inwestycyjnego. Audyt ETF, akcji i funduszy.",
  alternates: {
    canonical: "https://finasfera.pl/skaner-ai",
  },
  openGraph: {
    title: "Audyt Portfela AI — Skaner Inwestycyjny | Finasfera",
    description:
      "Darmowy skaner AI w 30 sekund oceni dywersyfikację i ryzyko Twojego portfela. Audyt ETF, akcji i funduszy.",
    url: "https://finasfera.pl/skaner-ai",
    type: "website",
    images: [
      {
        url: "https://finasfera.pl/og-image.png",
        width: 1200,
        height: 630,
        alt: "Skaner AI portfela inwestycyjnego — Finasfera",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Audyt Portfela AI — Skaner Inwestycyjny | Finasfera",
    description:
      "Darmowy skaner AI oceni dywersyfikację i ryzyko Twojego portfela w 30 sekund.",
    images: ["https://finasfera.pl/og-image.png"],
  },
};

export default function SkanerAILayout({ children }) {
  return <>{children}</>;
}
