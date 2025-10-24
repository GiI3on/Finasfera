// src/app/components/DividendsSection.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDividendDetailed } from "../../lib/portfolioStore";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

/* === konta === */
import {
  normalizeAccountType,
  isTaxExemptAccount,
  accountLabel,
} from "../../lib/accounts";

/* === REALNY SYNC: Yahoo → Firestore === */
import { syncDividendsForPortfolio } from "../../lib/syncDividendsForPortfolio";

/* ======================== USTAWIENIA DEBUG ======================== */
const DEBUG_UI_DEFAULT = true;            // pokaż pasek diagnostyczny na ekranie
const DEBUG_CONSOLE = true;               // loguj do konsoli (grupy)

/* ======================== POMOCNICZE DATY ======================== */
function iso(d) { return new Date(d).toISOString().slice(0,10); }
function startEndForRange(rangeKey, factsMinISO = null) {
  const today = new Date(); const y = today.getUTCFullYear();
  if (rangeKey === "YTD") return { startISO: iso(new Date(Date.UTC(y,0,1))), endISO: iso(new Date(Date.UTC(y,11,31))) };
  if (rangeKey === "1R") { const e=new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)); const s=new Date(e); s.setUTCMonth(e.getUTCMonth()-11); return { startISO: iso(s), endISO: iso(new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth()+1,0))) }; }
  if (rangeKey === "3L") { const e=new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)); const s=new Date(e); s.setUTCMonth(e.getUTCMonth()-35); return { startISO: iso(s), endISO: iso(new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth()+1,0))) }; }
  const s = factsMinISO ? new Date(factsMinISO + "T00:00:00Z") : new Date(Date.UTC(y-3, today.getUTCMonth(), 1));
  const e = new Date(Date.UTC(y,11,31));
  return { startISO: iso(s), endISO: iso(e) };
}
function buildMonthAxis(startISO, endISO) {
  const s = new Date(startISO + "T00:00:00Z"); const e = new Date(endISO + "T00:00:00Z");
  const out=[]; const cur=new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(),1)); const last=new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(),1));
  while(cur<=last){ out.push(`${cur.getUTCFullYear()}-${String(cur.getUTCMonth()+1).padStart(2,"0")}`); cur.setUTCMonth(cur.getUTCMonth()+1); }
  return out;
}
function monthKey(dISO){ if(!dISO) return null; const d=String(dISO).slice(0,7); return d&&d.length===7?d:null; }

/* ======================== FORMATERY ======================== */
const PLNfmt = new Intl.NumberFormat("pl-PL",{style:"currency",currency:"PLN"});

/* ======================== HELPERY DANYCH ======================== */
function isDividendRow(r){
  const t = String(r?.type || "").toLowerCase().trim();
  if (t.includes("div")) return true; // "dividend", "dywidenda" itp.
  if ("grossAmount" in (r||{}) || "netAmount" in (r||{}) || "payDate" in (r||{}) || "exDate" in (r||{})) return true;
  return false;
}
function extractISO(r, ...fields) {
  for (const f of fields) {
    const v = r?.[f];
    if (!v) continue;
    const s = String(v);
    const d = s.length >= 10 ? s.slice(0,10) : null;
    if (d) return d;
  }
  return null;
}

