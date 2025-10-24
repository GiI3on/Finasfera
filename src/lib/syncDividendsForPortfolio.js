// src/lib/syncDividendsForPortfolio.js
//
// Zbiera symbole z holdings (root + ewentualnie sub-portfel),
// pobiera dywidendy z /api/dividends?symbol=SYM i zapisuje:
//  - FAKTY do: users/{uid}/(portfolios/{portfolioId}/)?cashflows
//  - PROGNOZY do: users/{uid}/(portfolios/{portfolioId}/)?dividendPlans
//
// Deduplikacja: po kluczu factKey = `${symbol}|${payDate}|${gross}`
// oraz planKey = `${symbol}|${exDate}`.

import { db } from "./firebase";
import {
  collection, query, where, getDocs, addDoc, serverTimestamp,
} from "firebase/firestore";

function symCandidates(s) {
  const up = String(s || "").toUpperCase().trim();
  if (!up) return [];
  return Array.from(new Set([up, up.endsWith(".WA") ? up : `${up}.WA`, up.replace(/\.WA$/i, "")]));
}
function iso(d) {
  try { return new Date(d).toISOString().slice(0,10); } catch { return null; }
}

export async function syncDividendsForPortfolio({ uid, portfolioId = null, limit = 60 }) {
  if (!uid) throw new Error("syncDividendsForPortfolio: missing uid");

  // 1) Zbierz symbole z holdings (root + sub)
  async function fetchHoldingsSymbols() {
    const out = new Set();

    const roots = [
      { path: portfolioId
          ? ["users", uid, "portfolios", portfolioId, "holdings"]
          : ["users", uid, "holdings"]
      }
    ];

    for (const r of roots) {
      const col = collection(db, ...r.path);
      const snap = await getDocs(query(col));
      snap.forEach(d => {
        const x = d.data() || {};
        const s = String(x?.pair?.yahoo || x?.symbol || x?.name || "").toUpperCase();
        if (!s) return;
        symCandidates(s).forEach(c => out.add(c));
      });
    }

    return Array.from(out).slice(0, limit);
  }

  // 2) Pobierz istniejące klucze (deduplikacja)
  async function fetchExistingKeys() {
    const factsKeys = new Set();
    const plansKeys = new Set();

    const factsCol = collection(
      db,
      "users", uid,
      ...(portfolioId ? ["portfolios", portfolioId] : []),
      "cashflows"
    );
    const factsSnap = await getDocs(query(factsCol, where("type", "==", "dividend")));
    factsSnap.forEach(d => {
      const r = d.data() || {};
      const symbol = String(r?.symbol || "").toUpperCase();
      const pay = String(r?.payDate || r?.date || "").slice(0,10);
      const gross = Number(r?.grossAmount);
      if (!symbol || !pay) return;
      factsKeys.add(`${symbol}|${pay}|${Number.isFinite(gross) ? gross : "?"}`);
    });

    const plansCol = collection(
      db,
      "users", uid,
      ...(portfolioId ? ["portfolios", portfolioId] : []),
      "dividendPlans"
    );
    const plansSnap = await getDocs(query(plansCol));
    plansSnap.forEach(d => {
      const r = d.data() || {};
      const symbol = String(r?.symbol || "").toUpperCase();
      const ex = String(r?.exDate || "").slice(0,10);
      if (!symbol || !ex) return;
      plansKeys.add(`${symbol}|${ex}`);
    });

    return { factsKeys, plansKeys };
  }

  // 3) Yahoo via /api/dividends
  async function fetchYahooDivs(symbol) {
    const url = `/api/dividends?symbol=${encodeURIComponent(symbol)}`;
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return null;
      const j = await r.json().catch(() => null);
      return j;
    } catch {
      return null;
    }
  }

  const symbols = await fetchHoldingsSymbols();
  if (!symbols.length) return { addedFacts: 0, addedPlans: 0, checked: 0, symbols: [] };

  const { factsKeys, plansKeys } = await fetchExistingKeys();

  const factsCol = collection(
    db,
    "users", uid,
    ...(portfolioId ? ["portfolios", portfolioId] : []),
    "cashflows"
  );
  const plansCol = collection(
    db,
    "users", uid,
    ...(portfolioId ? ["portfolios", portfolioId] : []),
    "dividendPlans"
  );

  let addedFacts = 0;
  let addedPlans = 0;
  let checked = 0;

  for (const s of symbols) {
    checked += 1;
    const res = await fetchYahooDivs(s);
    if (!res) continue;

    const usedSym = String(res.used || s).toUpperCase();
    const currency = String(res.currency || "PLN").toUpperCase();

    // FAKTY
    for (const e of (res.events || [])) {
      if (String(e.kind) !== "fact") continue;
      const pay = iso(e.payDate);
      const gross = Number(e.gross);
      const net = Number.isFinite(Number(e.net)) ? Number(e.net) : (Number.isFinite(gross) ? gross : null);
      if (!pay || net == null) continue;

      const factKey = `${usedSym}|${pay}|${Number.isFinite(gross) ? gross : "?"}`;
      if (factsKeys.has(factKey)) continue;

      await addDoc(factsCol, {
        type: "dividend",
        symbol: usedSym,
        currencySrc: currency,
        grossAmount: Number.isFinite(gross) ? gross : null,
        netAmount: Number.isFinite(net) ? net : null,
        withholdingTax: Number.isFinite(gross) && Number.isFinite(net) ? Math.max(0, gross - net) : null,
        fxRate: currency === "PLN" ? 1 : null,
        payDate: pay,
        createdAt: serverTimestamp(),
        portfolioId: portfolioId || null,
      });
      factsKeys.add(factKey);
      addedFacts += 1;
    }

    // PLAN (najbliższa exDate)
    const plan = (res.events || []).find(e => String(e.kind) === "plan");
    if (plan && plan.exDate) {
      const ex = iso(plan.exDate);
      const planKey = `${usedSym}|${ex}`;
      if (!plansKeys.has(planKey)) {
        await addDoc(plansCol, {
          symbol: usedSym,
          exDate: ex,
          gross: Number.isFinite(Number(plan.gross)) ? Number(plan.gross) : null, // estymacja: ostatnia
          fxAtExDate: currency === "PLN" ? 1 : null,
          createdAt: serverTimestamp(),
          portfolioId: portfolioId || null,
        });
        plansKeys.add(planKey);
        addedPlans += 1;
      }
    }
  }

  return { addedFacts, addedPlans, checked, symbols };
}
