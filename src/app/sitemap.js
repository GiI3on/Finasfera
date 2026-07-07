// src/app/sitemap.js
// Dynamiczna mapa witryny generowana przez Next.js App Router.
// Dostępna pod: https://finasfera.pl/sitemap.xml
// WAŻNE: Ten plik ZASTĘPUJE statyczny public/sitemap.xml
// (Next.js daje pierwszeństwo dynamicznej sitemap.js nad plikiem publicznym).

const BASE_URL = "https://finasfera.pl";

// Data ostatniej modyfikacji layoutu / contentu strony
const SITE_LAST_MOD = "2026-07-07";

export default function sitemap() {
  return [
    // ── Strona główna ─────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/`,
      lastModified: SITE_LAST_MOD,
      changeFrequency: "weekly",
      priority: 1.0,
    },

    // ── Narzędzia / Kalkulatory ───────────────────────────────────────────
    {
      url: `${BASE_URL}/fire-path`,
      lastModified: SITE_LAST_MOD,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/symulacja-monte-carlo`,
      lastModified: SITE_LAST_MOD,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/skaner-ai`,
      lastModified: SITE_LAST_MOD,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/kalkulator-inwestycyjny`,
      lastModified: SITE_LAST_MOD,
      changeFrequency: "monthly",
      priority: 0.8,
    },

    // ── Portfel ──────────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/moj-portfel`,
      lastModified: SITE_LAST_MOD,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/portfel-inwestycyjny`,
      lastModified: SITE_LAST_MOD,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/statystyki`,
      lastModified: SITE_LAST_MOD,
      changeFrequency: "weekly",
      priority: 0.8,
    },

    // ── Edukacja / Blog ───────────────────────────────────────────────────
    {
      url: `${BASE_URL}/blog`,
      lastModified: SITE_LAST_MOD,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog/symulacja-monte-carlo-emerytura`,
      lastModified: "2026-04-07",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog/jak-zaczac-inwestowac`,
      lastModified: "2026-04-01",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog/emerytura-w-polsce`,
      lastModified: "2026-03-29",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog/limit-wplat-ike-2026`,
      lastModified: "2026-04-14",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/niezaleznosc-finansowa`,
      lastModified: SITE_LAST_MOD,
      changeFrequency: "monthly",
      priority: 0.7,
    },

    // ── Społeczność ───────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/forum`,
      lastModified: SITE_LAST_MOD,
      changeFrequency: "daily",
      priority: 0.7,
    },

    // ── Strony prawne / informacyjne ──────────────────────────────────────
    {
      url: `${BASE_URL}/zastrzezenie`,
      lastModified: "2025-10-01",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/polityka-prywatnosci`,
      lastModified: "2025-10-01",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified: "2025-10-01",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/regulamin`,
      lastModified: "2025-10-01",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