/* liczba: akceptuj przecinki, spacje, „zł” */
function toNumberSmart(v) {
  if (v == null) return null;
  const s = String(v).replace(/\s/g, "").replace(/zł|PLN/gi, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* liczenie PLN z cashflow — oraz diagnostyka dlaczego wychodzi 0 */
function computeDividendPLNFromRow(r){
  const diag = { source: "unknown", ccy: null, fx:null, reason:null };
  const ccy = String(r?.currencySrc || r?.currency || "PLN").toUpperCase();
  const fx  = toNumberSmart(r?.fxRate) ?? toNumberSmart(r?.fx_at) ?? 1;
  diag.ccy = ccy; diag.fx = fx;

  const inPLN = [r?.amountPLN, r?.amount_pln, r?.netPLN, r?.net_pln, r?.grossPLN, r?.gross_pln, r?.valuePLN]
    .map(toNumberSmart).find(v=>v!=null);
  if (inPLN != null) { diag.source="PLN_direct"; return { amt: Math.max(0, inPLN), diag }; }

  const net = [r?.netAmount, r?.net, r?.netto].map(toNumberSmart).find(v=>v!=null);
  if (net != null) {
    diag.source="net+fx";
    return { amt: Math.max(0, ccy==="PLN" ? net : net*(fx||1)), diag };
  }

  const gross = [r?.grossAmount, r?.gross, r?.brutto, r?.dywidenda].map(toNumberSmart).find(v=>v!=null);
  const wht   = [r?.withholdingTax, r?.wht, r?.tax].map(toNumberSmart).find(v=>v!=null);
  if (gross != null) {
    diag.source="gross-wht+fx";
    const netCalc = (wht != null) ? (gross - wht) : gross;
    return { amt: Math.max(0, ccy==="PLN" ? netCalc : netCalc*(fx||1)), diag };
  }

  const amount = toNumberSmart(r?.amount);
  if (amount != null) { diag.source="amount_abs"; return { amt: Math.max(0, Math.abs(amount)), diag }; }

  diag.reason = "no-amount-fields";
  return { amt: 0, diag };
}

/* warianty symbolu do dopasowań ('.WA', bez sufiksu) */
function symVariants(s) {
  const up = String(s || "").toUpperCase().trim();
  if (!up) return [];
  return Array.from(new Set([ up, up.endsWith(".WA") ? up : up + ".WA", up.replace(/\.WA$/i, "") ]));
}

/* kraj po suffixie (do stawki WHT dla prognoz) */
function countryFromSymbol(symbol) {
  const s = String(symbol||"").toUpperCase();
  if (s.endsWith(".WA")) return "PL";
  if (s.endsWith(".US")) return "US";
  if (s.endsWith(".DE")) return "DE";
  if (s.endsWith(".L"))  return "UK";
  if (s.endsWith(".MI")) return "IT";
  if (s.endsWith(".PA")) return "FR";
  if (s.endsWith(".SW")) return "CH";
  if (s.endsWith(".CO")) return "DK";
  if (s.endsWith(".OL")) return "NO";
  if (s.endsWith(".ST")) return "SE";
  return "US";
}

/* stawki WHT (dla prognoz) */
const DEFAULT_WHT = {
  PL: 0.19, US: 0.15, DE: 0.26375, UK: 0.00, IE: 0.20, FR: 0.128, NL: 0.15, CH: 0.35, SE: 0.30, NO: 0.25, CA: 0.25,
};
function getEffectiveTaxRate(accountType, country) {
  const acc = normalizeAccountType(accountType);
  const exempt = isTaxExemptAccount(acc);
  const c = (country||"US").toUpperCase();
  if (c === "PL") return exempt ? 0.0 : 0.19;
  return DEFAULT_WHT[c] ?? 0.15;
}

/* ======================== KOMPONENT ======================== */
const RANGE_PRESETS = [
  { key: "YTD", label: "YTD" },
  { key: "1R",  label: "1R"  },
  { key: "3L",  label: "3L"  },
  { key: "MAX", label: "MAX" },
];

export default function DividendsSection({ uid, portfolioId=null, currentPortfolioValuePLN=0 }) {
  const [rangeKey, setRangeKey] = useState("YTD");
  const [cashDivs, setCashDivs]   = useState([]);   // fakty (PLN + diag)
  const [plans, setPlans]         = useState([]);   // prognozy (PLN)
  const [factsRaw, setFactsRaw]   = useState([]);   // surowe rzędy do wglądu
  const [plansRaw, setPlansRaw]   = useState([]);   // surowe rzędy do wglądu
  const [factsMinISO, setFactsMinISO] = useState(null);
  const [minBuyMap, setMinBuyMap] = useState(new Map());
  const [accountType, setAccountType] = useState("TAXABLE_PL");
  const [skipMinBuy, setSkipMinBuy]   = useState(false);
  const [debugOpen, setDebugOpen]     = useState(DEBUG_UI_DEFAULT);
  const syncRunningRef = useRef(false);

  /* ===== wczytaj minBuy + typ konta ===== */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) return;

      // minBuy z holdings + BUY cashflows
      const minMap = new Map();
      const holdingsCol = portfolioId
        ? collection(db, "users", uid, "portfolios", portfolioId, "holdings")
        : collection(db, "users", uid, "holdings");
      const hSnap = await getDocs(query(holdingsCol));
      hSnap.forEach(d => {
        const r = d.data();
        const base = String(r?.pair?.yahoo || "").toUpperCase();
        const bd = String(r?.buyDate || "").slice(0,10);
        if (!base || !bd) return;
        for (const k of symVariants(base)) {
          const cur = minMap.get(k);
          minMap.set(k, cur && cur < bd ? cur : bd);
        }
      });

      const cfCol = portfolioId
        ? collection(db, "users", uid, "portfolios", portfolioId, "cashflows")
        : collection(db, "users", uid, "cashflows");
      const cfSnap = await getDocs(query(cfCol, where("type","==","buy")));
      cfSnap.forEach(d => {
        const r = d.data();
        const base = String(r?.symbol || "").toUpperCase();
        const dt = String(r?.date || r?.payDate || "").slice(0,10);
        if (!base || !dt) return;
        for (const k of symVariants(base)) {
          const cur = minMap.get(k);
          minMap.set(k, cur && cur < dt ? cur : dt);
        }
      });

      const acc = await (async () => {
        try {
          if (!portfolioId) return "TAXABLE_PL";
          const snap = await getDoc(doc(db, "users", uid, "portfolios", portfolioId));
          return normalizeAccountType(snap?.data()?.accountType || "TAXABLE_PL");
        } catch { return "TAXABLE_PL"; }
      })();

      if (!alive) return;
      setMinBuyMap(minMap);
      setAccountType(acc);

      if (DEBUG_CONSOLE) {
        console.groupCollapsed("[DIV][init] account & minBuy");
        console.log("accountType:", acc, accountLabel(acc));
        console.log("minBuyMap size:", minMap.size, "sample:", Array.from(minMap.entries()).slice(0,5));
        console.groupEnd();
      }
    })();
    return () => { alive = false; };
  }, [uid, portfolioId]);

  /* ===== nasłuch FAKTÓW i PLANS ===== */
  useEffect(() => {
    if (!uid) return;
    const unsub = [];

    const publishFacts = (rows) => {
      const seen = new Set();
      const out = [];
      let min = null;

      const rawRows = [];
      for (const row of rows) {
        if (!isDividendRow(row.raw)) continue;
        const k = `${row.symbol}|${row.payDate || ""}|${row.exDate || ""}|${row.diagKey}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(row);
        rawRows.push(row.raw);
        if (row.payDate && (!min || row.payDate < min)) min = row.payDate;
      }
      out.sort((a,b)=>String(a.payDate||"").localeCompare(String(b.payDate||"")));
      setCashDivs(out);
      setFactsRaw(rawRows);
      setFactsMinISO(min || null);

      if (DEBUG_CONSOLE) {
        console.groupCollapsed("[DIV] facts merged:", out.length);
        console.table(out.slice(-5).map(x => ({
          symbol: x.symbol, payDate: x.payDate, exDate: x.exDate,
          amtPLN: x.amtPLN, src: x.diag?.source, ccy: x.diag?.ccy, fx: x.diag?.fx
        })));
        console.groupEnd();
      }
    };

    const publishPlans = (rows) => {
      setPlans(rows);
      setPlansRaw(rows.map(r => r.raw));
      if (DEBUG_CONSOLE) {
        console.groupCollapsed("[DIV] plans merged:", rows.length);
        console.table(rows.slice(-5).map(x => ({ symbol:x.symbol, exDate:x.exDate, amtPLN:x.amtPLN })));
        console.groupEnd();
      }
    };

    const pushFact = (acc, r) => {
      const payISO = extractISO(r, "payDate", "date");
      const { amt, diag } = computeDividendPLNFromRow(r);
      acc.push({
        symbol: (r.symbol || r.note || "—").toUpperCase(),
        payDate: payISO || null,
        exDate: extractISO(r, "exDate"),
        amtPLN: Math.round(amt*100)/100,
        diag,
        diagKey: `${diag.source}|${diag.ccy}|${diag.fx ?? "?"}`,
        raw: r
      });
    };

    const pushPlan = (acc, r) => {
      const exISO = extractISO(r, "exDate");
      if (!exISO) return;
      const grossPLN = (toNumberSmart(r?.gross) ?? 0) * (toNumberSmart(r?.fxAtExDate) ?? 1);
      const country = countryFromSymbol(r?.symbol || "");
      const rate = getEffectiveTaxRate(accountType, country);
      const est = grossPLN * (1 - rate);

      acc.push({
        symbol: (r.symbol || "—").toUpperCase(),
        exDate: exISO,
        amtPLN: Math.max(0, Math.round(est*100)/100),
        taxRate: rate,
        raw: r,
      });
    };

    const collectFacts = (snap, into) => {
      const rows = [];
      snap.forEach(doc => { const raw = doc.data(); if (isDividendRow(raw)) pushFact(rows, raw); });
      into.length = 0; into.push(...rows);
    };
    const collectPlans = (snap, into) => {
      const rows = [];
      snap.forEach(doc => pushPlan(rows, doc.data()));
      into.length = 0; into.push(...rows);
    };

    let facts_sub = [], facts_root = [], plans_sub = [], plans_root = [];

    if (portfolioId) {
      const cashSubRef = collection(db, "users", uid, "portfolios", portfolioId, "cashflows");
      unsub.push(onSnapshot(query(cashSubRef), (snap) => { collectFacts(snap, facts_sub); publishFacts([...facts_sub, ...facts_root]); }));

      const plansSubRef = collection(db, "users", uid, "portfolios", portfolioId, "dividendPlans");
      unsub.push(onSnapshot(query(plansSubRef), (snap) => { collectPlans(snap, plans_sub); publishPlans([...plans_sub, ...plans_root]); }));
    }

    if (portfolioId) {
      const cashRootRef = collection(db, "users", uid, "cashflows");
      unsub.push(onSnapshot(query(cashRootRef, where("portfolioId","==",portfolioId)), (snap) => { collectFacts(snap, facts_root); publishFacts([...facts_sub, ...facts_root]); }));

      const plansRootRef = collection(db, "users", uid, "dividendPlans");
      unsub.push(onSnapshot(query(plansRootRef, where("portfolioId","==",portfolioId)), (snap) => { collectPlans(snap, plans_root); publishPlans([...plans_sub, ...plans_root]); }));
    }

    if (!portfolioId) {
      const cashRootRef = collection(db, "users", uid, "cashflows");
      unsub.push(onSnapshot(query(cashRootRef), (snap) => { collectFacts(snap, facts_root); publishFacts(facts_root); }));

      const plansRootRef = collection(db, "users", uid, "dividendPlans");
      unsub.push(onSnapshot(query(plansRootRef), (snap) => { collectPlans(snap, plans_root); publishPlans(plans_root); }));
    }

    return () => unsub.forEach(u => u && typeof u === "function" && u());
  }, [uid, portfolioId, accountType]);

  /* ===== Oś / agregacja ===== */
  const { startISO, endISO } = useMemo(
    () => startEndForRange(rangeKey, factsMinISO),
    [rangeKey, factsMinISO]
  );
  const months = useMemo(()=>buildMonthAxis(startISO, endISO),[startISO,endISO]);

  const passesMinBuy = (sym, exISO, payISO) => {
    if (skipMinBuy) return { ok: true, reason: "skip" };
    const variants = symVariants(sym);
    let min = null;
    for (const k of variants) {
      const v = minBuyMap.get(k);
      if (v && (!min || v < min)) min = v;
    }
    if (!min) return { ok: true, reason: "no-min" };
    const pivot = exISO || payISO || null;
    if (!pivot) return { ok: false, reason: "no-date" };
    return { ok: pivot >= min, reason: `min=${min}` };
  };

  const data = useMemo(() => {
    const base = new Map(months.map(m => [m, { month:m, facts:0, plans:0, __facts:[], __plans:[] }]));
    let dropMinBuyFacts = 0, dropMinBuyPlans = 0, zeroFacts = 0;

    for (const x of cashDivs) {
      const chk = passesMinBuy(x.symbol, x.exDate, x.payDate);
      if (!chk.ok) { dropMinBuyFacts++; continue; }
      if (!x.amtPLN) zeroFacts++;
      const pivot = monthKey(x.payDate) || monthKey(x.exDate);
      if (!pivot || !base.has(pivot)) continue;
      const o = base.get(pivot);
      o.facts += x.amtPLN;
      o.__facts.push({ symbol: x.symbol, amtPLN: x.amtPLN, src: x.diag?.source, ccy: x.diag?.ccy, fx: x.diag?.fx, reason: chk.reason });
    }
    for (const p of plans) {
      const chk = passesMinBuy(p.symbol, p.exDate, null);
      if (!chk.ok) { dropMinBuyPlans++; continue; }
      const pivot = monthKey(p.exDate);
      if (!pivot || !base.has(pivot)) continue;
      const o = base.get(pivot);
      o.plans += p.amtPLN;
      o.__plans.push({ symbol: p.symbol, amtPLN: p.amtPLN, reason: chk.reason, taxRate: p.taxRate });
    }

    const out = Array.from(base.values()).map(r => ({
      month: r.month,
      Fakty: Math.round(r.facts*100)/100,
      Prognozy: Math.round(r.plans*100)/100,
      __facts: r.__facts,
      __plans: r.__plans,
    }));

    if (DEBUG_CONSOLE) {
      console.groupCollapsed("[DIV] aggregation");
      console.log("months:", months.length, `${startISO}..${endISO}`);
      console.log("facts in:", cashDivs.length, "zero amounts:", zeroFacts, "dropped by minBuy:", dropMinBuyFacts);
      console.log("plans in:", plans.length, "dropped by minBuy:", dropMinBuyPlans);
      console.table(out.filter(r => r.Fakty || r.Prognozy));
      console.groupEnd();
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, cashDivs, plans, minBuyMap, skipMinBuy, startISO, endISO]);

  /* ===== KPI ===== */
  const sumFactsRange = useMemo(()=>data.reduce((a,r)=>a+r.Fakty,0),[data]);
  const sumTTM = useMemo(()=>{
    const today=new Date(); const e=new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(),1));
    const s=new Date(e); s.setUTCMonth(e.getUTCMonth()-11);
    const tMonths=buildMonthAxis(iso(s), iso(new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth()+1,0))));
    return data.filter(r=>tMonths.includes(r.month)).reduce((a,r)=>a+r.Fakty,0);
  },[data]);
  const dyTTM = useMemo(()=> {
    const v=Number(currentPortfolioValuePLN)||0; return v>0 ? (sumTTM/v) : 0;
  },[sumTTM, currentPortfolioValuePLN]);

  /* ===== Tooltip ===== */
  function DetailsTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    const facts = row.__facts || []; const plansT = row.__plans || [];
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 shadow-xl max-w-xs">
        <div className="font-medium mb-1">{label}</div>
        {facts.length ? (<>
          <div className="text-xs text-emerald-300 mb-1">Fakty</div>
          {facts.map((x,i)=>(<>
            <div key={`f-${i}`} className="mb-1">
              <div className="flex justify-between gap-3">
                <span className="text-zinc-300">{x.symbol}</span>
                <span className="tabular-nums">{PLNfmt.format(x.amtPLN)}</span>
              </div>
              <div className="text-[10px] text-zinc-400">src:{x.src} ccy:{x.ccy} fx:{x.fx ?? "-"} · {x.reason}</div>
            </div>
          </>))}
        </>) : null}
        {plansT.length ? (<>
          <div className="text-xs text-sky-300 mt-2 mb-1">Prognozy</div>
          {plansT.map((x,i)=>(<>
            <div key={`p-${i}`} className="mb-1">
              <div className="flex justify-between gap-3">
                <span className="text-zinc-300">{x.symbol}</span>
                <span className="tabular-nums">{PLNfmt.format(x.amtPLN)}</span>
              </div>
              <div className="text-[10px] text-zinc-400">tax:{(x.taxRate*100).toFixed(1)}% · {x.reason}</div>
            </div>
          </>))}
        </>) : null}
        {!facts.length && !plansT.length ? <div className="text-zinc-400">Brak danych</div> : null}
      </div>
    );
  }

  /* ===== Akcje — REALNY SYNC ===== */
  async function runManualSync() {
    if (!uid) return;
    if (syncRunningRef.current) return;
    syncRunningRef.current = true;
    try {
      const res = await syncDividendsForPortfolio({ uid, portfolioId, limit: 60 });
      console.log("[DIV][SYNC/real] wynik:", res);
      alert(`Real SYNC: facts +${res.addedFacts}, plans +${res.addedPlans}, sprawdzono ${res.checked} spółek.`);
    } catch (e) {
      console.error("[DIV][SYNC/real] błąd:", e);
      alert("SYNC (real) error – sprawdź konsolę.");
    } finally {
      syncRunningRef.current = false;
    }
  }

  /* ======================== RENDER ======================== */
  return (
    <section className="mt-6">
      {/* Pasek diagnostyczny */}
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-300">
        <button
          onClick={()=>setDebugOpen(v=>!v)}
          className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
        >
          {debugOpen ? "Ukryj diagnostykę" : "Pokaż diagnostykę"}
        </button>
        <label className="inline-flex items-center gap-1">
          <input type="checkbox" checked={skipMinBuy} onChange={e=>setSkipMinBuy(e.target.checked)} />
          <span>pomiń filtr minBuy</span>
        </label>
        <button
          onClick={runManualSync}
          className="px-2 py-1 rounded border border-yellow-500 bg-yellow-600/70 text-black hover:bg-yellow-500"
        >
          SYNC (real)
        </button>
        <span className="opacity-70">· Konto:</span>
        <span className="text-zinc-100">{accountLabel(accountType)} ({accountType})</span>
      </div>

      {debugOpen && (
        <div className="mb-3 text-xs rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2">
          <div className="grid sm:grid-cols-4 gap-2">
            <div>
              <div className="text-zinc-400">Fakty (wczytane)</div>
              <div className="text-zinc-100 font-medium">{cashDivs.length}</div>
            </div>
            <div>
              <div className="text-zinc-400">Prognozy (wczytane)</div>
              <div className="text-zinc-100 font-medium">{plans.length}</div>
            </div>
            <div>
              <div className="text-zinc-400">minBuyMap (klucze)</div>
              <div className="text-zinc-100 font-medium">{minBuyMap.size}</div>
            </div>
            <div>
              <div className="text-zinc-400">Pierwszy fakt</div>
              <div className="text-zinc-100">{cashDivs[0]?.symbol || "—"} {cashDivs[0]?.payDate || ""} ({cashDivs[0]?.amtPLN ?? "-"})</div>
            </div>
          </div>

          {/* mini-preview problematycznych rekordów */}
          <div className="mt-2">
            <div className="text-zinc-400 mb-1">Ostatnie 5 faktów (diag):</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {cashDivs.slice(-5).map((x,i)=>(
                <div key={i} className="rounded border border-zinc-700 p-2 bg-zinc-950">
                  <div className="flex justify-between">
                    <div className="text-zinc-200">{x.symbol}</div>
                    <div className="tabular-nums">{PLNfmt.format(x.amtPLN)}</div>
                  </div>
                  <div className="text-[11px] text-zinc-400">pay:{x.payDate||"-"} ex:{x.exDate||"-"} · src:{x.diag?.source} ccy:{x.diag?.ccy} fx:{x.diag?.fx ?? "-"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI + zakres */}
      <div className="flex items-center gap-2 mb-2">
        <div className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900">
          <div className="text-xs text-zinc-400">Suma YTD (PLN)</div>
          <div className="text-xl font-semibold tabular-nums">{PLNfmt.format(sumFactsRange)}</div>
        </div>
        <div className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900">
          <div className="text-xs text-zinc-400">Suma TTM (PLN)</div>
          <div className="text-xl font-semibold tabular-nums">{PLNfmt.format(sumTTM)}</div>
        </div>
        <div className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900">
          <div className="text-xs text-zinc-400">DY (TTM)</div>
          <div className="text-xl font-semibold tabular-nums">{(dyTTM*100).toFixed(2)}%</div>
        </div>

        <div className="ml-auto inline-flex rounded-lg overflow-hidden border border-zinc-700">
          {RANGE_PRESETS.map(r=>(
            <button key={r.key} onClick={()=>setRangeKey(r.key)}
              className={["px-3 py-1.5 text-sm", rangeKey===r.key?"bg-yellow-600/70 text-black":"bg-zinc-900 text-zinc-100 hover:bg-zinc-800"].join(" ")}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Wykres */}
      <div className="w-full h-60 card">
        <div className="card-inner">
          <h3 className="h2 mb-2">Miesięczne wpływy (PLN)</h3>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top:8, right:12, left:0, bottom:4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis width={72} tick={{ fontSize: 12 }} tickFormatter={(v)=>PLNfmt.format(v).replace(/\s*zł$/,"")} />
                <Tooltip content={<DetailsTooltip />} />
                <Legend wrapperStyle={{ color: "#e5e7eb" }} />
                <Bar dataKey="Fakty" stackId="a" fill="#eab308" />
                <Bar dataKey="Prognozy" stackId="a" fill="#60a5fa" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
