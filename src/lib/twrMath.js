/**
 * Wejście:
 *  - values:  [{ t: "YYYY-MM-DD", value: number }]  // OŚ DZIENNA, przycięta wcześniej
 *  - cashflows: Map<"YYYY-MM-DD", number>           // zewnętrzne CF (EOD), już na tej samej osi
 *
 * Zasady:
 *  - Nie przycinamy tu zakresu – zakładamy, że caller podał właściwy [start..end].
 *  - Dla pierwszego kroku gdy V_{t-1} == 0 → r_t = 0 (brak sensownego dzielnika).
 *  - Formuła dzienna (CF jako EOD): r_t = (V_t - CF_t - V_{t-1}) / V_{t-1}
 */

const EPS = 1e-9;

function toISOday(x) {
  if (!x) return null;
  const d = typeof x === "string" ? new Date(x) : x;
  if (Number.isNaN(d?.getTime?.())) return null;
  return d.toISOString().slice(0, 10);
}

function sortByDay(a, b) {
  const ta = String(a?.t || "");
  const tb = String(b?.t || "");
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

/** Upewnij się, że tablica values jest posortowana i bez duplikatów dni. */
function normalizeValues(values = []) {
  const map = new Map();
  for (const p of Array.isArray(values) ? values : []) {
    const t = toISOday(p?.t);
    const v = Number(p?.value);
    if (!t || !Number.isFinite(v)) continue;
    map.set(t, v); // ostatnia wygrywa
  }
  return Array.from(map.entries())
    .map(([t, value]) => ({ t, value }))
    .sort(sortByDay);
}

/** Główna funkcja TWR – bez dodatkowego „smart” przycinania. */
export function computeTWR({ values = [], cashflows = new Map() } = {}) {
  const vals = normalizeValues(values);
  if (vals.length <= 1) {
    return { twr: 0, daily: [] };
  }

  const daily = [];
  let mult = 1;

  for (let i = 1; i < vals.length; i++) {
    const today = vals[i];
    const prev  = vals[i - 1];

    const t     = today.t;
    const V     = Math.max(Number(today.value) || 0, 0);
    const Vprev = Math.max(Number(prev.value)  || 0, 0);
    const CF    = Number(cashflows instanceof Map ? (cashflows.get(t) || 0) : 0) || 0;

    let r = 0;
    if (Vprev > EPS) {
      r = (V - CF - Vprev) / Vprev;
    } else {
      r = 0; // pierwszy krok po starcie inwestycji
    }

    if (!Number.isFinite(r)) r = 0;

    daily.push({ t, r });
    mult *= (1 + r);
  }

  const twr = mult - 1;
  return { twr, daily };
}

/** Alias zgodny z dotychczasowymi importami. */
export const computeTWRSafe = computeTWR;
export default computeTWR;
