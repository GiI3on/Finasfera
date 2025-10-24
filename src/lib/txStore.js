// src/lib/txStore.js
// Store pozycji zgodny z Twoim UI i dawną lokalizacją danych:
//   users/{uid}/holdings
// Pola dokumentu: { name, pair, shares, buyPrice, buyDate, ts }

let _dbWrap = null;

// Leniwa inicjalizacja Firestore (ESM, bez psucia SSR)
async function getDb() {
  if (_dbWrap) return _dbWrap;
  try {
    const { initializeApp, getApps, getApp } = await import("firebase/app");
    const {
      getFirestore,
      collection,
      addDoc,
      getDocs,
      deleteDoc,
      doc,
      query,
      orderBy,
      onSnapshot,
      serverTimestamp,
    } = await import("firebase/firestore");

    const cfg = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    const app = getApps().length ? getApp() : initializeApp(cfg);
    const db = getFirestore(app);
    _dbWrap = {
      db,
      fx: {
        collection,
        addDoc,
        getDocs,
        deleteDoc,
        doc,
        query,
        orderBy,
        onSnapshot,
        serverTimestamp,
      },
    };
    return _dbWrap;
  } catch (e) {
    console.error("[txStore] Firestore init error:", e);
    _dbWrap = null;
    return null;
  }
}

// Fallback w pamięci (gdyby nie było Firestore)
const mem = {
  items: [], // {id, uid, name, pair, shares, buyPrice, buyDate, ts}
  listeners: new Map(), // uid -> Set(cb)
};
let _id = 0;
const genId = () => `hold_${Date.now()}_${_id++}`;
function notifyMem(uid) {
  const list = mem.items
    .filter((x) => x.uid === uid)
    .sort((a, b) =>
      (a.buyDate || "").localeCompare(b.buyDate || "") || (a.ts - b.ts)
    );
  const set = mem.listeners.get(uid);
  if (set) for (const cb of set) cb(list);
}

/** Dodaj pozycję (format zgodny z UI) */
export async function addHolding(uid, payload) {
  if (!uid) throw new Error("addHolding: missing uid");
  const row = {
    uid,
    name: String(payload.name || "").trim(),
    pair: payload.pair || null, // { yahoo, stooq, finnhub, currency }
    shares: Number(payload.shares || 0),
    buyPrice: Number(payload.buyPrice || 0),
    buyDate: payload.buyDate ? String(payload.buyDate).slice(0, 10) : null, // YYYY-MM-DD
  };

  const dbWrap = await getDb();
  if (!dbWrap) {
    const id = genId();
    mem.items.push({ id, ...row, ts: Date.now() });
    notifyMem(uid);
    return id;
  }

  const { db, fx } = dbWrap;
  const ref = fx.collection(db, "users", uid, "holdings");
  const docRef = await fx.addDoc(ref, { ...row, ts: fx.serverTimestamp() });
  return docRef.id;
}

/** Usuń pozycję */
export async function deleteHolding(uid, id) {
  const dbWrap = await getDb();
  if (!dbWrap) {
    mem.items = mem.items.filter((x) => !(x.uid === uid && x.id === id));
    notifyMem(uid);
    return;
  }
  const { db, fx } = dbWrap;
  await fx.deleteDoc(fx.doc(db, "users", uid, "holdings", id));
}

/** Jednorazowo pobierz listę pozycji */
export async function listHoldings(uid) {
  const dbWrap = await getDb();
  if (!dbWrap) {
    return mem.items
      .filter((x) => x.uid === uid)
      .sort((a, b) =>
        (a.buyDate || "").localeCompare(b.buyDate || "") || (a.ts - b.ts)
      );
  }
  const { db, fx } = dbWrap;
  const ref = fx.collection(db, "users", uid, "holdings");
  const q = fx.query(ref, fx.orderBy("buyDate"), fx.orderBy("ts"));
  const snap = await fx.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Live-listener (zwraca unsubscribe) */
export function listenHoldings(uid, cb) {
  let cleanup = null;
  let stopped = false;

  getDb().then((dbWrap) => {
    if (stopped) return;

    if (!dbWrap) {
      if (!mem.listeners.has(uid)) mem.listeners.set(uid, new Set());
      const set = mem.listeners.get(uid);
      set.add(cb);
      notifyMem(uid);
      cleanup = () => set.delete(cb);
      return;
    }

    const { db, fx } = dbWrap;
    const ref = fx.collection(db, "users", uid, "holdings");
    const q = fx.query(ref, fx.orderBy("buyDate"), fx.orderBy("ts"));
    const unsub = fx.onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      cb(items);
    });
    cleanup = () => unsub();
  });

  return () => {
    stopped = true;
    if (cleanup) cleanup();
  };
}
