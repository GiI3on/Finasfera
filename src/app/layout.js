// src/app/layout.js
import "./globals.css";
import TopNav from "./components/TopNav";
import AuthProvider from "./components/AuthProvider";

export const metadata = {
  title: "Finasfera",
  description: "Kalkulator FIRE i portfel inwestycyjny",
  verification: {
    google: "Lo2tpbGKiA4R2gW4N_UEpuhTurpkbyVfDiPQbfIEuUo",
  },
  metadataBase: new URL("https://finasfera.pl"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Finasfera – Kalkulator FIRE i portfel inwestycyjny",
    description:
      "Oblicz kiedy osiągniesz wolność finansową i zarządzaj swoim portfelem inwestycyjnym. Społeczność inwestorów Finasfera.",
    url: "https://finasfera.pl",
    siteName: "Finasfera",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <AuthProvider>
          <TopNav />
          {children}
        </AuthProvider>

        {/* Schema.org dla całej witryny */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Finasfera",
              url: "https://finasfera.pl",
              logo: "https://finasfera.pl/favicon.ico",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              url: "https://finasfera.pl",
              name: "Finasfera",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://finasfera.pl/szukaj?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
