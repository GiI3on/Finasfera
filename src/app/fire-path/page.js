// src/app/fire-path/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import usePortfolioValue from "../../lib/usePortfolioValue";
import { getChecklist, setChecklist, listenChecklist } from "../../lib/firePathChecklist";
import { listenPortfolios } from "../../lib/portfolios";
import { useAuth } from "../components/AuthProvider";
import ProgressGoalChart from "./components/ProgressGoalChart";
import PartnerFirePanel from "./components/PartnerFirePanel";

/* ===== Helpers ===== */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 })
    .format(Number.isFinite(v) ? Math.round(v) : 0);

const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

const parseIntSafe = (str, fb = 0) => {
  const s = String(str ?? "").replace(/\s+/g, "").replace(",", ".").replace(/[^\d+-]/g, "");
  if (!s) return fb;
  const n = Number(s);
  return Number.isFinite(n) ? n : fb;
};

function useDebouncedCallback(fn, delay = 600) {
  const t = useRef(null);
  return (...args) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), delay);
  };
}

const ALL_SCOPE = "__ALL__";
const LAST_SCOPE_KEY = "firePath:lastScope";
const HIDE_MAIN_KEY = "finasfera:hideMainPortfolio";

/* Klucze zgodne z kalkulatorem */
const FIRE_CALC_KEYS = [
  "fireCalculator:lastPlan",
  "fire:lastPlan",
  "fire:calc",
  "calculator:fire",
];

/* ===== DEMO wartości (tylko niezalogowany) ===== */
const DEMO_PORTFOLIO_VALUE = 187421; // żeby "Razem" było ~200k
const DEMO_EXTRA_CAPITAL = "13780";  // input "Dodatkowy kapitał" w demo

/* ===== DEMO checklista (startowe "odhaczenia") ===== */
const DEMO_DONE_BY_LEVEL = {
  basic: [0, 1, 2, 3, 5],      // Podstawy: 5 zadań
  steady: [0, 1, 3],          // Stabilizacja: 3
  invest: [0, 6],             // Inwestowanie: 2
  lifestyle: [0, 2],          // Styl życia: 2
  extreme: [0],               // Ekstremalne: 1
};

function applyDemoPreset(levels) {
  const preset = DEMO_DONE_BY_LEVEL || {};
  return (levels || []).map((l) => {
    const set = new Set(preset[l.id] || []);
    return {
      ...l,
      tasks: (l.tasks || []).map((t, i) => ({
        ...t,
        done: set.has(i),
      })),
    };
  });
}

