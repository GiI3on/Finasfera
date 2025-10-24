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

const toISO = (d) =>
  typeof d === "string" ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);

const signAmount = (amount, type) => {
  const a = Number(amount || 0);
  if (!Number.isFinite(a)) return 0;
  return type === "WITHDRAWAL" ? -Math.abs(a) : Math.abs(a);
};

const pathRef = (uid) => collection(db(), "users", uid, "cashflows");

export async function addCashflow(
  uid,
  { amount, date = new Date(), type = "DEPOSIT", note = "", ticker = "" }
) {
  if (!uid) throw new Error("addCashflow: brak uid");
  const item = {
    amount: signAmount(amount, type),
    type,
    note,
    ticker,
    date: toISO(date),
    createdAt: serverTimestamp(),
  };
  await addDoc(pathRef(uid), item);
  return item;
}

export function addDividend(uid, { amount, date, note = "", ticker = "" }) {
  return addCashflow(uid, { amount, date, type: "DIVIDEND", note, ticker });
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

export async function getCashBalance(uid) {
  const rows = await listCashflows(uid);
  return rows.reduce((s, r) => s + Number(r.amount || 0), 0);
}

export function listenCashflows(uid, cb) {
  if (!uid) return () => {};
  const q = query(pathRef(uid), orderBy("date", "asc"));
  return onSnapshot(q, (snap) => {
    const rows = [];
    let balance = 0;
    snap.forEach((d) => {
      const row = { id: d.id, ...d.data() };
      balance += Number(row.amount || 0);
      rows.push(row);
    });
    cb?.({ rows, balance });
  });
}
