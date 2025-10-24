// src/lib/scopeResolver.js
"use client";

export const ALL_SCOPE = "__ALL__";
export const MAIN_ID = "";

export function isAllScope(v) {
  if (v === ALL_SCOPE) return true;
  return typeof v === "string" && v.toLowerCase() === "all";
}

export function normalizePortfolioId(value, { allowAll = false } = {}) {
  if (value == null) return MAIN_ID;
  const str = String(value).trim();
  if (!str) return MAIN_ID;
  if (allowAll && isAllScope(str)) return ALL_SCOPE;
  if (!allowAll && isAllScope(str)) return MAIN_ID;
  return str;
}

/**
 * Z jednego "scope" robi listę ID portfeli, które należy wziąć pod uwagę.
 * - scope="__ALL__" → zwróci wszystkie nazwane + ewentualnie MAIN (jeśli includeMain=true)
 * - scope="" (MAIN) → [""] tylko
 * - scope="p123" → ["p123"] tylko
 *
 * @param {string} scope
 * @param {{
 *   hideMainPortfolio?: boolean,
 *   portfolioOptions?: Array<{id:string|number,name?:string}>,
 *   explicitIds?: string[],   // gdy podasz, to nadpisuje portfolioOptions
 *   includeMain?: boolean,     // czy do ALL dołożyć MAIN ("")
 * }} opts
 * @returns {string[]}
 */
export function resolveScopeToIds(
  scope,
  { hideMainPortfolio = false, portfolioOptions = [], explicitIds = null, includeMain = true } = {}
) {
  const s = isAllScope(scope) ? ALL_SCOPE : normalizePortfolioId(scope, { allowAll: false });

  // MAIN
  if (s === MAIN_ID) return [MAIN_ID];

  // KONKRET
  if (s !== ALL_SCOPE) return [s];

  // ALL
  const base =
    Array.isArray(explicitIds) && explicitIds.length
      ? explicitIds
      : (Array.isArray(portfolioOptions) ? portfolioOptions : [])
          .map((p) => (p?.id != null ? String(p.id) : null))
          .filter((x) => x !== null && x !== "");

  const set = new Set(base);
  if (includeMain && !hideMainPortfolio) set.add(MAIN_ID);

  return Array.from(set);
}
