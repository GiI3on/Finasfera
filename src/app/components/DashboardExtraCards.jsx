// src/app/components/DashboardExtraCards.jsx
"use client";

import { useMemo } from "react";

const fmtPct = (v) => `${Number(v || 0).toFixed(2)}%`;
const isoLocal = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* MDD z datami */
function computeMddWithDates(vals) {
  let peakVal = -Infinity, peakDate = null;
  let minDD = 0, troughDate = null;
  for (const p of vals || []) {
    const v = Number(p?.value) || 0;
    const t = p?.t || null;
    if (v > peakVal) { peakVal = v; peakDate = t; }
    if (peakVal > 0) {
      const dd = v / peakVal - 1;
      if (dd < minDD) { minDD = dd; troughDate = t; }
    }
  }
  return { mdd: minDD, peakDate, troughDate };
}

/* XIRR (Newton) — wpłaty będziemy negować wewnątrz (konwencja IRR) */
function xirrNewton(cash, guess = 0.1) {
  const flows = (cash || []).map(r => ({
    t: new Date(String(r.date || "").slice(0,10)),
    v: -Number(r.amount || 0),
  })).filter(f => Number.isFinite(f.t.getTime()) && Number.isFinite(f.v) && f.v !== 0);

  if (flows.length < 2) return null;
  const t0 = flows[0].t;

  function f(rate) {
    let s = 0;
    for (const {t, v} of flows) {
      const days = (t - t0) / 86400000;
      s += v / Math.pow(1 + rate, days / 365);
    }
    return s;
  }
  function df(rate) {
    let s = 0;
    for (const {t, v} of flows) {
      const days = (t - t0) / 86400000;
      const exp = days / 365;
      s += -(exp * v) / Math.pow(1 + rate, exp + 1);
    }
    return s;
  }

  let r = guess;
  for (let i = 0; i < 50; i++) {
    const fr = f(r);
    const dfr = df(r);
    if (Math.abs(dfr) < 1e-12) break;
    const next = r - fr / dfr;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - r) < 1e-10) return r;
    r = next;
  }
  return Number.isFinite(r) ? r : null;
}

/* Oblicz MWR (z CF zewnętrznych + terminal value) */
function computeMWR({ externalCF = [], terminalValuePLN = 0, sinceISO = null, untilISO = null }) {
  const rows = (externalCF || []).filter((f) => {
    const d = String(f.date || "").slice(0,10);
    if (!d) return false;
    if (sinceISO && d < sinceISO) return false;
    if (untilISO && d > untilISO) return false;
    return true;
  });
  const cf = rows.map(r => ({ date: String(r.date).slice(0,10), amount: Number(r.amount)||0 }));
  const todayISO = isoLocal(new Date());
  cf.push({ date: todayISO, amount: -(-terminalValuePLN) });

  const r = xirrNewton(cf);
  return Number.isFinite(r) ? r : null;
}

/* Turnover YTD */
function computeTurnoverYTD({ cashflowsAll = [], valuesAlignedAll = [], yearISO }) {
  const y = yearISO || new Date().getFullYear();
  const start = `${y}-01-01`;
  const end = new Date().toISOString().slice(0,10);

  let buys = 0, sells = 0;
  for (const f of cashflowsAll || []) {
    const t = String(f?.type || "").toLowerCase();
    const d = String(f?.date || "").slice(0,10);
    if (!d || d < start || d > end) continue;
    const amt = Number(f?.amount) || 0;
    if (t === "buy")  buys  += Math.abs(Math.min(0, amt)); // buy zwykle ujemny
    if (t === "sell") sells += Math.abs(Math.max(0, amt)); // sell zwykle dodatni
  }
  const valsYTD = (valuesAlignedAll || []).filter(p => (p?.t || "") >= start && (p?.t || "") <= end);
  const avg = valsYTD.length ? valsYTD.reduce((a,b)=>a+(Number(b.value)||0),0)/valsYTD.length : 0;
  if (!(avg > 0)) return 0;
  return (buys + sells) / avg;
}

