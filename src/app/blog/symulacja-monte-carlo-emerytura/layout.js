// src/app/blog/symulacja-monte-carlo-emerytura/layout.js
// FIX: Dodano openGraph, twitter, article type i pełne metadata SEO
export const metadata = {
  title: "Symulacja Monte Carlo dla emerytury — dlaczego zwykły kalkulator kłamie?",
  description:
    "Poznaj ryzyko sekwencji stóp zwrotu (SoRR) i sprawdź, dlaczego do planowania wczesnej emerytury (FIRE) w Polsce potrzebujesz symulacji Monte Carlo, a nie prostego kalkulatora.",
  alternates: {
    canonical: "https://finasfera.pl/blog/symulacja-monte-carlo-emerytura",
  },
  openGraph: {
    title: "Symulacja Monte Carlo dla emerytury — dlaczego kalkulator kłamie?",
    description:
      "Poznaj ryzyko sekwencji stóp zwrotu (SoRR) i naucz się planować emeryturę FIRE przy użyciu symulacji Monte Carlo.",
    url: "https://finasfera.pl/blog/symulacja-monte-carlo-emerytura",
    type: "article",
    publishedTime: "2026-04-07T00:00:00.000Z",
    authors: ["https://finasfera.pl"],
    images: [
      {
        url: "https://finasfera.pl/og-image.png",
        width: 1200,
        height: 630,
        alt: "Symulacja Monte Carlo emerytura FIRE",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Monte Carlo dla emerytury — dlaczego kalkulator kłamie? | Finasfera",
    description:
      "Ryzyko sekwencji stóp zwrotu i planowanie emerytury FIRE w Polsce.",
    images: ["https://finasfera.pl/og-image.png"],
  },
};

export default function MonteCarloArticleLayout({ children }) {
  return <>{children}</>;
}
