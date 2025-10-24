// src/lib/portfolioAll.js
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

/**
 * Nasłuch POZYCJI dla wszystkich portfeli naraz:
 *  - root: users/{uid}/holdings
 *  - named: users/{uid}/portfolios/{pid}/holdings
 * Zwraca jedną tablicę [{...row, portfolioId}], sortowaną po buyDate w ramach portfeli.
 */
export function listenHoldingsAll(uid, cb) {
  if (!uid) return () => {};
  const unsubs = [];
  const acc = new Map(); // key -> row

  const emit = () => cb?.(Array.from(acc.values()));

  // 1) ROOT
  const rootCol = collection(db, "users", uid, "holdings");
  unsubs.push(
    onSnapshot(query(rootCol, orderBy("buyDate", "asc")), (snap) => {
      for (const k of Array.from(acc.keys())) if (k.startsWith("__root__")) acc.delete(k);
      snap.forEach((d) => {
        acc.set(`__root__${d.id}`, { id: d.id, portfolioId: null, ...d.data() });
      });
      emit();
    })
  );

  // 2) DYNAMICZNA LISTA PORTFELI
  const portsCol = collection(db, "users", uid, "portfolios");
  unsubs.push(
    onSnapshot(portsCol, (portsSnap) => {
      const pids = [];
      portsSnap.forEach((p) => pids.push(p.id));

      // usuń dane portfeli, których już nie ma
      for (const k of Array.from(acc.keys())) {
        const m = k.match(/^__p__([^_]+)__/);
        if (m && !pids.includes(m[1])) acc.delete(k);
      }

      // dla każdego portfela załóż listener (idempotentnie)
      pids.forEach((pid) => {
        const marker = `__marker_hold_${pid}`;
        if (acc.has(marker)) return;
        acc.set(marker, true);

        const col = collection(db, "users", uid, "portfolios", pid, "holdings");
        const u = onSnapshot(query(col, orderBy("buyDate", "asc")), (snap) => {
          for (const k of Array.from(acc.keys())) if (k.startsWith(`__p__${pid}__`)) acc.delete(k);
          snap.forEach((d) => {
            acc.set(`__p__${pid}__${d.id}`, { id: d.id, portfolioId: pid, ...d.data() });
          });
          emit();
        });
        unsubs.push(u);
      });
    })
  );

  return () => unsubs.forEach((f) => f?.());
}

/**
 * Nasłuch GOTÓWKI dla wszystkich portfeli naraz:
 * scala flows z:
 *  - root: users/{uid}/cashflows
 *  - named: users/{uid}/portfolios/{pid}/cashflows
 * Zwraca { balance, byCurrency, flows } (flows posortowane po dacie).
 */
export function listenCashBalanceAll(uid, cb) {
  if (!uid) return () => {};
  const unsubs = [];
  const acc = { root: [], byPid: new Map() };

  const emit = () => {
    const rows = [...acc.root];
    for (const [, arr] of acc.byPid.entries()) rows.push(...arr);
    rows.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

    let balance = 0;
    const byCcy = new Map();
    rows.forEach((r) => {
      const amt = Number(r.amount) || 0;
      balance += amt;
      const ccy = r.currency || "PLN";
      byCcy.set(ccy, (byCcy.get(ccy) || 0) + amt);
    });

    cb?.({ balance, byCurrency: Object.fromEntries(byCcy), flows: rows });
  };

  // 1) ROOT
  const rootCol = collection(db, "users", uid, "cashflows");
  unsubs.push(
    onSnapshot(query(rootCol, orderBy("date", "asc")), (snap) => {
      acc.root = [];
      snap.forEach((d) => acc.root.push({ id: d.id, portfolioId: null, ...d.data() }));
      emit();
    })
  );

  // 2) PORTFELE
  const portsCol = collection(db, "users", uid, "portfolios");
  unsubs.push(
    onSnapshot(portsCol, (portsSnap) => {
      const pids = [];
      portsSnap.forEach((p) => pids.push(p.id));

      // usuń portfele, których już nie ma
      for (const pid of Array.from(acc.byPid.keys())) {
        if (!pids.includes(pid)) acc.byPid.delete(pid);
      }

      // słuchaj każdego pid
      pids.forEach((pid) => {
        if (acc.byPid.has(pid)) return;
        const col = collection(db, "users", uid, "portfolios", pid, "cashflows");
        const u = onSnapshot(query(col, orderBy("date", "asc")), (snap) => {
          const rows = [];
          snap.forEach((d) => rows.push({ id: d.id, portfolioId: pid, ...d.data() }));
          acc.byPid.set(pid, rows);
          emit();
        });
        unsubs.push(u);
      });
    })
  );

  return () => unsubs.forEach((f) => f?.());
}
