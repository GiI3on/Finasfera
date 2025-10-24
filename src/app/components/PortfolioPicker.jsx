// File: src/lib/portfolioStore.js
import { db } from "./firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

/** ============ HOLDINGS (pozycje) ============ **/

export function listenHoldings(uid, cb) {
  if (!uid) return () => {};
  const q = query(collection(db, "users", uid, "holdings"), orderBy("buyDate", "asc"));
  return onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb(rows);
  });
}

export async function addHolding(uid, item, opts = {}) {
  // item: { name, pair, shares, buyPrice, buyDate }
  const ref = await addDoc(collection(db, "users", uid, "holdings"), {
    name: item.name || item.pair?.yahoo || "—",
    pair: item.pair || null,
    shares: Number(item.shares) || 0,
    buyPrice: Number(item.buyPrice) || 0,
    buyDate: item.buyDate || new Date().toISOString().slice(0, 10),
    ts: serverTimestamp(),
  });

  // (opcjonalnie) automatyczna obsługa gotówki przy zakupie
  const shares = Number(item.shares) || 0;
  const price  = Number(item.buyPrice) || 0;
  const cost   = shares * price;

  const topUpExplicit = Number.isFinite(Number(opts.topUp)) ? Number(opts.topUp) : null;
  const topUp = topUpExplicit === null
    ? (opts.autoTopUp ? cost : 0)
    : topUpExplicit;

  if (topUp) {
    await addCashflow(uid, {
      amount: topUp,
      type: "deposit",
      date: item.buyDate,
      note: "Auto-zasilenie pod zakup",
    });
  }

  if (cost) {
    await addCashflow(uid, {
      amount: -cost,
      type: "buy",
      date: item.buyDate,
      note: item.pair?.yahoo || item.name || "Zakup",
    });
  }

  return ref.id;
}

export async function removeHolding(uid, id) {
  await deleteDoc(doc(db, "users", uid, "holdings", id));
}

// pomocniczo: zmiana liczby akcji w danym dokumencie
async function setHoldingShares(uid, id, shares) {
  await setDoc(doc(db, "users", uid, "holdings", id), { shares: Number(shares) || 0 }, { merge: true });
}

/**
 * SELL – sprzedaje łączną ilość 'qty' danego tickera (FIFO po lotach),
 * tworzy dodatni cashflow typu 'sell' na kwotę qty * price.
 */
export async function sellPosition(uid, { yahoo, qty, price, date, note }) {
  const symbol = String(yahoo || "").toUpperCase().trim();
  const sellQty = Number(qty) || 0;
  const px = Number(price) || 0;
  if (!uid || !symbol || sellQty <= 0 || px <= 0) return;

  const q = query(
    collection(db, "users", uid, "holdings"),
    where("pair.yahoo", "==", symbol),
    orderBy("buyDate", "asc")
  );
  const snap = await getDocs(q);
  let remaining = sellQty;

  for (const d of snap.docs) {
    if (remaining <= 0) break;
    const row = { id: d.id, ...d.data() };
    const have = Number(row.shares) || 0;
    if (have <= 0) continue;

    const use = Math.min(have, remaining);
    const left = have - use;

    if (left > 0) {
      await setHoldingShares(uid, row.id, left);
    } else {
      await removeHolding(uid, row.id);
    }
    remaining -= use;
  }

  const proceeds = sellQty * px;
  await addCashflow(uid, {
    amount: proceeds,
    type: "sell",
    date: (date ? new Date(date) : new Date()).toISOString().slice(0, 10),
    note: note || symbol,
  });
}

/**
 * SPLIT – dla wszystkich lotów danego tickera:
 * shares *= ratio, buyPrice /= ratio (zachowujemy koszt całkowity).
 */
export async function applySplit(uid, { yahoo, ratio, date }) {
  const symbol = String(yahoo || "").toUpperCase().trim();
  const r = Number(ratio);
  if (!uid || !symbol || !(r > 0)) return;

  const q = query(
    collection(db, "users", uid, "holdings"),
    where("pair.yahoo", "==", symbol),
    orderBy("buyDate", "asc")
  );
  const snap = await getDocs(q);

  for (const d of snap.docs) {
    const row = { id: d.id, ...d.data() };
    const newShares = (Number(row.shares) || 0) * r;
    const newPrice  = (Number(row.buyPrice) || 0) / r;
    await updateDoc(doc(db, "users", uid, "holdings", row.id), {
      shares: newShares,
      buyPrice: newPrice,
    });
  }

  await addCashflow(uid, {
    amount: 0,
    type: "manual",
    date: (date ? new Date(date) : new Date()).toISOString().slice(0, 10),
    note: `SPLIT ${symbol} x${r}`,
  });
}

/** ============ CASHFLOWS (gotówka) ============ **/

export async function addCashflow(
  uid,
  { amount, type = "manual", date = null, note = "" }
) {
  const payload = {
    amount: Number(amount) || 0,
    type, // 'deposit'|'withdraw'|'buy'|'sell'|'dividend'|'fee'|'manual'
    note: note || null,
    date: (date ? new Date(date) : new Date()).toISOString().slice(0, 10),
    ts: serverTimestamp(),
  };
  await addDoc(collection(db, "users", uid, "cashflows"), payload);
}

export function listenCashBalance(uid, cb) {
  if (!uid) return () => {};
  const q = query(collection(db, "users", uid, "cashflows"), orderBy("date", "asc"));
  return onSnapshot(q, (snap) => {
    let balance = 0;
    const flows = [];
    snap.forEach((d) => {
      const row = { id: d.id, ...d.data() };
      balance += Number(row.amount) || 0;
      flows.push(row);
    });
    cb({ balance, flows });
  });
}

// Wygodne aliasy:
export const addDeposit    = (uid, { amount, date, note }) => addCashflow(uid, { amount: +amount, date, note, type: "deposit" });
export const addWithdrawal = (uid, { amount, date, note }) => addCashflow(uid, { amount: -Math.abs(+amount), date, note, type: "withdraw" });
export const addDividend   = (uid, { amount, date, note }) => addCashflow(uid, { amount: +amount, date, note, type: "dividend" });
export const addFee        = (uid, { amount, date, note }) => addCashflow(uid, { amount: -Math.abs(+amount), date, note, type: "fee" });
