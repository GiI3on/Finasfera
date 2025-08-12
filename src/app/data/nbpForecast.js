// src/data/nbpForecast.js
const START_YEAR = new Date().getFullYear();
const YEARS_AHEAD = 15;

function buildPath(start, n, startCpi = 5.0, target = 2.7) {
  const out = [];
  let cur = startCpi;
  for (let i = 0; i < n; i++) {
    cur = target + (cur - target) * 0.55;
    out.push({ year: start + i, cpi: Math.max(0, Math.round(cur * 10) / 10) });
  }
  return out;
}

export const NBP_CPI_FORECAST = buildPath(START_YEAR, YEARS_AHEAD);
export const NBP_FORECAST_META = {
  source: "heuristic-local",
  generatedAt: new Date().toISOString(),
};
