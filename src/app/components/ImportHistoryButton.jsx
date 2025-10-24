"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Modal, ModalHeader, ModalBody } from "./TxModals";
import {
  addHolding,
  sellPosition,
  addDeposit,
  addWithdrawal,
  removeBatchById as _removeBatchById,
} from "../../lib/portfolioStore";

/* ========== Stałe / cache ========== */
const LSCACHE_KEY_FX   = "fxCache_v1";
const LSCACHE_KEY_HASH = "import_file_hashes";
const LSCACHE_KEY_MAP  = "ticker_map_v1";
const LSCACHE_TTL_DAYS = 90;
const FX_BACKFILL_DAYS = 7;
const todayISO = () => new Date().toISOString().slice(0, 10);

/* ========== Helpers ========== */
function normHeader(h = "") {
  return String(h)
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()[\]]/g, "")
    .replace(/[-–—]/g, "")
    .replace(/ś|ş|š/g, "s").replace(/ł/g, "l").replace(/ó/g, "o")
    .replace(/ż|ź/g, "z").replace(/ą/g, "a").replace(/ę/g, "e")
    .replace(/ć/g, "c").replace(/ń/g, "n");
}
function toNum(v) {
  if (v == null) return 0;
  // usuń wszystkie rodzaje spacji (NBSP / wąska / normalna)
  let s = String(v).trim().replace(/[\s\u00A0\u202F]/g, "");
  // jeśli są i przecinki, i kropki – przyjmij PRAWO-STRONNY znak jako separator dziesiętny
  const lastComma = s.lastIndexOf(",");
  const lastDot   = s.lastIndexOf(".");
  if (lastComma !== -1 || lastDot !== -1) {
    const decIx = Math.max(lastComma, lastDot);
    const intPart  = s.slice(0, decIx).replace(/[.,\s]/g, "");
    const fracPart = s.slice(decIx + 1);
    s = intPart + "." + fracPart;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function parseDate(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function parseWalorCell(s = "") {
  const t = String(s).trim();
  const m = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (m) return { name: m[1].trim(), ticker: m[2].trim().toUpperCase() };
  return { name: t, ticker: t.toUpperCase() };
}
function yahooFromTicker(ticker, waluta = "PLN", grupa = "") {
  const gpwLike =
    (waluta || "").toUpperCase() === "PLN" ||
    (grupa || "").toLowerCase().includes("gpw") ||
    (grupa || "").toLowerCase().includes("akcje");
  if (gpwLike && !/\.[A-Z]{2,4}$/.test(ticker)) return `${ticker}.WA`;
  return ticker;
}

/* === NOWE: normalizacja tekstu operacji (bez polskich znaków) === */
function stripDiacritics(s="") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
const opStr = (op="") => stripDiacritics(String(op).replace(/\s+/g,""));
const isBuy        = (op="") => /^(k|kup|kupn|kupno|buy)/.test(opStr(op));
const isSell       = (op="") => /^(s|sprz|sprzedaz|sprzedaz|sprzeda|sell)/.test(opStr(op));
/* rozszerzone warianty wpłat/wypłat (również „automatyczna”, „środków”) */
const isDepositOp  = (op="") => /(wplata|wplataautomatyczna|wplatasrodkow|zasilenie|doplat|doladow)/.test(opStr(op));
const isWithdrawOp = (op="") => /(wyplata|wyplataautomatyczna|wyplatasrodkow|withdraw)/.test(opStr(op));
const isDividend   = (op="") => /dywid/.test(opStr(op));
const isTax        = (op="") => /podatek|tax/.test(opStr(op));

/* ========== Sygnatury / hash (stabilne: bez FX/przeliczeń) ========== */
function rowSignatureStable(r) {
  return [
    r.date, r.kind, r.yahoo || "", r.qty ?? "", r.price ?? "", r.fee ?? "", r.amount ?? "", (r.waluta || "PLN")
  ].join("|");
}
async function sha1(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-1", enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

/* ========== FX cache (RAM + localStorage) ========== */
const memFx = new Map(); // key: ccy|date -> { rate, source, dateUsed, lookbackDays, ts, currency }
function loadFxCacheLS() {
  try {
    const raw = JSON.parse(localStorage.getItem(LSCACHE_KEY_FX) || "[]");
    const now = Date.now();
    for (const it of raw) {
      if (!it || !it.key) continue;
      if (now - (it.ts||0) > LSCACHE_TTL_DAYS*86400_000) continue;
      memFx.set(it.key, it);
    }
  } catch {}
}
function saveFxCacheLS() {
  try {
    const now = Date.now();
    const arr = [];
    for (const [key, v] of memFx.entries()) {
      if (now - (v.ts||0) > LSCACHE_TTL_DAYS*86400_000) continue;
      arr.push({ ...v, key });
    }
    localStorage.setItem(LSCACHE_KEY_FX, JSON.stringify(arr.slice(-5000)));
  } catch {}
}
if (typeof window !== "undefined" && memFx.size === 0) loadFxCacheLS();

async function fxFromECB(ccy, dateISO) {
  const url = `https://api.exchangerate.host/${encodeURIComponent(dateISO)}?base=${encodeURIComponent(ccy)}&symbols=PLN&source=ecb`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  const rate = Number(j?.rates?.PLN);
  return Number.isFinite(rate) && rate>0 ? rate : null;
}
async function fxFromNBP(ccy, dateISO) {
  const url = `https://api.nbp.pl/api/exchangerates/rates/A/${encodeURIComponent(ccy)}/${encodeURIComponent(dateISO)}/?format=json`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) return null;
  const j = await r.json();
  const rate = Number(j?.rates?.[0]?.mid);
  return Number.isFinite(rate) && rate>0 ? rate : null;
}
async function resolveFxToPLN(ccy, dateISO) {
  const C = (ccy||"PLN").toUpperCase();
  if (C === "PLN") return { rate:1, source:"static", dateUsed:dateISO, lookbackDays:0, currency:"PLN", ts: Date.now() };
  const key = `${C}|${dateISO}`;
  const cached = memFx.get(key);
  if (cached && cached.rate>0) return cached;

  for (let back=0; back<=FX_BACKFILL_DAYS; back++) {
    const d = new Date(dateISO);
    d.setDate(d.getDate()-back);
    const ds = d.toISOString().slice(0,10);

    // PRIORYTET: NBP -> fallback ECB
    try {
      const r = await fxFromNBP(C, ds);
      if (r) { const val = { rate:r, source:"NBP-A", dateUsed:ds, lookbackDays:back, ts: Date.now(), currency:C };
        memFx.set(key, val); saveFxCacheLS(); return val; }
    } catch {}
    try {
      const r = await fxFromECB(C, ds);
      if (r) { const val = { rate:r, source:"ECB", dateUsed:ds, lookbackDays:back, ts: Date.now(), currency:C };
        memFx.set(key, val); saveFxCacheLS(); return val; }
    } catch {}
  }
  const val = { rate:1, source:"MISSING", dateUsed:dateISO, lookbackDays:0, ts: Date.now(), currency:C };
  memFx.set(key, val); saveFxCacheLS(); return val;
}

/* ========== Parsowanie CSV (Papa Parse) ========== */
function parseCSV(text) {
  const errs = [];
  const res = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => normHeader(h),
    dynamicTyping: false,
  });
  if (res.errors?.length) errs.push(...res.errors.map(e => e.message || String(e)));
  const rowsIn = Array.isArray(res.data) ? res.data : [];

  const pick = (row, ...alts) => {
    for (const a of alts) {
      if (Object.prototype.hasOwnProperty.call(row, a)) return row[a];
    }
    return undefined;
  };

  const raw = [];
  const skipped = [];

  for (let i = 0; i < rowsIn.length; i++) {
    const r0 = rowsIn[i] || {};
    const date   = parseDate(pick(r0, "data"));
    const op     = String(pick(r0, "operacja","rodzajoperacji") || "").trim();
    const walor  = pick(r0, "walor","aktywo");
    const waluta = String(pick(r0, "waluta") || "PLN").trim().toUpperCase();
    const qty    = toNum(pick(r0, "liczbajedn","liczbajednostek","liczba","ilosc","sztuk"));
    const price  = toNum(pick(r0, "cena","cenajednostkowa","kurs"));
    const fee    = Math.max(0, toNum(pick(r0, "prowizja","oplata","koszt")));
    const grupa  = String(pick(r0, "grupa","kategoria") || "");
    // myfund bywa z różnymi nazwami kolumn wartości:
    const value  = toNum(pick(r0, "wartosc","wartość","kwota","kwotatransakcji","wartoscwpln","wartoscpln"));

    if (!date || !op) { skipped.push({ i, reason:"brak daty/operacji" }); continue; }

    if (isBuy(op) || isSell(op)) {
      const { name, ticker } = parseWalorCell(walor || "");
      if (!ticker || qty<=0 || (price<=0 && value<=0)) { skipped.push({i,reason:"brak waloru/ilości/ceny"}); continue; }
      const yahoo = yahooFromTicker(ticker, waluta, grupa);
      raw.push({ kind:isBuy(op)?"BUY":"SELL", date, waluta, yahoo, name, qty, price, fee, value });
      continue;
    }
    if (isDividend(op))  { value>0 ? raw.push({ kind:"DIVIDEND",  date, waluta, amount:value }) : skipped.push({i,reason:"dywidenda bez kwoty"}); continue; }
    if (isTax(op))       { value>0 ? raw.push({ kind:"TAX",       date, waluta, amount:value }) : skipped.push({i,reason:"podatek bez kwoty"});  continue; }
    if (isDepositOp(op)) { value>0 ? raw.push({ kind:"DEPOSIT",   date, waluta, amount:value }) : skipped.push({i,reason:"wpłata bez kwoty"});   continue; }
    if (isWithdrawOp(op)){ value>0 ? raw.push({ kind:"WITHDRAW",  date, waluta, amount:value }) : skipped.push({i,reason:"wypłata bez kwoty"});  continue; }

    skipped.push({ i, reason:"nieobsługiwany typ" });
  }

  if (!raw.length && !errs.length) errs.push("Nie rozpoznano żadnych wierszy.");
  return { rows: raw, skipped, errs };
}

/* ========== FX + preview ========== */
async function attachFx(rows) {
  const fxMissing = [];
  const enriched = [];
  for (const r of rows) {
    const fx = await resolveFxToPLN(r.waluta || "PLN", r.date);
    if (fx.source === "MISSING") fxMissing.push({ ccy:(r.waluta||"PLN").toUpperCase(), date: r.date });

    if (r.kind==="BUY" || r.kind==="SELL") {
      const priceNat = Number(r.price)||0;
      const feeNat   = Number(r.fee)||0;
      const valueNat = Number(r.value)||0;
      const pricePLN = priceNat>0 ? priceNat * fx.rate : 0;
      const feePLN   = feeNat>0   ? feeNat   * fx.rate : 0;

      enriched.push({
        ...r,
        fx,
        pricePLN,
        feePLN,
        grossNat: valueNat>0 ? valueNat : (r.qty * priceNat + feeNat),
      });
    } else {
      enriched.push({
        ...r,
        fx,
        amountPLN: (Number(r.amount)||0) * fx.rate
      });
    }
  }
  return { previewRows: enriched, fxMissing };
}

/* ========== Komponent ========== */
export default function ImportHistoryButton({ uid, portfolioId }) {
  const [open, setOpen] = useState(false);

  const [rawText, setRawText] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [parsed, setParsed] = useState({ rows: [], skipped: [], errs: [] });
  const [previewRows, setPreviewRows] = useState([]);
  const [fxMissing, setFxMissing] = useState([]);
  const [fileName, setFileName] = useState("");

  const [warnDuplicate, setWarnDuplicate] = useState("");
  const [allowDup, setAllowDup] = useState(false);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tickerMap, setTickerMap] = useState(()=>{
    try { return JSON.parse(localStorage.getItem(LSCACHE_KEY_MAP) || "{}"); } catch { return {}; }
  });

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState({ ok: 0, fail: 0 });
  const [summary, setSummary] = useState(null);
  const [batchId, setBatchId] = useState(() => {
    const ts = new Date().toISOString().replace(/[:T]/g,"-").slice(0,19);
    const rnd = Math.random().toString(36).slice(2,8);
    return `import-${ts}-${rnd}`;
  });
  const removeBatchById = typeof _removeBatchById === "function"
    ? _removeBatchById
    : async () => { alert("Dodaj removeBatchById(uid, portfolioId, batchId) w portfolioStore, aby 'Cofnij import' działał automatycznie."); };

  /* ----- dup check ----- */
  function rememberFileHash(hash) {
    try {
      const arr = JSON.parse(localStorage.getItem(LSCACHE_KEY_HASH) || "[]");
      if (!arr.includes(hash)) {
        arr.push(hash);
        localStorage.setItem(LSCACHE_KEY_HASH, JSON.stringify(arr.slice(-50)));
      }
    } catch {}
  }
  async function checkDup(text) {
    try {
      const h = await sha1(text);
      const arr = JSON.parse(localStorage.getItem(LSCACHE_KEY_HASH) || "[]");
      setWarnDuplicate(arr.includes(h) ? "Wygląda na to, że identyczny plik był już importowany." : "");
    } catch { setWarnDuplicate(""); }
  }

  /* ----- mapowanie ----- */
  function applyTickerMap(rows, map) {
    if (!rows?.length) return rows;
    return rows.map(r=>{
      if (!r.yahoo) return r;
      const src = r.yahoo.toUpperCase();
      const dst = map?.[src];
      return dst ? { ...r, yahoo: String(dst).toUpperCase() } : r;
    });
  }
  function uniqueYahooFrom(rows) {
    const s = new Set();
    rows.forEach(r=>{ if (r.yahoo) s.add(r.yahoo.toUpperCase()); });
    return Array.from(s).sort();
  }
  function setMapEntry(src, dst) {
    const next = { ...(tickerMap||{}) };
    if (dst && src) next[String(src).toUpperCase()] = String(dst).toUpperCase();
    setTickerMap(next);
    try { localStorage.setItem(LSCACHE_KEY_MAP, JSON.stringify(next)); } catch {}
  }

  /* ----- deduplikacja po mapowaniu (stabilna) ----- */
  async function dedupeAfterMapping(rows) {
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      const k = await sha1(rowSignatureStable(r));
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ ...r, _stableSig: k });
    }
    return out;
  }

  /* ----- build preview from text ----- */
  async function buildPreviewFromText(t) {
    const base = parseCSV(t);
    setParsed(base);
    setSourceText(t);
    setAllowDup(false);
    await checkDup(t);

    const mapped = applyTickerMap(base.rows, tickerMap);
    const deduped = await dedupeAfterMapping(mapped);
    const { previewRows, fxMissing } = await attachFx(deduped);
    setPreviewRows(previewRows);
    setFxMissing(fxMissing);
  }

  /* ----- inputs ----- */
  function handleSelectFile(file) {
    if (!file) return;
    setFileName(file.name||"");
    const r1 = new FileReader();
    r1.onload = async () => {
      const t1 = String(r1.result||"");
      // próbujemy UTF-8; jeśli Papa zwróci puste bez nagłówków – spróbuj CP-1250
      const p1 = parseCSV(t1);
      if (p1.rows.length===0 && p1.errs.length) {
        const r2 = new FileReader();
        r2.onload = async () => buildPreviewFromText(String(r2.result||""));
        r2.readAsText(file, "windows-1250");
        return;
      }
      await buildPreviewFromText(t1);
    };
    r1.readAsText(file, "utf-8");
  }
  async function handleParseTextarea() {
    await buildPreviewFromText(rawText);
  }

  /* ----- zagregowane info (proste) ----- */
  const counts = useMemo(()=>{
    const m={BUY:0,SELL:0,DEPOSIT:0,WITHDRAW:0,DIVIDEND:0,TAX:0};
    for (const r of previewRows) m[r.kind] = (m[r.kind]||0)+1;
    return m;
  },[previewRows]);

  const cashImpact = useMemo(()=>{
    let cash = 0;
    for (const r of previewRows) {
      if (r.kind==="BUY")       cash -= (r.qty * r.pricePLN) + (r.feePLN||0);
      else if (r.kind==="SELL") cash += Math.max(0, (r.qty * r.pricePLN) - (r.feePLN||0));
      else if (r.kind==="DEPOSIT"||r.kind==="DIVIDEND") cash += (r.amountPLN||0);
      else if (r.kind==="WITHDRAW"||r.kind==="TAX")     cash -= (r.amountPLN||0);
    }
    return cash;
  },[previewRows]);

  const firstDate = useMemo(()=>{
    if (!previewRows.length) return todayISO();
    const ds = previewRows.map(r=>r.date).filter(Boolean).sort((a,b)=>String(a).localeCompare(String(b)));
    return ds[0] || todayISO();
  },[previewRows]);
  function prevDay(isoDate) {
    const d = new Date(isoDate); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10);
  }

  /* ----- IMPORT z automatycznym saldem otwarcia ----- */
  async function handleImport() {
    if (!uid || previewRows.length===0) return;
    if (warnDuplicate && !allowDup) return;

    const fileHash = sourceText ? await sha1(sourceText) : "";
    let ok=0, fail=0, sumIn=0, sumOut=0;
    setBusy(true);

    // 0) SALDO OTWARCIA — zawsze, jeśli po imporcie wyszłoby ujemne
    if (cashImpact < 0) {
      const need = -cashImpact; // tyle potrzeba, by wyzerować PLN
      const openingSig = await sha1(`OPENING|${firstDate}|${need.toFixed(2)}|${batchId}|${fileHash.slice(0,8)}`);
      await addDeposit(uid, portfolioId ?? null, {
        amount: need,
        date: prevDay(firstDate),
        note: "Saldo otwarcia – import myfund",
        kind: "DEPOSIT",
        excludeFromTWR: false, // to realna wpłata
        importSignature: openingSig,
        importBatchId: batchId,
        importFileHash: fileHash
      });
      sumIn += need;
    }

    const ordered = [...previewRows].sort((a,b)=>{
      const dd = String(a.date).localeCompare(String(b.date));
      if (dd !== 0) return dd;
      return String(a._stableSig || "").localeCompare(String(b._stableSig || ""));
    });

    for (let i=0;i<ordered.length;i+=5) {
      const batch = ordered.slice(i,i+5);
      const res = await Promise.allSettled(batch.map(async (r) => {
        const stable = r._stableSig || await sha1(rowSignatureStable(r));
        const noteSuffix = `(${batchId}${fileHash?` • ${fileHash.slice(0,8)}`:""})`;
        const fxMeta = `FX ${(r.fx.currency||r.waluta)}->PLN ${r.fx.rate.toFixed(6)} [${r.fx.source} ${r.fx.dateUsed}${r.fx.lookbackDays?` • -${r.fx.lookbackDays}d`:""}]`;

        if (r.kind==="BUY") {
          await addHolding(
            uid, portfolioId ?? null,
            {
              name: r.name || r.yahoo,
              pair: { yahoo: r.yahoo, currency: null }, // walutę wykryjemy z Yahoo przy pierwszym pobraniu ceny
              shares: r.qty,
              buyPrice: r.pricePLN,
              buyDate: r.date,
              importSignature: stable,
              importBatchId: batchId,
              importFileHash: fileHash,
            },
            { autoTopUp: false, noAutoCash: true }
          );

          const grossPLN = (Number(r.value)>0 ? Number(r.value)*r.fx.rate : (r.qty * r.pricePLN) + (r.feePLN||0));
          if (grossPLN>0) {
            await addWithdrawal(uid, portfolioId ?? null, {
              amount: grossPLN,
              date: r.date,
              note: `Zakup ${r.yahoo} (brutto) ${fxMeta} ${noteSuffix}`,
              kind: "INTERNAL",
              excludeFromTWR: true, // wewnętrzne; nie dzieli okresu
              importSignature: stable+"#gross",
              importBatchId: batchId, importFileHash: fileHash
            });
            sumOut += grossPLN;
          }
          return;
        }

        if (r.kind==="SELL") {
          await sellPosition(uid, portfolioId ?? null, {
            yahoo:r.yahoo, qty:r.qty, price:r.pricePLN, date:r.date,
            note:`Sprzedaż (import) ${fxMeta} ${noteSuffix}`,
            importSignature: stable, importBatchId: batchId, importFileHash: fileHash,
            noAutoCash: true
          });
          const netPLN = (Number(r.value)>0
            ? Math.max(0, Number(r.value)*r.fx.rate)
            : Math.max(0, (r.qty * r.pricePLN) - (r.feePLN||0)));
          if (netPLN>0) {
            await addDeposit(uid, portfolioId ?? null, {
              amount: netPLN, date:r.date,
              note:`Sprzedaż ${r.yahoo} (netto) ${fxMeta} ${noteSuffix}`,
              kind: "INTERNAL",
              excludeFromTWR: true, // wewnętrzne
              importSignature: stable+"#netin",
              importBatchId: batchId, importFileHash: fileHash
            });
            sumIn += netPLN;
          }
          return;
        }

        // Zewnętrzne (liczą się i tną okresy)
        if (r.kind==="DEPOSIT")   {
          await addDeposit(uid,    portfolioId ?? null, {
            amount:r.amountPLN, date:r.date,
            note:`Wpłata (import) ${fxMeta} ${noteSuffix}`,
            kind: "DEPOSIT",
            excludeFromTWR: false,
            importSignature:stable, importBatchId:batchId, importFileHash:fileHash
          }); sumIn  += r.amountPLN;  return;
        }
        if (r.kind==="WITHDRAW")  {
          await addWithdrawal(uid, portfolioId ?? null, {
            amount:r.amountPLN, date:r.date,
            note:`Wypłata (import) ${fxMeta} ${noteSuffix}`,
            kind: "WITHDRAWAL",
            excludeFromTWR: false,
            importSignature:stable, importBatchId:batchId, importFileHash:fileHash
          }); sumOut += r.amountPLN;  return;
        }
        // Wewnętrzne (wchodzą w wynik, nie tną)
        if (r.kind==="DIVIDEND")  {
          await addDeposit(uid,    portfolioId ?? null, {
            amount:r.amountPLN, date:r.date,
            note:`Dywidenda (import) ${fxMeta} ${noteSuffix}`,
            kind: "DIVIDEND",
            excludeFromTWR: true,
            importSignature:stable, importBatchId:batchId, importFileHash:fileHash
          }); sumIn  += r.amountPLN;  return;
        }
        if (r.kind==="TAX")       {
          await addWithdrawal(uid, portfolioId ?? null, {
            amount:r.amountPLN, date:r.date,
            note:`Podatek (import) ${fxMeta} ${noteSuffix}`,
            kind: "TAX",
            excludeFromTWR: true,
            importSignature:stable, importBatchId:batchId, importFileHash:fileHash
          }); sumOut += r.amountPLN; return;
        }
      }));
      for (const rr of res) (rr.status==="fulfilled" ? ok++ : fail++);
    }

    setBusy(false);
    setDone({ ok, fail });
    if (sourceText) rememberFileHash(await sha1(sourceText));
    setSummary({
      counts, totals: { in: sumIn, out: sumOut, net: sumIn - sumOut },
      batchId, fileHash, fileName,
    });
  }

  /* ----- example ----- */
  const example = useMemo(()=>(`
Data;Operacja;Walor;Waluta;Liczba jedn;Cena;Prowizja;Wartość
2025-01-02;Kupno;PKNORLEN (PKN);PLN;10;49,15;0;491,5
2025-02-15;Sprzedaż;XTB;USD;5;30,10;0,39;150,5
2025-03-10;Wpłata środków;;PLN;;;;1000
2025-04-05;Dywidenda;;PLN;;;;25,30
2025-04-06;Podatek od dywidendy;;PLN;;;;4,81`.trim()),[]);

  /* ========== UI ========== */
  return (
    <>
      <button
        className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
        onClick={()=>setOpen(true)}
      >
        Importuj historię (CSV)
      </button>

      <Modal open={open} onClose={()=>setOpen(false)} maxWidth="max-w-2xl">
        <ModalHeader title="Import historii (myfund.pl)" onClose={()=>setOpen(false)} />
        <ModalBody>
          <div className="space-y-3">
            <div className="text-xs text-zinc-400">
              Wgraj plik CSV z myfund.pl: <strong>Operacje → Historia operacji → „Eksport do CSV”</strong>.
              Kursy walut pobieramy automatycznie (NBP → ECB). Transakcje giełdowe nie wpływają na TWR
              (księgowane jako przepływy wewnętrzne), natomiast <em>Wpłaty/Wypłaty</em> oraz
              <em> Dywidendy/Podatki</em> liczą się do TWR. Import automatycznie utworzy saldo otwarcia,
              jeśli to konieczne, by wyzerować gotówkę.
            </div>

            {!!warnDuplicate && (
              <label className="rounded-lg border border-yellow-700 bg-yellow-900/30 text-yellow-200 text-xs px-3 py-2 flex items-center gap-2">
                {warnDuplicate}
                <input type="checkbox" checked={allowDup} onChange={(e)=>setAllowDup(e.target.checked)} />
                <span>Zezwól mimo ostrzeżenia</span>
              </label>
            )}

            <div className="flex items-center gap-2">
              <input type="file" accept=".csv,text/csv" onChange={(e)=>handleSelectFile(e.target.files?.[0]||null)} />
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs"
                onClick={()=>navigator.clipboard?.writeText(example)}
              >
                Skopiuj przykład CSV
              </button>
            </div>

            <textarea
              className="input w-full h-24 text-sm"
              value={rawText}
              onChange={(e)=>setRawText(e.target.value)}
              placeholder={example}
            />

            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800"
                onClick={handleParseTextarea}
                type="button"
              >
                Podgląd
              </button>
              <div className="text-xs text-zinc-400">
                Rozpoznane: <span className="text-zinc-200">{parsed.rows.length}</span>
                {parsed.skipped.length>0 && <> · Pominięte: <span className="text-zinc-200">{parsed.skipped.length}</span></>}
              </div>
            </div>

            {previewRows.length>0 && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
                <div className="flex flex-wrap gap-2 text-xs mb-2">
                  <span className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900/40">BUY: <strong>{counts.BUY||0}</strong></span>
                  <span className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900/40">SELL: <strong>{counts.SELL||0}</strong></span>
                  <span className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900/40">Wpłaty: <strong>{counts.DEPOSIT||0}</strong></span>
                  <span className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900/40">Wypłaty: <strong>{counts.WITHDRAW||0}</strong></span>
                  <span className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900/40">Dywidendy: <strong>{counts.DIVIDEND||0}</strong></span>
                  <span className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900/40">Podatki: <strong>{counts.TAX||0}</strong></span>
                </div>
              </div>
            )}

            {summary && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                <div className="mb-1 text-zinc-300 font-medium">Zapisano import</div>
                <div className="text-xs text-zinc-400 mb-1">
                  Batch ID: <span className="text-zinc-200">{summary.batchId}</span>
                  {summary.fileHash && <> · Hash: <span className="text-zinc-200">{summary.fileHash.slice(0,12)}…</span></>}
                </div>
                <div className="text-xs text-zinc-300">
                  PLN IN: <span className="text-emerald-300">{summary.totals.in.toFixed(2)}</span>{" · "}
                  PLN OUT: <span className="text-red-300">{summary.totals.out.toFixed(2)}</span>{" · "}
                  NETTO: <span className={`${summary.totals.net>=0?"text-emerald-300":"text-red-300"}`}>{summary.totals.net.toFixed(2)}</span>
                </div>
                <div className="mt-2">
                  <button
                    className="px-3 py-1.5 rounded-lg border border-red-700 text-red-200 hover:bg-red-900/20"
                    type="button"
                    onClick={async ()=>{
                      try {
                        await removeBatchById(uid, portfolioId ?? null, summary.batchId);
                        alert("Import cofnięty (o ile removeBatchById jest zaimplementowane po stronie bazy).");
                      } catch (e) {
                        console.error(e);
                        alert("Nie udało się cofnąć importu. Dodaj removeBatchById() w portfolioStore.");
                      }
                    }}
                  >
                    Cofnij import
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-zinc-400">
                Zaimportowano: <span className="text-emerald-300">{done.ok}</span>
                {" · "}Błędy: <span className="text-red-300">{done.fail}</span>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800"
                  type="button"
                  onClick={()=>{
                    setRawText(""); setParsed({ rows:[], skipped:[], errs:[] });
                    setPreviewRows([]); setFxMissing([]); setDone({ok:0,fail:0});
                    setSummary(null); setWarnDuplicate(""); setFileName(""); setAllowDup(false); setAdvancedOpen(false);
                    const ts = new Date().toISOString().replace(/[:T]/g,"-").slice(0,19);
                    setBatchId(`import-${ts}-${Math.random().toString(36).slice(2,8)}`);
                  }}
                >
                  Wyczyść
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400 disabled:opacity-60"
                  type="button"
                  disabled={busy || previewRows.length===0 || (!!warnDuplicate && !allowDup)}
                  onClick={handleImport}
                  title={warnDuplicate && !allowDup ? "Zezwól mimo ostrzeżenia, aby kontynuować" : ""}
                >
                  {busy ? "Importuję…" : "Importuj"}
                </button>
              </div>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
}