/**
 * Props:
 * - valuesAlignedAll: [{t, value}] (lifetime, wyrównane)
 * - cashflowsAll: cash.flows z Twojego store (pełna lista CF)
 * - lifetimeSince: ISO pierwszej aktywności (albo null)
 * - lastValueNow: ostatnia wartość portfela (PLN)
 */
export default function DashboardExtraCards({ valuesAlignedAll, cashflowsAll, lifetimeSince, lastValueNow }) {
  const mddLifetimeEx = useMemo(() => computeMddWithDates(valuesAlignedAll), [valuesAlignedAll]);

  // Zewnętrzne CF do IRR (deposit/withdraw/manual/correction, bez storno i excludeFromTWR)
  const externalCashAll = useMemo(() => {
    const EXTERNAL = new Set(["deposit", "withdraw", "manual", "correction"]);
    return (cashflowsAll || []).filter((f) => {
      const t = String(f?.type || "").toLowerCase();
      return EXTERNAL.has(t) && !f?.excludeFromTWR && !f?.storno;
    });
  }, [cashflowsAll]);

  const endISO = useMemo(() => isoLocal(new Date()), []);
  const mwrLifetime = useMemo(() => {
    const since = lifetimeSince || null;
    return computeMWR({
      externalCF: externalCashAll,
      terminalValuePLN: lastValueNow || 0,
      sinceISO: since,
      untilISO: endISO,
    });
  }, [externalCashAll, lastValueNow, lifetimeSince, endISO]);

  const mwrYTD = useMemo(() => {
    const start = isoLocal(new Date(new Date().getFullYear(), 0, 1));
    return computeMWR({
      externalCF: externalCashAll,
      terminalValuePLN: lastValueNow || 0,
      sinceISO: start,
      untilISO: endISO,
    });
  }, [externalCashAll, lastValueNow, endISO]);

  const turnoverYTD = useMemo(() => {
    return computeTurnoverYTD({
      cashflowsAll,
      valuesAlignedAll,
      yearISO: new Date().getFullYear(),
    });
  }, [cashflowsAll, valuesAlignedAll]);

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">MWR / XIRR (od startu)</div>
          <div className="text-3xl font-semibold tabular-nums">
            {Number.isFinite(mwrLifetime) ? fmtPct(mwrLifetime * 100) : "—"}
          </div>
          <div className="text-xs text-zinc-400">Money-weighted (IRR z przepływów zewnętrznych)</div>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">MWR / XIRR (YTD)</div>
          <div className="text-3xl font-semibold tabular-nums">
            {Number.isFinite(mwrYTD) ? fmtPct(mwrYTD * 100) : "—"}
          </div>
          <div className="text-xs text-zinc-400">Od 1 stycznia do dziś</div>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          <div className="muted text-sm">Turnover (YTD)</div>
          <div className="text-3xl font-semibold tabular-nums">
            {fmtPct((turnoverYTD || 0) * 100)}
          </div>
          <div className="text-xs text-zinc-400">Obrót: (zakupy+sprzedaże) / śr. wartość portfela</div>
        </div>
      </div>

      {/* BONUS: MDD z datami (lifetime) */}
      <div className="card md:col-span-3">
        <div className="card-inner">
          <div className="muted text-sm">Max Drawdown (od startu)</div>
          <div className="text-3xl font-semibold tabular-nums text-red-400">
            {fmtPct((mddLifetimeEx?.mdd || 0) * 100)}
          </div>
          <div className="text-xs text-zinc-400">
            {mddLifetimeEx?.peakDate && mddLifetimeEx?.troughDate
              ? `Peak: ${mddLifetimeEx.peakDate} → Trough: ${mddLifetimeEx.troughDate}`
              : "—"}
          </div>
        </div>
      </div>
    </section>
  );
}
