import { db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  limit,
  startAfter,
} from "firebase/firestore";

/* =========================================================
   Pomocnicze: lokalna data ISO (YYYY-MM-DD) bez przesunięcia UTC
   ========================================================= */
function isoLocal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* =========================================================
   ŚCIEŻKI: holdings & cashflows (główny portfel vs. wiele portfeli)
   ========================================================= */
function holdingsCol(uid, portfolioId = null) {
  return portfolioId
    ? collection(db, "users", uid, "portfolios", portfolioId, "holdings")
    : collection(db, "users", uid, "holdings");
}
function holdingDoc(uid, portfolioId, holdingId) {
  return portfolioId
    ? doc(db, "users", uid, "portfolios", portfolioId, "holdings", holdingId)
    : doc(db, "users", uid, "holdings", holdingId);
}
function cashflowsCol(uid, portfolioId = null) {
  return portfolioId
    ? collection(db, "users", uid, "portfolios", portfolioId, "cashflows")
    : collection(db, "users", uid, "cashflows");
}

/* =========================================================
   HOLDINGS (pozycje)
   ========================================================= */

/**
 * Nasłuch pozycji – z fallbackiem:
 *  1) standard: users/{uid}/(portfolios/{id}/)holdings
 *  2) fallback: top-level 'portfolio' filtrowane po userId (+ opcjonalnie portfolioId)
 *     – mapuje pola symbol/shares/buyPrice/buyDate do oczekiwanej struktury
 */
export function listenHoldings(uid, a, b) {
  if (!uid) return () => {};
  let portfolioId = null;
  let cb = a;
  if ((typeof a === "string" || a === null) && typeof b === "function") {
    portfolioId = a;
    cb = b;
  }

  // 1) główny listener: users/{uid}/.../holdings
  const qCol = holdingsCol(uid, portfolioId || null);
  const q = query(qCol, orderBy("buyDate", "asc"));

  let fallbackAttached = false;
  let offFallback = null;

  const attachFallback = () => {
    if (fallbackAttached) return;
    fallbackAttached = true;
    try {
      // 2) fallback: top-level 'portfolio' (Twoja istniejąca kolekcja)
      const topCol = collection(db, "portfolio");
      const wh = [where("userId", "==", uid)];
      // Jeśli trzymasz 'portfolioId' w dokumentach kolekcji 'portfolio', filtruj po nim.
      if (portfolioId != null && portfolioId !== "") {
        // Odkomentuj poniższą linię, jeśli korzystasz z pola portfolioId:
        wh.push(where("portfolioId", "==", String(portfolioId)));
      }
      const qTop = query(topCol, ...wh, orderBy("buyDate", "asc"));

      offFallback = onSnapshot(
        qTop,
        (snap2) => {
          const mapped = [];
          snap2.forEach((d) => {
            const r = d.data() || {};
            mapped.push({
              id: d.id,
              name: r.symbol || r.name || "—",
              pair: r.symbol ? { yahoo: String(r.symbol).toUpperCase() } : (r.pair || null),
              shares: Number(r.shares) || 0,
              buyPrice: Number(r.buyPrice) || 0, // PLN
              buyDate: r.buyDate || null,
              currency: r.currency || "PLN",
              prevClose: Number(r.prevClose) || 0,
            });
          });
          cb?.(mapped);
        },
        () => cb?.([])
      );
    } catch {
      cb?.([]);
    }
  };

  const offUsers = onSnapshot(
    q,
    (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      if (rows.length > 0) {
        cb?.(rows);
      } else {
        // brak danych w users/... → włącz fallback
        attachFallback();
        // emit pusty (fallback za chwilę dośle swoje)
        cb?.([]);
      }
    },
    // błąd users/... → spróbuj od razu fallback
    () => {
      attachFallback();
      cb?.([]);
    }
  );

  return () => {
    try { offUsers?.(); } catch {}
    try { offFallback?.(); } catch {}
  };
}

