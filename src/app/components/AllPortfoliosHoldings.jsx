"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listenHoldings } from "../../lib/portfolioStore";

/* ===== Helpers ===== */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Wyciąga cenę PLN z odpowiedzi /api/quote (różne formaty) */
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
  // Yahoo-like
  const p = Number(raw.regularMarketPrice ?? raw.c);
  const pc = Number(raw.regularMarketPreviousClose ?? raw.pc);
  return {
    pricePLN: Number.isFinite(p) ? p : null,
    prevClosePLN: Number.isFinite(pc) ? pc : null,
  };
}

/** Minimalny parser historii: zwraca ostatnie sensowne close */
function lastCloseFromHistory(json) {
  try {
    const arr =
      (Array.isArray(json?.historyPLN) && json.historyPLN) ||
      (Array.isArray(json?.history) && json.history) ||
      [];
    for (let i = arr.length - 1; i >= 0; i--) {
      const c = Number(arr[i]?.close ?? arr[i]?.price ?? arr[i]?.adjClose ?? arr[i]?.c);
      if (Number.isFinite(c) && c > 0) return c;
    }
  } catch {}
  return null;
}

/** Strategia wyboru ceny „teraz” dla zgrupowanej spółki */
function priceNow({ quoteObj, histClose, avgBuy, anyBuy }) {
  const live = Number.isFinite(quoteObj?.pricePLN) ? quoteObj.pricePLN : null;
  if (live && live > 0) return live;
  if (Number.isFinite(histClose) && histClose > 0) return histClose;
  const pc = Number.isFinite(quoteObj?.prevClosePLN) ? quoteObj.prevClosePLN : null;
  if (pc && pc > 0) return pc;
  if (Number.isFinite(avgBuy) && avgBuy > 0) return avgBuy;
  if (Number.isFinite(anyBuy) && anyBuy > 0) return anyBuy;
  return 0;
}

