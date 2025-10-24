/**
 * @typedef {{
 *   date: string|Date,
 *   amount: number,      // PLN (już przeliczone do PLN)
 *   currency?: string,
 *   excludeFromTWR?: boolean,
 *   storno?: boolean,
 *   linkedTxnId?: string
 * }} CashRow
 */

/** @param {string|Date} d */
function toISO(d) {
  const x = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(x?.getTime?.()) ? null : x.toISOString().slice(0, 10);
}

/**
 * Zwraca Mapę `dzień -> sumaPLN` zawierającą tylko zewnętrzne przepływy:
 *  - pomija `excludeFromTWR === true`
 *  - pomija `storno === true` (techniczne korekty/autodoładowania)
 * @param {CashRow[]} flows
 * @returns {Map<string, number>}
 */
export function normalizeCashflowsForTWR(flows = []) {
  const m = new Map();
  for (const f of flows) {
    if (!f) continue;
    if (f.excludeFromTWR === true) continue;
    if (f.storno === true) continue;

    const k = toISO(f.date);
    const v = Number(f.amount);
    if (!k || !Number.isFinite(v) || v === 0) continue;

    m.set(k, (m.get(k) || 0) + v);
  }
  return m;
}

/**
 * Wyrównuje przepływy do zadanej osi (CF są EOD).
 * Jeżeli przepływ wypada w dzień NIEobecny na osi (np. weekend),
 * zostaje „przypięty” do najbliższego PÓŹNIEJSZEGO dnia z osi (zwykle poniedziałek).
 *
 * @param {Map<string, number>} cashMap   – klucze: YYYY-MM-DD (dowolne dni)
 * @param {string[]} axisDays             – posortowana rosnąco oś (np. kolejne dni handlowe)
 * @returns {Map<string, number>}         – mapowanie dokładnie po axisDays
 */
export function filterCashflowsByAxis(cashMap, axisDays) {
  const out = new Map();
  const axis = Array.isArray(axisDays) ? [...axisDays].sort() : [];

  // szybki lookup
  const isOnAxis = new Set(axis);

  // najpierw rozlej CF na „snapowane” dni
  if (cashMap instanceof Map) {
    for (const [d, amt] of cashMap.entries()) {
      if (!d || !Number.isFinite(amt) || amt === 0) continue;

      let target = null;
      if (isOnAxis.has(d)) {
        target = d;
      } else {
        // znajdź pierwszy dzień z osi > d
        for (let i = 0; i < axis.length; i++) {
          if (axis[i] >= d) { target = axis[i]; break; }
        }
        // jeżeli cały CF jest PO osi (np. błąd zakresu) – pomiń
        if (!target) continue;
      }
      out.set(target, (out.get(target) || 0) + amt);
    }
  }

  // następnie dopisz zera na brakujące dni z osi
  for (const d of axis) {
    if (!out.has(d)) out.set(d, 0);
  }
  return out;
}
