// src/app/api/logo/route.js
import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

/** Najpopularniejsze GPW/US – ręczne mapowanie domen (opcjonalnie rozszerzaj) */
const DOMAIN_MAP = {
  "PKN.WA": "orlen.pl",
  "PZU.WA": "pzu.pl",
  "PKO.WA": "pkobp.pl",
  "PEO.WA": "pekao.com.pl",
  "CDR.WA": "cdprojekt.com",
  "KGH.WA": "kghm.com",
  "ALE.WA": "allegro.pl",
  "XTB.WA": "xtb.com",
  "NVDA": "nvidia.com",
  "AAPL": "apple.com",
  "MSFT": "microsoft.com",
  "AMZN": "amazon.com",
  "GOOGL": "about.google",
  "TSLA": "tesla.com",
};

const CACHE_DIR = path.join(process.cwd(), "public", "logos-cache");
const LOCAL_DIR = path.join(process.cwd(), "public", "logos"); // tu możesz trzymać swoje SVG

async function ensureDir(p) {
  try {
    await fs.mkdir(p, { recursive: true });
  } catch {}
}

function parseHostname(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function fetchYahooWebsite(symbol) {
  // Yahoo Finance: website w module assetProfile
  const u = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=assetProfile`;
  try {
    const j = await fetch(u, { cache: "no-store" }).then((r) => r.json());
    const website = j?.quoteSummary?.result?.[0]?.assetProfile?.website;
    const host = parseHostname(website);
    return host;
  } catch {
    return null;
  }
}

async function fetchClearbitLogo(host) {
  const url = `https://logo.clearbit.com/${host}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  return buf;
}

async function readIfExists(p) {
  try {
    return await fs.readFile(p);
  } catch {
    return null;
  }
}

function initialsFromSymbol(sym = "") {
  const s = String(sym).replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (s.length <= 3) return s;
  return s.slice(0, 3);
}

function svgPlaceholder(sym) {
  const txt = initialsFromSymbol(sym);
  // ciemne tło z delikatnym gradientem + białe inicjały
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#27272a"/>
      <stop offset="100%" stop-color="#3f3f46"/>
    </linearGradient>
  </defs>
  <circle cx="48" cy="48" r="48" fill="url(#g)"/>
  <text x="50%" y="55%" text-anchor="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell" font-size="36" fill="#ffffff" font-weight="700">
    ${txt}
  </text>
</svg>`;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("symbol") || "").trim();
  if (!raw) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const symbol = raw.toUpperCase();

  await ensureDir(CACHE_DIR);

  // 1) Cache na dysku
  const cachePng = path.join(CACHE_DIR, `${symbol}.png`);
  const cacheSvg = path.join(CACHE_DIR, `${symbol}.svg`);
  const cachedPng = await readIfExists(cachePng);
  if (cachedPng) {
    return new NextResponse(cachedPng, {
      headers: { "content-type": "image/png", "cache-control": "public, max-age=2592000" },
    });
  }
  const cachedSvg = await readIfExists(cacheSvg);
  if (cachedSvg) {
    return new NextResponse(cachedSvg, {
      headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=2592000" },
    });
  }

  // 2) Lokalny katalog logos (np. /public/logos/PKN.WA.svg)
  const localSvgPath = path.join(LOCAL_DIR, `${symbol}.svg`);
  const localSvg = await readIfExists(localSvgPath);
  if (localSvg) {
    // skopiuj do cache żeby kolejne requesty były z cache
    await fs.writeFile(cacheSvg, localSvg);
    return new NextResponse(localSvg, {
      headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=2592000" },
    });
  }

  // 3) Domena – mapa ręczna → Yahoo
  let host = DOMAIN_MAP[symbol] || null;
  if (!host) host = await fetchYahooWebsite(symbol);

  // 4) Clearbit
  if (host) {
    const png = await fetchClearbitLogo(host);
    if (png) {
      await fs.writeFile(cachePng, png);
      return new NextResponse(png, {
        headers: { "content-type": "image/png", "cache-control": "public, max-age=2592000" },
      });
    }
  }

  // 5) Placeholder (SVG) z inicjałami
  const svg = svgPlaceholder(symbol);
  await fs.writeFile(cacheSvg, svg);
  return new NextResponse(svg, {
    headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=2592000" },
  });
}
