import "./globals.css";
import dynamic from "next/dynamic";

// ⬇⬇ KLUCZ: bierzemy default ALBO nazwany export
const AuthProvider = dynamic(
  () =>
    import("./components/AuthProvider").then(
      (m) => m.default ?? m.AuthProvider ?? ((p) => p.children)
    ),
  { ssr: false }
);

const TopNav = dynamic(
  () => import("./components/TopNav").then((m) => m.default ?? m.TopNav),
  { ssr: false }
);

// Cookie banner (bez SSR)
const CookieBanner = dynamic(
  () =>
    import("./components/CookieBanner").then(
      (m) => m.default ?? m.CookieBanner
    ),
  { ssr: false }
);

// 🔹 SEO + Open Graph + favicon
export const metadata = {
  title: "Finasfera — edukacyjna platforma inwestycyjna i kalkulator FIRE",
  description:
    "Finasfera.pl to niezależny projekt edukacyjny o inwestowaniu i finansowej niezależności. Kalkulator FIRE, portfel inwestycyjny, forum i narzędzia dla inwestorów.",
  keywords: [
    "Finasfera",
    "inwestowanie",
    "FIRE",
    "finansowa niezależność",
    "kalkulator inwestycyjny",
    "portfel inwestycyjny",
    "forum finansowe",
  ],
  openGraph: {
    title: "Finasfera — Twoja droga do finansowej niezależności",
    description:
      "Projekt edukacyjny o inwestowaniu i metodologii FIRE. Kalkulator FIRE, portfel inwestycyjny, forum społeczności.",
    url: "https://finasfera.pl",
    siteName: "Finasfera",
    locale: "pl_PL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finasfera — edukacja inwestycyjna i kalkulator FIRE",
    description:
      "Finasfera.pl to narzędzia, kalkulatory i społeczność osób dążących do niezależności finansowej.",
  },
  themeColor: "#facc15",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <AuthProvider>
          {/* === Pasek informacyjny o wersji beta === */}
          <div className="bg-yellow-500 text-black text-sm text-center py-2 font-medium">
            Finasfera.pl — wersja testowa (beta). Funkcjonalność może ulec
            zmianie.
          </div>

          <TopNav />
          {children}
        </AuthProvider>

        {/* === Baner cookies (pokazuje się raz) === */}
        <CookieBanner />

        {/* === Google Analytics (GA4) === */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-8424WRRES0"
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-8424WRRES0', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />

        {/* === Stopka Finasfera === */}
        <footer className="mt-12 border-t border-zinc-800 pt-8 pb-6 text-sm text-zinc-400">
          <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <p>
                © 2025 Finasfera.pl — niezależny projekt edukacyjny o
                inwestowaniu i metodologii FIRE.
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
            <div className="flex flex-col md:items-end">
              <a href="/zastrzezenie" className="hover:text-yellow-400">
                Zastrzeżenie
              </a>
              <a href="/polityka-prywatnosci" className="hover:text-yellow-400">
                Polityka prywatności
              </a>
              <a href="/cookies" className="hover:text-yellow-400">
                Polityka cookies
              </a>
              <a href="/regulamin" className="hover:text-yellow-400">
                Regulamin
              </a>
            </div>
          </div>
          <p className="text-xs mt-4 text-zinc-500">
            Uwaga: Finasfera.pl jest obecnie w fazie testowej (beta).
            Funkcjonalność może ulec zmianie, a dane prezentowane w
            kalkulatorach i statystykach mają charakter orientacyjny. W
            przyszłości planowane jest wprowadzenie wersji komercyjnej.
          </p>
        </footer>

        {/* …Twoje skrypty schema.org – bez zmian… */}
      </body>
    </html>
  );
}
