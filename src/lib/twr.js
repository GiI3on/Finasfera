/**
 * @typedef {{ t: string, close: number }} PricePoint
 * @typedef {{ history: PricePoint[], shares: number }} LotSeries
 */

/**
 * Zbiera wspólną oś dni z wszystkich historii.
 * @param {Record<string, LotSeries>} seriesById
 * @returns {string[]}
 */
function collectAxis(seriesById) {
  const s = new Set();
  for (const id of Object.keys(seriesById || {})) {
    for (const p of seriesById[id]?.history || []) {
      const d = (p?.t || "").slice(0, 10);
      if (d) s.add(d);
    }
  }
  return Array.from(s).sort();
}

/**
 * Forward-fill: 0 przed pierwszym notowaniem, potem ostatnia znana wartość.
 * @param {PricePoint[]} history
 * @param {string[]} days
 * @returns {number[]}
 */
function forwardFillWithZero(history, days) {
  const map = new Map();
  for (const p of history || []) {
    const d = (p?.t || "").slice(0, 10);
    const v = Number(p?.close);
    if (d && Number.isFinite(v)) map.set(d, v);
  }
  const out = [];
  let last = null;
  let firstSeen = false;

  for (const d of days) {
    if (map.has(d)) {
      last = Number(map.get(d)) || 0;
      firstSeen = true;
    }
    if (!firstSeen) {
      out.push(0);
    } else {
      out.push(last ?? 0);
    }
  }
  return out;
}

/**
 * Buduje serię wartości portfela: [{ t, value }].
 * Wartość = suma (close * shares) po forward-fillu i 0 przed startem pozycji.
 * @param {{ seriesById: Record<string, LotSeries>, holdings: Array<{ id: string, shares?: number }> }} params
 */
export function buildPortfolioValueSeries(params) {
  const { seriesById = {}, holdings = [] } = params || {};
  const days = collectAxis(seriesById);
  if (!days.length) return [];

  // shares: preferuj z seriesById, fallback do holdings
  const sharesById = new Map();
  for (const id of Object.keys(seriesById)) {
    const s = Number(seriesById[id]?.shares);
    if (Number.isFinite(s)) sharesById.set(id, s);
  }
  for (const h of holdings || []) {
    if (!sharesById.has(h.id)) {
      const s = Number(h?.shares) || 0;
      sharesById.set(h.id, s);
    }
  }

  // precompute FF dla każdego id
  const ffById = new Map();
  for (const id of Object.keys(seriesById)) {
    const hist = seriesById[id]?.history || [];
    const ff = forwardFillWithZero(hist, days);
    ffById.set(id, ff);
  }

  const res = [];
  for (let i = 0; i < days.length; i++) {
    let sum = 0;
    for (const id of Object.keys(seriesById)) {
      const px = ffById.get(id)?.[i] ?? 0;
      const sh = Number(sharesById.get(id)) || 0;
      if (sh > 0 && px > 0) sum += px * sh;
    }
    res.push({ t: days[i], value: sum });
  }
  return res;
}
