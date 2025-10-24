// src/lib/portfolioIdHelpers.js

// ID zarezerwowane przez Firestore – NIE wolno używać ich jako docId.
const RESERVED_DOC_IDS = new Set(["__ALL__", "__ID__", "__NAME__"]);

// Czy to ID jest zarezerwowane w Firestore?
export function isReservedDocId(id) {
  return !!id && RESERVED_DOC_IDS.has(id);
}

// Normalizacja wartości pochodzących z UI/URL/localStorage.
// "__ALL__" -> "ALL" (bezpieczny identyfikator do UI), ""/null -> null
export function normalizeSelectedPortfolioId(id) {
  const raw = typeof id === "string" ? id.trim() : "";
  if (!raw) return null;
  if (isReservedDocId(raw)) return "ALL"; // używaj TYLKO w UI, NIGDY w doc()
  return raw;
}

// Czy to „wirtualny” ALL do UI?
export function isVirtualAll(id) {
  return id === "ALL";
}