/** Dodaj pozycję (auto-cashflow jeśli nie zablokowano) */
export async function addHolding(uid, a, b, c) {
  if (!uid) throw new Error("addHolding: missing uid");

  let portfolioId = null;
  let item = a;
  let opts = b || {};
  if (typeof a === "string" || a === null) {
    portfolioId = a || null;
    item = b;
    opts = c || {};
  }

  const shares = Number(item.shares) || 0;
  const price = Number(item.buyPrice) || 0; // PLN
  const cost = shares * price;
  const fee = Number(opts.fee) || 0;

  // wyznacz topUp + tryb
  const topUpExplicit = Number.isFinite(Number(opts.topUp)) ? Number(opts.topUp) : null;
  let topUp = 0;
  let topupMode = "none";
  if (topUpExplicit !== null) {
    topUp = Math.max(0, topUpExplicit);
    topupMode = topUp > 0 ? (Math.abs(topUp - cost) < 0.005 ? "full" : "diff") : "none";
  } else if (opts.autoTopUp) {
    topUp = cost;
    topupMode = "full";
  }

  const importBatchId   = item.importBatchId   ?? opts.importBatchId   ?? null;
  const importSignature = item.importSignature ?? opts.importSignature ?? null;
  const importFileHash  = item.importFileHash  ?? opts.importFileHash  ?? null;

  const payload = {
    name: item.name || item.pair?.yahoo || "—",
    pair: item.pair || null,
    shares,
    buyPrice: price,
    buyDate: item.buyDate || isoLocal(new Date()),

    ts: serverTimestamp(),
    meta: {
      topupMode,
      topupAmount: topUp,
      grossPaid: cost,
      fee,
      txnId: null,
    },

    ...(importBatchId   ? { importBatchId }   : {}),
    ...(importSignature ? { importSignature } : {}),
    ...(importFileHash  ? { importFileHash }  : {}),
  };

  const ref = await addDoc(holdingsCol(uid, portfolioId), payload);

  // Doładowanie (jeśli wybrane) — pominąć gdy noAutoCash
  if (topUp && !opts.noAutoCash) {
    await addCashflow(uid, portfolioId, {
      amount: topUp,
      type: "deposit",
      date: payload.buyDate,
      note: "Auto-zasilenie pod zakup",
      excludeFromTWR: !!opts.excludeFromTWR,
      importBatchId,
      importSignature,
      importFileHash,
    });
  }

  // Wypływ za zakup (cost) — pominąć gdy noAutoCash
  if (cost && !opts.noAutoCash) {
    await addCashflow(uid, portfolioId, {
      amount: -cost,
      type: "buy",
      date: payload.buyDate,
      note: item.pair?.yahoo || item.name || "Zakup",
      excludeFromTWR: !!opts.excludeFromTWR,
      importBatchId,
      importSignature,
      importFileHash,
    });
  }

  await updateDoc(holdingDoc(uid, portfolioId, ref.id), { "meta.txnId": ref.id });
  return ref.id;
}

/** Usuń pozycję */
export async function removeHolding(uid, a, b) {
  if (!uid) return;
  const hasPortfolioArg = typeof b !== "undefined";
  const portfolioId = hasPortfolioArg ? (a || null) : null;
  const holdingId   = hasPortfolioArg ? b : a;
  if (!holdingId) return;
  await deleteDoc(holdingDoc(uid, portfolioId, holdingId));
}

/** pomocniczo: ustaw liczbę akcji (merge) */
async function setHoldingShares(uid, portfolioId, id, shares) {
  await setDoc(holdingDoc(uid, portfolioId, id), { shares: Number(shares) || 0 }, { merge: true });
}

