// src/lib/tradeService.js
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

/**
 * Minimalny serwis do zakupu pozycji – zapisuje JEDEN dokument w
 * users/{uid}/holdings. Rozszerzysz go później o cashflow/TWR.
 */
export async function buyStock(uid, payload) {
  if (!uid) throw new Error("buyStock: missing uid");

  // payload np.:
  // { symbol, name, shares, buyPrice, buyDate, currency?, note? }
  const safe = {
    ...payload,
    shares: Number(payload.shares || 0),
    buyPrice: Number(payload.buyPrice || 0),
    buyDate: payload.buyDate || null,
    currency: payload.currency || "PLN",
    ts: serverTimestamp(),
  };

  return await addDoc(collection(db, "users", uid, "holdings"), safe);
}
