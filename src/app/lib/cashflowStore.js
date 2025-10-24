// src/app/lib/cashflowStore.js
import { db } from "./firebase";
import {
  addDoc, collection, deleteDoc, doc,
  getDocs, orderBy, query, where, serverTimestamp,
} from "firebase/firestore";

/** Podkolekcja z przepływami gotówki */
const cfColl = (uid) => collection(db, "users", uid, "cashflows");

/** Dozwolone typy przepływów */
export const CF = {
  DEPOSIT: "DEPOSIT",                 // ręczna wpłata
  DEPOSIT_AUTO: "DEPOSIT_AUTO",       // auto-wpłata przy BUY
  DEPOSIT_ADJ: "DEPOSIT_ADJ",         // korekta salda (dodatnia)
  WITHDRAWAL: "WITHDRAWAL",           // ręczna wypłata
  WITHDRAWAL_ADJ: "WITHDRAWAL_ADJ",   // korekta salda (ujemna)
  DIVIDEND: "DIVIDEND",               // dywidenda (wewnętrzne, nie CF dla TWR)
  FEE: "FEE",                         // prowizje/opłaty (wewnętrzne)
};

/** Dodaj przepływ gotówki */
export async function addCashflow(uid, { type, amount, date, note, meta }) {
  const amt = Number(amount) || 0;
  const d = (date || "").slice(0, 10);
  if (!uid || !type || !d || !Number.isFinite(amt)) return;
  await addDoc(cfColl(uid), {
    type,
    amount: amt,
    date: d,               // YYYY-MM-DD
    note: note || "",
    meta: meta || null,    // np. { reason:"auto_from_buy", symbol:"PKN.WA" }
    createdAt: serverTimestamp(),
  });
}

/** Usuń przepływ */
export async function deleteCashflow(uid, id) {
  if (!uid || !id) return;
  await deleteDoc(doc(db, "users", uid, "cashflows", id));
}

/** Pobierz przepływy w zadanym zakresie (opcjonalnie) */
export async function listCashflows(uid, { from, to } = {}) {
  if (!uid) return [];
  let q = query(cfColl(uid), orderBy("date", "asc"));
  if (from) {
    q = query(
      cfColl(uid),
      where("date", ">=", from),
      where("date", "<=", to || "9999-12-31"),
      orderBy("date", "asc")
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Zbicie do: data -> suma (zewnętrzne CF dla TWR: wpłaty +, wypłaty -) */
export function sumExternalCFByDate(rows) {
  const m = new Map();
  for (const r of rows || []) {
    const d = (r.date || "").slice(0, 10);
    if (!d) continue;
    let s = 0;
    if (r.type === CF.DEPOSIT || r.type === CF.DEPOSIT_AUTO || r.type === CF.DEPOSIT_ADJ) s = +1;
    if (r.type === CF.WITHDRAWAL || r.type === CF.WITHDRAWAL_ADJ) s = -1;
    if (!s) continue;
    const v = (Number(r.amount) || 0) * s;
    m.set(d, (m.get(d) || 0) + v);
  }
  return m;
}

/** Zbicie do: data -> suma (wewnętrzne przepływy gotówkowe: dywidendy +, fee -) */
export function sumInternalCashByDate(rows) {
  const m = new Map();
  for (const r of rows || []) {
    const d = (r.date || "").slice(0, 10);
    if (!d) continue;
    let s = 0;
    if (r.type === CF.DIVIDEND) s = +1;
    if (r.type === CF.FEE) s = -1;
    if (!s) continue;
    const v = (Number(r.amount) || 0) * s;
    m.set(d, (m.get(d) || 0) + v);
  }
  return m;
}

/** Proste saldo gotówki: (wszystkie CF) - (suma kosztów BUY z lotów) */
export function computeCashBalance({ cashflows = [], holdings = [] }) {
  let cashCF = 0;
  for (const r of cashflows || []) {
    const amt = Number(r.amount) || 0;
    if ([CF.DEPOSIT, CF.DEPOSIT_AUTO, CF.DEPOSIT_ADJ].includes(r.type)) cashCF += amt;
    else if ([CF.WITHDRAWAL, CF.WITHDRAWAL_ADJ].includes(r.type)) cashCF -= amt;
    else if (r.type === CF.DIVIDEND) cashCF += amt;
    else if (r.type === CF.FEE) cashCF -= amt;
  }
  const buyCost = (holdings || []).reduce((a, h) => a + (Number(h.buyPrice) || 0) * (Number(h.shares) || 0), 0);
  return cashCF - buyCost;
}
