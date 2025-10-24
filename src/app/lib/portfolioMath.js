// src/app/lib/portfolioMath.js

// ✅ Formatter opcjonalny (przydaje się w UI)
export const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(v) ? v : 0);

// ✅ Bezpieczna konwersja na number: "64,04 zł" -> 64.04
export const num = (v) => {
  if (typeof v === "string") {
    v = v.replace(/\s/g, "")
         .replace("zł", "")
         .replace(",", ".");
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * ✅ ŚREDNI KOSZT (weighted average)
 * trades: [{ side: 'BUY'|'SELL', qty, pricePLN }]  // pricePLN = cena transakcyjna w PLN (SUROWA liczba)
 * - BUY zwiększa ilość i koszt
 * - SELL zmniejsza koszt wg bieżącej średniej (nie FIFO)
 */
export function averageBuyPricePLN(trades = []) {
  let qty = 0;   // aktualna ilość
  let cost = 0;  // koszt przypisany do aktualnej ilości

  for (const t of trades) {
    const q = Math.max(0, num(t.qty));
    const p = num(t.pricePLN ?? t.price_pln ?? t.price); // weź pole, które faktycznie masz

    if (t.side === "BUY") {
      qty  += q;
      cost += q * p;
    } else if (t.side === "SELL") {
      if (qty <= 0 || q <= 0) continue;
      const toReduce = Math.min(q, qty);
      const avg = qty > 0 ? cost / qty : 0;
      cost -= avg * toReduce;
      qty  -= toReduce;
    }
  }
  return qty > 0 ? cost / qty : 0;
}

/**
 * ✅ Pozycja z transakcji dla jednego symbolu
 */
export function buildPositionFromTrades(symbol, trades = []) {
  const avg = averageBuyPricePLN(trades);
  const qty = trades.reduce(
    (s, t) => s + (t.side === "BUY" ? num(t.qty) : -num(t.qty)),
    0
  );
  return {
    symbol,
    qty: Math.max(0, qty),
    avgBuyPLN: avg,
    costBasisPLN: Math.max(0, qty) * avg,
  };
}

/**
 * ✅ Zgrupuj wszystkie transakcje -> lista pozycji
 * trades: [{ symbol, side, qty, pricePLN }, ...]
 */
export function buildPositionsFromTrades(trades = []) {
  const map = new Map();
  for (const t of trades) {
    const sym = String(t.symbol || t.ticker || t.yahoo || "").toUpperCase();
    if (!sym) continue;
    if (!map.has(sym)) map.set(sym, []);
    map.get(sym).push(t);
  }
  const out = [];
  for (const [symbol, arr] of map) {
    out.push(buildPositionFromTrades(symbol, arr));
  }
  // sort wg wartości kosztu malejąco (opcjonalnie)
  out.sort((a, b) => (b.costBasisPLN || 0) - (a.costBasisPLN || 0));
  return out;
}
