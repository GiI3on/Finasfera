export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";

/**
 * Batch quotes: pobiera kursy dla wielu pozycji jednym żądaniem.
 * Wejście:
 *   { items: [ { id, pair }, ... ] }
 * Wyjście:
 *   { [id]: { pricePLN, prevClosePLN, currency, yahoo } | null }
 *
 * Implementacja to "fan-out" do Twojego istniejącego /api/quote,
 * więc korzysta 1:1 z tej samej logiki i źródeł danych.
 */

const MAX_CONCURRENCY = 6; // ile równolegle (bezpiecznie)
const BATCH_CHUNK = 50;    // gdyby ktoś wysłał setki elementów

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function mapWithConcurrency(items, mapper, limit = MAX_CONCURRENCY) {
  const ret = new Array(items.length);
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      ret[idx] = await mapper(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return ret;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      // Bezpiecznie: pusta mapa, żeby klient się nie wywrócił
      return NextResponse.json({}, { headers: { "Cache-Control": "no-store" } });
    }

    const out = {};

    // duże listy tniemy, żeby nie dusić serwera zewnętrznego/Twojego API
    for (const part of chunk(items, BATCH_CHUNK)) {
      const results = await mapWithConcurrency(
        part,
        async (item) => {
          const id = String(item?.id ?? "");
          const pair = item?.pair ?? null;
          if (!id || !pair) return [id || "?", null];

          try {
            const r = await fetch(new URL("/api/quote", req.url), {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ pair }),
              // każdy „pod-request” bez cache, nie blokujemy całego batched req
              cache: "no-store",
            });

            if (!r.ok) return [id, null];
            const json = await r.json();
            return [id, json ?? null];
          } catch {
            return [id, null];
          }
        },
        MAX_CONCURRENCY
      );

      for (const [id, val] of results) {
        if (id) out[id] = val;
      }
    }

    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // w razie totalnej awarii zwracamy pustą mapę (klient pokaże ostrzeżenie)
    return NextResponse.json({}, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
