// src/app/layout.js
// Ten plik jest Server Component. Metadata zdefiniowana tutaj
// trafia jako tagi <title>/<meta> do każdej podstrony jako wartość domyślna.

import "./globals.css";
import Link from "next/link";
import dynamic from "next/dynamic";

// Komponenty klienckie ładowane dynamicznie (ssr:false = bezpieczne dla hydracji)
const AuthProvider = dynamic(
  () =>
    import("./components/AuthProvider").then(
      (m) => m.default ?? m.AuthProvider ?? ((p) => p.children)
    ),
  { ssr: false }
);

// TopNav ładujemy Z włączonym SSR, aby Google widział linki nawigacji
// (ssr:false powoduje, że crawler nie widzi menu i nie może przejść po stronach!)
const TopNav = dynamic(
  () => import("./components/TopNav").then((m) => m.default ?? m.TopNav),
  { ssr: true }
);

const CookieBanner = dynamic(
  () =>
    import("./components/CookieBanner").then(
      (m) => m.default ?? m.CookieBanner
    ),
  { ssr: false }
);

const ChatAI = dynamic(
  () => import("./components/ChatAI").then((m) => m.default ?? m.ChatAI),
  { ssr: false }
);

// ── Metadata domyślna (nadpisywana przez podstrony) ──────────────────────────
export const metadata = {
  metadataBase: new URL("https://finasfera.pl"),

  // Szablon tytułu: podstrony mogą używać %s, np. title: "Blog | %s"
  title: {
    default: "Finasfera — Kalkulator FIRE i Tracker Portfela Inwestycyjnego",
    template: "%s | Finasfera.pl",
  },
  description:
    "Darmowy kalkulator FIRE i niezależności finansowej. Oblicz kiedy osiągniesz wolność finansową, śledź portfel inwestycyjny ETF i akcji i zaplanuj bezpieczną emeryturę w Polsce.",
  keywords: [
    "kalkulator FIRE",
    "wolność finansowa",
    "niezależność finansowa",
    "kalkulator inwestycyjny",
    "kalkulator emerytalny",
    "symulacja Monte Carlo emerytura",
    "tracker portfela inwestycyjnego",
    "FIRE Polska",
    "IKE IKZE",
    "ETF Polska",
    "portfel inwestycyjny online",
    "Finasfera",
  ],
  authors: [{ name: "Finasfera", url: "https://finasfera.pl" }],
  creator: "Finasfera",
  publisher: "Finasfera",

  // Robots: jawnie zezwalamy na indeksowanie
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Open Graph (Facebook, LinkedIn, Messenger)
  openGraph: {
    title: "Finasfera — Kalkulator FIRE i Tracker Portfela Inwestycyjnego",
    description:
      "Darmowy kalkulator FIRE i niezależności finansowej. Oblicz kiedy osiągniesz wolność finansową i zaplanuj bezpieczną emeryturę.",
    url: "https://finasfera.pl",
    siteName: "Finasfera",
    locale: "pl_PL",
    type: "website",
    images: [
      {
        url: "https://finasfera.pl/og-image.png",
        width: 1200,
        height: 630,
        alt: "Finasfera — Kalkulator FIRE i wolność finansowa",
      },
    ],
  },

  // Twitter/X Card
  twitter: {
    card: "summary_large_image",
    title: "Finasfera — Kalkulator FIRE i Tracker Portfela",
    description:
      "Oblicz kiedy osiągniesz wolność finansową i zaplanuj bezpieczną emeryturę.",
    images: ["https://finasfera.pl/og-image.png"],
    creator: "@finasfera",
  },

  // Ikony
  icons: {
    icon: "/icon.png",
    apple: "/icon-192.png",
    shortcut: "/icon.png",
  },

  // Theme color (PWA / mobile Chrome)
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b10" },
    { media: "(prefers-color-scheme: light)", color: "#facc15" },
  ],

  // Weryfikacja Google Search Console
  verification: {
    google: "Lo2tpbGKiA4R2gW4N_UEpuhTurpkbyVfDiPQbfIEuUo",
  },

  // Canonical jest ustawiany per-strona przez alternates.canonical
  // Domyślnie Next.js generuje go automatycznie na podstawie URL
};

// ── Root Layout (Server Component) ──────────────────────────────────────────
export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">

        {/* JSON-LD: Organizacja — pomaga Google powiązać logo z marką */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Finasfera",
              url: "https://finasfera.pl",
              logo: "https://finasfera.pl/icon.png",
              sameAs: [],
              contactPoint: {
                "@type": "ContactPoint",
                email: "kontakt.finasfera@gmail.com",
                contactType: "customer support",
              },
            }),
          }}
        />

        {/* JSON-LD: WebSite — umożliwia Sitelinks Searchbox w Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Finasfera",
              url: "https://finasfera.pl",
              description:
                "Darmowy kalkulator FIRE, tracker portfela inwestycyjnego i symulacja Monte Carlo dla emerytury.",
              inLanguage: "pl-PL",
            }),
          }}
        />

        <AuthProvider>
          {/* TopNav: ssr:true → Google widzi linki, może je zaindeksować */}
          <TopNav />
          <main id="main-content">
            {children}
          </main>
          <ChatAI />
        </AuthProvider>

        {/* Baner cookies */}
        <CookieBanner />

        {/* Google Analytics GA4 */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-8424WRRES0"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-8424WRRES0', { page_path: window.location.pathname });
            `,
          }}
        />

        {/* Stopka — Link zamiast <a> dla spójnego prefetchingu Next.js */}
        <footer
          aria-label="Stopka strony"
          className="mt-12 border-t border-zinc-800 pt-8 pb-6 text-sm text-zinc-400"
        >
          <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <p>
                © {new Date().getFullYear()} Finasfera.pl — niezależny projekt
                edukacyjny o inwestowaniu i metodologii FIRE.
              </p>
              <p>
                Kontakt:{" "}
                <a
                  href="mailto:kontakt.finasfera@gmail.com"
                  className="hover:text-yellow-400"
                >
                  kontakt.finasfera@gmail.com
                </a>
              </p>
            </div>
            <nav aria-label="Linki prawne" className="flex flex-col md:items-end gap-1">
              <Link href="/zastrzezenie" className="hover:text-yellow-400">
                Zastrzeżenie
              </Link>
              <Link href="/polityka-prywatnosci" className="hover:text-yellow-400">
                Polityka prywatności
              </Link>
              <Link href="/cookies" className="hover:text-yellow-400">
                Polityka cookies
              </Link>
              <Link href="/regulamin" className="hover:text-yellow-400">
                Regulamin
              </Link>
            </nav>
          </div>
          <p className="text-xs mt-4 text-zinc-500 max-w-5xl mx-auto px-4">
            Stale rozwijamy Finasferę — daj znać co chcesz zobaczyć. Dane
            prezentowane w kalkulatorach i statystykach mają charakter wyłącznie
            edukacyjny i orientacyjny.
          </p>
        </footer>
      </body>
    </html>
  );
}
