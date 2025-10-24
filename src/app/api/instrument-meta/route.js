// File: src/app/api/instrument-meta/route.js
import { NextResponse } from "next/server";
import { getManyMeta, upsertManyMeta } from "../../../lib/instrumentMetaStore";

// -------- Yahoo fetch (server-side) --------
async function fetchYahooMeta(symbol) {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=assetProfile,fundProfile,price`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Yahoo error for ${symbol}: ${r.status}`);
  const j = await r.json();
  const res = j?.quoteSummary?.result?.[0] || {};

  const sectorRaw =
    res?.assetProfile?.sector ||
    res?.fundProfile?.category ||
    res?.price?.sector ||
    "";

  const industryRaw =
    res?.assetProfile?.industry ||
    res?.fundProfile?.styleBoxUrl ||
    res?.price?.industry ||
    "";

  const countryRaw =
    res?.assetProfile?.country ||
    res?.price?.exchangeName ||
    "";

  return {
    sectorRaw,
    industryRaw,
    countryRaw,
    source: "yahoo",
  };
}

// -------- Normalizacja sektorów --------
const SECTOR_MAP = [
  { re: /information\s*technology|technology|tech/i, out: "Technologia" },
  { re: /health|pharma|biotech|biotechnology|medical/i, out: "Ochrona zdrowia" },
  { re: /financial|bank|insurance|insurer|broker/i, out: "Finanse" },
  { re: /energy|oil|gas|petrol|fuel/i, out: "Energia" },
  { re: /material|chem|metal|steel|aluminum|mining/i, out: "Materiały" },
  { re: /industrial|industry|aerospace|defense|manufact/i, out: "Przemysł" },
  { re: /(consumer).*(discretionary|cyc)/i, out: "Dobra konsumpcyjne cykliczne" },
  { re: /(consumer).*(staples|defen)/i, out: "Dobra konsumpcyjne defensywne" },
  { re: /communication|telecom|media/i, out: "Usługi komunikacyjne" },
  { re: /real\s*estate|reit/i, out: "Nieruchomości" },
  { re: /utility/i, out: "Usługi użyteczności publicznej" },
];

function normalizeSector(sRaw = "") {
  const s = String(sRaw).trim();
  for (const m of SECTOR_MAP) if (m.re.test(s)) return m.out;
  return s ? s : "Inne";
}

function normalizeCountry(cRaw = "") {
  const c = String(cRaw).toLowerCase();
  if (/(poland|warsaw|gpw|\.wa)/.test(c)) return "Polska";
  if (/germany|frankfurt|\.de/.test(c)) return "Niemcy";
  if (/france|paris|\.pa/.test(c)) return "Francja";
  if (/united kingdom|london|\.l\b/.test(c)) return "Wielka Brytania";
  if (/united states|usa|nasdaq|nyse|amex|\.n?as?d?q?/.test(c)) return "USA";
  return cRaw || "Nieznany";
}

const TTL_DAYS = 90;
const MS_DAY = 24 * 3600 * 1000;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const list = String(searchParams.get("symbols") || "")
      .split(",")
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    if (!list.length) {
      return NextResponse.json({ meta: {} }, { status: 200 });
    }

    // 1) cache
    const cached = await getManyMeta(list);
    const bySym = new Map(cached.map(e => [e.symbol.toUpperCase(), e]));

    // 2) co pobrać (przeterminowane albo brak)
    const now = Date.now();
    const toFetch = list.filter(sym => {
      const hit = bySym.get(sym);
      if (!hit) return true;
      const ts = Number(new Date(hit.updatedAt || 0).getTime() || 0);
      return now - ts > TTL_DAYS * MS_DAY;
    });

    const fresh = [];
    for (const sym of toFetch) {
      try {
        const y = await fetchYahooMeta(sym);
        const sector = normalizeSector(y.sectorRaw);
        const industry = y.industryRaw || "";
        const country = normalizeCountry(y.countryRaw || "");
        fresh.push({
          symbol: sym,
          sector,
          industry,
          country,
          source: "yahoo",
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // brak profilu – trudno, zostanie heurystyka po stronie klienta
      }
    }

    if (fresh.length) {
      await upsertManyMeta(fresh);
      for (const f of fresh) bySym.set(f.symbol, f);
    }

    const out = {};
    for (const s of list) {
      const hit = bySym.get(s);
      if (hit) out[s] = hit;
    }

    return NextResponse.json({ meta: out }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
