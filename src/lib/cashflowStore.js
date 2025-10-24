// src/lib/cashflowStore.js
import { db } from "./firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

/** Ścieżka kolekcji cashflows
 * users/{uid}/cashflows  lub  users/{uid}/portfolios/{portfolioId}/cashflows
 */
function colPath(uid, portfolioId) {
  return portfolioId
    ? collection(db, "users", uid, "portfolios", portfolioId, "cashflows")
    : collection(db, "users", uid, "cashflows");
}

/** listCashflows(uid, opts)  lub  listCashflows(uid, portfolioId, opts)
 * opts: { from?: "YYYY-MM-DD", to?: "YYYY-MM-DD" }
 */
export async function listCashflows(uid, a, b) {
  let portfolioId = null;
  let opts = a;
  if (typeof a === "string") {
    portfolioId = a;
    opts = b;
  }

  const from = String((opts?.from || "1900-01-01")).slice(0, 10);
  const to   = String((opts?.to   || "2100-12-31")).slice(0, 10);

  const qy = query(
    colPath(uid, portfolioId),
    where("date", ">=", from),
    where("date", "<=", to),
    orderBy("date", "asc")
  );

  const snap = await getDocs(qy);
  const rows = [];
  snap.forEach((d) => {
    const raw = d.data() || {};
    const date = String(raw.date || "").slice(0, 10);
    const amount = Number(raw.amount || 0);
    const type = String(raw.type || "");
    rows.push({ id: d.id, ...raw, date, amount, type });
  });

  // na wszelki wypadek – stabilne sortowanie
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

/** Zewnętrzne CF (wpłaty/wypłaty) do TWR: Map<YYYY-MM-DD, kwota> */
export function sumExternalCFByDate(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const d = (r?.date || "").slice(0, 10);
    if (!d) continue;

    const t = String(r?.type || "").toUpperCase();
    const amt = Number(r?.amount || 0);

    // dopuszczamy warianty nazw (Twoje i ewentualne lowercase)
    const isDeposit  = t.startsWith("DEPOSIT");
    const isWithdraw = t.startsWith("WITHDRAW");

    if (isDeposit)  map.set(d, (map.get(d) || 0) + amt);
    if (isWithdraw) map.set(d, (map.get(d) || 0) - amt);
  }
  return map;
}

/** Wewnętrzne CF (dywidendy/fee/buy/sell) – wpływają na gotówkę, NIE na TWR */
export function sumInternalCashByDate(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const d = (r?.date || "").slice(0, 10);
    if (!d) continue;

    const t = String(r?.type || "").toUpperCase();
    const amt = Number(r?.amount || 0);

    // dywidendy (+), prowizje (-), BUY (-), SELL (+)
    if (t === "DIVIDEND" || t === "DIVIDENDS")
      map.set(d, (map.get(d) || 0) + Math.abs(amt));
    if (t === "FEE" || t === "COMMISSION" || t === "PROVISION")
      map.set(d, (map.get(d) || 0) - Math.abs(amt));
    if (t === "BUY")
      map.set(d, (map.get(d) || 0) - Math.abs(amt));
    if (t === "SELL")
      map.set(d, (map.get(d) || 0) + Math.abs(amt));
  }
  return map;
}
