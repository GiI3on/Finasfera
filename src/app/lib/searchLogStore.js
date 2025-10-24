import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseClient";

/** Prosty sanitizer, usuwa undefined/NaN/puste stringi */
function sanitize(input) {
  if (input === undefined || input === null) return null;
  if (typeof input === "number" && Number.isNaN(input)) return null;
  if (typeof input === "string" && input.trim() === "") return null;
  if (Array.isArray(input)) return input.map(sanitize);
  if (typeof input === "object") {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined) continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return input;
}

async function add(uid, kind, payload) {
  try {
    if (!uid) return; // tylko zalogowani – nic nie zapisujemy anonimowo
    const col = collection(db, "users", uid, "searchLogs");
    const docData = sanitize({
      kind,                         // "click" | "no_result"
      q: payload?.q ?? null,        // zapytanie wpisane przez użytkownika
      item: payload?.item ?? null,  // wybrany wynik (dla click)
      latencyMs: payload?.latencyMs ?? null,
      ts: serverTimestamp(),        // serwerowy timestamp
      tsm: Date.now(),              // milisekundy klienta (dla wykresów)
      ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    await addDoc(col, docData);
  } catch {
    // telemetria nie może blokować UI – ignorujemy błędy
  }
}

export async function logSearchClick(uid, payload) {
  return add(uid, "click", payload);
}

export async function logNoResult(uid, payload) {
  return add(uid, "no_result", payload);
}
