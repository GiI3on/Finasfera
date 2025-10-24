// src/lib/usePortfolioValue.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listenPortfolioValue } from "./portfolioStore";

/**
 * Hook do pobierania wartości portfela w PLN z Firestore (liveValue).
 *
 * @param {string} scope
 *    "__ALL__"  -> suma główny (root) + wszystkie nazwane
 *    ""         -> główny (root)
 *    "<id>"     -> konkretny nazwany portfel
 *
 * @param {object} options
 *    - uid: string (wymagane)
 *    - portfolioIds?: string[] (używane przy "__ALL__" do zsumowania nazwanych)
 *
 * Zwraca: { value, loading, source }
 *    - value: number (PLN)
 *    - loading: boolean
 *    - source: "live"
 */
export default function usePortfolioValue(scope, options = {}) {
  const { uid, portfolioIds = [] } = options;

  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("live"); // spójnie z przyszłymi rozszerzeniami

  // stabilizuj zależności, żeby nie prze-subskrybować bez potrzeby
  const scopeKey = typeof scope === "string" ? scope : "__ALL__";
  const idsKey = useMemo(
    () => (Array.isArray(portfolioIds) ? portfolioIds.map(String).sort().join("|") : ""),
    [portfolioIds]
  );

  // pojedyncza subskrypcja liveValue (sumuje po stronie clienta dla "__ALL__")
  useEffect(() => {
    if (!uid) {
      setValue(0);
      setLoading(false);
      setSource("live");
      return;
    }

    setLoading(true);
    let off = null;

    try {
      // listenPortfolioValue(uid, scope, { portfolioIds })(callback)
      off = listenPortfolioValue(uid, scopeKey, { portfolioIds })((v) => {
        setValue(Number.isFinite(v) ? Number(v) : 0);
        setSource("live");
        setLoading(false);
      });
    } catch (e) {
      console.error("usePortfolioValue listen error:", e);
      setValue(0);
      setSource("live");
      setLoading(false);
    }

    return () => {
      try { off && off(); } catch {}
    };
  }, [uid, scopeKey, idsKey]);

  return { value, loading, source };
}
