// src/lib/finance/getPricePLN.js

export async function getPricePLN({ yahoo, stooq }) {
  // 1. Spróbuj z Yahoo Finance
  if (yahoo) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?region=PL&lang=pl-PL`;
      const data = await fetch(url, { cache: "no-store" }).then(r => r.json());

      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      const currency = data?.chart?.result?.[0]?.meta?.currency;

      if (typeof price === "number") {
        if (currency && currency !== "PLN") {
          // jeśli waluta inna niż PLN → przelicz przez NBP API
          const fx = await getFXtoPLN(currency);
          return +(price * fx).toFixed(2);
        }
        return +price.toFixed(2);
      }
    } catch (err) {
      console.error("Yahoo fetch error:", err);
    }
  }

  // 2. Spróbuj z Stooq
  if (stooq) {
    try {
      const url = `https://stooq.pl/q/l/?s=${encodeURIComponent(stooq)}&f=sd2t2ohlcvn&h&e=csv`;
      const text = await fetch(url, { cache: "no-store" }).then(r => r.text());
      const [, , , , , close] = text.split("\n")[1]?.split(",") || [];
      if (close && !isNaN(parseFloat(close))) {
        return +parseFloat(close).toFixed(2);
      }
    } catch (err) {
      console.error("Stooq fetch error:", err);
    }
  }

  // Jeśli brak danych
  return null;
}

async function getFXtoPLN(currency) {
  if (currency === "PLN") return 1;
  try {
    const nbp = await fetch(`https://api.nbp.pl/api/exchangerates/rates/a/${currency.toLowerCase()}/?format=json`)
      .then(r => r.json());
    return nbp?.rates?.[0]?.mid || 1;
  } catch {
    return 1; // fallback bez przeliczania
  }
}