// SPRZEDAŻ (FIFO po lotach)
export async function sellPosition(uid, a, b) {
  let portfolioId = null;
  let p = a;
  if (typeof a === "string" || a === null) { portfolioId = a || null; p = b; }

  const symbol  = String(p.yahoo || "").toUpperCase().trim();
  const sellQty = Number(p.qty) || 0;
  const px      = Number(p.price) || 0;
  if (!uid || !symbol || sellQty <= 0 || px <= 0) return;

  const qLots = query(holdingsCol(uid, portfolioId), where("pair.yahoo", "==", symbol));
  const snap  = await getDocs(qLots);

  const lots = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((x, y) => String(x.buyDate || "").localeCompare(String(y.buyDate || ""))); // FIFO

  let remaining = sellQty;

  for (const row of lots) {
    if (remaining <= 0) break;
    const have = Number(row.shares) || 0;
    if (have <= 0) continue;

    const use  = Math.min(have, remaining);
    const left = have - use;

    if (left > 0) await setHoldingShares(uid, portfolioId, row.id, left);
    else          await removeHolding(uid, portfolioId, row.id);

    remaining -= use;
  }

  // wpływ ze sprzedaży (pomiń, jeśli noAutoCash)
  const proceeds = sellQty * px;
  if (!p?.noAutoCash) {
    await addCashflow(uid, portfolioId, {
      amount: proceeds,
      type: "sell",
      date: p.date ? isoLocal(new Date(p.date)) : isoLocal(new Date()),
      note: p.note || symbol,
      excludeFromTWR: !!p.excludeFromTWR,
      importBatchId:   p.importBatchId   ?? null,
      importSignature: p.importSignature ?? null,
      importFileHash:  p.importFileHash  ?? null,
    });
  }
}

// SPLIT (proporcjonalnie modyfikuje wszystkie loty symbolu)
export async function applySplit(uid, a, b) {
  let portfolioId = null;
  let p = a;
  if (typeof a === "string" || a === null) { portfolioId = a || null; p = b; }

  const symbol = String(p.yahoo || "").toUpperCase().trim();
  const ratio  = Number(p.ratio);
  if (!uid || !symbol || !(ratio > 0)) return;

  const qLots = query(holdingsCol(uid, portfolioId), where("pair.yahoo", "==", symbol));
  const snap  = await getDocs(qLots);

  const lots = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((x, y) => String(x.buyDate || "").localeCompare(String(y.buyDate || "")));

  for (const row of lots) {
    const newShares = (Number(row.shares) || 0) * ratio;
    const newPrice  = (Number(row.buyPrice) || 0) / ratio;
    await updateDoc(holdingDoc(uid, portfolioId, row.id), {
      shares: newShares,
      buyPrice: newPrice,
    });
  }

  await addCashflow(uid, portfolioId, {
    amount: 0,
    type: "manual",
    date: p.date ? isoLocal(new Date(p.date)) : isoLocal(new Date()),
    note: `SPLIT ${symbol} x${ratio}`,
  });
}

/* =========================================================
   CASHFLOWS (gotówka)
   ========================================================= */
export async function addCashflow(uid, a, b) {
  if (!uid) throw new Error("addCashflow: missing uid");

  let portfolioId = null;
  let p = a;
  if (typeof a === "string" || a === null) { portfolioId = a || null; p = b; }

  const payload = {
    amount: Number(p?.amount) || 0,
    type:   p?.type || "manual",
    note:   p?.note || null,
    date:   p?.date ? isoLocal(new Date(p.date)) : isoLocal(new Date()),
    currency: p?.currency || "PLN",
    excludeFromTWR: !!p?.excludeFromTWR,
    storno: !!p?.storno,
    linkedTxnId: p?.linkedTxnId || null,

    ...(p?.importBatchId   ? { importBatchId:   p.importBatchId }   : {}),
    ...(p?.importSignature ? { importSignature: p.importSignature } : {}),
    ...(p?.importFileHash  ? { importFileHash:  p.importFileHash }  : {}),

    ts: serverTimestamp(),
  };

  await addDoc(cashflowsCol(uid, portfolioId), payload);
}

export async function addCashOperation(uid, a, b) {
  const hasPortfolioArg = typeof b !== "undefined";
  const portfolioId = hasPortfolioArg ? (a || null) : null;
  const p = hasPortfolioArg ? b : a;
  const type = p?.type || (p?.storno ? "correction" : "manual");
  return addCashflow(uid, portfolioId, { ...p, type });
}

