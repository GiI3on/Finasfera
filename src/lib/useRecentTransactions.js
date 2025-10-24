// src/lib/useRecentTransactions.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveScopeToIds, ALL_SCOPE, MAIN_ID, normalizePortfolioId } from "./scopeResolver";

async function loadStore() {
  const tries = ["./portfolioStore", "./portfolio-store", "../lib/portfolioStore"];
  for (const p of tries) {
    try {
      const mod = await import(/* @vite-ignore */ p);
      if (mod) return mod;
    } catch (_) {}
  }
  return null;
}

/**
 * useRecentTransactions(scope, limit, options)
 * options:
 *  - uid?: string
 *  - portfolioIds?: string[]     // dla scope="__ALL__" zbierzemy ze wszystkich i zmergujemy
 *  - includeMain?: boolean       // domyślnie true (do ALL dodaj MAIN)
 */
export default function useRecentTransactions(scope = "all", limit = 5, options = {}) {
  const normalizedScope = typeof scope === "string" ? scope : "all";
  const { uid = null, portfolioIds = [], includeMain = true } = options || {};

  // podpis listy ID dla ALL (staramy się nie rozjechać z usePortfolioValue)
  const idsForAll = useMemo(() => {
    if (normalizedScope === ALL_SCOPE || normalizedScope.toLowerCase?.() === "all") {
      const set = new Set(
        (Array.isArray(portfolioIds) ? portfolioIds : [])
          .map((id) => normalizePortfolioId(id, { allowAll: false }))
          .filter(Boolean)
      );
      if (includeMain) set.add(MAIN_ID);
      return Array.from(set);
    }
    return [];
  }, [normalizedScope, portfolioIds, includeMain]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stop = false;
    const unsubs = [];

    const safeSet = (arr) => {
      if (!stop) {
        setItems(arr);
        setLoading(false);
      }
    };

    (async () => {
      setLoading(true);
      const store = await loadStore();

      // 1) Jeśli scope nie jest ALL → najpierw spróbuj natywne API store (current/id)
      if (!(normalizedScope === ALL_SCOPE || normalizedScope.toLowerCase?.() === "all")) {
        // preferowane: listenRecentTransactions("current", limit, cb)
        if (store && typeof store.listenRecentTransactions === "function") {
          const off = store.listenRecentTransactions("current", limit, (arr = []) => {
            safeSet(Array.isArray(arr) ? arr.slice(0, limit) : []);
          });
          unsubs.push(off);
          return;
        }

        // alternatywa: listenTransactions("current", cb) → weź ostatnie N
        if (store && typeof store.listenTransactions === "function") {
          const off = store.listenTransactions("current", (arr = []) => {
            const sorted = Array.isArray(arr)
              ? [...arr].sort((a, b) => (b?.date || 0) - (a?.date || 0)).slice(0, limit)
              : [];
            safeSet(sorted);
          });
          unsubs.push(off);
          return;
        }

        // fallback
        safeSet([]);
        return;
      }

      // 2) ALL — spróbuj po wszystkich ID, a jak się nie da, użyj "all"
      const mergeAndTrim = (map) => {
        const merged = []
          .concat(...Array.from(map.values()))
          .filter(Boolean)
          .sort((a, b) => (b?.date || 0) - (a?.date || 0))
          .slice(0, limit);
        safeSet(merged);
      };

      const perIdSupported =
        (store && typeof store.listenRecentTransactionsById === "function") ||
        (store && typeof store.listenRecentTransactions === "function" && store.listenRecentTransactions.length >= 4) ||
        (store && typeof store.listenTransactions === "function" && store.listenTransactions.length >= 3);

      if (uid && perIdSupported && idsForAll.length) {
        const bucket = new Map(); // id -> arr

        const attachById = (id) => {
          const push = (arr) => {
            bucket.set(id, Array.isArray(arr) ? arr : []);
            mergeAndTrim(bucket);
          };

          // 3 warianty API — wykryj i użyj
          if (typeof store.listenRecentTransactionsById === "function") {
            const off = store.listenRecentTransactionsById(uid, id === MAIN_ID ? null : id, limit, push);
            if (typeof off === "function") unsubs.push(off);
            return;
          }
          if (typeof store.listenRecentTransactions === "function" && store.listenRecentTransactions.length >= 4) {
            const off = store.listenRecentTransactions(uid, id === MAIN_ID ? null : id, limit, push);
            if (typeof off === "function") unsubs.push(off);
            return;
          }
          if (typeof store.listenTransactions === "function" && store.listenTransactions.length >= 3) {
            const off = store.listenTransactions(uid, id === MAIN_ID ? null : id, (arr = []) => {
              const sorted = Array.isArray(arr)
                ? [...arr].sort((a, b) => (b?.date || 0) - (a?.date || 0)).slice(0, limit)
                : [];
              push(sorted);
            });
            if (typeof off === "function") unsubs.push(off);
            return;
          }
        };

        for (const id of idsForAll) attachById(id);
        return;
      }

      // 3) Ostateczny fallback: "all" jako jeden feed
      if (store && typeof store.listenRecentTransactions === "function") {
        const off = store.listenRecentTransactions("all", limit, (arr = []) => {
          safeSet(Array.isArray(arr) ? arr.slice(0, limit) : []);
        });
        unsubs.push(off);
        return;
      }
      if (store && typeof store.listenTransactions === "function") {
        const off = store.listenTransactions("all", (arr = []) => {
          const sorted = Array.isArray(arr)
            ? [...arr].sort((a, b) => (b?.date || 0) - (a?.date || 0)).slice(0, limit)
            : [];
          safeSet(sorted);
        });
        unsubs.push(off);
        return;
      }

      // brak wsparcia
      safeSet([]);
    })();

    return () => {
      stop = true;
      for (const off of unsubs) if (typeof off === "function") off();
    };
  }, [normalizedScope, limit, uid, idsForAll.join("|")]);

  return { items, loading };
}
