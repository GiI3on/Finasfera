"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import FireChart from "./components/FireChart";

/* ====== helpers ====== */
const parseNumber = (str, fb = 0) => {
  const s = String(str ?? "")
    .replace(/\s+/g, "")
    .replace(",", ".")
    .replace(/[^\d.+-]/g, "");
  if (!s) return fb;
  const n = Number(s);
  return Number.isFinite(n) ? n : fb;
};

const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(v) ? Math.round(v) : 0);

const pct = (x) => Number(x) / 100;

const MONTHS = [
  "styczeń",
  "luty",
  "marzec",
  "kwiecień",
  "maj",
  "czerwiec",
  "lipiec",
  "sierpień",
  "wrzesień",
  "październik",
  "listopad",
  "grudzień",
];

// 🔐 zgodność z /fire-path
const FIRE_CALC_KEYS = [
  "fireCalculator:lastPlan",
  "fire:lastPlan",
  "fire:calc",
  "calculator:fire",
];

// mały debounce
function useDebounced(fn, delay = 400) {
  const t = useRef();
  return (...args) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), delay);
  };
}

// szybkie budowanie query do linka „zapisz plan” (zostawione na przyszłość)
const buildQuery = (state) =>
  new URLSearchParams({
    initial: String(state.initial),
    monthly: String(state.monthly),
    rate: String(state.rate),
    years: String(state.years),
    expenses: String(state.annualExpenses),
    mult: String(state.targetMultiplier),
    nbp: state.useNBPPath ? "1" : "0",
    wage: String(state.customWageGrowth),
  }).toString();