/** Nasłuch salda gotówki */
export function listenCashBalance(uid, a, b) {
  if (!uid) return () => {};
  let portfolioId = null;
  let cb = a;
  if (typeof a === "string" || a === null) { portfolioId = a || null; cb = b; }

  const q = query(cashflowsCol(uid, portfolioId), orderBy("date", "asc"));
  return onSnapshot(q, (snap) => {
    let balance = 0;
    const byCcy = new Map();
    const flows = [];
    snap.forEach((d) => {
      const row = { id: d.id, ...d.data() };
      const amt = Number(row.amount) || 0;
      balance += amt;
      const ccy = row.currency || "PLN";
      byCcy.set(ccy, (byCcy.get(ccy) || 0) + amt);
      flows.push(row);
    });
    cb?.({ balance, byCurrency: Object.fromEntries(byCcy), flows });
  });
}

/* ===== wygodne aliasy ===== */
function _alias(type) {
  return (uid, a, b) => {
    const hasPortfolioArg = typeof b !== "undefined";
    const portfolioId = hasPortfolioArg ? (a || null) : null;
    const p = hasPortfolioArg ? b : a;
    return addCashflow(uid, portfolioId, { ...p, type });
  };
}
export const addDeposit    = _alias("deposit");
export const addWithdrawal = (uid, a, b) => {
  const hasPortfolioArg = typeof b !== "undefined";
  const portfolioId = hasPortfolioArg ? (a || null) : null;
  const p = hasPortfolioArg ? b : a;
  return addCashflow(uid, portfolioId, { ...p, amount: -Math.abs(+p.amount || 0), type: "withdraw" });
};
export const addDividend   = _alias("dividend");
export const addFee        = (uid, a, b) => {
  const hasPortfolioArg = typeof b !== "undefined";
  const portfolioId = hasPortfolioArg ? (a || null) : null;
  const p = hasPortfolioArg ? b : a;
  return addCashflow(uid, portfolioId, { ...p, amount: -Math.abs(+p.amount || 0), type: "fee" });
};

/* =========================================================
   COFNIJ IMPORT – kasowanie wszystkiego z danego batcha
   ========================================================= */
export async function removeBatchById(uid, portfolioId = null, batchId) {
  if (!uid) throw new Error("removeBatchById: missing uid");
  if (!batchId) throw new Error("removeBatchById: missing batchId");

  const hCol = holdingsCol(uid, portfolioId);
  const cCol = cashflowsCol(uid, portfolioId);

  async function deleteLoop(colRef) {
    let last = null;
    for (;;) {
      const base = query(colRef, where("importBatchId", "==", batchId), orderBy("__name__"), limit(400));
      const q2 = last ? query(base, startAfter(last)) : base;
      const snap = await getDocs(q2);
      if (snap.empty) break;

      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      const docs = snap.docs;
      last = docs[docs.length - 1];
      if (docs.length < 400) break;
    }
  }

  await deleteLoop(hCol).catch(() => {});
  await deleteLoop(cCol).catch(() => {});
}

/* =========================================================
   TWR – agregacja cashflow + backfill brakujących 'buy' i 'deposit'
   ========================================================= */

/** ✅ Map dayISO -> suma kwot TYLKO Z ZEWNĘTRZNYCH CF */
export function aggregateCashflowsForTwr(flows, startISO = null, endISO = null) {
  const EXTERNAL = new Set(["deposit", "withdraw", "correction", "manual"]);
  const m = new Map();
  for (const f of flows || []) {
    if (!f) continue;
    if (f.excludeFromTWR || f.storno) continue;
    const type = String(f.type || "").toLowerCase();
    if (!EXTERNAL.has(type)) continue; // ignoruj buy/sell/dividend/fee
    const d = String(f.date || "").slice(0, 10);
    if (!d) continue;
    if (startISO && d < startISO) continue;
    if (endISO && d > endISO) continue;
    const amt = Number(f.amount) || 0;
    m.set(d, (m.get(d) || 0) + amt);
  }
  return m;
}
// alias zgodny ze starszym importem
export const aggregateCashflowsForTWR = aggregateCashflowsForTwr;

