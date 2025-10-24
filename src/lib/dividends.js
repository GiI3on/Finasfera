// src/lib/dividends.js

/** Normalizacja rekordu dywidendy z cashflow */
export function normalizeDividendFlow(cfRow = {}) {
  const t = String(cfRow?.type || "").toLowerCase();
  if (t !== "dividend") return null;

  // amount w cashflows traktujemy jako NETTO w PLN (patrz addDividendDetailed)
  const netPLN = Number(cfRow?.amount) || 0;

  return {
    id: cfRow.id || null,
    symbol: cfRow.symbol || cfRow.note || "—",
    payDate: (cfRow.payDate || cfRow.date || "").slice(0, 10),
    exDate: (cfRow.exDate || "") ? String(cfRow.exDate).slice(0,10) : null,
    recordDate: (cfRow.recordDate || "") ? String(cfRow.recordDate).slice(0,10) : null,

    // źródłowa waluta i wartości (jeśli podane)
    currency: cfRow.currencySrc || cfRow.currency || "PLN",
    grossSrc: Number(cfRow.grossAmount) || null,        // w walucie źródłowej
    whtSrc:   Number(cfRow.withholdingTax) || null,     // w walucie źródłowej
    netSrc:   Number.isFinite(Number(cfRow.netAmount)) ? Number(cfRow.netAmount) : (
                (Number(cfRow.grossAmount)||0) - (Number(cfRow.withholdingTax)||0)
              ),

    // przeliczenie
    fxRate: Number(cfRow.fxRate) || (cfRow.currency === "PLN" ? 1 : null),
    netPLN,
    accountId: cfRow.accountId || null,
    note: cfRow.note || null,
  };
}

/** Filtrowanie cash.flows -> dywidendy (znormalizowane) */
export function extractDividendsFromCashflows(cashInfo) {
  const rows = Array.isArray(cashInfo?.flows) ? cashInfo.flows : [];
  return rows
    .map(normalizeDividendFlow)
    .filter(Boolean)
    .sort((a, b) => String(a.payDate||"").localeCompare(String(b.payDate||"")));
}

/** Suma w PLN po dacie (YYYY-MM) */
export function monthlySumsPLN(divs) {
  const byYm = new Map();
  for (const d of divs) {
    const ym = String(d.payDate || "").slice(0,7);
    if (!ym) continue;
    byYm.set(ym, (byYm.get(ym) || 0) + (Number(d.netPLN)||0));
  }
  const keys = Array.from(byYm.keys()).sort();
  return keys.map((k) => ({ ym: k, netPLN: byYm.get(k) }));
}

/** Zakres daty pomocniczo */
function addMonths(iso, n) {
  const [Y,M] = (iso||"").split("-").map(x=>+x);
  if (!Y || !M) return iso;
  const d = new Date(Date.UTC(Y, M-1, 1));
  d.setUTCMonth(d.getUTCMonth()+n);
  return d.toISOString().slice(0,7);
}

/** Suma TTM (ostatnie 12 pełnych miesięcy, PLN) względem max daty w danych */
export function sumTTM(divs) {
  if (!divs.length) return 0;
  const lastYm = (divs[divs.length-1].payDate || "").slice(0,7);
  if (!lastYm) return 0;
  let total = 0;
  const startYm = addMonths(lastYm, -11);
  for (const d of divs) {
    const ym = (d.payDate||"").slice(0,7);
    if (ym >= startYm && ym <= lastYm) total += Number(d.netPLN)||0;
  }
  return total;
}

/** Suma YTD (PLN) */
export function sumYTD(divs) {
  if (!divs.length) return 0;
  const year = (divs[divs.length-1].payDate || "").slice(0,4);
  if (!year) return 0;
  let total = 0;
  for (const d of divs) {
    const y = (d.payDate||"").slice(0,4);
    if (y === year) total += Number(d.netPLN)||0;
  }
  return total;
}

/** DY TTM = TTM / bieżąca wartość portfela */
export function dyTTM(divs, currentPortfolioValuePLN) {
  const ttm = sumTTM(divs);
  const base = Number(currentPortfolioValuePLN)||0;
  if (!(base>0)) return 0;
  return ttm / base;
}

/** Prosty formattery */
export const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL",{style:"currency",currency:"PLN",minimumFractionDigits:2,maximumFractionDigits:2})
    .format(Number.isFinite(Number(v)) ? Number(v) : 0);

export const fmtPct = (v) => `${Number(v||0).toFixed(2)}%`;
