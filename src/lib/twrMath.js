/**
 * Wejście:
 *  - values:  [{ t: "YYYY-MM-DD", value: number }]
 *  - cashflows: Map<"YYYY-MM-DD", number>
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

export function computeTWR({ values = [], cashflows = new Map() } = {}) {
  const vals = normalizeValues(values);
  if (vals.length <= 1) {
    return { twr: 0, daily: [] };
  }

  // ==========================================
  // 🛠️ YTD HOLIDAY PATCH (Wsteczne łatanie 1 stycznia)
  // ==========================================
  // Jeśli wykres został ucięty (np. przez filtr YTD) w dzień świąteczny, 
  // system nie ma jak przepisać ceny z "wczoraj". Wtedy wartość na starcie = 0 (lub sama gotówka).
  if (vals.length > 1) {
    const v0 = vals[0].value;
    const v1 = vals[1].value;
    const cf1 = Number(cashflows instanceof Map ? (cashflows.get(vals[1].t) || 0) : 0) || 0;

    // Jeśli z 1. na 2. dzień portfel "rośnie" o ponad 50% BEZ wpłaty gotówki,
    // to jest to ewidentny błąd braku wyceny giełdowej w dniu 1.
    if (v0 > 0 && v1 > (v0 + cf1) * 1.5) {
      // Nadpisujemy zepsutą wartość z 1 stycznia prawdziwą wartością z 2 stycznia
      vals[0].value = v1 - cf1; 
    }
  }

  // Standardowy smoother dla luk w środku roku (jeśli jakieś święto by się prześlizgnęło)
  for (let i = 1; i < vals.length - 1; i++) {
    const prevValue = vals[i - 1].value;
    const currValue = vals[i].value;
    const nextValue = vals[i + 1].value;
    
    // Jeśli wartość drastycznie spada (V-shape dip) z powodu braku notowań i zaraz wraca
    if (currValue < prevValue * 0.6 && nextValue > currValue * 1.5) {
       vals[i].value = prevValue;
    }
  }
  // ==========================================

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
    const activeCapital = Vprev + CF;

    if (activeCapital > 1) {
      r = (V - activeCapital) / activeCapital;
    } else {
      r = 0;
    }

    if (!Number.isFinite(r)) r = 0;

    daily.push({ t, r });
    mult *= (1 + r);
  }

  const twr = mult - 1;
  return { twr, daily };
}

export const computeTWRSafe = computeTWR;
export default computeTWR;