/** 🔧 Dopisuje brakujące 'buy' po imporcie (idempotentnie) */
export async function backfillMissingBuyFlows(uid, portfolioId = null) {
  if (!uid) throw new Error("backfillMissingBuyFlows: missing uid");

  const hSnap = await getDocs(query(holdingsCol(uid, portfolioId)));
  const cSnap = await getDocs(query(cashflowsCol(uid, portfolioId)));

  const flowsByTxn = new Map();
  cSnap.forEach((d) => {
    const row = d.data();
    if (!row) return;
    const t = row.linkedTxnId || row.txnId || null;
    if (t) flowsByTxn.set(t, (flowsByTxn.get(t) || 0) + (Number(row.amount) || 0));
  });

  const fixes = [];
  hSnap.forEach((d) => {
    const h = d.data();
    if (!h) return;
    const id   = d.id;
    const paid = (Number(h?.meta?.grossPaid) || 0) * -1; // wydatek powinien być ujemny
    const linkedSum = flowsByTxn.get(id) || 0;
    if (Math.abs(linkedSum - paid) > 0.005) {
      fixes.push({
        amount: paid,
        type: "buy",
        date: isoLocal(new Date(h.buyDate || new Date())),
        note: h?.pair?.yahoo || h?.name || "Zakup",
        excludeFromTWR: false,
        storno: false,
        linkedTxnId: id,
      });
    }
  });

  for (const fx of fixes) {
    await addCashflow(uid, portfolioId, fx);
  }
  return { fixed: fixes.length };
}

/** 🔧 NOWE: dopisuje brakujące 'deposit' pod zakup (idempotentnie, ważne dla TWR) */
export async function backfillMissingDeposits(uid, portfolioId = null) {
  if (!uid) throw new Error("backfillMissingDeposits: missing uid");

  const hSnap = await getDocs(query(holdingsCol(uid, portfolioId)));
  const cSnap = await getDocs(query(cashflowsCol(uid, portfolioId)));

  // ile DEPOSIT przypięto do danego zakupu
  const depositByTxn = new Map();
  cSnap.forEach((d) => {
    const row = d.data();
    if (!row) return;
    if (String(row.type || "").toLowerCase() !== "deposit") return;
    const t = row.linkedTxnId || row.txnId || null;
    if (t) depositByTxn.set(t, (depositByTxn.get(t) || 0) + (Number(row.amount) || 0));
  });

  const fixes = [];
  hSnap.forEach((d) => {
    const h = d.data();
    if (!h) return;
    const id = d.id;
    const paid = Number(h?.meta?.grossPaid) || (Number(h.buyPrice) || 0) * (Number(h.shares) || 0);
    if (!(paid > 0)) return;
    const have = depositByTxn.get(id) || 0;
    const missing = paid - have;
    if (missing > 0.005) {
      fixes.push({
        amount: missing,
        type: "deposit",
        date: isoLocal(new Date(h.buyDate || new Date())),
        note: "Auto-zasilenie (import)",
        excludeFromTWR: false,
        storno: false,
        linkedTxnId: id,
      });
    }
  });

  for (const fx of fixes) {
    await addCashflow(uid, portfolioId, fx);
  }
  return { fixed: fixes.length };
}

/** 🔁 Automatyczny backfill – uruchamiany raz na portfel (znaczniki w Firestore) */
export async function autoBackfillBuyFlowsIfNeeded(uid, portfolioId = null) {
  if (!uid) return { skipped: true };
  const key = portfolioId || "__main__";
  const flagRef = doc(db, "users", uid, "meta", `backfill_buy_v1__${key}`);

  try {
    const snap = await getDoc(flagRef);
    if (snap.exists() && snap.data()?.doneAt) return { skipped: true };
  } catch {}

  const res = await backfillMissingBuyFlows(uid, portfolioId).catch(() => ({ fixed: 0 }));
  try {
    await setDoc(flagRef, { doneAt: serverTimestamp(), fixed: res.fixed || 0 }, { merge: true });
  } catch {}
  return res;
}

