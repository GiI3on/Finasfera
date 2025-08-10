// src/data/nbpForecast.js
// NBP – Projekcja inflacji (lipiec 2025): CPI r/r (%)
// Źródło: nbp.pl / „Projekcja inflacji i PKB – lipiec 2025” (tabela CPI).
// Aktualizację robisz edytując poniższą tablicę (np. po listopadowej projekcji).

export const NBP_FORECAST_META = {
  title: "NBP – Projekcja inflacji i PKB (lipiec 2025)",
  release: "2025-07-01", // przybliżona data publikacji
  source: "NBP",
};

export const NBP_CPI_FORECAST = [
  { year: 2025, cpi: 3.9 },
  { year: 2026, cpi: 3.1 },
  { year: 2027, cpi: 2.4 },
];
// Jeśli NBP opublikuje dalsze lata – dopisz kolejne obiekty.
