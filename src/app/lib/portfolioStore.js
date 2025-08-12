// src/app/lib/portfolioStore.js
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebaseClient";

const colRef = (uid) => collection(db, "users", uid, "holdings");

export function listenHoldings(uid, cb) {
  const q = query(colRef(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cb(items);
  });
}

export async function addHolding(uid, item) {
  // spodziewamy się {name, pair:{yahoo,stooq}, shares, buyPrice, buyDate}
  return await addDoc(colRef(uid), {
    ...item,
    createdAt: Date.now(),
  });
}

export async function removeHolding(uid, id) {
  return await deleteDoc(doc(db, "users", uid, "holdings", id));
}
