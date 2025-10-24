// File: src/lib/twr.js
//
// Helper do liczenia TWR i przygotowania dziennej wartości portfela (PLN).
// - działa na Twoich strukturach: seriesById = { [id]: { history:[{t,close}], shares:number } }
// - uwzględnia buyDate (0 przed zakupem), forward-fill cen po dniach
// - cashflows: bierze tylko PLN i pomija excludeFromTWR
// - TWR: r_t = (V_t - V_{t-1} - CF_t) / V_{t-1} (gdy V_{t-1} > 0), inaczej 0
//
// Użycie (przykład):
//   import { buildPortfolioValueSeries, aggregateCashflowsForTWR, computeTWR } from "@/lib/twr";
//   const values = buildPortfolioValueSeries({ seriesById: series, holdings });
//   const cf = aggregateCashflowsForTWR(cashflows);
//   const { daily, twr } = computeTWR({ values, cashflows: cf });
//
// Gdzie:
//   series: to co masz w state: { [id]: { history:[{t,close}], shares } }
//   holdings: Twój array lotów (m.in. id, buyDate, shares)
//   cashflows: array wpisów gotówki z listenCashBalance(...).flows

/* =========================
   Małe utilsy
   ========================= */
function isoLocal(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const isNum = (v) => Number.isFinite(Number(v));

/* =========================
   Oś dni + forward fill
   ========================= */
function collectAllDaysFromSeriesMap(seriesById = {}) {
  const s = new Set();
  for (const key of Object.keys(seriesById || {})) {
    const h = seriesById[key]?.history || [];
    for (const pt of h) if (pt?.t) s.add(String(pt.t).slice(0, 10));
  }
  return Array.from(s).sort();
}

function forwardFill(history = [], days = [], buyDateISO = null) {
  const map = new Map();
  for (const p of history) {
    const d = (p?.t || "").slice(0, 10);
    const v = isNum(p?.close) ? Number(p.close) : null;
    if (d && v != null) map.set(d, v);
  }
  const out = [];
  let last = null;
  const bd = buyDateISO ? String(buyDateISO).slice(0, 10) : null;
  for (const d of days) {
    const exp = map.get(d);
    if (exp != null) last = exp;
    if (bd && d < bd) { out.push({ t: d, close: 0 }); continue; }
    out.push({ t: d, close: last ?? 0 });
  }
  return out;
}

/* =========================
   1) Agregacja wartości portfela (PLN) per dzień
   ========================= */
export function buildPortfolioValueSeries({ seriesById = {}, holdings = [] }) {
  // mapa: id -> buyDate
  const buyById = new Map();
  for (const h of holdings || []) {
    buyById.set(h.id, (h?.buyDate ? String(h.buyDate).slice(0, 10) : null));
  }

  const days = collectAllDaysFromSeriesMap(seriesById);
  if (!days.length) return []; // brak danych

  // forward-fill dla każdej pozycji i sumowanie shares * close
  // (shares bierzemy z seriesById[id].shares, a gdyby były rozbieżności – fallback na lot)
  const seriesFF = {};
  for (const id of Object.keys(seriesById)) {
    const s = seriesById[id] || { history: [], shares: 0 };
    const bd = buyById.get(id) || null;
    seriesFF[id] = {
      shares: Number(s.shares) || 0,
      ff: forwardFill(s.history || [], days, bd),
    };
  }

  const values = [];
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    let sum = 0;
    for (const id of Object.keys(seriesFF)) {
      const row = seriesFF[id];
      const pt = row.ff[i];
      const px = isNum(pt?.close) ? Number(pt.close) : 0;
      const sh = Number(row.shares) || 0;
      sum += px * sh;
    }
    values.push({ t: d, value: sum });
  }
  return values;
}

/* =========================
   2) Cashflow per dzień pod TWR
   ========================= */
export function aggregateCashflowsForTWR(flows = []) {
  // Zasady:
  //  - bierzemy tylko currency === 'PLN'
  //  - pomijamy excludeFromTWR === true
  //  - sumujemy po dacie YYYY-MM-DD
  const byDay = new Map();
  for (const f of Array.isArray(flows) ? flows : []) {
    if (f?.excludeFromTWR) continue;
    const ccy = f?.currency || "PLN";
    if (String(ccy).toUpperCase() !== "PLN") continue; // jeśli kiedyś pojawią się inne waluty -> konwersja potrzebna
    const d = (f?.date ? new Date(f.date) : new Date());
    const day = isoLocal(d);
    const amt = Number(f?.amount) || 0;
    byDay.set(day, (byDay.get(day) || 0) + amt);
  }
  return byDay; // Map<YYYY-MM-DD, number>
}

/* =========================
   3) Liczenie TWR
   ========================= */
export function computeTWR({ values = [], cashflows }) {
  // values: [{t, value}] – muszą być posortowane rosnąco po t
  // cashflows: Map<day, amount> z aggregateCashflowsForTWR()

  const V = (Array.isArray(values) ? values.slice() : []).sort((a, b) =>
    String(a.t).localeCompare(String(b.t))
  );

  const cf = cashflows instanceof Map ? cashflows : new Map();

  const daily = [];
  let twrMult = 1;

  for (let i = 0; i < V.length; i++) {
    const t = String(V[i].t).slice(0, 10);
    const cur = Number(V[i].value) || 0;
    const prev = i > 0 ? (Number(V[i - 1].value) || 0) : 0;
    const cft = Number(cf.get(t)) || 0;

    let r = 0;
    if (prev > 0) {
      r = (cur - prev - cft) / prev;
    } else {
      // Brzegowe: brak kapitału dnia poprzedniego – definiujemy r=0 (neutralne dla iloczynu)
      r = 0;
    }

    // ogranicz ekstremalne NaN/Inf
    if (!Number.isFinite(r)) r = 0;

    daily.push({ t, r });
    twrMult *= (1 + r);
  }

  return { daily, twr: twrMult - 1 };
}

/* =========================
   4) Wygodny wrapper end-to-end (opcjonalny)
   ========================= */
/**
 * buildTwrFromState({
 *   seriesById: { [id]: { history:[{t,close}], shares } },
 *   holdings: [ { id, buyDate, shares } ],
 *   cashflows: [ { amount, date, currency, excludeFromTWR } ],
 * })
 */
export function buildTwrFromState({ seriesById, holdings, cashflows }) {
  const values = buildPortfolioValueSeries({ seriesById, holdings }); // [{t,value}]
  const cf = aggregateCashflowsForTWR(cashflows);                     // Map(day -> sum)
  return computeTWR({ values, cashflows: cf });                       // { daily, twr }
}
