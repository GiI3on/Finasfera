// src/lib/cashStore.js
import { getApps, getApp, initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

let _db = null;
function db() {
  if (_db) return _db;
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app = getApps().length ? getApp() : initializeApp(cfg);
  _db = getFirestore(app);
  return _db;
}

export const CASHFLOW_TYPES = {
  DEPOSIT: "DEPOSIT",
  WITHDRAWAL: "WITHDRAWAL",
  DIVIDEND: "DIVIDEND",
  INTEREST: "INTEREST",
  TAX: "TAX",
  FEE: "FEE",
  ADJ: "ADJ",               // auto-zasilenie przy BUY / wpływ ze sprzedaży
  SET_BALANCE: "SET_BALANCE",
};

const toISO = (d) =>
  typeof d === "string" ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
const normalizeAmount = (a) => Number(a || 0);

const pathRef = (uid) => collection(db(), "users", uid, "cashflows");

export async function addCashflow(
  uid,
  { amount, date = new Date(), type = CASHFLOW_TYPES.DEPOSIT, note = "", ticker = "", currency = "PLN" }
) {
  if (!uid) throw new Error("addCashflow: brak uid");
  const item = {
    amount: normalizeAmount(amount),
    type, note, ticker, currency,
    date: toISO(date),
    createdAt: serverTimestamp(),
  };
  await addDoc(pathRef(uid), item);
  return item;
}

// Szybkie helpery
export function addDeposit(uid, { amount, date, note = "", currency = "PLN" }) {
  return addCashflow(uid, { amount, date, note, currency, type: CASHFLOW_TYPES.DEPOSIT });
}
export function addWithdrawal(uid, { amount, date, note = "", currency = "PLN" }) {
  return addCashflow(uid, { amount: -Math.abs(amount), date, note, currency, type: CASHFLOW_TYPES.WITHDRAWAL });
}
export function addDividend(uid, { amount, date, note = "", ticker = "", currency = "PLN" }) {
  return addCashflow(uid, { amount, date, note, ticker, currency, type: CASHFLOW_TYPES.DIVIDEND });
}
export function addFee(uid, { amount, date, note = "Fee", currency = "PLN" }) {
  return addCashflow(uid, { amount: -Math.abs(amount), date, note, currency, type: CASHFLOW_TYPES.FEE });
}
export function addTax(uid, { amount, date, note = "Tax", currency = "PLN" }) {
  return addCashflow(uid, { amount: -Math.abs(amount), date, note, currency, type: CASHFLOW_TYPES.TAX });
}

export async function setBalance(uid, { target, date = new Date(), currency = "PLN", note = "SET_BALANCE" }) {
  const rows = await listCashflows(uid);
  const cur = rows.reduce((s, r) => s + normalizeAmount(r.amount || 0), 0);
  const diff = normalizeAmount(target) - cur;
  if (Math.abs(diff) < 1e-8) return null;
  return addCashflow(uid, { amount: diff, date, note, currency, type: CASHFLOW_TYPES.SET_BALANCE });
}

export async function removeCashflow(uid, id) {
  if (!uid || !id) return;
  await deleteDoc(doc(db(), "users", uid, "cashflows", id));
}

export async function listCashflows(uid, { from, to } = {}) {
  if (!uid) return [];
  const q = query(pathRef(uid), orderBy("date", "asc"));
  const snap = await getDocs(q);
  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (from) rows = rows.filter((r) => String(r.date) >= toISO(from));
  if (to) rows = rows.filter((r) => String(r.date) <= toISO(to));
  return rows;
}

export function listenCashflows(uid, cb) {
  if (!uid) return () => {};
  const q = query(pathRef(uid), orderBy("date", "asc"));
  return onSnapshot(q, (snap) => {
    const rows = [];
    let balance = 0;
    snap.forEach((d) => {
      const row = { id: d.id, ...d.data() };
      balance += normalizeAmount(row.amount || 0);
      rows.push(row);
    });
    cb?.({ rows, balance });
  });
}
