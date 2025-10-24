import { getDocs, query, orderBy, collection, where } from "firebase/firestore";
import { db } from "../firebase";
import { addDividendDetailed, addDividendPlan } from "./portfolioStore";

/** === LOG helper === */
const L = {
  sync:  (...a) => console.log("[DIV:SYNC]", ...a),
  shares:(...a) => console.log("[DIV:SHARES]", ...a),
  add:   (...a) => console.log("[DIV:ADD]", ...a),
  warn:  (...a) => console.warn("[DIV:WARN]", ...a),
  err:   (...a) => console.error("[DIV:ERR]", ...a),
};

/** API: /api/dividends?symbol=XYZ */
async function fetchCalendar(symbol) {
  try {
    const r = await fetch(`/api/dividends?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
    if (!r.ok) return [];
    const j = await r.json().catch(() => ({}));
    return Array.isArray(j?.events) ? j.events : [];
  } catch (e) {
    L.err("fetchCalendar failed for", symbol, e);
    return [];
  }
}

/** API: /api/fx?ccy=USD&date=YYYY-MM-DD */
async function fetchFx(ccy, dateISO) {
  try {
    const r = await fetch(`/api/fx?ccy=${encodeURIComponent(ccy)}&date=${encodeURIComponent(dateISO || "")}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({}));
    return Number.isFinite(Number(j?.rate)) ? Number(j.rate) : null;
  } catch (e) {
    L.err("fetchFx failed", ccy, dateISO, e);
    return null;
  }
}

/* ===== FX memo-cache ===== */
const _fxCache = new Map();
async function getFxCached(ccy, dateISO) {
  const key = `${String(ccy).toUpperCase()}|${String(dateISO || "").slice(0,10)}`;
  if (_fxCache.has(key)) return _fxCache.get(key);
  const rate = await fetchFx(ccy, dateISO).catch(() => null);
  const val = Number.isFinite(Number(rate)) ? Number(rate) : null;
  _fxCache.set(key, val);
  return val;
}

/* ===== Sygnatury ===== */
function divSignature({ symbol, payDate, gross, currency }) {
  const s = String(symbol || "").toUpperCase().trim();
  const d = String(payDate || "").slice(0, 10);
  const g = Number(gross || 0).toFixed(4);
  const c = String(currency || "PLN").toUpperCase();
  return `${s}|${d}|${g}|${c}`;
}
function planSignature({ symbol, exDate, gross, currency }) {
  const s = String(symbol || "").toUpperCase().trim();
  const d = String(exDate || "").slice(0, 10);
  const g = Number(gross || 0).toFixed(4);
  const c = String(currency || "PLN").toUpperCase();
  return `PLAN|${s}|${d}|${g}|${c}`;
}

/* ===== Wczytanie istniejących ===== */
async function loadExistingDividendSigs(uid, portfolioId = null) {
  const cashCol = portfolioId
    ? collection(db, "users", uid, "portfolios", portfolioId, "cashflows")
    : collection(db, "users", uid, "cashflows");

  const snap = await getDocs(query(cashCol, orderBy("date", "asc")));
  const sigs = new Set();

  snap.forEach((d) => {
    const row = d.data();
    if (!row || String(row.type || "").toLowerCase() !== "dividend") return;
    const sig =
      row.importSignature ||
      divSignature({
        symbol: row.symbol || row.note,
        payDate: row.payDate || row.date,
        gross: row.grossAmount,
        currency: row.currencySrc || row.currency || "PLN",
      });
    if (sig) sigs.add(sig);
  });

  return sigs;
}

async function loadExistingPlanSigs(uid, portfolioId = null) {
  const plansCol = portfolioId
    ? collection(db, "users", uid, "portfolios", portfolioId, "dividendPlans")
    : collection(db, "users", uid, "dividendPlans");

  const snap = await getDocs(query(plansCol, orderBy("exDate", "asc")));
  const sigs = new Set();

  snap.forEach((d) => {
    const row = d.data();
    if (!row) return;
    const sig =
      row.importSignature ||
      planSignature({
        symbol: row.symbol,
        exDate: row.exDate,
        gross: row.gross,
        currency: row.currency || "PLN",
      });
    if (sig) sigs.add(sig);
  });

  return sigs;
}

