// src/app/lib/transactionsStore.js
import { db } from "./firebase";
import {
  addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot,
  orderBy, query, serverTimestamp, updateDoc, where
} from "firebase/firestore";

export const TX_TYPES = {
  BUY: "BUY",
  SELL: "SELL",
  DEPOSIT: "DEPOSIT",
  WITHDRAWAL: "WITHDRAWAL",
  DIVIDEND: "DIVIDEND",
  FEE: "FEE",
  SPLIT: "SPLIT",
};

const txCol = (uid, pid) => collection(db, "users", uid, "portfolios", pid, "transactions");

export async function addTransaction(uid, pid, tx) {
  // Minimalna walidacja + standaryzacja daty
  const date = (tx.date || "").slice(0, 10);
  const docIn = {
    type: tx.type,
    date,
    symbol: tx.symbol || null,
    qty: Number.isFinite(+tx.qty) ? +tx.qty : null,
    price: Number.isFinite(+tx.price) ? +tx.price : null,
    amount: Number.isFinite(+tx.amount) ? +tx.amount : null,
    currency: tx.currency || "PLN",
    fee: Number.isFinite(+tx.fee) ? +tx.fee : 0,
    note: tx.note || "",
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(txCol(uid, pid), docIn);
  return ref.id;
}

export function listenTransactions(uid, pid, cb, opts = {}) {
  if (!uid || !pid) return () => {};
  const clauses = [];
  if (opts.from) clauses.push(where("date", ">=", String(opts.from).slice(0, 10)));
  if (opts.to)   clauses.push(where("date", "<=", String(opts.to).slice(0, 10)));
  const q = query(
    txCol(uid, pid),
    ...clauses,
    orderBy("date", "desc"),
    orderBy("createdAt", "desc"),
    ...(opts.limitN ? [limit(opts.limitN)] : [])
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function listTransactions(uid, pid, opts = {}) {
  const clauses = [];
  if (opts.from) clauses.push(where("date", ">=", String(opts.from).slice(0, 10)));
  if (opts.to)   clauses.push(where("date", "<=", String(opts.to).slice(0, 10)));
  const q = query(
    txCol(uid, pid),
    ...clauses,
    orderBy("date", "asc"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateTransaction(uid, pid, id, patch) {
  await updateDoc(doc(db, "users", uid, "portfolios", pid, "transactions", id), patch);
}

export async function deleteTransaction(uid, pid, id) {
  await deleteDoc(doc(db, "users", uid, "portfolios", pid, "transactions", id));
}
