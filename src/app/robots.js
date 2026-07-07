// src/app/robots.js
// Dynamicznie generowany plik robots.txt przez Next.js App Router.
// Dostępny pod: https://finasfera.pl/robots.txt
// WAŻNE: Ten plik ZASTĘPUJE statyczny public/robots.txt
// (Next.js daje pierwszeństwo dynamicznemu robots.js).

export default function robots() {
  return {
    rules: [
      {
        // Ogólna reguła dla wszystkich botów
        userAgent: "*",
        allow: "/",
        // Blokujemy trasy API (nie są treścią do indeksowania)
        disallow: [
          "/api/",
          "/_next/",
        ],
      },
      {
        // Googlebot może indeksować wszystko poza API
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
    ],
    // Linki do map witryny
    sitemap: "https://finasfera.pl/sitemap.xml",
    host: "https://finasfera.pl",
  };
}