/* ===== Komponent ===== */
export default function AllPortfoliosHoldings({ uid, portfolioIds = [] }) {
  const [lotsBySymbol, setLotsBySymbol] = useState({}); // symbol -> { name, lots:[{shares,buyPrice,...}] }
  const [quotes, setQuotes] = useState({});            // symbol -> {pricePLN, prevClosePLN}
  const [histFallback, setHistFallback] = useState({}); // symbol -> lastClose
  const [loading, setLoading] = useState(true);

  const unsubRef = useRef([]);

  // 1) Słuchamy WSZYSTKIE portfele i zbieramy loty per ticker
  useEffect(() => {
    unsubRef.current.forEach((u) => typeof u === "function" && u());
    unsubRef.current = [];
    setLotsBySymbol({});
    setQuotes({});
    setHistFallback({});
    if (!uid || !Array.isArray(portfolioIds) || portfolioIds.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Bieżąca mapa budująca się strumieniowo
    const map = new Map(); // symbol -> {name, lots:[]}

    const attach = (pid) => {
      const off = listenHoldings(uid, pid, (items = []) => {
        // prosto: na każde zdarzenie przebuduj mapę z aktualnych items
        const local = new Map(map);

        for (const h of items) {
          const symbol = String(h?.pair?.yahoo || h?.symbol || h?.name || "").toUpperCase().trim();
          if (!symbol) continue;

          if (!local.has(symbol)) {
            local.set(symbol, { name: h?.name || symbol, lots: [] });
          }
          const entry = local.get(symbol);
          entry.lots.push({
            shares: num(h.shares),
            buyPrice: num(h.buyPrice),
            valuePLN: num(h.marketValuePLN ?? h.valuePLN ?? h.value),
          });
        }

        map.clear();
        for (const [k, v] of local.entries()) map.set(k, v);

        setLotsBySymbol(Object.fromEntries(map.entries()));
        setLoading(false);
      });

      if (typeof off === "function") unsubRef.current.push(off);
    };

    

    for (const idRaw of portfolioIds) {
  const id = String(idRaw || "").trim();
  if (!id) continue; // ⚠️ pomijamy pusty portfel (np. "Mój portfel" bez dokumentu)
  attach(id);
}


    return () => {
      unsubRef.current.forEach((u) => typeof u === "function" && u());
      unsubRef.current = [];
    };
  }, [uid, JSON.stringify(portfolioIds)]);

  const symbols = useMemo(() => Object.keys(lotsBySymbol), [lotsBySymbol]);

  // 2) Pobierz QUOTES dla wszystkich symboli (jednym strzałem)
  useEffect(() => {
    if (!symbols.length) {
      setQuotes({});
      return;
    }
    const controller = new AbortController();

    (async () => {
      try {
        const url = `/api/quote?symbols=${encodeURIComponent(symbols.join(","))}`;
        const r = await fetch(url, { signal: controller.signal });
        if (!r.ok) {
          setQuotes({});
          return;
        }
        const j = await r.json().catch(() => ({}));
        const bySym = j?.quotes || {};
        const out = {};
        for (const s of symbols) {
          const q = bySym[s] || bySym[s.toUpperCase()] || bySym[s.toLowerCase()];
          out[s] = q ? parseQuotePLN(q) : { pricePLN: null, prevClosePLN: null };
        }
        setQuotes(out);
      } catch (e) {
        if (e?.name !== "AbortError") setQuotes({});
      }
    })();

    return () => controller.abort();
  }, [JSON.stringify(symbols)]);

  // 3) Fallback do historii – tylko dla symboli bez ceny po QUOTE
  useEffect(() => {
    const needHist = symbols.filter(
      (s) => !(Number.isFinite(quotes[s]?.pricePLN) && quotes[s].pricePLN > 0)
    );
    if (!needHist.length) {
      setHistFallback({});
      return;
    }

    const controller = new AbortController();
    (async () => {
      const entries = await Promise.all(
        needHist.map(async (s) => {
          try {
            const r = await fetch("/api/history", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ pair: { yahoo: s }, range: "1mo", interval: "1d" }),
              signal: controller.signal,
            });
            if (!r.ok) return [s, null];
            const json = await r.json().catch(() => ({}));
            return [s, lastCloseFromHistory(json)];
          } catch {
            return [s, null];
          }
        })
      );
      setHistFallback(Object.fromEntries(entries));
    })();

    return () => controller.abort();
  }, [JSON.stringify(symbols), JSON.stringify(quotes)]);

  // 4) Wyliczenie tabeli łączonej
  const rows = useMemo(() => {
    const out = [];
    for (const sym of symbols) {
      const entry = lotsBySymbol[sym];
      const lots = entry?.lots || [];
      if (!lots.length) continue;

      const shares = lots.reduce((s, l) => s + num(l.shares), 0);
      const cost   = lots.reduce((s, l) => s + num(l.shares) * num(l.buyPrice), 0);
      const avgBuy = shares > 0 ? cost / shares : 0;
      const anyBuy = lots.find((l) => num(l.buyPrice) > 0)?.buyPrice ?? 0;

      const q   = quotes[sym] || {};
      const hcl = histFallback[sym];

      const px = priceNow({ quoteObj: q, histClose: hcl, avgBuy, anyBuy });
      const value   = px * shares;
      const gain    = value - cost;
      const gainPct = cost > 0 ? (gain / cost) * 100 : 0;

      out.push({ key: sym, name: entry?.name || sym, shares, value, gain, gainPct });
    }
    return out.sort((a, b) => b.value - a.value);
  }, [lotsBySymbol, quotes, histFallback, JSON.stringify(symbols)]);

  const totals = useMemo(() => {
    const value = rows.reduce((s, r) => s + r.value, 0);
    const cost  = rows.reduce((s, r) => s + (r.value - r.gain), 0);
    const gain  = value - cost;
    const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
    return { value, gain, gainPct };
  }, [rows]);

  if (loading) return <div className="text-zinc-400">Ładowanie danych…</div>;

  return (
    <div className="mt-8 card">
      <div className="card-inner">
        <h3 className="h2 mb-2">Skład wszystkich portfeli (łączony)</h3>
        <div className="mb-2 text-sm text-zinc-400">
          Wszystkie akcje (suma ze wszystkich portfeli)
        </div>

        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-zinc-400 border-b border-zinc-700">
              <th className="text-left  py-2 px-2">Spółka</th>
              <th className="text-right py-2 px-2">Akcje</th>
              <th className="text-right py-2 px-2">Wartość</th>
              <th className="text-right py-2 px-2">Zysk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.key} className="border-b border-zinc-800">
                <td className="py-1 px-2">{x.name}</td>
                <td className="text-right py-1 px-2">{x.shares}</td>
                <td className="text-right py-1 px-2">{fmtPLN(x.value)}</td>
                <td className={`text-right py-1 px-2 ${x.gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtPLN(x.gain)} ({x.gainPct.toFixed(2)}%)
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-700">
            <tr className="font-semibold">
              <td className="py-2 px-2">SUMA</td>
              <td />
              <td className="text-right py-2 px-2">{fmtPLN(totals.value)}</td>
              <td className={`text-right py-2 px-2 ${totals.gain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmtPLN(totals.gain)} ({totals.gainPct.toFixed(2)}%)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
