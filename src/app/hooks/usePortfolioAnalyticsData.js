// File: src/app/hooks/usePortfolioAnalyticsData.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { listenHoldings } from '../lib/portfolioStore';

// --- helpers z Twojej strony portfela ---
function collectAllDays(seriesMap) {
  const days = new Set();
  for (const k of Object.keys(seriesMap || {})) {
    for (const p of seriesMap[k]?.history || []) {
      if (p?.t) days.add(p.t.slice(0, 10));
    }
  }
  return Array.from(days).sort();
}
function forwardFillOnDays(history, days, buyDate) {
  const map = new Map();
  for (const p of history || []) {
    const d = (p.t || '').slice(0, 10);
    const v = Number.isFinite(p.close) ? p.close : null;
    if (d && v != null) map.set(d, v);
  }
  const out = [];
  let last = null;
  for (const d of days) {
    const explicit = map.get(d);
    if (explicit != null) last = explicit;
    if (buyDate && d < buyDate) {
      out.push({ t: d, close: 0 });
      continue;
    }
    out.push({ t: d, close: last ?? 0 });
  }
  return out;
}
function normalizeSeriesMap(seriesMap, holdings) {
  const days = collectAllDays(seriesMap);
  if (days.length === 0) return seriesMap;
  const byIdBuyDate = new Map();
  for (const h of holdings || []) byIdBuyDate.set(h.id, h.buyDate ? h.buyDate.slice(0, 10) : null);
  const out = {};
  for (const id of Object.keys(seriesMap)) {
    const s = seriesMap[id] || { history: [], shares: 0 };
    const buyDate = byIdBuyDate.get(id);
    out[id] = {
      shares: s.shares,
      history: forwardFillOnDays(s.history, days, buyDate),
    };
  }
  return out;
}
function pickLastPricePLN(q, hist) {
  const priceNow =
    Number.isFinite(q?.pricePLN)
      ? q.pricePLN
      : (q?.currency === 'PLN' && Number.isFinite(q?.price) ? q.price : undefined);
  const lastClose = Array.isArray(hist) && hist.length ? hist[hist.length - 1].close : undefined;
  if (Number.isFinite(priceNow)) return priceNow;
  if (Number.isFinite(lastClose)) return lastClose;
  return 0;
}
function makeGroups(holdings, quotes, series) {
  const byKey = new Map();
  for (const h of holdings || []) {
    const key = h?.pair?.yahoo || h.name;
    if (!byKey.has(key)) {
      byKey.set(key, { key, name: h.name, pair: h.pair, positions: [], totalShares: 0, costSum: 0 });
    }
    const g = byKey.get(key);
    g.positions.push(h);
    g.totalShares += Number(h.shares) || 0;
    g.costSum    += (Number(h.buyPrice) || 0) * (Number(h.shares) || 0);
  }
  const out = [];
  for (const g of byKey.values()) {
    const avgBuy = g.totalShares > 0 ? g.costSum / g.totalShares : 0;
    let pricePLN = 0;
    for (const lot of g.positions) {
      const q    = quotes[lot.id];
      const hist = series[lot.id]?.history || [];
      const p    = pickLastPricePLN(q, hist);
      if (Number.isFinite(p) && p > 0) { pricePLN = p; break; }
    }
    const value = pricePLN * g.totalShares;
    out.push({ ...g, avgBuy, pricePLN, value });
  }
  return out.sort((a, b) => (b.value || 0) - (a.value || 0));
}

// --- główny hook ---
export function usePortfolioAnalyticsData() {
  const { user } = useAuth();
  const [fsHoldings, setFsHoldings] = useState(null);
  const [quotes, setQuotes] = useState({});
  const [series, setSeries] = useState({});
  const loadingUser = user === undefined;

  // 1) holdings z Firestore
  useEffect(() => {
    if (!user) { setFsHoldings(null); return; }
    const unsub = listenHoldings(user.uid, (items) => setFsHoldings(items));
    return () => unsub?.();
  }, [user]);

  const holdings = fsHoldings ?? [];

  // 2) notowania bieżące
  useEffect(() => {
    (async () => {
      if (!holdings?.length) { setQuotes({}); return; }
      const entries = await Promise.all(
        holdings.map(async (h) => {
          try {
            const resp = await fetch('/api/quote', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ pair: h.pair }),
            });
            if (!resp.ok) return [h.id, null];
            const q = await resp.json();
            let pricePLN = Number.isFinite(q?.pricePLN)
              ? q.pricePLN
              : (q?.currency === 'PLN' && Number.isFinite(q?.price) ? q.price : null);
            return [h.id, { ...q, pricePLN }];
          } catch {
            return [h.id, null];
          }
        })
      );
      setQuotes(Object.fromEntries(entries));
    })();
  }, [JSON.stringify(holdings?.map?.((h) => ({ id: h.id, pair: h.pair })) || [])]);

  // 3) historia (bierzemy YTD dziennie – wystarczy do panelu; chcesz MAX, zmień range/interval)
  useEffect(() => {
    (async () => {
      if (!holdings?.length) { setSeries({}); return; }
      const entries = await Promise.all(
        holdings.map(async (h) => {
          try {
            const resp = await fetch('/api/history', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ pair: h.pair, range: 'ytd', interval: '1d' }),
            });
            if (!resp.ok) return [h.id, { history: [], shares: h.shares }];
            const hist = await resp.json();
            const rawArr = Array.isArray(hist?.historyPLN)
              ? hist.historyPLN
              : (Array.isArray(hist?.history) ? hist.history : []);
            const safe = rawArr
              .filter((p) => p?.t && Number.isFinite(p?.close))
              .map((p) => ({ t: p.t, close: p.close }));
            return [h.id, { history: safe, shares: h.shares }];
          } catch {
            return [h.id, { history: [], shares: h.shares }];
          }
        })
      );
      const rawMap = Object.fromEntries(entries);
      const normalized = normalizeSeriesMap(rawMap, holdings);
      setSeries(normalized);
    })();
  }, [JSON.stringify(holdings?.map?.((h) => ({ id: h.id, pair: h.pair, shares: h.shares })) || [])]);

  // 4) NAV portfela (sumujemy po dniach)
  const navSeries = useMemo(() => {
    const days = collectAllDays(series);
    if (!days.length) return [];
    // sprawdźmy długości historii – zakładamy, że normalizeSeriesMap wyrównał
    return days.map((d, idx) => {
      let total = 0;
      for (const id of Object.keys(series)) {
        const s = series[id];
        const bar = s?.history?.[idx];
        total += (bar?.close || 0) * (s?.shares || 0);
      }
      return { date: d, value: total };
    });
  }, [series]);

  // 5) Walory do tabeli w panelu
  const grouped = useMemo(() => makeGroups(holdings, quotes, series), [holdings, quotes, series]);
  const holdingsForAnalytics = useMemo(
    () =>
      grouped.map((g) => ({
        ticker: g.pair?.yahoo || g.key || g.name,
        name: g.name,
        qty: g.totalShares,
        avgPrice: g.avgBuy || 0,
        lastPrice: g.pricePLN || 0,
        currency: 'PLN',
        sector: g.positions?.[0]?.sector || undefined,
      })),
    [grouped]
  );

  const data = useMemo(
    () => ({ navSeries, holdings: holdingsForAnalytics, transactions: [] }),
    [navSeries, holdingsForAnalytics]
  );

  const loading =
    loadingUser || (user && fsHoldings === null); // ładowanie holdings po zalogowaniu

  return { loading, data };
}
