// File: src/app/api/riskfree/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";

/** Prosty cache w pamięci (na ~12h) */
const cache = new Map();
const TTL = 12 * 60 * 60 * 1000;

function setCache(k, v) { cache.set(k, { v, exp: Date.now() + TTL }); }
function getCache(k) {
  const it = cache.get(k);
  if (!it) return null;
  if (it.exp && it.exp < Date.now()) { cache.delete(k); return null; }
  return it.v;
}

function toDailyFromAnnual(annual) {
  const a = Number(annual) || 0;
  return Math.pow(1 + a, 1 / 252) - 1;
}

/** Wyciągnij liczbę w % -> na ułamek (np. "4,34853" -> 0.0434853) */
function pctToFloat(pctStr) {
  if (!pctStr) return null;
  const x = String(pctStr).trim().replace(/\s+/g, "").replace(",", ".");
  const n = Number(x);
  return Number.isFinite(n) ? n / 100 : null;
}

/** Parser: strona główna EN z kafelkami (dość stabilna) */
function parseFromHome(html) {
  // przykładowy fragment: "WIRON® 1M Compound Rate, 4.34853%, 2025-09-10"
  const m = html.match(/WIRON[^%]*?1M[^%]*?([0-9.,]+)%[^0-9]*?(\d{4}-\d{2}-\d{2})/i);
  if (m) {
    const annual = pctToFloat(m[1]);
    const asOf = m[2];
    if (annual != null) return { annual, asOf, source: "GPW Benchmark (home)" };
  }
  // fallback: chwyć pierwsze "1M ... %" jeśli jest
  const m2 = html.match(/1M[^%]{0,40}?([0-9.,]+)%/i);
  if (m2) {
    const annual = pctToFloat(m2[1]);
    if (annual != null) return { annual, asOf: null, source: "GPW Benchmark (home, loose)" };
  }
  return null;
}

/** Parser: „Index data and statistics” – tabela z kolumnami */
function parseFromTable(html) {
  // nagłówek: "WIRON® Compound Rates" ... "1M in %"
  // złap pierwszy (najświeższy) odczyt po frazie "1M in %"
  const block = html.split(/1M in %/i)[1];
  if (!block) return null;
  const m = block.match(/([0-9.,]{1,10})/);
  if (!m) return null;
  const annual = pctToFloat(m[1]);
  if (annual == null) return null;

  // spróbuj jeszcze złapać datę z nagłówka/wierszy obok
  const d = html.match(/(\d{4}-\d{2}-\d{2})/);
  const asOf = d ? d[1] : null;
  return { annual, asOf, source: "GPW Benchmark (table)" };
}

async function fetchWiron1M() {
  const CK = "wiron1m";
  const c = getCache(CK);
  if (c) return c;

  const HEADERS = {
    "User-Agent": "Mozilla/5.0",
    Accept: "text/html,*/*",
    "Accept-Language": "en,en-US;q=0.9"
  };
  const urls = [
    "https://gpwbenchmark.pl/en-home",
    "https://gpwbenchmark.pl/index-data-and-statistics",
  ];

  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: HEADERS, cache: "no-store" });
      if (!r.ok) continue;
      const html = await r.text();

      const parsed = u.includes("en-home") ? parseFromHome(html) : parseFromTable(html);
      if (parsed?.annual != null) {
        const out = {
          kind: "WIRON_1M_COMPOUND",
          annual: parsed.annual,
          daily: toDailyFromAnnual(parsed.annual),
          asOf: parsed.asOf,
          source: parsed.source,
        };
        setCache(CK, out);
        return out;
      }
    } catch { /* ignore and try next */ }
  }

  // Fallback: ENV lub bezpieczna stała
  const fallbackAnnual =
    Number(process.env.NEXT_PUBLIC_RF_PLN_ANNUAL || process.env.RF_PLN_ANNUAL) || 0.04;
  const out = {
    kind: "WIRON_1M_COMPOUND",
    annual: fallbackAnnual,
    daily: toDailyFromAnnual(fallbackAnnual),
    asOf: null,
    source: "fallback",
  };
  setCache(CK, out);
  return out;
}

export async function GET() {
  try {
    const rf = await fetchWiron1M();
    return NextResponse.json(rf);
  } catch {
    const annual = 0.04;
    return NextResponse.json({
      kind: "WIRON_1M_COMPOUND",
      annual,
      daily: toDailyFromAnnual(annual),
      asOf: null,
      source: "fallback-error",
    });
  }
}

// opcjonalnie POST dla zgodności
export async function POST() {
  return GET();
}