export async function autoBackfillDepositsIfNeeded(uid, portfolioId = null) {
  if (!uid) return { skipped: true };
  const key = portfolioId || "__main__";
  const flagRef = doc(db, "users", uid, "meta", `backfill_deposits_v1__${key}`);

  try {
    const snap = await getDoc(flagRef);
    if (snap.exists() && snap.data()?.doneAt) return { skipped: true };
  } catch {}

  const res = await backfillMissingDeposits(uid, portfolioId).catch(() => ({ fixed: 0 }));
  try {
    await setDoc(flagRef, { doneAt: serverTimestamp(), fixed: res.fixed || 0 }, { merge: true });
  } catch {}
  return res;
}

/* =========================================================
   ⭐ NOWE: czyszczenie portfela głównego i pełne kasowanie portfela
   ========================================================= */

/** wewnętrzne: paginowane czyszczenie dowolnej kolekcji */
async function _deleteCollectionAll(colRef) {
  let last = null;
  for (;;) {
    const base = query(colRef, orderBy("__name__"), limit(400));
    const q2 = last ? query(base, startAfter(last)) : base;
    const snap = await getDocs(q2);
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    const docs = snap.docs;
    last = docs[docs.length - 1];
    if (docs.length < 400) break;
  }
}

/** Czyści portfel główny (root): usuwa wszystkie holdings + cashflows */
export async function clearDefaultPortfolio(uid) {
  if (!uid) throw new Error("clearDefaultPortfolio: missing uid");
  await _deleteCollectionAll(holdingsCol(uid, null));
  await _deleteCollectionAll(cashflowsCol(uid, null));
  // wyczyść znaczniki backfill
  try {
    await deleteDoc(doc(db, "users", uid, "meta", "backfill_buy_v1____main__"));
  } catch {}
  try {
    await deleteDoc(doc(db, "users", uid, "meta", "backfill_deposits_v1____main__"));
  } catch {}
}

/** Usuwa portfel użytkownika wraz z subkolekcjami i dokumentem meta */
export async function deletePortfolioDeep(uid, portfolioId) {
  if (!uid) throw new Error("deletePortfolioDeep: missing uid");
  if (!portfolioId) throw new Error("deletePortfolioDeep: missing portfolioId");

  await _deleteCollectionAll(holdingsCol(uid, portfolioId));
  await _deleteCollectionAll(cashflowsCol(uid, portfolioId));

  try {
    await deleteDoc(doc(db, "users", uid, "meta", `backfill_buy_v1__${portfolioId}`));
  } catch {}
  try {
    await deleteDoc(doc(db, "users", uid, "meta", `backfill_deposits_v1__${portfolioId}`));
  } catch {}

  try {
    await deleteDoc(doc(db, "users", uid, "portfolios", portfolioId));
  } catch {}
}

/* =========================================================
   ⭐⭐ NOWE: obsługa listy portfeli + bezpieczne usuwanie
   ========================================================= */

// meta kolekcja portfeli
function portfoliosCol(uid) {
  return collection(db, "users", uid, "portfolios");
}

/** Lista portfeli użytkownika (id + nazwa jeśli jest) */
export async function listPortfolios(uid) {
  if (!uid) return [];
  const snap = await getDocs(query(portfoliosCol(uid), orderBy("createdAt", "asc")));
  const out = [];
  snap.forEach((d) => out.push({ id: d.id, name: (d.data() || {}).name || null }));
  return out;
}

/** Liczba wszystkich „portfeli”: 1 (root) + N (named) */
export async function countAllPortfolios(uid) {
  if (!uid) return 0;
  const named = await getDocs(portfoliosCol(uid));
  return 1 + named.size; // 1 = główny (root)
}

// wybór następnego portfela po usunięciu
async function _chooseNextPortfolioId(uid, removedId) {
  const rest = (await listPortfolios(uid)).map(x => x.id).filter(id => id !== removedId);
  if (rest.length) return rest[0]; // przełącz na pierwszy dostępny named
  return null; // brak named -> root
}

/**
 * Bezpieczne usuwanie portfela:
 *  - jeśli to ostatni (root + named = 1) -> blokada
 *  - jeśli portfolioId == null (root) -> czyścimy root (clearDefaultPortfolio)
 *  - jeśli portfolioId != null        -> twarde kasowanie (deletePortfolioDeep)
 * Zwraca: { deleted: boolean, nextId: string|null, reason?: string }
 */
