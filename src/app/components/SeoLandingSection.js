// src/app/components/SeoLandingSection.js
// Uniwersalny komponent SEO dla stron freemium (Tool-as-a-Landing-Page).
// Renderowany po stronie serwera (brak "use client") – widoczny dla Googlebot.
// Props:
//   title       – string, nagłówek sekcji (h2)
//   description – string, akapit wprowadzający
//   features    – Array<{ icon?: string, title: string, body: string }>
//   faq         – Array<{ q: string, a: string }> (opcjonalne)
//   cta         – { label: string, href: string } (opcjonalne)

import Link from "next/link";

export default function SeoLandingSection({
  title,
  description,
  features = [],
  faq = [],
  cta = null,
}) {
  return (
    <section
      aria-label={title}
      className="mt-16 max-w-4xl mx-auto px-4 pb-24 text-gray-300"
    >
      {/* ── Nagłówek ─────────────────────────────────────────────────── */}
      <div className="border-t border-zinc-800 pt-12 mb-10 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-4">
          {title}
        </h2>
        {description && (
          <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed text-base">
            {description}
          </p>
        )}
      </div>

      {/* ── Cechy / Jak to działa ──────────────────────────────────── */}
      {features.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {features.map((f, i) => (
            <article
              key={i}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-600 transition-colors"
            >
              {f.icon && (
                <span className="text-2xl mb-3 block" aria-hidden="true">
                  {f.icon}
                </span>
              )}
              <h3 className="text-base font-semibold text-zinc-100 mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.body}</p>
            </article>
          ))}
        </div>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      {faq.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-zinc-100 mb-6">
            Najczęściej zadawane pytania
          </h2>
          <div className="space-y-4">
            {faq.map((item, i) => (
              <details
                key={i}
                className="group bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-medium text-zinc-200 hover:text-zinc-100 transition-colors">
                  <span>{item.q}</span>
                  <span className="ml-4 text-zinc-500 group-open:rotate-180 transition-transform shrink-0">
                    ▾
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm text-zinc-400 leading-relaxed border-t border-zinc-800 pt-3">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      {cta && (
        <div className="text-center">
          <Link
            href={cta.href}
            className="inline-block px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(250,204,21,0.15)]"
          >
            {cta.label}
          </Link>
        </div>
      )}
    </section>
  );
}
