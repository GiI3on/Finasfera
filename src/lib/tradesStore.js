// src/lib/tradesStore.js
import { db } from "../../firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

/* =========================================================
   Pomocnicze: lokalna data ISO (YYYY-MM-DD) bez przesunięcia UTC
   ========================================================= */
function isoLocal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* =========================================================
   Bezpieczna normalizacja portfolioId (jak u Ciebie w portfolioStore)
   ========================================================= */
function normPortfolioId(x) {
  if (x == null) return null;
  if (typeof x === "string") {
    const s = x.trim();
    return s ? s : null;
  }
  if (typeof x === "number") return String(x);
  if (typeof x === "object") {
    const id = x?.id;
    if (typeof id === "string" && id.trim()) return id.trim();
    if (typeof id === "number") return String(id);
    return null;
  }
  return null;
}

/* =========================================================
   Ścieżka kolekcji trades:
   - root: users/{uid}/trades
   - named: users/{uid}/portfolios/{pid}/trades
   ========================================================= */
function tradesCol(uid, portfolioId = null) {
  const pid = normPortfolioId(portfolioId);
  return pid
    ? collection(db, "users", uid, "portfolios", pid, "trades")
    : collection(db, "users", uid, "trades");
}

/**
 * Zapisuje trade do ledgera.
 * Sygnatura: addTrade(uid, payload) albo addTrade(uid, portfolioId, payload)
 *
 * payload (minimal):
 * {
 *   side: "BUY"|"SELL",
 *   symbol: "NVDA" / "PKN.WA",
 *   qty: number,
 *   pricePLN: number,
 *   date: "YYYY-MM-DD",
 *   feePLN?: number,
 *   cashImpactPLN?: number, // BUY ujemne, SELL dodatnie
 *   meta?: {...}
 * }
 */
export async function addTrade(uid, a, b) {
  if (!uid) throw new Error("addTrade: missing uid");

  const hasPortfolioArg = typeof b !== "undefined";
  const portfolioId = hasPortfolioArg ? (a || null) : null;
  const p = hasPortfolioArg ? b : a;

  const side = String(p?.side || "").toUpperCase();
  const symbol = String(p?.symbol || "").toUpperCase().trim();
  const qty = Number(p?.qty) || 0;
  const pricePLN = Number(p?.pricePLN) || 0;

  const date = p?.date ? String(p.date).slice(0, 10) : isoLocal(new Date());
  const feePLN = Number.isFinite(Number(p?.feePLN)) ? Number(p.feePLN) : 0;

  // cashImpactPLN: BUY -> ujemne, SELL -> dodatnie (łatwe sumowanie i analizy)
  let cashImpactPLN = Number(p?.cashImpactPLN);
  if (!Number.isFinite(cashImpactPLN)) {
    const gross = qty * pricePLN;
    if (side === "BUY") cashImpactPLN = -(gross + feePLN);
    else if (side === "SELL") cashImpactPLN = +(gross - feePLN);
    else cashImpactPLN = 0;
  }

  if (!side || !["BUY", "SELL"].includes(side)) {
    throw new Error("addTrade: invalid side");
  }
  if (!symbol) throw new Error("addTrade: missing symbol");
  if (!(qty > 0)) throw new Error("addTrade: invalid qty");
  if (!(pricePLN > 0)) throw new Error("addTrade: invalid pricePLN");

  const payload = {
    side,
    symbol,
    qty,
    pricePLN,
    feePLN,
    cashImpactPLN,
    date,
    source: p?.source || "TransactionForm",
    meta: p?.meta || null,
    createdAt: serverTimestamp(),
  };

  await addDoc(tradesCol(uid, portfolioId), payload);
}

/**
 * Nasłuch trades.
 * Sygnatura: listenTrades(uid, cb) albo listenTrades(uid, portfolioId, cb)
 */
export function listenTrades(uid, a, b) {
  if (!uid) return () => {};

  let portfolioId = null;
  let cb = null;

  if (typeof a === "function") cb = a;
  else if (typeof b === "function") {
    portfolioId = a;
    cb = b;
  }

  const emit = (rows) => {
    if (typeof cb === "function") cb(rows);
  };

  const q = query(tradesCol(uid, portfolioId || null), orderBy("date", "asc"), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      emit(rows);
    },
    () => emit([])
  );
}