/* ====== mikro komponenty ====== */
function InfoTip({ text }) {
  return (
    <span
      className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-zinc-700/60 text-[10px] text-zinc-200 cursor-help"
      title={text}
    >
      i
    </span>
  );
}
function NumberField({ label, value, onChange, placeholder, min, max }) {
  return (
    <div>
      <label className="muted text-sm">{label}</label>
      <input
        className="input mt-1"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const n = parseNumber(e.target.value);
          if (Number.isFinite(n)) {
            const clamped =
              typeof min === "number" || typeof max === "number"
                ? Math.min(
                    typeof max === "number" ? max : n,
                    Math.max(typeof min === "number" ? min : n, n)
                  )
                : n;
            e.target.value = String(clamped);
            onChange(String(clamped));
          }
        }}
      />
    </div>
  );
}
function Kpi({ label, value }) {
  return (
    <div className="kpi shadow-[0_0_30px_rgba(250,204,21,0.06)]">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

/* ====== strona ====== */
export default function Page() {
  // Podstawowe
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(10); // %/rok
  const [years, setYears] = useState(30);

  // Zaawansowane
  const [useNBPPath, setUseNBPPath] = useState(true);
  const [customWageGrowth, setCustomWageGrowth] = useState(0); // %/rok
  const [annualExpenses, setAnnualExpenses] = useState(60000);
  const [targetMultiplier, setTargetMultiplier] = useState(25);
  const [showGoal, setShowGoal] = useState(false);

  // Wynik
  const [result, setResult] = useState(null);

  // CPI NBP
  const [nbpCpi, setNbpCpi] = useState([]);
  const [nbpError, setNbpError] = useState(false);

  const fireTarget = useMemo(
    () => parseNumber(annualExpenses, 0) * parseNumber(targetMultiplier, 25),
    [annualExpenses, targetMultiplier]
  );

  // ======== PERSISTENCE: load -> save =========
  function makePlan() {
    const plan = {
      // dane wejściowe
      initial: parseNumber(initial, 0),
      monthly: parseNumber(monthly, 0),
      rate: parseNumber(rate, 0),
      years: parseNumber(years, 0),

      // kluczowe dla /fire-path
      annualExpenses: parseNumber(annualExpenses, 0),
      expenses: parseNumber(annualExpenses, 0), // alias
      monthlyExpenses: parseNumber(annualExpenses, 0) / 12, // alias kompatybilny
      targetMultiplier: parseNumber(targetMultiplier, 25),
      mult: parseNumber(targetMultiplier, 25), // alias

      // pozostałe
      useNBPPath: !!useNBPPath,
      customWageGrowth: parseNumber(customWageGrowth, 0),
      showGoal: !!showGoal,

      // meta
      updatedAt: Date.now(),
    };
    return plan;
  }

  function savePlanExplicit(plan) {
    if (typeof window === "undefined") return;
    try {
      const json = JSON.stringify(plan);
      // zapis pod wszystkimi znanymi kluczami (pełna zgodność)
      for (const key of FIRE_CALC_KEYS) {
        localStorage.setItem(key, json);
      }
      // wyemituj event dla tej samej karty (ułatwia odczyt po przejściu)
      window.dispatchEvent(new StorageEvent("storage", { key: FIRE_CALC_KEYS[0], newValue: json }));
    } catch {}
  }

  const savePlan = useDebounced(() => savePlanExplicit(makePlan()), 400);

  // Bootstrap: wczytaj plan, jeśli istnieje
  useEffect(() => {
    if (typeof window === "undefined") return;
    for (const key of FIRE_CALC_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const p = JSON.parse(raw);
        // ustaw tylko pola, które mamy
        if (p?.initial != null) setInitial(String(p.initial));
        if (p?.monthly != null) setMonthly(String(p.monthly));
        if (p?.rate != null) setRate(String(p.rate));
        if (p?.years != null) setYears(String(p.years));
        const ann =
          parseNumber(p?.annualExpenses ?? p?.expenses ?? (p?.monthlyExpenses ? p.monthlyExpenses * 12 : 0), 0);
        if (ann) setAnnualExpenses(String(ann));
        const mult = parseNumber(p?.targetMultiplier ?? p?.mult, 25);
        if (mult) setTargetMultiplier(String(mult));
        if (typeof p?.useNBPPath === "boolean") setUseNBPPath(!!p.useNBPPath);
        if (p?.customWageGrowth != null) setCustomWageGrowth(String(p.customWageGrowth));
        if (typeof p?.showGoal === "boolean") setShowGoal(!!p.showGoal);
        break; // pierwszy trafiony klucz
      } catch {}
    }
  }, []);

  // Auto-zapis gdy zmienia się cel
  useEffect(() => {
    savePlan();
  }, [annualExpenses, targetMultiplier, useNBPPath, customWageGrowth]);

  // Ładowanie CPI NBP z fallbackiem
  useEffect(() => {
    let stop = false;
    async function load() {
      setNbpError(false);
      try {
        const res = await fetch(
          `/api/nbp-forecast?years=${Math.max(1, parseNumber(years, 0) + 2)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        const arr = Array.isArray(json?.forecast) ? json.forecast : [];
        if (!stop && arr.length) setNbpCpi(arr);
      } catch {
        if (!stop) setNbpError(true);
      }
    }
    if (useNBPPath) load();
    return () => {
      stop = true;
    };
  }, [useNBPPath, years]);

  function handleCalculate() {
    const Y = Math.max(0, parseNumber(years, 0));
    const start = new Date();
    const baseYear = start.getFullYear();
    const baseMonth = start.getMonth(); // 0..11

    const mRate = pct(parseNumber(rate, 0)) / 12;

    let capital = parseNumber(initial, 0);
    let monthlyPay = parseNumber(monthly, 0);
    let contribAcc = 0;

    const labels = [];
    const capPoints = [];
    const contribPoints = [];
    let reachedAt = null;

    for (let month = 0; month <= Y * 12; month++) {
      if (month % 12 === 0) {
        const yr = baseYear + Math.floor((baseMonth + month) / 12);
        labels.push(String(yr));
        capPoints.push(capital);
        contribPoints.push(contribAcc);
      }

      capital += monthlyPay;
      contribAcc += monthlyPay;
      capital *= 1 + mRate;

      const currentYear = baseYear + Math.floor((baseMonth + month) / 12);
      const annualInfl =
        useNBPPath && nbpCpi?.length
          ? pct(nbpCpi.find((r) => r?.year === currentYear)?.cpi ?? 0)
          : pct(parseNumber(customWageGrowth, 0));
      if (annualInfl) monthlyPay *= 1 + annualInfl / 12;

      if (showGoal && !reachedAt && capital >= fireTarget) {
        reachedAt = new Date(baseYear, baseMonth + month, 1);
      }
    }

    const contribSimple = parseNumber(monthly, 0) * 12 * Y; // bez indeksacji (kafelek)
    setResult({
      total: capital,
      contrib: contribSimple,
      labels,
      capitalPoints: capPoints,
      contribPoints,
      reachedAt,
    });

    // zapis po przeliczeniu
    savePlanExplicit(makePlan());
  }

  // klik w „Zapisz swój plan”
  function handleSaveClick() {
    savePlanExplicit(makePlan());
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      {/* Tytuł */}
      <section className="text-center mt-10 mb-6">
        <h1 className="h1">
          Kalkulator <span className="text-yellow-400 typewriter">FIRE</span>
        </h1>
        <p className="mt-2 muted">Zrób szybkie obliczenie i zobacz, jak blisko jesteś.</p>
      </section>

      {/* Komunikat o błędzie CPI (nie blokuje obliczeń) */}
      {useNBPPath && nbpError && (
        <div className="mb-4 rounded-lg border border-yellow-600/50 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-200">
          Brak danych inflacji — użyjemy <b>0% indeksacji wpłat</b>, żeby Cię nie peszyć 😉
        </div>
      )}

      {/* Dwie kolumny */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch auto-rows-fr">
        {/* ZAŁOŻENIA */}
        <div className="card flex flex-col h-full">
          <div className="card-inner flex flex-col flex-1">
            <h2 className="h2 mb-4">Założenia</h2>

            {/* Pola + szybkie presety */}
            <div className="space-y-3">
              <NumberField
                label="Oszczędności początkowe (zł)"
                value={String(initial)}
                onChange={setInitial}
                min={0}
              />

              <div>
                <NumberField
                  label="Wpłaty miesięczne (zł)"
                  value={String(monthly)}
                  onChange={setMonthly}
                  min={0}
                />
                <div className="mt-2 flex gap-2 text-xs">
                  {[500, 1000, 1500].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="rounded-md border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
                      onClick={() => setMonthly(String(v))}
                    >
                      {v.toLocaleString("pl-PL")} zł
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <NumberField
                  label="Oczekiwana roczna stopa zwrotu (%)"
                  value={String(rate)}
                  onChange={setRate}
                  placeholder="np. 7.5"
                  min={-50}
                  max={50}
                />
                <div className="mt-2 flex gap-2 text-xs">
                  {[4, 7, 10].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="rounded-md border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
                      onClick={() => setRate(String(v))}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>

              <NumberField
                label="Liczba lat inwestowania"
                value={String(years)}
                onChange={setYears}
                min={0}
                max={60}
              />
            </div>

            <button className="btn-primary w-full mt-5" onClick={handleCalculate}>
              Sprawdź swoją drogę
            </button>

            {/* Opcje zaawansowane — zawsze widoczne */}
            <div className="mt-4 space-y-4">
              <div className="muted text-sm">Ułóż</div>

              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-yellow-400" checked readOnly />
                <span className="muted">
                  Indeksuj miesięczne wpłaty
                  <InfoTip text="Każdego miesiąca wpłata rośnie o 1/12 rocznej stopy (CPI NBP lub własny %)." />
                </span>
              </label>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="muted text-sm">
                  <input
                    type="radio"
                    name="infl"
                    className="mr-2 accent-yellow-400"
                    checked={useNBPPath}
                    onChange={() => setUseNBPPath(true)}
                  />
                  Ścieżka NBP (API)
                  <InfoTip text="Prognoza inflacji (CPI) NBP dla kolejnych lat." />
                </label>
                <label className="muted text-sm">
                  <input
                    type="radio"
                    name="infl"
                    className="mr-2 accent-yellow-400"
                    checked={!useNBPPath}
                    onChange={() => setUseNBPPath(false)}
                  />
                  Własny wzrost (%/rok)
                  <InfoTip text="Stały roczny % indeksacji wpłat, np. 3%." />
                </label>
                {!useNBPPath && (
                  <input
                    className="input !w-28"
                    inputMode="decimal"
                    value={String(customWageGrowth)}
                    onChange={(e) => setCustomWageGrowth(e.target.value)}
                    placeholder="np. 3"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField
                  label={
                    <>
                      Wydatki roczne (cel)
                      <InfoTip text="Twoje roczne wydatki dziś. Cel = wydatki × mnożnik." />
                    </>
                  }
                  value={String(annualExpenses)}
                  onChange={setAnnualExpenses}
                  min={0}
                />
                <NumberField
                  label={
                    <>
                      Mnożnik celu (np. 25×)
                      <InfoTip text="Rule of thumb: 25× wydatków = ~4% wypłaty/rok." />
                    </>
                  }
                  value={String(targetMultiplier)}
                  onChange={setTargetMultiplier}
                  min={1}
                />
              </div>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-yellow-400"
                  checked={showGoal}
                  onChange={(e) => setShowGoal(e.target.checked)}
                />
                <span className="muted">
                  Pokaż cel FIRE (kafle)
                  <InfoTip text="Pokazuje, czy i kiedy przekraczasz cel." />
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* PROGNOZA */}
        <div className="card flex flex-col h-full">
          <div className="card-inner flex flex-col flex-1">
            <h2 className="h2">Prognoza</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Kpi
                label={`Wartość po ${years} latach (nominalnie)`}
                value={result ? fmtPLN(result.total) : "—"}
              />
              <Kpi
                label="Suma wpłat (bez indeksacji)"
                value={result ? fmtPLN(result.contrib) : "—"}
              />
              <Kpi label="Cel FIRE (dziś)" value={fmtPLN(fireTarget)} />
            </div>

            {showGoal && result && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <Kpi label="Czy osiągnięty?" value={result.total >= fireTarget ? "Tak" : "Nie"} />
                <Kpi
                  label="Kiedy?"
                  value={
                    result.reachedAt
                      ? `${MONTHS[result.reachedAt.getMonth()]} ${result.reachedAt.getFullYear()}`
                      : "—"
                  }
                />
              </div>
            )}

            {/* WYKRES */}
            <div className="mt-4 flex-1">
              <div className="relative min-h-[420px] flex items-center justify-center overflow-hidden rounded-lg">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-yellow-400/8 to-transparent" />
                <div className="relative z-10 w-full">
                  {result ? (
                    <FireChart
                      labels={result.labels}
                      capital={result.capitalPoints}
                      contributions={result.contribPoints}
                      goal={0}
                      height={420}
                    />
                  ) : (
                    <div className="text-zinc-500 text-sm text-center">
                      Podaj dane i kliknij <b>„Sprawdź swoją drogę”</b>, aby zobaczyć wykres.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CTA: Zapisz plan – po obliczeniu, prowadzi do /fire-path */}
            {result && (
              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-zinc-400">Chcesz wrócić do tych ustawień później?</div>
                <Link href="/fire-path" onClick={handleSaveClick} className="btn-primary rounded-full px-4 py-2">
                  Zapisz swój plan
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Forum */}
      <section className="card mt-8">
        <div className="card-inner">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-yellow-400">Forum</h3>
              <p className="text-zinc-300">
                Dołącz do społeczności inwestorów FIRE — zadawaj pytania i dziel się doświadczeniem.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/forum" className="btn-primary">
                Wejdź na forum
              </Link>
              <Link
                href="/forum"
                className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Najnowsze wątki →
              </Link>
            </div>
          </div>

          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {["Jak inwestować w ETF?", "Jak zjeść budżet domowy?", "Dziennik mojej drogi do FIRE"].map(
              (t, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/60"
                >
                  <Link href="/forum" className="block truncate">
                    {t}
                  </Link>
                  <div className="mt-1 text-xs text-zinc-400">społeczność FIRE</div>
                </li>
              )
            )}
          </ul>
        </div>
      </section>

      {/* Edukacja (bez FAQ; + 2 nowe karty) */}
      <section className="card mt-10">
        <div className="card-inner">
          <h3 className="h2 mb-4">Dowiedz się więcej o FIRE i metodologii</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NOWA karta — Niezależność finansowa */}
            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h4 className="text-lg font-semibold text-zinc-100">Niezależność finansowa (FIRE) w praktyce</h4>
              <p className="muted mt-1">
                FIRE to prosty cel: zbudować kapitał, który utrzyma Twoje wydatki. Nie chodzi o „szybkie triki”,
                tylko o sensowny plan, regularne wpłaty i długi horyzont.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/fire-path" className="btn-primary px-3 py-2">Policz swoją ścieżkę</Link>
                <Link href="/forum" className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Zapytaj społeczność →
                </Link>
              </div>
            </article>

            {/* NOWA karta — Jak zacząć małymi kwotami */}
            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h4 className="text-lg font-semibold text-zinc-100">Jak zacząć inwestować małe kwoty</h4>
              <p className="muted mt-1">
                Wystarczy stała wpłata (np. 200–500 zł miesięcznie) i trzymanie się planu. Procent składany robi robotę,
                a prosty portfel indeksowy to dobre pierwsze podejście.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/kalkulator-inwestycyjny" className="btn-primary px-3 py-2">Kalkulator inwestycyjny</Link>
                <Link href="/portfel-inwestycyjny" className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Portfel online
                </Link>
              </div>
            </article>

            {/* Istniejące karty — zostają */}
            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h4 className="text-lg font-semibold text-zinc-100">Na czym polega FIRE?</h4>
              <p className="muted mt-1">
                Cel jest prosty: zbudować kapitał, który pozwoli Ci żyć z wypłat z portfela (np. ~4% rocznie)
                bez konieczności pracy zarobkowej. Klucz to <b>regularne wpłaty</b> i <b>długi horyzont</b>.
              </p>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h4 className="text-lg font-semibold text-zinc-100">Skąd 25× wydatków?</h4>
              <p className="muted mt-1">
                To prosta reguła: 25× rocznych wydatków ≈ kapitał, z którego możesz wypłacać ~4% rocznie.
                Nie jest to gwarancja, ale sensowny punkt orientacyjny, by złapać skalę celu.
              </p>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h4 className="text-lg font-semibold text-zinc-100">Jaką stopę zwrotu przyjąć?</h4>
              <p className="muted mt-1">
                Zacznij konserwatywnie (np. 4–7% rocznie). Wyższe wartości zwiększają optymizm w wyniku,
                ale Twoje wpłaty i czas są ważniejsze niż każda cyferka.
              </p>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h4 className="text-lg font-semibold text-zinc-100">Indeksacja wpłat</h4>
              <p className="muted mt-1">
                Możesz indeksować miesięczne wpłaty ścieżką NBP (CPI) lub własnym %, żeby odzwierciedlić wzrost
                zarobków. To prosty „turbo-dopłacacz” dla Twojego planu.
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
