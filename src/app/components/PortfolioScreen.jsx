"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

/* === Twoje istniejące komponenty UI === */
import { useAuth } from "./AuthProvider";
import LoginCard from "./LoginCard";
import PortfolioChart from "./PortfolioChart";
import CompanyLogo from "./CompanyLogo";
import PortfolioSwitcher from "./PortfolioSwitcher";
import AddTransactionButton from "./AddTransactionButton";
import DeleteOrFixModal from "./DeleteOrFixModal";
import ImportHistoryButton from "./ImportHistoryButton";
import PortfolioTable from "../components/PortfolioTable";
import { publishPortfolioValue } from "../../lib/portfolioBridge";
import { listenPortfolios } from "../../lib/portfolios";

/* ==== NOWE: resolver par z katalogu ==== */
import { resolvePair } from "../../lib/pairs";

/* === Firestore store === */
import {
  listenHoldings,
  removeHolding as fsDel,
  addCashOperation as _addCashOperation,
  setLivePortfolioValue,                // ⬅️ DODAJ
} from "../../lib/portfolioStore";


/* ==== zakresy ==== */
const RANGES = [
  { key: "1M", label: "1M", range: "1mo", interval: "1d" },
  { key: "3M", label: "3M", range: "3mo", interval: "1d" },
  { key: "6M", label: "6M", range: "6mo", interval: "1d" },
  { key: "YTD", label: "YTD", range: "ytd", interval: "1d" },
  { key: "1R", label: "1R", range: "1y", interval: "1d" },
  { key: "5L", label: "5L", range: "5y", interval: "1wk" },
  { key: "MAX", label: "MAX", range: "max", interval: "1mo" },
];

const ALL_PORTFOLIO_ID = "__ALL__";
const MAIN_PORTFOLIO_ID = "";

/* ==== formatery ==== */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(v)) ? Number(v) : 0);
const fmtPct = (v) => `${Number(v || 0).toFixed(2)}%`;

/* ==== deep find pomoce ==== */
function deepFind(obj, pred) {
  const S = [obj];
  while (S.length) {
    const cur = S.pop();
    if (!cur || typeof cur !== "object") continue;
    if (pred(cur)) return cur;
    for (const v of Object.values(cur)) S.push(v);
  }
  return null;
}
function deepFindArray(obj, predItem) {
  const S = [obj];
  while (S.length) {
    const cur = S.pop();
    if (!cur || typeof cur !== "object") continue;
    if (Array.isArray(cur) && cur.some(predItem)) return cur;
    for (const v of Object.values(cur)) S.push(v);
  }
  return null;
}

/* ==== parsing historii ==== */
function parseHistoryArray(json) {
  if (!json || typeof json !== "object") return [];
  const base =
    (Array.isArray(json.historyPLN) && json.historyPLN) ||
    (Array.isArray(json.history) && json.history) ||
    deepFindArray(json, (p) =>
      p &&
      typeof p === "object" &&
      (p.t || p.date || p.time || p.timestamp || p.Date) &&
      (Number.isFinite(p.close) || Number.isFinite(p.price) || Number.isFinite(p.adjClose) || Number.isFinite(p.c))
    ) ||
    [];

  return base
    .map((p) => {
      const tRaw = p?.t ?? p?.date ?? p?.Date ?? p?.time ?? p?.timestamp;
      const t = tRaw ? new Date(tRaw).toISOString().slice(0, 10) : null;
      const close = Number(p?.close ?? p?.price ?? p?.adjClose ?? p?.c);
      return { t, close };
    })
    .filter((p) => p.t && Number.isFinite(p.close));
}

