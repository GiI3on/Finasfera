// === IMPORTY (na górze pliku) ===
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { normalizeSelectedPortfolioId, isVirtualAll } from "./portfolioIdHelpers";

// === PATCH: bezpieczna funkcja z guardem na "__ALL__" / "ALL" ===
export async function ensureHoldingQuoteMeta(uid, portfolioId, holdingId, pair) {
  if (!uid || !holdingId) {
    throw new Error("ensureHoldingQuoteMeta: missing args (uid/holdingId)");
  }

  // 1) Normalizacja wartości z UI/URL — "__ALL__" -> "ALL", "" -> null
  portfolioId = normalizeSelectedPortfolioId(portfolioId);

  // 2) Jeśli to "ALL" (syntetyczne ID do UI) albo brak id — NIE dotykamy Firestore
  if (!portfolioId || isVirtualAll(portfolioId)) {
    // zwracamy neutralny wynik (DOWOLNY – ważne, żeby nie pisać w doc)
    const cur = (pair?.currency || pair?.currenc || "PLN").toUpperCase();
    const fixed = cur === "GBX" ? "GBP" : cur;
    return { currency: fixed };
  }

  // 3) Aktualizacja metadanych w realnym dokumencie
  const ref = doc(db, "users", uid, "portfolios", portfolioId, "holdings", holdingId);

  // Waluta – najpierw z parametru pair; mapowanie GBX -> GBP jak u Ciebie
  const raw = String(pair?.currency || pair?.currenc || "PLN").toUpperCase();
  const currency = raw === "GBX" ? "GBP" : raw;

  // Meta (przykładowy provider + znacznik czasu; możesz dostosować)
  const metaQuote = {
    provider: "yahoo",
    currency,
    detectedAt: new Date().toISOString(),
    ...(raw === "GBX" ? { scale: 0.01 } : {}), // jak w Twoim kodzie
  };

  await updateDoc(ref, {
    "pair.currency": currency,
    "meta.quote": metaQuote,
  });

  return { currency };
}
