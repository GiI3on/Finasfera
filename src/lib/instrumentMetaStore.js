// File: src/lib/instrumentMetaStore.js
let admin = null;
try {
  // Jeśli masz plik z inicjalizacją Admin SDK, eksportujący { admin }, to go użyj:
  // np. src/lib/firebaseAdmin.js => module.exports = { admin };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  admin = require("./firebaseAdmin").admin || null;
} catch (_) {
  admin = null;
}

const mem = new Map(); // fallback cache in-memory (dev)

function col() {
  if (!admin) return null;
  const db = admin.firestore();
  return db.collection("instrumentMeta");
}

export async function getManyMeta(symbols = []) {
  const out = [];
  const c = col();

  if (!c) {
    for (const s of symbols) {
      const v = mem.get(s.toUpperCase());
      if (v) out.push(v);
    }
    return out;
  }

  const chunks = [];
  for (let i = 0; i < symbols.length; i += 10) chunks.push(symbols.slice(i, i + 10));
  for (const part of chunks) {
    const snaps = await Promise.all(part.map(s => c.doc(s.toUpperCase()).get()));
    for (const snap of snaps) {
      if (snap.exists) out.push(snap.data());
    }
  }
  return out;
}

export async function upsertManyMeta(entries = []) {
  const c = col();
  if (!c) {
    for (const e of entries) mem.set(String(e.symbol || "").toUpperCase(), e);
    return;
  }
  const batch = admin.firestore().batch();
  for (const e of entries) {
    const ref = c.doc(String(e.symbol || "").toUpperCase());
    batch.set(ref, e, { merge: true });
  }
  await batch.commit();
}
