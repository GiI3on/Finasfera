"use client";

import { useEffect, useRef, useState } from "react";

/** Spróbuj załadować store z kilku potencjalnych ścieżek/rozszerzeń */
async function loadStore() {
  const tries = [
    "./portfolioStore",
    "./portfolio-store",
    "../lib/portfolioStore",
    "../../lib/portfolioStore",
  ];
  for (const p of tries) {
    try {
      const mod = await import(/* @vite-ignore */ p);
      if (mod) return mod;
    } catch (_) {}
  }
  return null;
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Bezpieczny wybór wartości pozycji (PLN) */
function pickHoldingValuePLN(h) {
  const direct =
    h?.valuePLN ??
    h?.marketValuePLN ??
    h?.mvPLN ??
    h?.value ??
    h?.marketValue;
  if (Number.isFinite(Number(direct))) return Number(direct);

  const shares = Number(h?.shares) || 0;
  const px = Number(h?.buyPrice) || 0; // w PLN
  if (shares > 0 && px > 0) return shares * px;

  return 0;
}

/**
 * Zwraca SUMĘ wszystkich portfeli (root + wszystkie nazwane).
 * Nie wymaga odwiedzania „Mój portfel”. Działa wyłącznie na holdings.
 */
export default function useAllPortfoliosPLN(uid) {
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const unsubsRef = useRef([]);

  useEffect(() => {
    let stop = false;

    // posprzątaj poprzednie subskrypcje
    unsubsRef.current.forEach((u) => { try { u(); } catch {} });
    unsubsRef.current = [];
    setLoading(true);
    setValue(0);

    if (!uid) {
      setLoading(false);
      return;
    }

    (async () => {
      const store = await loadStore();
      if (!store) {
        setLoading(false);
        return;
      }

      const totals = new Map(); // pid -> suma PLN
      const emit = () => {
        if (stop) return;
        const sum = Array.from(totals.values()).reduce((a, b) => a + (Number(b) || 0), 0);
        setValue(sum);
        setLoading(false);
      };

      // 1) root (główny portfel)
      try {
        const offRoot = store.listenHoldings(uid, (rows = []) => {
          const v = Array.isArray(rows)
            ? rows.reduce((s, h) => s + pickHoldingValuePLN(h), 0)
            : 0;
          totals.set("__root__", v);
          emit();
        });
        if (typeof offRoot === "function") unsubsRef.current.push(offRoot);
      } catch (_) {}

      // 2) lista nazwanych portfeli (jednorazowo)
      let ids = [];
      try {
        if (typeof store.listPortfolios === "function") {
          const list = await store.listPortfolios(uid);
          ids = Array.isArray(list) ? list.map((p) => String(p?.id || "")).filter(Boolean) : [];
        }
      } catch (_) { ids = []; }

      // 3) nasłuch dla każdego nazwanego
      ids.forEach((pid) => {
        try {
          const off = store.listenHoldings(uid, pid, (rows = []) => {
            const v = Array.isArray(rows)
              ? rows.reduce((s, h) => s + pickHoldingValuePLN(h), 0)
              : 0;
            totals.set(pid, v);
            emit();
          });
          if (typeof off === "function") unsubsRef.current.push(off);
        } catch (_) {}
      });

      // na wypadek, gdy nie ma żadnych portfeli nazwanych
      emit();
    })();

    return () => {
      stop = true;
      unsubsRef.current.forEach((u) => { try { u(); } catch {} });
      unsubsRef.current = [];
    };
  }, [uid]);

  return { value, loading };
}
