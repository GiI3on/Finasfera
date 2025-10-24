export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";

/** Strzela do /api/history pełnym URL, żeby uniknąć problemów ze ścieżką względną. */
async function getOne(baseOrigin, symbol, range, interval) {
  const url = `${baseOrigin}/api/history`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ yahoo: symbol, range, interval }),
    cache: "no-store",
  });
  if (!r.ok) return { historyPLN: [] };
  try { return await r.json(); } catch { return { historyPLN: [] }; }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw =
      Array.isArray(body?.symbols) ? body.symbols :
      Array.isArray(body?.pairs) ? body.pairs.map(p => p?.yahoo).filter(Boolean) :
      [];
    // deduplikacja
    const symbols = Array.from(new Set(raw.map(s => String(s || "").toUpperCase()).filter(Boolean)));

    const range = String(body?.range || "1y");
    const interval = String(body?.interval || "1d").toLowerCase();

    if (!symbols.length) return NextResponse.json({ results: {} });

    const baseOrigin = req.nextUrl.origin;

    const out = {};
    // ZWIĘKSZONA RÓWNOLEGŁOŚĆ -> szybciej kończymy partię
    const CONCURRENCY = Math.min(24, symbols.length);
    let idx = 0;

    async function worker() {
      while (idx < symbols.length) {
        const i = idx++;
        const sym = symbols[i];
        try {
          const data = await getOne(baseOrigin, sym, range, interval);
          out[sym] = Array.isArray(data?.historyPLN) ? data.historyPLN : [];
        } catch {
          out[sym] = [];
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    return NextResponse.json({ results: out });
  } catch {
    return NextResponse.json({ results: {} });
  }
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const symbols = Array.from(
      new Set(
        (url.searchParams.get("symbols") || "")
          .split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
      )
    );
    const range = url.searchParams.get("range") || "1y";
    const interval = String(url.searchParams.get("interval") || "1d").toLowerCase();

    if (!symbols.length) return NextResponse.json({ results: {} });

    const baseOrigin = req.nextUrl.origin;

    const out = {};
    const CONCURRENCY = Math.min(24, symbols.length);
    let idx = 0;

    async function worker() {
      while (idx < symbols.length) {
        const i = idx++;
        const sym = symbols[i];
        try {
          const data = await getOne(baseOrigin, sym, range, interval);
          out[sym] = Array.isArray(data?.historyPLN) ? data.historyPLN : [];
        } catch {
          out[sym] = [];
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    return NextResponse.json({ results: out });
  } catch {
    return NextResponse.json({ results: {} });
  }
}
