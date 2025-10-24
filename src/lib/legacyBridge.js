// src/lib/legacyBridge.js
import { hasLegacyHoldings, migrateLegacyToUserHoldings } from "./portfolioStore";

/**
 * Sprawdza, czy nie masz przypadkiem "pustych" nowych holdingsów,
 * a jednocześnie istnieją stare pozycje – wtedy pozwala jedną funkcją je przenieść.
 */
export async function autoOfferMigration(uid) {
  const ok = await hasLegacyHoldings(uid);
  return ok; // true => pokaż bannerek/przycisk "Przenieś stare pozycje"
}

export async function doMigrate(uid) {
  return await migrateLegacyToUserHoldings(uid);
}
