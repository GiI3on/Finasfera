// Proste formatery używane w wielu komponentach
export const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(v)) ? Number(v) : 0);

export const fmtPct = (v) => `${Number(v || 0).toFixed(2)}%`;