/* ===== Pomoc: warianty symbolu ===== */
function symbolVariants(raw) {
  const s = String(raw || "").trim();
  return Array.from(new Set([
    s,
    s.toUpperCase(),
    s.toUpperCase().endsWith(".WA") ? s.toUpperCase() : (s.toUpperCase() + ".WA"),
    s.replace(/\.WA$/i, ""),
  ])).filter(Boolean);
}

/* ===== Liczba akcji (sumujemy OR-owo po wariantach) ===== */
async function getCurrentShares(uid, portfolioId = null, symbol) {
  const col = portfolioId
    ? collection(db, "users", uid, "portfolios", portfolioId, "holdings")
    : collection(db, "users", uid, "holdings");

  const variants = symbolVariants(symbol);
  let qty = 0;
  for (const v of variants) {
    try {
      const snap = await getDocs(query(col, where("pair.yahoo", "==", v)));
      snap.forEach((d) => { qty += Number(d.data()?.shares) || 0; });
    } catch (e) {
      L.warn("getCurrentShares query failed for", v, e);
    }
  }
  L.shares("symbol", symbol, "variants", variants, "qty", qty);
  return qty;
}

/* ===== Minimalny buyDate per symbol (najpierw holdings, jeśli brak — cashflows BUY) ===== */
async function loadMinBuyDatePerSymbol(uid, portfolioId = null, symbols = []) {
  const out = new Map();
  if (!uid || !symbols.length) return out;

  // 1) HOLDINGS
  const holdingsCol = portfolioId
    ? collection(db, "users", uid, "portfolios", portfolioId, "holdings")
    : collection(db, "users", uid, "holdings");

  for (const raw of symbols) {
    const sym = String(raw || "").toUpperCase().trim();
    if (!sym) continue;

    const variants = Array.from(new Set([sym, sym.replace(/\.WA$/i,""), sym.endsWith(".WA")?sym:(sym+".WA")]));
    let min = null;

    for (const v of variants) {
      const snap = await getDocs(query(holdingsCol, where("pair.yahoo", "==", v)));
      snap.forEach((d) => {
        const row = d.data();
        const bd = String(row?.buyDate || "").slice(0, 10);
        if (!bd) return;
        if (!min || bd < min) min = bd;
      });
    }

    // 2) jeżeli holdings nie ma buyDate → sprawdź cashflows (typ "buy")
    if (!min) {
      const cfCol = portfolioId
        ? collection(db, "users", uid, "portfolios", portfolioId, "cashflows")
        : collection(db, "users", uid, "cashflows");

      for (const v of variants) {
        try {
          const snap = await getDocs(query(cfCol, where("type", "==", "buy"), where("symbol", "==", v)));
          snap.forEach((d) => {
            const row = d.data();
            const dt = String(row?.date || row?.payDate || "").slice(0,10);
            if (!dt) return;
            if (!min || dt < min) min = dt;
          });
        } catch (e) {
          // pomijamy błędy jednostkowe
        }
      }
    }

    if (min) out.set(sym, min);
  }

  return out;
}

