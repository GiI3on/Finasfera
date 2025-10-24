// src/app/api/lookup/route.js
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json({ items: [] });

    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=pl-PL&quotesCount=10`;
    const r = await fetch(url, { next: { revalidate: 10 } });
    const j = await r.json();

    const items = (j?.quotes || [])
      .filter(x => x?.symbol)
      .slice(0, 10)
      .map(x => ({
        symbol: x.symbol,
        name: x.shortname || x.longname || x.symbol,
        exchange: x.exchDisp || x.exchange || "",
        currency: x.currency || (x.symbol.endsWith(".WA") ? "PLN" : undefined),
      }));

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ items: [], error: String(e) }, { status: 200 });
  }
}