/* ===== Page ===== */
export default function FirePathPage() {
  /* Auth */
  let auth = { user: null, loading: false, signIn: null };
  try {
    auth = useAuth?.() || auth;
  } catch {}
  const { user, loading, signIn } = auth;
  const uid = user?.uid || null;
  const isDemo = !uid;

  /* Loading skeleton */
  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 pb-24">
        <div className="mt-16 space-y-4">
          <div className="h-10 w-64 bg-zinc-800/60 rounded animate-pulse" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="h-[380px] bg-zinc-900/40 border border-zinc-800 rounded animate-pulse" />
            <div className="h-[380px] bg-zinc-900/40 border border-zinc-800 rounded animate-pulse" />
          </div>
          <div className="h-[420px] bg-zinc-900/40 border border-zinc-800 rounded animate-pulse" />
        </div>
      </main>
    );
  }

  /* ===== Odczyt planu z LS ===== */
  const DEFAULT_ANNUAL_EXPENSES = 60000; // -> 1 500 000 przy mnożniku 25
  const DEFAULT_MULTIPLIER = 25;

  function readPlanFromLocal() {
    for (const key of FIRE_CALC_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (data && typeof data === "object") return data;
      } catch {}
    }
    return null;
  }

  function readFireTargetFromLocal() {
    const data = readPlanFromLocal();
    const annual =
      Number(data?.annualExpenses) ||
      Number(data?.expenses) ||
      (Number(data?.monthlyExpenses) ? Number(data?.monthlyExpenses) * 12 : 0);
    const mult = Number(data?.targetMultiplier || data?.mult || DEFAULT_MULTIPLIER);
    if (Number.isFinite(annual) && annual > 0 && Number.isFinite(mult) && mult > 0) {
      return Math.round(annual * mult);
    }
    return DEFAULT_ANNUAL_EXPENSES * DEFAULT_MULTIPLIER;
  }

  const [plan, setPlan] = useState(() => (typeof window === "undefined" ? null : readPlanFromLocal()));
  const [baseTarget, setBaseTarget] = useState(() =>
    typeof window === "undefined" ? DEFAULT_ANNUAL_EXPENSES * DEFAULT_MULTIPLIER : readFireTargetFromLocal()
  );

  /* CPI NBP do zgodności z kalkulatorem (gdy plan.useNBPPath) */
  const [nbpCpi, setNbpCpi] = useState([]);
  const [nbpError, setNbpError] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try {
        setPlan(readPlanFromLocal());
        setBaseTarget(readFireTargetFromLocal());
      } catch {}
    };
    window.addEventListener("storage", (e) => {
      if (FIRE_CALC_KEYS.includes(e.key)) refresh();
    });
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    let stop = false;
    async function load() {
      if (!plan?.useNBPPath) return;
      setNbpError(false);
      try {
        const years = Math.max(1, parseIntSafe(plan?.years, 30) + 2);
        const res = await fetch(`/api/nbp-forecast?years=${years}`, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        const arr = Array.isArray(json?.forecast) ? json.forecast : [];
        if (!stop && arr.length) setNbpCpi(arr);
      } catch {
        if (!stop) setNbpError(true);
      }
    }
    load();
    return () => {
      stop = true;
    };
  }, [plan?.useNBPPath, plan?.years]);

  /* Portfele: lista + wybór */
  const [portfolioOptions, setPortfolioOptions] = useState([]);
  const [hideMainPortfolio, setHideMainPortfolio] = useState(false);
  const [selectedScope, setSelectedScope] = useState(() => {
    if (typeof window === "undefined") return ALL_SCOPE;
    const stored = localStorage.getItem(LAST_SCOPE_KEY);
    return stored || ALL_SCOPE;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHideMainPortfolio(localStorage.getItem(HIDE_MAIN_KEY) === "1");
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (ev) => {
      if (ev?.key === HIDE_MAIN_KEY) {
        setHideMainPortfolio(localStorage.getItem(HIDE_MAIN_KEY) === "1");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!uid) {
      setPortfolioOptions([]);
      return;
    }
    const unsub = listenPortfolios(uid, (list) => {
      setPortfolioOptions(Array.isArray(list) ? list.filter(Boolean) : []);
    });
    return () => unsub?.();
  }, [uid]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LAST_SCOPE_KEY, selectedScope);
    } catch {}
  }, [selectedScope]);

  const portfolioChoices = useMemo(() => {
    const entries = [{ id: ALL_SCOPE, label: "Wszystkie portfele" }];
    const named = (portfolioOptions || [])
      .filter((p) => p?.id != null && p.id !== "")
      .map((p) => ({ id: String(p.id), label: p.name || "Portfel" }));
    return entries.concat(named);
  }, [portfolioOptions]);

  useEffect(() => {
    if (!portfolioChoices.length) return;
    if (!portfolioChoices.some((opt) => opt.id === selectedScope)) {
      setSelectedScope(portfolioChoices[0].id);
    }
  }, [portfolioChoices, selectedScope]);

  const portfolioIdsForHook = useMemo(() => {
    const named = portfolioOptions
      .map((p) => (p?.id != null && p.id !== "" ? String(p.id) : null))
      .filter(Boolean);
    return hideMainPortfolio ? named : ["", ...named];
  }, [portfolioOptions, hideMainPortfolio]);

  const { value: portfolioValueRaw, loading: loadingPortfolioRaw } = usePortfolioValue(selectedScope, {
    uid,
    portfolioIds: portfolioIdsForHook,
  });

  const portfolioValue = isDemo ? DEMO_PORTFOLIO_VALUE : Number(portfolioValueRaw);
  const loadingPortfolio = isDemo ? false : loadingPortfolioRaw;

  /* Partner – tryb włącz/wyłącz */
  const [partnerMode, setPartnerMode] = useState(false);
  const [partnerValue, setPartnerValue] = useState(0);

  /* ===== Checklista (Firestore + fallback do localStorage) ===== */
  const DEFAULT_LEVELS = [
    {
      id: "basic",
      name: "Podstawy",
      tasks: [
        "Utworzono budżet domowy",
        "Zidentyfikowano stałe koszty (abonamenty, rachunki)",
        "Włączono powiadomienia bankowe o transakcjach",
        "Lista celów finansowych na 12 miesięcy",
        "Przegląd subskrypcji i rezygnacja z nieużywanych",
        "Poduszka bezpieczeństwa 1 miesiąc wydatków",
        "Włączono automatyczną wpłatę oszczędności",
        "Pierwsza inwestycja/ETF z planu",
        "Zapas gotówki na drobne awarie (min. 500 zł)",
        "Konto oszczędnościowe/IKZE/PPK skonfigurowane",
      ],
    },
    {
      id: "steady",
      name: "Stabilizacja",
      tasks: [
        "Ustalono stałą miesięczną wpłatę",
        "Poduszka bezpieczeństwa 3–6 miesięcy",
        "Plan spłaty drobnych długów (jeśli są)",
        "Automatyzacja wpłat inwestycyjnych",
        "Portfel prosty – 1–2 fundusze/ETF",
        "Roczne koszty inwestowania (TER + prowizje) < 0,30%",
        "12 miesięcy z rzędu: wpłaty bez przerwy",
        "Raport roczny wydatków i przychodów",
        "Wyłączone impulsywne zakupy (reguła 48h)",
        "Zapas na wydatki nieregularne (ubezpieczenia/serwisy)",
      ],
    },
    {
      id: "invest",
      name: "Inwestowanie",
      tasks: [
        "Średnioroczna stopa zwrotu ≥ 4% przez 3 lata (netto)",
        "Średnioroczna stopa zwrotu ≥ 6% przez 5 lat (netto)",
        "Średnioroczna stopa zwrotu ≥ 7% przez 7 lat (netto)",
        "Dochód pasywny pokrywa 50% miesięcznych wydatków",
        "Dochód pasywny pokrywa 100% miesięcznych wydatków (Lean FIRE)",
        "10 lat na rynku bez naruszenia planu (zero panic-sell)",
        "Długoterminowy plan alokacji – spisany i przestrzegany",
        "Dywersyfikacja: min. 3 klasy aktywów i 2 konta/brokerzy",
        "Ścieżka podatkowa zoptymalizowana (IKZE/IKE/PPK)",
        "Roczne rozliczenie i retrospektywa decyzji",
      ],
    },
    {
      id: "lifestyle",
      name: "Styl życia FIRE",
      tasks: [
        "Wydatki stale poniżej dochodu (margines 10%+)",
        "Redukcja kluczowych kosztów (mieszkanie/transport)",
        "Stała aktywność fizyczna (min. 3× w tygodniu)",
        "Nawyki: lista zakupów, plan posiłków, brak marnowania",
        "Tydzień offline/rok – reset informacyjny",
        "Minimalizm: przegląd i sprzedaż zbędnych rzeczy",
        "Budowanie dodatkowego dochodu (side-project)",
        "Kalendarze przeglądów finansowych (mies./kw./rok)",
        "Plan ścieżki kariery i rozwoju kompetencji",
        "Wsparcie bliskich: rozmowa o planie i priorytetach",
      ],
    },
    {
      id: "extreme",
      name: "Ekstremalne",
      tasks: [
        "Wartość portfela = 50% docelowego FIRE",
        "Wartość portfela = 75% docelowego FIRE",
        "Wartość portfela = 100% docelowego FIRE",
        "Dochód pasywny > 120% miesięcznych wydatków (z zapasem)",
        "5 lat ciągłej obecności na rynku (bez panicznej sprzedaży)",
        "Średnioroczna stopa zwrotu ≥ 8% przez 10 lat (netto)",
        "Bezpieczeństwo: plan i środki na 12 m-cy awarii dochodu",
        "Dokument „instrukcja finansowa” dla bliskich",
        "Test: miesiąc życia wyłącznie z pasywnego dochodu",
        "Mentoring: wsparcie innej osoby na starcie inwestycji",
      ],
    },
  ];
  const CANON = DEFAULT_LEVELS.map((lvl) => ({
    ...lvl,
    tasks: lvl.tasks.map((t) => ({ text: t, done: false })),
  }));
  const STORAGE_KEY = "fire-path:checklist:v2";

  const [levels, setLevels] = useState(() => (isDemo ? applyDemoPreset(CANON) : CANON));
  const [activeTab, setActiveTab] = useState("basic");
  const [cloudReady, setCloudReady] = useState(false);

  // bootstrap/persist LS gdy brak usera
  useEffect(() => {
    if (uid) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLevels(JSON.parse(saved));
    } catch {}
  }, [uid]);
  useEffect(() => {
    if (uid) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
    } catch {}
  }, [levels, uid]);

  // Firestore
  useEffect(() => {
    if (!uid) return;
    let off = null;
    let initialLoaded = false;
    (async () => {
      try {
        const remote = await getChecklist(uid);
        if (remote && Array.isArray(remote)) {
          setLevels(normalizeLevels(remote, CANON));
        } else {
          await setChecklist(uid, CANON);
          setLevels(CANON);
        }
        initialLoaded = true;
        setCloudReady(true);
      } catch {
        setCloudReady(false);
      }
      off = listenChecklist(uid, (remote) => {
        if (!initialLoaded || !remote) return;
        setLevels((prev) => {
          const norm = normalizeLevels(remote, CANON);
          return JSON.stringify(prev) === JSON.stringify(norm) ? prev : norm;
        });
      });
    })();
    return () => { if (typeof off === "function") off(); };
  }, [uid]);

  const saveCloud = useDebouncedCallback((lvls) => {
    if (uid) setChecklist(uid, lvls).catch(() => {});
  }, 600);

  const toggleTask = (lvlId, idx) => {
    setLevels((prev) => {
      const next = prev.map((l) =>
        l.id !== lvlId ? l : { ...l, tasks: l.tasks.map((t, i) => (i === idx ? { ...t, done: !t.done } : t)) }
      );
      if (uid) saveCloud(next);
      return next;
    });
  };

  const currentLevel = levels.find((l) => l.id === activeTab) ?? levels[0];
  const levelPct =
    Math.round((currentLevel.tasks.filter((t) => t.done).length / currentLevel.tasks.length) * 100) || 0;
  const overallPct = (() => {
    const all = levels.flatMap((l) => l.tasks);
    return all.length ? Math.round((all.filter((t) => t.done).length / all.length) * 100) : 0;
  })();

  /* ===== Logika celu i postępu ===== */
  const householdFactor = 1;
  const totalTarget = Math.max(1, Math.round(baseTarget * householdFactor));

  // dodatkowy kapitał spoza portfelami – demo ma domyślną wartość
  const [extraCapitalInput, setExtraCapitalInput] = useState(() => (isDemo ? DEMO_EXTRA_CAPITAL : ""));
  const extraCapital = useMemo(() => parseIntSafe(extraCapitalInput, 0), [extraCapitalInput]);

  const totalValueRaw = partnerMode ? Number(portfolioValue) + Number(partnerValue) : Number(portfolioValue);
  const totalValue = Math.max(0, totalValueRaw + Math.max(0, extraCapital));

  const progress = clamp((totalValue / totalTarget) * 100, 0, 100);
  const missing = Math.max(0, totalTarget - totalValue);

  const donutSlices = useMemo(() => {
    if (!partnerMode) return [
      { label: "Ty", value: Math.max(0, Number(portfolioValue)), color: "#eab308" },
      { label: "Poza portfelami", value: Math.max(0, extraCapital), color: "#a1a1aa" },
    ];
    return [
      { label: "Ty", value: Math.max(0, Number(portfolioValue)), color: "#eab308" },
      { label: "Partner", value: Math.max(0, Number(partnerValue)), color: "#f59e0b" },
      { label: "Poza portfelami", value: Math.max(0, extraCapital), color: "#a1a1aa" },
    ];
  }, [partnerMode, portfolioValue, partnerValue, extraCapital]);

  const stagesTop = [
    { label: "Mini-FIRE", pct: 10 },
    { label: "Ćwierć drogi", pct: 25 },
    { label: "Półmetek", pct: 50 },
    { label: "Lean FIRE", pct: 60 },
    { label: "3/4 drogi", pct: 75 },
    { label: "Pełne FIRE", pct: 100 },
  ];
  const nextStage = stagesTop.find((s) => totalValue < (s.pct / 100) * totalTarget);

  /* === PUBLIKACJA METRYK DO localStorage -> użyje tego Forum === */
  useEffect(() => {
    try {
      localStorage.setItem("profile:progressPct", String(Math.round(progress || 0)));
      localStorage.setItem("profile:checklistPct", String(Math.round(overallPct || 0)));
    } catch (err) {
      console.warn("Nie udało się zapisać metryk FIRE do localStorage:", err);
    }
  }, [progress, overallPct]);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16">
      {/* DEMO BAR */}
      {!user && (
        <div className="card mt-6">
          <div className="card-inner flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0">
              <div className="text-sm text-zinc-200 font-semibold">Tryb demo</div>
              <div className="text-xs text-zinc-400">
                Po zalogowaniu automatycznie zobaczysz dane z Twojego konta i portfeli.
              </div>
            </div>
            <button
              className="btn-primary sm:ml-auto"
              onClick={() => {
                try { signIn?.(); } catch {}
              }}
            >
              Zaloguj się
            </button>
          </div>
        </div>
      )}

      <h1 className="h1 text-center my-8">
        Twoja ścieżka <span className="text-yellow-400">FIRE</span>
      </h1>

      <p className="text-sm text-zinc-400 text-center mb-6">
        Twój cel bazowy to <b>{fmtPLN(baseTarget)}</b> (wydatki <u>roczne</u> × 25).
        Jeśli korzystałeś z kalkulatora FIRE — używamy wartości stamtąd. Wspólny cel liczymy w panelu po prawej.
      </p>

      {/* GÓRA: Checklista | Postęp + Donut + Portfel */}
      {/* MOBILE FIX: auto-rows-fr tylko na XL */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch xl:auto-rows-fr">
        {/* Checklista */}
        <div className="card xl:h-full">
          <div className="card-inner flex flex-col xl:h-full">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="h2">Checklist celów</h2>
              <span className="ml-auto text-sm text-zinc-400">Łącznie: <b>{overallPct}%</b></span>
            </div>

            {uid && (
              <div className="text-xs text-zinc-500 mb-2">
                {cloudReady ? "✅ Zsynchronizowano z chmurą" : "Synchronizacja…"}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {levels.map((l) => (
                <button
                  key={l.id}
                  className={`px-3 py-1 rounded-md border text-sm ${
                    activeTab === l.id ? "border-yellow-500 text-yellow-300" : "border-zinc-700 text-zinc-300"
                  } hover:bg-zinc-800`}
                  onClick={() => setActiveTab(l.id)}
                  aria-pressed={activeTab === l.id}
                >
                  {l.name}
                </button>
              ))}
            </div>

            <div className="text-sm text-zinc-400 mb-1">Poziom: <b>{levelPct}%</b></div>
            <Progress value={levelPct} />

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentLevel.tasks.map((t, idx) => (
                <TaskButton
                  key={idx}
                  done={t.done}
                  label={String(t.text)}
                  onToggle={() => toggleTask(currentLevel.id, idx)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Prawy panel: Donut + KPI */}
        <div className="card xl:h-full">
          <div className="card-inner flex flex-col gap-4 xl:h-full">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-zinc-100">Portfel i postęp</h3>
              <label className="sr-only" htmlFor="scopeSelect">Zakres portfeli</label>
              <select
                id="scopeSelect"
                className="input !py-1 !h-8 !w-auto max-w-[220px]"
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                title="Zakres, który wliczamy do wartości"
              >
                {portfolioChoices.map((opt) => (
                  <option key={opt.id || "main"} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* MOBILE FIX: grow tylko na XL (na telefonie nie wypycha pustej przestrzeni) */}
            <div className="flex flex-col items-center gap-4 xl:grow">
              <div className="relative">
                <Donut total={totalTarget} slices={donutSlices} size={236} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center leading-tight">
                    <div className="text-xs text-zinc-400">Postęp</div>
                    <div className="text-3xl font-semibold tabular text-zinc-100">{Math.round(progress)}%</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <Kpi label="Razem" value={loadingPortfolio ? "…" : fmtPLN(totalValue)} />
                <Kpi label="Cel" value={fmtPLN(totalTarget)} />
              </div>

              <div className="w-full">
                <label className="text-xs text-zinc-400">Dodatkowy kapitał (poza portfelami)</label>
                <input
                  className="input mt-1"
                  value={extraCapitalInput}
                  onChange={(e) => setExtraCapitalInput(e.target.value)}
                  inputMode="numeric"
                  placeholder="np. 50 000"
                  title="Złoto, gotówka, obligacje itp. — doliczymy do bieżącej wartości"
                />
              </div>
            </div>

            {nextStage && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-300">
                    Do etapu <b>{nextStage.label}</b> brakuje{" "}
                    <b className="tabular">
                      {fmtPLN((nextStage.pct / 100) * totalTarget - totalValue)}
                    </b>
                  </span>
                  <span className="text-[11px] text-zinc-500 tabular">{Math.round(progress)}%</span>
                </div>
                <div className="mt-2 h-2 w-full bg-zinc-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{
                      width: `${clamp(
                        (totalValue / Math.max(1, (nextStage.pct / 100) * totalTarget)) * 100,
                        0,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="text-sm text-zinc-300">
              Brakuje: <b className="tabular">{fmtPLN(missing)}</b>
            </div>
          </div>
        </div>
      </section>

      {/* Etapy */}
      <section className="card mt-8">
        <div className="card-inner">
          <h2 className="h2 mb-3">Etapy FIRE</h2>
          <StagesTable target={totalTarget} current={totalValue} monthlyPlan={plan} nbpCpi={nbpCpi} />
          {plan?.useNBPPath && nbpError && (
            <p className="mt-2 text-xs text-yellow-300">Brak danych CPI NBP — indeksacja wpłat może być niedokładna.</p>
          )}
        </div>
      </section>

      {/* ====== ANALIZA + PARTNER — DWIE KOLUMNY ====== */}
      {/* MOBILE FIX: auto-rows-fr tylko na XL */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8 items-stretch xl:auto-rows-fr">
        {/* Lewa kolumna: wykres wariancji */}
        <div className="card xl:h-full">
          <div className="card-inner flex flex-col xl:h-full">
            <h2 className="h2 mb-3">Cel postępu i wariancja</h2>

            {/* MOBILE FIX: mniejszy min-h na telefonie + grow tylko na XL */}
            <div className="min-h-[260px] sm:min-h-[340px] xl:grow">
              <ProgressGoalChart
                currentValue={totalValue}
                rateDeltaPct={2}
                monthlyDeltaPct={10}
                height={300}
              />
            </div>
          </div>
        </div>

        {/* Prawa kolumna: FIRE z partnerem */}
        <div className="card xl:h-full">
          <div className="card-inner flex flex-col xl:h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h2">FIRE z partnerem</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-yellow-400"
                  checked={partnerMode}
                  onChange={(e) => setPartnerMode(e.target.checked)}
                />
                <span className="text-zinc-300">Włącz</span>
              </label>
            </div>

            <div className="xl:grow">
              <PartnerFirePanel baseTargetSingle={baseTarget} currentCombinedValue={totalValue} nbpCpi={nbpCpi} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ===== Utils & mini-komponenty ===== */
function normalizeLevels(incoming, template) {
  const byId = Object.fromEntries(template.map((l) => [l.id, l]));
  return template.map((base) => {
    const src = incoming.find((x) => x?.id === base.id);
    const incTasks = Array.isArray(src?.tasks) ? src.tasks : [];
    const tasks = base.tasks.map((t, i) => {
      const s = incTasks[i];
      return { text: t.text, done: !!(s && typeof s === "object" && s.done) };
    });
    return { id: base.id, name: base.name, tasks };
  });
}

function Progress({ value }) {
  return (
    <div className="h-2 w-full bg-zinc-800 rounded overflow-hidden">
      <div className="h-full bg-yellow-500" style={{ width: `${clamp(value, 0, 100)}%` }} />
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="kpi min-w-0 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="kpi-label text-xs text-zinc-400 text-center truncate">{label}</div>
      <div className="kpi-value tabular text-center font-semibold text-zinc-100 text-xl leading-tight mt-1 whitespace-nowrap">
        {value}
      </div>
    </div>
  );
}

function Donut({ total, slices, size = 200 }) {
  const strokeWidth = 18;
  const r = Math.max(1, (size - strokeWidth) / 2);
  const C = 2 * Math.PI * r;
  let used = 0;

  return (
    <div className="flex flex-col items-center min-w-0">
      <svg width={size} height={size} viewBox={"0 0 " + size + " " + size} role="img" aria-label="Udział wartości">
        <g transform={"rotate(-90 " + (size / 2) + " " + (size / 2) + ")"}> 
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
          {slices.map((s, i) => {
            const frac = clamp(total > 0 ? s.value / total : 0, 0, 1);
            const dash = frac * C;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color || "#eab308"}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-used}
                strokeLinecap="round"
              />
            );
            used += dash;
            return el;
          })}
        </g>
      </svg>
      <div className="mt-2 text-[11px] text-zinc-400 flex gap-3 flex-wrap justify-center">
        {slices.map((s, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color || "#eab308" }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ===== Etapy – zgodne z kalkulatorem ===== */
function StagesTable({ target, current, monthlyPlan, nbpCpi }) {
  const fmt = (v) =>
    new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      maximumFractionDigits: 0,
    }).format(Math.round(v || 0));

  const clampLocal = (n, a, b) => Math.min(Math.max(n, a), b);

  const toYM = (months) => {
    if (!Number.isFinite(months) || months <= 0) return "—";
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return `${m} mies.`;
    if (m === 0) return `${y} ${y === 1 ? "rok" : y < 5 ? "lata" : "lat"}`;
    return `${y} ${y === 1 ? "rok" : y < 5 ? "lata" : "lat"} i ${m} mies.`;
  };

  function monthsToReach(amount) {
    const p = monthlyPlan || {};
    let capital = Math.max(0, Number(current) || 0);
    let monthlyPay = Math.max(0, Number(p?.monthly) || 0);
    const mRate = (Number(p?.rate) || 0) / 100 / 12;
    const useNBP = !!p?.useNBPPath;
    const customWage = (Number(p?.customWageGrowth) || 0) / 100;

    if (!monthlyPay && capital < amount) return NaN;

    const start = new Date();
    const baseYear = start.getFullYear();
    const baseMonth = start.getMonth();

    for (let month = 0; month <= 1200; month++) {
      if (capital >= amount) return month;

      capital += monthlyPay;
      capital *= 1 + mRate;

      const currentYear = baseYear + Math.floor((baseMonth + month) / 12);
      const annualInfl =
        useNBP && Array.isArray(nbpCpi) && nbpCpi.length
          ? (Number(nbpCpi.find((r) => r?.year === currentYear)?.cpi) || 0) / 100
          : customWage;

      if (annualInfl) monthlyPay *= 1 + annualInfl / 12;
    }
    return NaN;
  }

  function monthsLinear(gap) {
    const m = Number(monthlyPlan?.monthly) || 0;
    return m > 0 ? Math.ceil(gap / m) : NaN;
  }

  const stages = [
    { label: "Pierwsze kroki", pct: 0.5 },
    { label: "Darmowy batonik", pct: 1.25 },
    { label: "Pół roku luzu", pct: 2.5 },
    { label: "Darmowa pizza", pct: 3 },
    { label: "Mini-FIRE", pct: 10 },
    { label: "Ćwierć drogi", pct: 25 },
    { label: "Półmetek", pct: 50 },
    { label: "Lean FIRE", pct: 60 },
    { label: "3/4 drogi", pct: 75 },
    { label: "Pełne FIRE", pct: 100 },
  ];

  const rows = stages.map((s) => {
    const amount = (s.pct / 100) * (target || 0);
    const done = current || 0;
    const gap = Math.max(0, amount - done);

    let monthsProj = NaN;
    try {
      monthsProj = monthsToReach(amount);
    } catch {}
    if (!Number.isFinite(monthsProj)) monthsProj = monthsLinear(gap);

    const pctDone = clampLocal((done / Math.max(1, amount)) * 100, 0, 100);
    const eta = gap === 0 ? "—" : toYM(Math.max(0, Math.ceil(monthsProj)));

    return { ...s, amount, done, gap, pctDone, eta };
  });

  return (
    <div>
      {/* ===== MOBILE (kafelki) ===== */}
      <div className="sm:hidden space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold text-zinc-100 truncate">
                  {r.label}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-400">
                  {r.pct}% celu • <span className="tabular">{fmt(r.amount)}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                {r.gap === 0 ? (
                  <div className="text-[11px] text-emerald-300 whitespace-nowrap">
                    Osiągnięto ✓
                  </div>
                ) : (
                  <>
                    <div className="text-[11px] text-zinc-400">Brakuje</div>
                    <div className="text-sm font-semibold text-zinc-100 tabular whitespace-nowrap">
                      {fmt(r.gap)}
                    </div>
                    {/* ✅ TYLKO RAZ pokazujemy ETA */}
                    <div className="mt-1 text-[11px] text-zinc-500 whitespace-nowrap">
                      Za {r.eta}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-3 h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500"
                style={{ width: `${r.pctDone}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Postęp: <span className="tabular">{Math.round(r.pctDone)}%</span></span>
              <span className="tabular">{r.gap === 0 ? "—" : fmt(r.amount)}</span>
            </div>
          </div>
        ))}

        <p className="mt-2 text-[11px] text-zinc-500">
          „Za ile miesięcy” liczone projekcją m/m jak w kalkulatorze (CPI NBP lub własny %).
        </p>
      </div>

      {/* ===== DESKTOP (tabela jak było) ===== */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-400">
              <th className="pb-2 font-normal">Etap</th>
              <th className="pb-2 font-normal">% celu</th>
              <th className="pb-2 font-normal">Kwota</th>
              <th className="pb-2 font-normal">Ile brakuje</th>
              <th className="pb-2 font-normal">Za ile mies.</th>
              <th className="pb-2 font-normal w-[260px]">Postęp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-zinc-800 align-middle">
                <td className="py-2">{r.label}</td>
                <td className="tabular">{r.pct}%</td>
                <td className="tabular">{fmt(r.amount)}</td>
                <td className="tabular">{r.gap === 0 ? "Osiągnięto" : fmt(r.gap)}</td>
                <td className="tabular">{r.gap === 0 ? "—" : r.eta}</td>
                <td className="py-2">
                  <div className="group relative">
                    <div className="h-2 w-full bg-zinc-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all duration-300 group-hover:brightness-110"
                        style={{ width: `${r.pctDone}%` }}
                      />
                    </div>
                    {r.gap > 0 && (
                      <div className="pointer-events-none absolute -top-7 right-0 hidden group-hover:block">
                        <div className="px-2 py-[2px] text-[11px] rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 shadow">
                          Brakuje {fmt(r.gap)}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-3 text-xs text-zinc-400">
          „Za ile miesięcy” liczone projekcją m/m jak w kalkulatorze (CPI NBP lub własny %).
        </p>
      </div>
    </div>
  );
}

/* ===== Pigułka z zadaniem ===== */
function TaskButton({ done, label, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "group relative w-full text-left rounded-2xl border transition-colors",
        "min-h-[72px] px-5 py-4",
        done
          ? "border-emerald-600/40 bg-emerald-900/15 hover:bg-emerald-900/25"
          : "border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60",
      ].join(" ")}
      aria-pressed={done}
    >
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        <span
          className={[
            "inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold",
            done ? "border-emerald-500 bg-emerald-600/80 text-black" : "border-zinc-600 text-zinc-400",
          ].join(" ")}
        >
          {done ? "✓" : "0"}
        </span>
      </div>
      <div className="ml-11">
        <div className="text-[15px] text-zinc-200 leading-snug clamp-2">{label}</div>
      </div>
    </button>
  );
}

/* ===== CSS helpers ===== */
if (typeof document !== "undefined" && !document.getElementById("fire-clamp-css")) {
  const style = document.createElement("style");
  style.id = "fire-clamp-css";
  style.innerHTML = `
    .clamp-2{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .tabular{ font-variant-numeric: tabular-nums; }
  `;
  document.head.appendChild(style);
}
