// src/components/ApiDebugPanel.jsx
"use client";

import { useEffect, useState } from "react";

/**
 * Mały pływający panel do podglądu wywołań /api/quote i /api/history,
 * które zbiera ApiFetchTap. Pokazuje ostatnie ~50 wpisów.
 */
export default function ApiDebugPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // odświeżaj listę co 800 ms
    const i = setInterval(() => {
      const arr = Array.isArray(window.__apiLog) ? window.__apiLog : [];
      // bierz ostatnie 50, w odwrotnej kolejności (najnowsze na górze)
      setLogs([...arr].slice(-50).reverse());
    }, 800);

    return () => clearInterval(i);
  }, []);

  const btnStyle = {
    padding: "8px 10px",
    borderRadius: 10,
    background: "#facc15",
    color: "#111",
    border: "1px solid #eab308",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 10px rgba(0,0,0,.35)",
  };

  const panelStyle = {
    position: "fixed",
    right: 16,
    bottom: 64,
    width: 420,
    maxHeight: 360,
    overflow: "auto",
    background: "rgba(24,24,27,.95)",
    color: "#e5e7eb",
    border: "1px solid #3f3f46",
    borderRadius: 12,
    padding: 10,
    zIndex: 9999,
    boxShadow: "0 8px 30px rgba(0,0,0,.45)",
  };

  const badge = (status) => {
    if (!status) return { color: "#a1a1aa" };
    const ok = Number(status) >= 200 && Number(status) < 300;
    return { color: ok ? "#34d399" : "#f87171" };
  };

  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 9999 }}>
      <button style={btnStyle} onClick={() => setOpen((o) => !o)}>
        {open ? "Zamknij API" : "API"}
      </button>

      {open && (
        <div style={panelStyle}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Ostatnie wywołania API</div>
          {logs.length === 0 ? (
            <div style={{ color: "#a1a1aa" }}>Brak wpisów — wykonaj akcję w aplikacji.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {logs.map((l, i) => (
                <li
                  key={i}
                  style={{
                    borderTop: "1px solid #27272a",
                    padding: "6px 0",
                    fontSize: 13,
                    lineHeight: 1.25,
                  }}
                >
                  <div>
                    <span style={badge(l.status)}>{l.status || "ERR"}</span>{" "}
                    <strong>{(l.method || "GET").toUpperCase()}</strong>
                  </div>
                  <div style={{ color: "#a1a1aa", wordBreak: "break-all" }}>{l.url}</div>
                  <div style={{ color: "#71717a", fontSize: 12 }}>
                    {new Date(l.t || Date.now()).toLocaleTimeString()}
                    {l.error ? ` · ${l.error}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