export async function safeDeletePortfolio(uid, portfolioId) {
  if (!uid) throw new Error("safeDeletePortfolio: missing uid");

  const total = await countAllPortfolios(uid);
  if (total <= 1) {
    return { deleted: false, nextId: null, reason: "Musi pozostać co najmniej jeden portfel." };
  }

  if (portfolioId == null) {
    await clearDefaultPortfolio(uid); // „usunięcie” root = wyczyszczenie
    const nextId = await _chooseNextPortfolioId(uid, null);
    return { deleted: true, nextId };
  } else {
    await deletePortfolioDeep(uid, portfolioId);
    const nextId = await _chooseNextPortfolioId(uid, portfolioId);
    return { deleted: true, nextId };
  }
}

/* =========================================================
   === NOWE: zapis dywidendy z pełnymi szczegółami (NETTO w PLN)
   ========================================================= */
export async function addDividendDetailed(uid, a, b) {
  if (!uid) throw new Error("addDividendDetailed: missing uid");

  // Obsługa signatury: (uid, payload) lub (uid, portfolioId, payload)
  const hasPortfolioArg = typeof b !== "undefined";
  const portfolioId = hasPortfolioArg ? (a || null) : null;
  const p = hasPortfolioArg ? b : a;

  // Kwoty źródłowe
  const grossSrc = Number(p?.grossAmount) || 0;
  const whtSrc   = Number(p?.withholdingTax) || 0;
  const netSrc   = Number.isFinite(Number(p?.netAmount)) ? Number(p?.netAmount) : (grossSrc - whtSrc);

  const ccy = p?.currencySrc || p?.currency || "PLN";
  const fx  = ccy === "PLN" ? 1 : (Number(p?.fxRate) || 0);
  const netPLN = ccy === "PLN" ? netSrc : (fx > 0 ? netSrc * fx : 0);

  const payDateISO = p?.payDate ? String(p.payDate).slice(0, 10) : isoLocal(new Date());

  const payload = {
    amount: Number(netPLN) || 0,      // NETTO w PLN (do metryk)
    type: "dividend",
    date: payDateISO,
    currency: "PLN",
    note: p?.note || (p?.symbol || "Dywidenda"),
    excludeFromTWR: true,             // dywidendy zwykle wyłączamy z TWR
    storno: false,
    linkedTxnId: null,

    // Szczegóły oryginalne
    symbol: p?.symbol || null,
    payDate: payDateISO,
    exDate: p?.exDate ? String(p.exDate).slice(0, 10) : null,
    recordDate: p?.recordDate ? String(p.recordDate).slice(0, 10) : null,

    currencySrc: ccy,
    grossAmount: Number.isFinite(grossSrc) ? grossSrc : null,
    withholdingTax: Number.isFinite(whtSrc) ? whtSrc : null,
    netAmount: Number.isFinite(netSrc) ? netSrc : null,
    fxRate: Number.isFinite(fx) && fx > 0 ? fx : null,

    ts: serverTimestamp(),
  };

  await addDoc(cashflowsCol(uid, portfolioId), payload);
}

/* =========================================================
   📌 DIVIDEND PLANS (prognozy wg EX-DATE)
   ========================================================= */

function dividendPlansCol(uid, portfolioId = null) {
  return portfolioId
    ? collection(db, "users", uid, "portfolios", portfolioId, "dividendPlans")
    : collection(db, "users", uid, "dividendPlans");
}

export function listenDividendPlans(uid, a, b) {
  if (!uid) return () => {};
  let portfolioId = null;
  let cb = a;
  if (typeof a === "string" || a === null) { portfolioId = a || null; cb = b; }

  const q = query(dividendPlansCol(uid, portfolioId), orderBy("exDate", "asc"));
  return onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    cb?.(rows);
  });
}

