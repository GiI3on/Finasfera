// src/lib/finance/getPricePLN.js

const REVALIDATE_SECONDS = 3600; // 1h – możesz zmienić np. na 900 (15 min)

/**
 * Zwraca cenę w PLN na podstawie źródeł:
 * - Yahoo Finance (jeśli zwróci cenę i walutę ≠ PLN, przelicza po NBP)
 * - Stooq (CSV)
 * Jeśli brak danych z obu, zwraca null.
 */
export async function getPricePLN({ yahoo, stooq }) {
  // 1) Yahoo Finance
  if (yahoo) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        yahoo
      )}?region=PL&lang=pl-PL`;

      // Uwaga: ISR zamiast cache:"no-store"
      const data = await fetch(url, {
        next: { revalidate: REVALIDATE_SECONDS },
      }).then((r) => r.json());

      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      const currency = data?.chart?.result?.[0]?.meta?.currency;

      if (typeof price === "number") {
        if (currency && currency !== "PLN") {
          const fx = await getFXtoPLN(currency);
          return +(price * fx).toFixed(2);
        }
        return +Number(price).toFixed(2);
      }
    } catch (err) {
      console.error("Yahoo fetch error:", err);
    }
  }

  // 2) Stooq
  if (stooq) {
    try {
      const url = `https://stooq.pl/q/l/?s=${encodeURIComponent(
        stooq
      )}&f=sd2t2ohlcvn&h&e=csv`;

      // ISR zamiast no-store
      const text = await fetch(url, {
        next: { revalidate: REVALIDATE_SECONDS },
      }).then((r) => r.text());

      const [, , , , , close] = text.split("\n")[1]?.split(",") || [];
      if (close && !isNaN(parseFloat(close))) {
        return +parseFloat(close).toFixed(2);
      }
    } catch (err) {
      console.error("Stooq fetch error:", err);
    }
  }

  // Brak danych
  return null;
}

async function getFXtoPLN(currency) {
  if (!currency || currency === "PLN") return 1;

  try {
    const url = `https://api.nbp.pl/api/exchangerates/rates/a/${encodeURIComponent(
      String(currency).toLowerCase()
    )}/?format=json`;

    // ISR również dla NBP (żeby nie wywoływać „dynamic server usage”)
    const nbp = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
    }).then((r) => r.json());

    const mid = nbp?.rates?.[0]?.mid;
    return typeof mid === "number" ? mid : 1;
  } catch (err) {
    console.error("NBP fetch error:", err);
    return 1; // fallback bez przeliczenia
  }
}
