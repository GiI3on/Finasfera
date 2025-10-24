"use client";

/**
 * Mostek wartości portfela pomiędzy zakładkami/stronami:
 * - trzyma dane w window.__PORTFOLIO_BRIDGE__
 * - utrwala snapshot w localStorage
 * - wysyła powiadomienia (BroadcastChannel, storage event, CustomEvent)
 *
 * Format:
 * {
 *   all: number,                        // suma wszystkich znanych portfeli
 *   current: number,                    // wartość bieżącego widoku (fallback)
 *   currentPortfolioId: string|null,    // "", "__ALL__", "uuid" itd.
 *   portfolios: { [id: string]: number } // mapowanie id → wartość portfela
 * }
 */

const SNAPSHOT_KEY = "portfolio:latest";
const PING_KEY = "portfolio:value";
const ALL_ID = "__ALL__";
const MAIN_ID = "";

const EMPTY_STATE = {
  all: 0,
  current: 0,
  currentPortfolioId: null,
  portfolios: {},
};

// --- inicjalizacja globalnej pamięci (ważne, aby istniało zanim cokolwiek zacznie używać) ---
if (typeof window !== "undefined") {
  window.__PORTFOLIO_BRIDGE__ = window.__PORTFOLIO_BRIDGE__ || { ...EMPTY_STATE };
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function isAllId(id) {
  if (!id) return false;
  if (id === ALL_ID) return true;
  return typeof id === "string" && id.toLowerCase() === "all";
}
function normalizePortfolioId(value, { allowAll = false } = {}) {
  if (value == null) return MAIN_ID;
  const str = String(value).trim();
  if (!str) return MAIN_ID;
  if (allowAll && isAllId(str)) return ALL_ID;
  return str === ALL_ID && !allowAll ? MAIN_ID : str;
}

function extractState(raw) {
  if (!raw || typeof raw !== "object") return {};

  const out = {};
  if ("all" in raw) out.all = n(raw.all);
  if ("current" in raw) out.current = n(raw.current);
  if ("currentPortfolioId" in raw) {
    out.currentPortfolioId = normalizePortfolioId(raw.currentPortfolioId, { allowAll: true });
  }

  if (raw.portfolios && typeof raw.portfolios === "object") {
    const map = {};
    for (const [key, val] of Object.entries(raw.portfolios)) {
      const id = normalizePortfolioId(key, { allowAll: false });
      if (isAllId(id)) continue;

      const resolved =
        val && typeof val === "object"
          ? n(
              val.value ??
                val.amount ??
                val.val ??
                val.v ??
                val.total ??
                val.portfolioValue ??
                val.portfolio ??
                val.cur
            )
          : n(val);

      map[id] = resolved;
    }
    out.portfolios = map;
  }
  return out;
}

function mergeState(base, partial) {
  const next = {
    all: base.all,
    current: base.current,
    currentPortfolioId: base.currentPortfolioId,
    portfolios: { ...base.portfolios },
  };

  if (partial.all !== undefined) next.all = n(partial.all);
  if (partial.current !== undefined) next.current = n(partial.current);
  if (partial.currentPortfolioId !== undefined)
    next.currentPortfolioId = partial.currentPortfolioId;

  if (partial.portfolios) {
    for (const [id, value] of Object.entries(partial.portfolios)) {
      next.portfolios[id] = n(value);
    }
  }
  return next;
}

function getInMemoryState() {
  if (typeof window === "undefined") return { ...EMPTY_STATE };
  return mergeState({ ...EMPTY_STATE }, extractState(window.__PORTFOLIO_BRIDGE__));
}
function persistState(state) {
  if (typeof window === "undefined") return;

  // 1) pamięć karty
  window.__PORTFOLIO_BRIDGE__ = state;

  // 2) snapshot LS
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(state));
  } catch {}

  // 3) BroadcastChannel
  try {
    const bc = new BroadcastChannel("portfolio");
    bc.postMessage({ type: "portfolio:value", data: state });
    bc.close();
  } catch {}

  // 4) storage ping
  try {
    localStorage.setItem(PING_KEY, String(Date.now()));
  } catch {}

  // 5) CustomEvent
  try {
    window.dispatchEvent(new CustomEvent("portfolio:value", { detail: state }));
  } catch {}
}

/** Publiczne API: odczyt snapshotu (np. do debug) */
export function getPortfolioBridgeState() {
  if (typeof window === "undefined") return { ...EMPTY_STATE };
  let state = getInMemoryState();
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (raw) state = mergeState(state, extractState(JSON.parse(raw)));
  } catch {}
  return state;
}

/**
 * publishPortfolioValue(payload)
 * Obsługiwane pola:
 * - all, current
 * - portfolioId, value
 * - portfolios: { [id]: number }
 * - currentPortfolioId
 * - knownPortfolioIds: string[]
 */
export function publishPortfolioValue(payload = {}) {
  if (typeof window === "undefined") return;

  const prev = getInMemoryState();
  let next = { ...prev, portfolios: { ...prev.portfolios } };

  // wstępna fuzja
  next = mergeState(next, extractState(payload));

  // wpisy per-portfel (batch)
  if (payload.portfolios && typeof payload.portfolios === "object") {
    for (const [key, val] of Object.entries(payload.portfolios)) {
      const id = normalizePortfolioId(key, { allowAll: false });
      if (isAllId(id)) continue;
      next.portfolios[id] = n(val);
    }
  }

  // pojedyncza aktualizacja
  if (payload.portfolioId !== undefined && payload.value != null) {
    const id = normalizePortfolioId(payload.portfolioId, { allowAll: false });
    if (!isAllId(id)) {
      next.portfolios[id] = n(payload.value);
      next.currentPortfolioId =
        payload.currentPortfolioId !== undefined
          ? normalizePortfolioId(payload.currentPortfolioId, { allowAll: true })
          : id;
      next.current = n(payload.current != null ? payload.current : payload.value);
    }
  } else if (payload.currentPortfolioId !== undefined) {
    next.currentPortfolioId = normalizePortfolioId(payload.currentPortfolioId, { allowAll: true });
    if (payload.current != null) next.current = n(payload.current);
  }

  // sprzątanie nieznanych ID (opcjonalne, ale pomaga gdy coś „dopisało” śmieci)
  const knownList = Array.isArray(payload.knownPortfolioIds)
    ? Array.from(
        new Set(
          payload.knownPortfolioIds
            .map((id) => normalizePortfolioId(id, { allowAll: false }))
            .filter((id) => !isAllId(id))
        )
      )
    : null;
  if (knownList) {
    for (const key of Object.keys(next.portfolios)) {
      if (!knownList.includes(key)) delete next.portfolios[key];
    }
  }

  // wylicz „all” jeśli nie ustawiono jawnie
  if (payload.all == null) {
    const sum = Object.values(next.portfolios).reduce((acc, val) => acc + n(val), 0);
    next.all = sum;
  }

  // spójny current
  const curId = next.currentPortfolioId;
  if (isAllId(curId)) {
    next.current = next.all;
  } else if (curId && Object.prototype.hasOwnProperty.call(next.portfolios, curId)) {
    next.current = n(next.portfolios[curId]);
  }

  persistState(next);
}
