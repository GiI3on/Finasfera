"use client";

import { db } from "./firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

import {
  isReservedDocId,
  normalizeSelectedPortfolioId,
  isVirtualAll,
} from "./portfolioIdHelpers";

/**
 * Nasłuch listy portfeli użytkownika (kolekcja).
 * - filtruje puste/niepoprawne ID
 * - pomija zarezerwowane ID (np. "__ALL__")
 * Zwraca funkcję off() do odpięcia.
 */
export function listenPortfolios(uid, callback) {
  if (!uid) {
    try { callback([]); } catch {}
    return () => {};
  }

  try {
    const colRef = collection(db, "users", uid, "portfolios");
    const q = query(colRef, orderBy("createdAt", "asc"));

    const off = onSnapshot(
      q,
      (snap) => {
        const list = [];
        snap.forEach((d) => {
          const rawId = d?.id;
          const id = typeof rawId === "string" ? rawId.trim() : "";

          // Pomijamy puste/niepoprawne ID
          if (!id) return;

          // Pomijamy zarezerwowane ID – ich obecność w bazie i tak jest błędem
          if (isReservedDocId(id)) {
            console.warn("[listenPortfolios] pominięto zarezerwowane ID dokumentu:", id);
            return;
          }

          const data = d.data() || {};
          if (data.archived === true || data.deleted === true) return;

          list.push({
            id,
            name: data.name || data.title || data.label || "Portfel",
            ...data,
          });
        });

        try { callback(list); } catch {}
      },
      (err) => {
        console.error("[listenPortfolios] onSnapshot error:", err);
        try { callback([]); } catch {}
      }
    );

    return off;
  } catch (e) {
    console.error("[listenPortfolios] setup error:", e);
    try { callback([]); } catch {}
    return () => {};
  }
}

/**
 * Bezpieczny helper do pobrania referencji dokumentu portfela.
 * - NIE pozwala na "__ALL__" (ani inne zarezerwowane ID)
 * - zwraca null dla "ALL" (syntetyczny identyfikator do UI)
 */
export function safePortfolioDoc(uid, portfolioId) {
  const normalized = normalizeSelectedPortfolioId(portfolioId);
  if (!uid || !normalized || isVirtualAll(normalized)) return null;
  if (isReservedDocId(normalized)) {
    throw new Error(
      `safePortfolioDoc: użyto zarezerwowanego ID "${normalized}". ` +
      `Użyj "ALL" w UI i nie przekazuj tej wartości do doc().`
    );
  }
  return doc(db, "users", uid, "portfolios", normalized);
}