/* ===== Główna funkcja ===== */
export async function syncDividendsForPortfolio({ uid, portfolioId = null, symbols = [] }) {
  if (!uid || !Array.isArray(symbols) || !symbols.length) {
    L.warn("sync: missing uid or symbols");
    return { added: 0, planned: 0, checked: 0 };
  }

  const existingDiv  = await loadExistingDividendSigs(uid, portfolioId);
  const existingPlan = await loadExistingPlanSigs(uid, portfolioId);
  const minBuyMap    = await loadMinBuyDatePerSymbol(uid, portfolioId, symbols);

  const todayISO = new Date().toISOString().slice(0, 10);

  let added = 0, planned = 0, checked = 0;

  const uniqSymbols = Array.from(new Set(symbols.map(s => String(s || "").toUpperCase().trim()).filter(Boolean)));
  const calendars = await Promise.allSettled(uniqSymbols.map(sym => fetchCalendar(sym)));

  for (let i = 0; i < uniqSymbols.length; i++) {
    const symbol = uniqSymbols[i];
    const events = calendars[i].status === "fulfilled" ? (calendars[i].value || []) : [];
    checked += events.length;

    const minBuy = minBuyMap.get(symbol) || null;
    const qty = await getCurrentShares(uid, portfolioId, symbol);

    L.sync("symbol", symbol, "events", events.length, "qty", qty, "minBuy", minBuy);

    if (qty <= 0) continue; // nic nie liczymy, jeśli brak akcji
    if (!minBuy) {
      // nie znamy daty zakupu -> dla bezpieczeństwa NIE backfillujemy historycznych faktów,
      // ale pozwolimy na plany (przyszłe exDate) – bo i tak nie wypłacone.
    }

    const eligible = events.filter((ev) => {
      const ex  = String(ev.exDate   || "").slice(0,10);
      const pay = String(ev.payDate  || "").slice(0,10);

      // --- KLUCZOWA REGUŁA ---
      // liczymy wyłącznie dywidendy, do których prawo nabyłeś:
      // - jeśli znamy exDate → exDate >= minBuy
      // - jeśli exDate brak → dopuszczamy tylko, gdy payDate >= minBuy (heurystyka)
      const pivot = ex || pay || null;
      if (!pivot) return false;
      if (minBuy && ex && ex < minBuy) return false;
      if (minBuy && !ex && pay && pay < minBuy) return false;

      return true;
    });

    for (const ev of eligible) {
      const ex = String(ev.exDate || "").slice(0, 10);
      const pay = String(ev.payDate || "").slice(0, 10);
      let ccy = String(ev.currency || "PLN").toUpperCase();

      if ((symbol || "").endsWith(".WA") && !ccy) ccy = "PLN";

      const grossPerShare = Number(ev.gross || 0);
      const wht = Number.isFinite(Number(ev.wht)) ? Number(ev.wht) : null;
      const netPerShare = Number.isFinite(Number(ev.net)) ? Number(ev.net) : (wht != null ? (grossPerShare - wht) : grossPerShare);

      // 1) PLANY – tylko przyszłe ex/pay
      const isFutureByEx  = ex  && ex  >= todayISO;
      const isFutureByPay = pay && pay >  todayISO;
      if (isFutureByEx || isFutureByPay) {
        // dodatkowo: jeśli mamy minBuy i ex < minBuy → wypad (ale wyżej już to przefiltrowaliśmy)
        const psig = planSignature({ symbol, exDate: ex || pay, gross: grossPerShare, currency: ccy });
        if (!existingPlan.has(psig)) {
          existingPlan.add(psig);
          const fx = ccy === "PLN" ? 1 : (await getFxCached(ccy, ex || pay)) ?? 1;
          const estPLN = Math.max(0, netPerShare * qty * fx);
          try {
            await addDividendPlan(uid, portfolioId, {
              symbol,
              exDate: ex || null,
              gross: grossPerShare,
              currency: ccy,
              fxAtExDate: fx,
              netEstimatePLN: estPLN,
              note: isFutureByPay && !isFutureByEx ? "Prognoza (po ex-date, oczekuje na wypłatę)" : "Prognoza (na podstawie ex-date)",
              importSignature: psig,
            });
            planned += 1;
            L.add("PLAN", { symbol, exDate: ex || pay, psig, estPLN, qty, fx });
          } catch (e) {
            L.err("addDividendPlan failed", psig, e);
          }
        }
        continue;
      }

      // 2) FAKTY – przeszłe, ale tylko spełniające warunek minBuy vs ex/pay
      const dsig = divSignature({ symbol, payDate: pay, gross: grossPerShare, currency: ccy });
      if (existingDiv.has(dsig)) continue;
      existingDiv.add(dsig);

      const fxRate = ccy === "PLN" ? 1 : (await getFxCached(ccy, pay || ex));
      try {
        await addDividendDetailed(uid, portfolioId, {
          symbol,
          currencySrc: ccy,
          grossAmount: grossPerShare * qty,
          withholdingTax: wht != null ? wht * qty : null,
          netAmount: netPerShare * qty,
          payDate: pay || null,
          exDate: ex || null,
          recordDate: ev.recordDate ? String(ev.recordDate).slice(0, 10) : null,
          note: `Dywidenda ${symbol}`,
          fxRate: ccy === "PLN" ? 1 : (Number.isFinite(Number(fxRate)) ? Number(fxRate) : null),
          importSignature: dsig,
        });
        added += 1;
        L.add("FACT", { symbol, payDate: pay, dsig, grossPerShare, netPerShare, qty, fxRate });
      } catch (e) {
        L.err("addDividendDetailed failed", dsig, e);
      }
    }
  }

  L.sync("DONE", { added, planned, checked });
  return { added, planned, checked };
}
