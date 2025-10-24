// src/components/ApiFetchTap.jsx
"use client";

import { useEffect } from "react";

/**
 * Installs a tiny fetch() tap in the browser so we can see
 * what /api/quote and /api/history return (in ApiDebugPanel).
 * Safe for HMR and SSR.
 */
export default function ApiFetchTap() {
  useEffect(() => {
    if (typeof window === "undefined") return;         // SSR guard
    if (window.__apiTapInstalled) return;              // don't re-install

    const originalFetch = window.fetch;

    window.__apiLog = window.__apiLog || [];

    window.fetch = async (...args) => {
      const [input, init] = args;
      try {
        const res = await originalFetch(...args);

        // lightweight log for the panel
        window.__apiLog.push({
          t: Date.now(),
          url: typeof input === "string" ? input : input?.url,
          status: res?.status,
          method: (init?.method || "GET").toUpperCase(),
        });

        return res;
      } catch (err) {
        window.__apiLog.push({
          t: Date.now(),
          url: typeof input === "string" ? input : input?.url,
          error: String(err),
        });
        throw err;
      }
    };

    window.__apiTapInstalled = true;

    // cleanup on HMR / unmount
    return () => {
      window.fetch = originalFetch;
      window.__apiTapInstalled = false;
    };
  }, []);

  return null;
}
