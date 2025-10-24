// src/app/api/_utils/tickers.js
// Spójne mapowanie Yahoo → prawidłowy ticker GPW + pomocnicze konwersje

// znane rozbieżności Yahoo ↔ GPW
export const FIX_TICKER = {
  "PRA.WA": "GPP.WA", // Grupa Pracuj
  // tu dopisuj kolejne wyjątki, gdyby wyszły w praniu
};

export const isWATicker = (sym = "") => /\.WA$/i.test(sym);

// Yahoo 'XYZ.WA' -> Stooq 'xyz'
export function yahooWAToStooqCode(sym) {
  return String(sym || "").split(".")[0].toLowerCase();
}

// Zwraca poprawiony ticker Yahoo (po fixach)
export function normalizeYahoo(sym = "") {
  const up = String(sym || "").toUpperCase();
  return FIX_TICKER[up] || up;
}