/* ==== parsing quote ==== */
function parseQuotePLN(raw) {
  if (!raw || typeof raw !== "object") return { pricePLN: null, prevClosePLN: null };

  if (Number.isFinite(raw.pricePLN) || Number.isFinite(raw.prevClosePLN)) {
    return { pricePLN: Number(raw.pricePLN), prevClosePLN: Number(raw.prevClosePLN) };
  }
  if (raw.currency === "PLN") {
    const p = Number(raw.price);
    const pc = Number(raw.prevClose);
    if (Number.isFinite(p) || Number.isFinite(pc)) return { pricePLN: p, prevClosePLN: pc };
  }

  const node = deepFind(raw, (n) =>
    n && typeof n === "object" && (Number.isFinite(n.pricePLN) || Number.isFinite(n.prevClosePLN))
  );
  if (node) return { pricePLN: Number(node.pricePLN), prevClosePLN: Number(node.prevClosePLN) };

  const node2 = deepFind(raw, (n) => n && typeof n === "object" && (Number.isFinite(n.pln) || Number.isFinite(n.price)));
  if (node2) {
    const p = Number(node2.pln ?? node2.price);
    const prevNode = deepFind(raw, (n) => n && typeof n === "object" && Number.isFinite(n.prevClosePLN));
    return { pricePLN: Number.isFinite(p) ? p : null, prevClosePLN: prevNode ? Number(prevNode.prevClosePLN) : null };
  }

  const ylike = deepFind(raw, (n) =>
    n && typeof n === "object" && (Number.isFinite(n.regularMarketPrice) || Number.isFinite(n.c))
  );
  if (ylike) {
    return {
      pricePLN: Number(ylike.regularMarketPrice ?? ylike.c ?? null),
      prevClosePLN: Number(ylike.regularMarketPreviousClose ?? ylike.pc ?? null),
    };
  }
  return { pricePLN: null, prevClosePLN: null };
}

/* ==== oś dni + forward fill ==== */
function collectAllDays(seriesMap) {
  const s = new Set();
  for (const k of Object.keys(seriesMap)) {
    for (const pt of (seriesMap[k]?.history || [])) pt?.t && s.add(pt.t.slice(0, 10));
  }
  return Array.from(s).sort();
}
function forwardFillOnDays(history, days, buyDate) {
  const map = new Map();
  for (const p of (history || [])) {
    const d = (p.t || "").slice(0, 10);
    const v = Number.isFinite(p.close) ? p.close : null;
    if (d && v != null) map.set(d, v);
  }
  const out = [];
  let last = null;
  for (const d of days) {
    const explicit = map.get(d);
    if (explicit != null) last = explicit;
    if (buyDate && d < buyDate) { out.push({ t: d, close: 0 }); continue; }
    out.push({ t: d, close: last ?? 0 });
  }
  return out;
}
function normalizeSeriesMap(rawMap, holdings) {
  const days = collectAllDays(rawMap);
  if (!days.length) return rawMap;
  const byIdDate = new Map();
  for (const h of holdings) byIdDate.set(h.id, h.buyDate ? h.buyDate.slice(0, 10) : null);

  const out = {};
  for (const id of Object.keys(rawMap)) {
    const s = rawMap[id] || { history: [], shares: 0 };
    const bd = byIdDate.get(id);
    out[id] = { shares: s.shares, history: forwardFillOnDays(s.history, days, bd) };
  }
  return out;
}

/* ==== wybór ceny TERAZ ==== */
function priceNowFrom({ quote, hist, avgBuy, buyPrice }) {
  const live = Number.isFinite(quote?.pricePLN)
    ? quote.pricePLN
    : (Number.isFinite(quote?.price) ? quote.price : null);
  if (Number.isFinite(live) && live > 0) return live;

  let lastFromHist = null;
  if (Array.isArray(hist) && hist.length) {
    for (let i = hist.length - 1; i >= 0; i--) {
      const c = Number(hist[i]?.close);
      if (Number.isFinite(c) && c > 0) { lastFromHist = c; break; }
    }
  }
  if (Number.isFinite(lastFromHist) && lastFromHist > 0) return lastFromHist;

  const prev = Number.isFinite(quote?.prevClosePLN) ? quote.prevClosePLN : null;
  if (Number.isFinite(prev) && prev > 0) return prev;

  const approx = Number.isFinite(avgBuy) && avgBuy > 0
    ? avgBuy
    : (Number.isFinite(buyPrice) && buyPrice > 0 ? buyPrice : 0);

  return approx > 0 ? approx : 0;
}

