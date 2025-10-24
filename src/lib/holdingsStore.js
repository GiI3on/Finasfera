// src/lib/holdingsStore.js
import { getApps, getApp, initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp
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

// ---------- API ----------
export function listenHoldings(uid, cb) {
  if (!uid) return () => {};
  // subkolekcja: users/{uid}/holdings
  const ref = collection(db(), "users", uid, "holdings");
  // sortuj po buyDate (string YYYY-MM-DD), a w razie braku – po ts
  const q = query(ref, orderBy("buyDate")); // prościej: sortuj tylko po buyDate (string YYYY-MM-DD)
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // debug (zobaczysz w DevTools, że coś przychodzi)
    console.log("[holdings] items:", items);
    cb?.(items);
  });
}

// (opcjonalnie – jeżeli masz przycisk „Dodaj” w UI)
export async function addHolding(uid, payload) {
  const ref = collection(db(), "users", uid, "holdings");
  const row = {
    name: payload?.name || payload?.pair?.yahoo || payload?.symbol || "",
    pair: payload?.pair || null,
    shares: Number(payload?.shares || 0),
    buyPrice: Number(payload?.buyPrice || 0),
    buyDate: toISO(payload?.buyDate || new Date()),
    ts: serverTimestamp(),
  };
  await addDoc(ref, row);
}

export async function removeHolding(uid, id) {
  if (!uid || !id) return;
  await deleteDoc(doc(db(), "users", uid, "holdings", id));
}
