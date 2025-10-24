// File: src/lib/instrumentMetaClient.js
export async function fetchInstrumentMeta(symbols = []) {
  if (!symbols.length) return {};
  const url = `/api/instrument-meta?symbols=${encodeURIComponent(symbols.join(","))}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    return j?.meta || {};
  } catch {
    return {};
  }
}