/* ==== helpers ==== */
function normalizePortfolioId(id, { allowAll = false } = {}) {
  if (id == null) return MAIN_PORTFOLIO_ID;
  const str = String(id).trim();
  if (!str) return MAIN_PORTFOLIO_ID;
  if (!allowAll && str === ALL_PORTFOLIO_ID) return MAIN_PORTFOLIO_ID;
  return str;
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

/* ================== EKRAN ================== */
export default function PortfolioScreen({ title = "Mój Portfel" }) {
  const { user, signOut } = useAuth();

  const [currentPortfolioId, setCurrentPortfolioId] = useState(null);
  const [portfolioList, setPortfolioList] = useState([]);
  const [fsHoldings, setFsHoldings] = useState(null);
  const [quotes, setQuotes] = useState({});
  const [series, setSeries] = useState({});
  const [rangeKey, setRangeKey] = useState("YTD");
  const [expanded, setExpanded] = useState(() => new Set());
  const [missingDataRatio, setMissingDataRatio] = useState(0);

  // dzienne zmiany na 1 akcję (z historii)
  const [dayPerId, setDayPerId] = useState({});

  // NOWE: zmapowane pary wg katalogu (yahoo/stooq/PLN)
  const [pairsById, setPairsById] = useState({});

  // Modal „Cofnij zakup”
  const [fixLot, setFixLot] = useState(null);

  // abort + mounted guard
  const quotesAbortRef = useRef(null);
  const histAbortRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      quotesAbortRef.current?.abort();
      histAbortRef.current?.abort();
    };
  }, []);

  /* =========================
     HOLDINGS — SINGLE vs ALL
     ========================= */
  useEffect(() => {
    if (!user) { setFsHoldings(null); return; }

    // tryb „Wszystkie portfele”
    if (currentPortfolioId === ALL_PORTFOLIO_ID) {
      const unsubs = [];
      const mapByPid = new Map(); // pid -> rows[]
      const emit = () => {
        const merged = [];
        for (const [pid, rows] of mapByPid.entries()) {
          for (const r of (rows || [])) {
            merged.push({
              ...r,
              id: `${pid || "MAIN"}__${r.id}`,   // unikalny id w agregacie
              __origin: pid || null,             // skąd pochodzi pozycja
            });
          }
        }
        setFsHoldings(merged);
      };
      const attach = (pid) => {
        const off = pid
          ? listenHoldings(user.uid, pid, (rows) => { mapByPid.set(pid, rows || []); emit(); })
          : listenHoldings(user.uid,           (rows) => { mapByPid.set(null, rows || []); emit(); });
        if (typeof off === "function") unsubs.push(off);
      };

      // root + wszystkie nazwane
      attach(null);
      const ids = (portfolioList || []).map(p => p?.id).filter(Boolean);
      Array.from(new Set(ids)).forEach(attach);

      return () => { unsubs.forEach(u => { try { u(); } catch {} }); };
    }

    // tryb pojedynczego portfela (root lub wskazany)
    const off = currentPortfolioId
      ? listenHoldings(user.uid, currentPortfolioId, (items) => setFsHoldings(items))
      : listenHoldings(user.uid,                        (items) => setFsHoldings(items));
    return () => off?.();
  }, [user, currentPortfolioId, portfolioList]);

  /* =========================
     LISTA PORTFELI (id, nazwy)
     ========================= */
  useEffect(() => {
    if (!user?.uid) {
      setPortfolioList([]);
      return;
    }
    const unsub = listenPortfolios(user.uid, (items) => {
      setPortfolioList(Array.isArray(items) ? items.filter(Boolean) : []);
    });
    return () => unsub?.();
  }, [user?.uid]);

  const holdings = fsHoldings ?? [];
  const currentRange = RANGES.find((r) => r.key === rangeKey) || RANGES[3];

  const normalizedCurrentPortfolioId = useMemo(
    () => normalizePortfolioId(currentPortfolioId, { allowAll: true }),
    [currentPortfolioId]
  );

  const knownPortfolioIds = useMemo(() => {
    const ids = new Set([MAIN_PORTFOLIO_ID]);
    for (const item of portfolioList) {
      if (item?.id != null && item.id !== "") {
        ids.add(String(item.id));
      }
    }
    const normalized = normalizePortfolioId(currentPortfolioId, { allowAll: false });
    if (normalized) ids.add(normalized);
    return Array.from(ids);
  }, [portfolioList, currentPortfolioId]);

  // ====== PRE-RESOLVE PAR (yahoo/stooq) z katalogu ======
  useEffect(() => {
    if (!Array.isArray(holdings) || !holdings.length) { setPairsById({}); return; }
    let alive = true;
    (async () => {
      try {
        const entries = await Promise.all(
          holdings.map(async (h) => {
            const base = h?.pair || { yahoo: h?.pair?.yahoo || h?.name };
            const pair = await resolvePair(base);
            return [h.id, pair];
          })
        );
        if (alive) setPairsById(Object.fromEntries(entries));
      } catch {
        if (alive) setPairsById({});
      }
    })();
    return () => { alive = false; };
  }, [holdings]);

  // stabilne sygnatury do efektów
  const quotesSig = useMemo(
    () => holdings.map(h => `${h.id}|${(pairsById[h.id]?.yahoo || h?.pair?.yahoo || h?.name || "").toUpperCase()}`).sort().join(";"),
    [holdings, pairsById]
  );
  const historySig = useMemo(
    () =>
      holdings
        .map(h => `${h.id}|${(pairsById[h.id]?.yahoo || h?.pair?.yahoo || h?.name || "").toUpperCase()}|${h.shares}`)
        .sort()
        .join(";") + `|${currentRange.key}`,
    [holdings, pairsById, currentRange.key]
  );

  /* ==== QUOTES – batch GET (1 request) ==== */
  useEffect(() => {
    if (!holdings.length) { setQuotes({}); return; }

    const controller = new AbortController();
    quotesAbortRef.current?.abort();
    quotesAbortRef.current = controller;

    (async () => {
      try {
        const list = holdings
          .map(h => String(pairsById[h.id]?.yahoo || h?.pair?.yahoo || h?.name || "").toUpperCase())
          .filter(Boolean);

        if (!list.length) { setQuotes({}); return; }

        const url = `/api/quote?symbols=${encodeURIComponent(list.join(","))}`;
        const r = await fetch(url, { signal: controller.signal });
        if (!r.ok) { setQuotes({}); return; }
        const j = await r.json().catch(() => ({}));
        const bySym = j?.quotes || (j?.yahoo ? { [j.yahoo]: j } : {});

        const out = {};
        for (const h of holdings) {
          const sym = String((pairsById[h.id]?.yahoo || h?.pair?.yahoo || h?.name || "")).toUpperCase();
          const q = bySym[sym] || null;
          out[h.id] = q ? { pricePLN: q.pricePLN, prevClosePLN: q.prevClosePLN } : null;
        }
        if (mountedRef.current && !controller.signal.aborted) setQuotes(out);
      } catch (e) {
        if (e?.name !== "AbortError") console.error("quotes effect error:", e);
      }
    })();

    return () => controller.abort();
  }, [quotesSig]);

  /* ==== HISTORY – więcej równoległości + forward-fill ==== */
  useEffect(() => {
    if (!holdings.length) { setSeries({}); setMissingDataRatio(0); setDayPerId({}); return; }

    const controller = new AbortController();
    histAbortRef.current?.abort();
    histAbortRef.current = controller;

    (async () => {
      try {
        const items = holdings.map(h => ({
          id: h.id,
          shares: h.shares,
          pair: pairsById[h.id] || (h.pair || { yahoo: h?.pair?.yahoo || h?.name }),
        }));

        let raw = {};
        const dayMap = {};
        const settled = await Promise.allSettled(
          items.map(async ({ id, shares, pair }) => {
            try {
              const r = await fetch("/api/history", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  pair,
                  range: currentRange.range,
                  interval: currentRange.interval,
                }),
                signal: controller.signal,
              });
              if (!r.ok) return [id, { history: [], shares }];

              const json = await r.json();
              const safe = parseHistoryArray(json);

              if (safe.length >= 2) {
                const last = Number(safe[safe.length - 1]?.close);
                const prev = Number(safe[safe.length - 2]?.close);
                dayMap[id] = (Number.isFinite(last) && Number.isFinite(prev)) ? (last - prev) : 0;
              } else {
                dayMap[id] = 0;
              }

              return [id, { history: safe, shares }];
            } catch (e) {
              if (e?.name === "AbortError") {
                dayMap[id] = 0;
                return [id, { history: [], shares }];
              }
              dayMap[id] = 0;
              return [id, { history: [], shares }];
            }
          })
        );
        raw = Object.fromEntries(
          settled.filter(s => s.status === "fulfilled").map(s => s.value)
        );

        const norm = normalizeSeriesMap(raw, holdings);

        const miss = holdings.filter((h) => {
          const q = quotes[h.id];
          const hist = norm[h.id]?.history || [];
          const qMissing = !(q && (Number.isFinite(q?.pricePLN) || Number.isFinite(q?.price)));
          const hMissing = !(hist && hist.length);
          return qMissing && hMissing;
        }).length;

        if (mountedRef.current && !controller.signal.aborted) {
          setSeries(norm);
          setMissingDataRatio(holdings.length ? miss / holdings.length : 0);
          setDayPerId(dayMap);
        }
      } catch (e) {
        if (e?.name !== "AbortError") console.error("history effect error:", e);
      }
    })();

    return () => controller.abort();
  }, [historySig, quotes]);

  // --- ZAMIANA CAŁEGO BLOKU groups = useMemo(...) ---
  const groups = useMemo(() => {
    const byKey = new Map();

    for (const h of holdings) {
      const pair = pairsById[h.id] || (h.pair || { yahoo: h?.pair?.yahoo || h?.name });
      const symU = String(pair?.yahoo || h.name || "").toUpperCase();

      if (!byKey.has(symU)) {
        byKey.set(symU, { key: symU, name: h.name, pair, lots: [], totalShares: 0, costSum: 0 });
      }
      const g = byKey.get(symU);

      const shares = Number(h.shares) || 0;
      const buy = Number(h.buyPrice) || 0;

      if (shares <= 0) continue;

      g.lots.push(h);
      g.totalShares += shares;
      g.costSum    += buy * shares;
    }

    const out = [];
    for (const g of byKey.values()) {
      const avgBuy = g.totalShares > 0 ? g.costSum / g.totalShares : 0;

      let price = 0;
      for (const lot of g.lots) {
        const q    = quotes[lot.id];
        const hist = series[lot.id]?.history || [];
        price = priceNowFrom({ quote: q, hist, avgBuy, buyPrice: lot.buyPrice });
        if (price > 0) break;
      }

      const value   = price * g.totalShares;
      const cost    = avgBuy * g.totalShares;
      const gain    = value - cost;
      const gainPct = cost > 0 ? (gain / cost) * 100 : 0;

      out.push({ ...g, avgBuy, price, value, gain, gainPct });
    }

    return out.sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [holdings, quotes, series, pairsById]);


  const totals = useMemo(() => {
    const cur = groups.reduce((a, g) => a + (g.value || 0), 0);
    const cost = groups.reduce((a, g) => a + (g.avgBuy * g.totalShares || 0), 0);

    // dzienny P&L z historii (ostatnie 2 zamknięcia)
    let day = 0;
    for (const h of holdings) {
      const shares = Number(h.shares) || 0;
      const d = Number(dayPerId[h.id]);
      if (Number.isFinite(d)) day += d * shares;
    }
    // fallback na quote, gdy dla pozycji brak dayPerId
    for (const h of holdings) {
      if (dayPerId[h.id] != null) continue;
      const q = quotes[h.id];
      const shares = Number(h.shares) || 0;
      if (q && Number.isFinite(q.pricePLN) && Number.isFinite(q.prevClosePLN)) {
        day += (q.pricePLN - q.prevClosePLN) * shares;
      }
    }

    return { cur, cost, gainAbs: cur - cost, gainPct: cost > 0 ? ((cur - cost) / cost) * 100 : 0, day };
  }, [groups, holdings, dayPerId, quotes]);

  // === EFEKT: publikuj i ZAPISUJ live value ===
  useEffect(() => {
    if (!Number.isFinite(totals?.cur)) return;

    const value = Number(totals.cur) || 0;

    if (currentPortfolioId === ALL_PORTFOLIO_ID) {
      publishPortfolioValue({
        all: value,
        current: value,
        currentPortfolioId: ALL_PORTFOLIO_ID,
        knownPortfolioIds,
      });
      return; // w ALL nie zapisujemy per-portfel (brak id)
    }

    const pidNorm = normalizePortfolioId(currentPortfolioId, { allowAll: false });

    publishPortfolioValue({
      portfolioId: pidNorm,
      value,
      current: value,
      currentPortfolioId: pidNorm,
      knownPortfolioIds,
    });

    // ⬇️ Zapis live value do Firestore, by FIRE mogło to odczytać bez otwierania „Mój portfel”
    try {
      const pid = pidNorm === "" ? null : pidNorm; // root = null
      setLivePortfolioValue(user?.uid, pid, value);
    } catch (_) {}
  }, [totals?.cur, currentPortfolioId, knownPortfolioIds, user?.uid]);

  const isLoadingUser = user === undefined;
  const isLoggedIn = !!user;

  const addCashOperation =
    typeof _addCashOperation === "function"
      ? _addCashOperation
      : async () => {
          console.warn("addCashOperation() brak – dodaj w ../../lib/portfolioStore");
          alert("Uwaga: storna gotówkowe nie zostały zapisane (brak addCashOperation). Usunięto tylko akcje.");
        };

  /* ==== COFNIJ ZAKUP – z optymistycznym usunięciem z tabeli ==== */
  async function handleUndoError(lot, preview) {
    try {
      // Uwaga: w trybie ALL operacje edycyjne mogłyby wymagać portfolioId z lot.__origin
      setFsHoldings(prev => Array.isArray(prev) ? prev.filter(r => r.id !== lot.id) : prev);
      await fsDel(user?.uid, currentPortfolioId, lot.id);

      const date = lot.buyDate || new Date().toISOString();
      const noteBase = `Anulowanie błędu: ${lot?.pair?.yahoo || lot.name || ""}`;
      const addOp = typeof _addCashOperation === "function" ? _addCashOperation : async () => {};

      if (Number.isFinite(preview?.grossPaid) && preview.grossPaid !== 0) {
        await addOp(user?.uid, currentPortfolioId, {
          amount: Number(preview.grossPaid),
          date,
          note: `${noteBase} (zwrot kwoty zakupu)`,
          currency: "PLN",
          excludeFromTWR: true,
          storno: true,
          linkedTxnId: preview?.txnId || lot.id,
        });
      }
      if (preview?.topupMode !== "none" && Number.isFinite(preview?.topupAmount) && preview.topupAmount > 0) {
        await addOp(user?.uid, currentPortfolioId, {
          amount: -Number(preview.topupAmount),
          date,
          note: `${noteBase} (cofnięcie doładowania)`,
          currency: "PLN",
          excludeFromTWR: true,
          storno: true,
          linkedTxnId: preview?.txnId || lot.id,
        });
      }
      if (Number.isFinite(preview?.fee) && preview.fee > 0) {
        await addOp(user?.uid, currentPortfolioId, {
          amount: Number(preview.fee),
          date,
          note: `${noteBase} (korekta prowizji)`,
          currency: "PLN",
          excludeFromTWR: true,
          storno: true,
          linkedTxnId: preview?.txnId || lot.id,
        });
      }
    } catch (e) {
      console.error("handleUndoError – błąd:", e);
      throw e;
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <section className="text-center mt-8 mb-6">
        <h1 className="h1">{title}</h1>
        <p className="muted text-sm">
          {isLoadingUser ? "Ładowanie…" : (isLoggedIn ? <>Zalogowano jako {user.email} · <button className="underline hover:text-zinc-200" onClick={signOut}>Wyloguj</button></> : "Nie zalogowano")}
        </p>
      </section>

      {!isLoggedIn ? (
        <section className="mx-auto max-w-6xl pb-24">
          {isLoadingUser ? <div className="mx-auto max-w-md text-center text-zinc-400">Ładowanie…</div> : <LoginCard />}
        </section>
      ) : (
        <>
          {missingDataRatio > 0.5 && (
            <div className="mb-4 rounded-lg border border-yellow-600/50 bg-yellow-900/20 px-3 py-2 text-sm text-yellow-300">
              Brakuje cen z API dla większości pozycji (wykresy mogą być puste). Sprawdź odpowiedzi <code>/api/quote</code> i <code>/api/history</code>.
            </div>
          )}

          {/* KPI — NA GÓRZE */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Wartość portfela */}
            <div className="card">
              <div className="card-inner">
                <div className="muted text-sm">Wartość portfela</div>
                <div className="text-3xl font-semibold tabular-nums">
                  {fmtPLN(totals.cur)}
                </div>
              </div>
            </div>

            {/* Dzienny zysk */}
            <div className="card">
              <div className="card-inner">
                <div className="muted text-sm">Dzienny zysk</div>
                <div className={`text-3xl font-semibold tabular-nums ${totals.day >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtPLN(totals.day)}
                </div>
              </div>
            </div>

            {/* Całkowity zysk */}
            <div className="card">
              <div className="card-inner">
                <div className="muted text-sm">Całkowity zysk</div>
                <div className={`text-3xl font-semibold tabular-nums ${totals.gainAbs >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtPLN(totals.gainAbs)}
                </div>
                <div className={`${totals.gainAbs >= 0 ? "text-emerald-400/80" : "text-red-400/80"} text-xs tabular-nums`}>
                  {fmtPct(totals.gainPct)}
                </div>
              </div>
            </div>
          </section>

          {/* PASEK KONTROLEK — POD KPI */}
          <section className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRangeKey(r.key)}
                  className={[
                    "px-3 py-1.5 rounded-lg border text-sm",
                    rangeKey === r.key
                      ? "bg-yellow-600/70 border-yellow-500 text-black"
                      : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                  ].join(" ")}
                  aria-pressed={rangeKey === r.key}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <PortfolioSwitcher uid={user.uid} value={currentPortfolioId} onChange={setCurrentPortfolioId} />
              {/* W trybie ALL nie pokazujemy przycisków, żeby nie pisać do pseudo-portfela */}
              {currentPortfolioId !== ALL_PORTFOLIO_ID && (
                <>
                  <ImportHistoryButton uid={user.uid} portfolioId={currentPortfolioId} />
                  <AddTransactionButton uid={user.uid} portfolioId={currentPortfolioId} />
                </>
              )}
            </div>
          </section>

          {/* Wykres */}
          <section className="card mb-4">
            <div className="card-inner">
              <h3 className="h2 mb-2">Wartość portfela (PLN)</h3>
              <PortfolioChart
                seriesBySymbol={Object.fromEntries(
                  holdings.map(h => [h.id, series[h.id] || { history: [], shares: h.shares }])
                )}
                height={240}
                longRange={["6M", "YTD", "1R", "5L", "MAX"].includes(rangeKey)}
              />
            </div>
          </section>

          <PortfolioTable
            groups={groups}
            expanded={expanded}
            onToggle={(key) => {
              const s = new Set(expanded);
              s.has(key) ? s.delete(key) : s.add(key);
              setExpanded(s);
            }}
            onOpenFix={(lot, group) => setFixLot({ lot, lots: [lot], group })}
          />

          {/* Modal: Cofnij zakup */}
          {fixLot && (
            <DeleteOrFixModal
              open={!!fixLot}
              onClose={() => setFixLot(null)}
              lot={fixLot.lot}
              group={fixLot.group}
              onUndoError={handleUndoError}
            />
          )}
        </>
      )}
    </main>
  );
}
