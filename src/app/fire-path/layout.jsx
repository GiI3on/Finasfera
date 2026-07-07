// src/app/fire-path/layout.jsx
// FIX: Dodano openGraph, twitter i pełne metadata SEO
export const metadata = {
  title: "Kalkulator FIRE — Policz Kiedy Osiągniesz Wolność Finansową",
  description:
    "Oblicz swój FIRE Number (reguła 4%) i sprawdź, na jakim etapie wolności finansowej jesteś. Zbuduj plan na wcześniejszą emeryturę w Polsce krok po kroku.",
  alternates: {
    canonical: "https://finasfera.pl/fire-path",
  },
  openGraph: {
    title: "Kalkulator FIRE — Policz Kiedy Osiągniesz Wolność Finansową",
    description:
      "Oblicz FIRE Number i sprawdź, na jakim etapie wolności finansowej jesteś. Plan na wcześniejszą emeryturę.",
    url: "https://finasfera.pl/fire-path",
    type: "website",
    images: [
      {
        url: "https://finasfera.pl/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kalkulator FIRE — wolność finansowa | Finasfera",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kalkulator FIRE — Wolność Finansowa | Finasfera",
    description:
      "Oblicz FIRE Number i sprawdź, kiedy możesz przejść na wcześniejszą emeryturę.",
    images: ["https://finasfera.pl/og-image.png"],
  },
};

export default function FirePathLayout({ children }) {
  return <>{children}</>;
}