export async function addDividendPlan(uid, a, b) {
  if (!uid) throw new Error("addDividendPlan: missing uid");

  let portfolioId = null;
  let p = a;
  if (typeof a === "string" || a === null) { portfolioId = a || null; p = b; }

  const payload = {
    symbol:   String(p?.symbol || "").toUpperCase(),
    exDate:   String(p?.exDate || "").slice(0, 10),
    gross:    Number(p?.gross) || 0,         // w walucie źródłowej
    currency: String(p?.currency || "PLN").toUpperCase(),
    fxAtExDate: Number.isFinite(p?.fxAtExDate) ? Number(p.fxAtExDate) : null, // opcjonalnie
    netEstimatePLN: Number.isFinite(p?.netEstimatePLN) ? Number(p.netEstimatePLN) : null,
    note: p?.note || null,
    ts: serverTimestamp(),
  };
  if (!payload.symbol || !payload.exDate) throw new Error("addDividendPlan: missing symbol/exDate");
  await addDoc(dividendPlansCol(uid, portfolioId), payload);
}

export async function deleteDividendPlan(uid, a, b) {
  if (!uid) return;
  const hasPortfolioArg = typeof b !== "undefined";
  const portfolioId = hasPortfolioArg ? (a || null) : null;
  const id = hasPortfolioArg ? b : a;
  if (!id) return;
  const ref = portfolioId
    ? doc(db, "users", uid, "portfolios", portfolioId, "dividendPlans", id)
    : doc(db, "users", uid, "dividendPlans", id);
  await deleteDoc(ref);
}

/* =========================================================
   💾 LIVE PORTFOLIO VALUE (zapis i nasłuch) — spójna wersja
   Zapisy: users/{uid}/meta/liveValue
           users/{uid}/portfolios/{id}/meta/liveValue
   Pole:   valuePLN
   ========================================================= */

function _liveValueDoc(uid, portfolioId = null) {
  return portfolioId
    ? doc(db, "users", uid, "portfolios", portfolioId, "meta", "liveValue")
    : doc(db, "users", uid, "meta", "liveValue");
}

/** Zapis bieżącej wartości w PLN */
export async function setLivePortfolioValue(uid, portfolioId = null, valuePLN = 0) {
  if (!uid) return;
  try {
    await setDoc(
      _liveValueDoc(uid, portfolioId || null),
      { valuePLN: Number(valuePLN) || 0, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.error("setLivePortfolioValue error:", e);
  }
}

/**
 * Nasłuch wartości z Firestore.
 * Użycie: listenPortfolioValue(uid, scope, { portfolioIds })(callback)
 *  - scope: "__ALL__" albo "", albo konkretne id
 *  - portfolioIds: lista id do zsumowania przy "__ALL__" (dodamy też root "")
 */
export function listenPortfolioValue(uid, scope, opts = {}) {
  return (callback) => {
    if (!uid) { try { callback(0); } catch {} ; return () => {}; }

    // SUMA ALL: root + przekazane portfele
    if (scope === "__ALL__") {
      const ids = Array.isArray(opts.portfolioIds)
        ? Array.from(new Set(opts.portfolioIds.map(x => (x == null ? "" : String(x)))))
        : [];
      if (!ids.includes("")) ids.unshift(""); // dołóż root

      const map = new Map();
      const unsubs = [];

      const emit = () => {
        const sum = Array.from(map.values()).reduce((s, v) => s + (Number(v) || 0), 0);
        try { callback(sum); } catch {}
      };

      for (const pid of ids) {
        const off = onSnapshot(
          _liveValueDoc(uid, pid || null),
          (snap) => {
            const v = (snap.exists() && Number(snap.data()?.valuePLN)) || 0;
            map.set(pid || "", v);
            emit();
          },
          () => { map.set(pid || "", 0); emit(); }
        );
        if (typeof off === "function") unsubs.push(off);
      }

      emit();
      return () => unsubs.forEach(u => { try { u(); } catch {} });
    }

    // POJEDYNCZY PORTFEL ("" = root lub konkretne id)
    const pid = scope === "" ? "" : String(scope || "");
    return onSnapshot(
      _liveValueDoc(uid, pid || null),
      (snap) => { try { callback((snap.exists() && Number(snap.data()?.valuePLN)) || 0); } catch {} },
      () => { try { callback(0); } catch {} }
    );
  };
}
