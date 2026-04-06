import "./globals.css";
import dynamic from "next/dynamic";

// ⬇⬇ Importy dynamiczne komponentów klienckich
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

const CookieBanner = dynamic(
  () =>
    import("./components/CookieBanner").then(
      (m) => m.default ?? m.CookieBanner
    ),
  { ssr: false }
);

// --- NOWOŚĆ: Twój Asystent AI ---
const ChatAI = dynamic(
  () => import("./components/ChatAI").then((m) => m.default ?? m.ChatAI),
  { ssr: false }
);

// 🔹 SEO + Open Graph + Weryfikacja
export const metadata = {
  title: "Finasfera — Kalkulator FIRE i tracker portfela",
  description:
    "Oblicz kiedy osiągniesz wolność finansową. Śledź portfel, zaplanuj bezpieczną emeryturę i sprawdź przewidywania ZUS.",
  keywords: [
    "Finasfera",
    "inwestowanie",
    "FIRE",
    "finansowa niezależność",
    "kalkulator inwestycyjny",
    "kalkulator emerytalny", // <-- Dodane dla SEO
    "symulacja emerytury",   // <-- Dodane dla SEO
    "portfel inwestycyjny",
    "forum finansowe",
  ],
  openGraph: {
    title: "Finasfera — Kalkulator FIRE i tracker portfela",
    description:
      "Oblicz kiedy osiągniesz wolność finansową. Śledź portfel, zaplanuj bezpieczną emeryturę i sprawdź przewidywania ZUS.",
    url: "https://finasfera.pl",
    siteName: "Finasfera",
    locale: "pl_PL",
    type: "website",
    images: [
      {
        url: "https://finasfera.pl/og-image.png",
        width: 1200,
        height: 630,
        alt: "Finasfera.pl",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finasfera — Kalkulator FIRE i tracker portfela",
    description: "Oblicz kiedy osiągniesz wolność finansową i zaplanuj bezpieczną emeryturę.",
    images: ["https://finasfera.pl/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  themeColor: "#facc15",
  icons: {
    icon: "/icon.png", 
    apple: "/icon-192.png",
  },
  verification: {
    google: "Lo2tpbGKiA4R2gW4N_UEpuhTurpkbyVfDiPQbfIEuUo",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        
        {/* Niewidoczny skrypt JSON-LD dla robotów Google (Oficjalne powiązanie logo z marką) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Finasfera",
              "url": "https://finasfera.pl", 
              "logo": "https://finasfera.pl/icon.png" 
            })
          }}
        />

        <AuthProvider>
          <TopNav />
          <main>
            {children}
          </main>
          
          {/* === Twój pływający Asystent AI === */}
          <ChatAI />
        </AuthProvider>

        {/* === Baner cookies === */}
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
                © {new Date().getFullYear()} Finasfera.pl — niezależny projekt edukacyjny o
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
          <p className="text-xs mt-4 text-zinc-500 max-w-5xl mx-auto px-4">
            Stale rozwijamy Finasferę — daj znać co chcesz zobaczyć. Dane prezentowane w
            kalkulatorach i statystykach mają charakter wyłącznie edukacyjny i orientacyjny.
          </p>
        </footer>
      </body>
    </html>
  );
}