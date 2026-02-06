"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import FireChart from "./components/FireChart";
import DemoChart from "./components/DemoChart";

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
    indexation: String(state.indexationExtra),
  }).toString();

/* ====== FIX: INFO TIP - MOBILE: CENTER, DESKTOP: POPUP NAD IKONKĄ ====== */
function InfoTip({ text }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    // WAŻNE: Wrapper 'relative' zakotwicza dymek przy ikonce na desktopie
    <span className="relative inline-flex items-center ml-2">
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-zinc-700/60 text-[10px] text-zinc-200 cursor-help align-middle relative z-10 hover:bg-zinc-600 transition-colors"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        aria-label="Informacja"
      >
        i
      </button>

      {isOpen && (
        <>
          {/* TŁO: Zamyka dymek (tylko mobile/fixed mode) */}
          <div 
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-0"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
            }}
          />

          {/* DYMEK */}
          <div 
            className="
              /* MOBILE: Fixed Center (Zawsze na środku ekranu) */
              fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] max-w-[300px] z-[100]
              
              /* DESKTOP (sm): Absolute NAD Ikonką (bottom-full) */
              sm:absolute sm:top-auto sm:bottom-full sm:left-1/2 sm:mb-2
              sm:w-64 sm:-translate-y-0 sm:-translate-x-1/2
              
              /* WSPÓLNE STYLE */
              p-4 bg-zinc-800 border border-zinc-600 rounded-xl shadow-2xl text-xs text-zinc-200 text-left leading-relaxed animate-in zoom-in-95 duration-200
            "
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
          >
             <div className="flex justify-between items-start gap-3">
                <span className="flex-1">{text}</span>
                <button
                  type="button"
                  onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsOpen(false);
                  }}
                  className="text-zinc-400 hover:text-white font-bold p-1 -m-1 leading-none text-sm bg-zinc-700/50 rounded-full w-5 h-5 flex items-center justify-center"
                  aria-label="Zamknij"
                >
                    ✕
                </button>
             </div>
             
             {/* Strzałeczka w dół (tylko na desktopie) */}
             <div className="hidden sm:block absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-r border-b border-zinc-600 rotate-45"></div>
          </div>
        </>
      )}
    </span>
  );
}

function NumberField({ label, value, onChange, placeholder, min, max }) {
  return (
    <div>
      <label className="muted text-sm flex items-center flex-wrap">
          {label}
      </label>
      <input
        className="input mt-1 w-full"
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

/**
 * Kafelek KPI
 */
function Kpi({ label, value, compact = false }) {
  return (
    <div
      className={
        "kpi shadow-[0_0_30px_rgba(250,204,21,0.06)] flex flex-col" +
        (compact ? " py-2 px-3" : " p-3")
      }
    >
      <div
        className={
          "kpi-label flex items-start text-zinc-400" +
          (compact ? " text-xs min-h-[1.4rem]" : " text-xs uppercase tracking-wider min-h-[1.5rem]")
        }
      >
        {label}
      </div>
      <div className={"kpi-value font-semibold text-zinc-100" + (compact ? " text-base mt-0.5" : " text-lg sm:text-xl mt-1")}>
        {value}
      </div>
    </div>
  );
}

/* ====== strona ====== */
export default function Page() {
  // Podstawowe
  const [initial, setInitial] = useState(20000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(10); // %/rok NOMINALNIE
  const [years, setYears] = useState(30);

  // Zaawansowane
  const [indexationExtra, setIndexationExtra] = useState(0); // realny wzrost wpłat ponad inflację (%/rok)
  const [annualExpenses, setAnnualExpenses] = useState(60000);
  const [targetMultiplier, setTargetMultiplier] = useState(25);

  // Wynik
  const [result, setResult] = useState(null);

  // CPI NBP
  const [nbpCpi, setNbpCpi] = useState([]);
  const [nbpError, setNbpError] = useState(false);

  // REF do sekcji wyników
  const resultsRef = useRef(null);

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

      // cel FIRE
      annualExpenses: parseNumber(annualExpenses, 0),
      expenses: parseNumber(annualExpenses, 0), // alias
      monthlyExpenses: parseNumber(annualExpenses, 0) / 12, // alias kompatybilny
      targetMultiplier: parseNumber(targetMultiplier, 25),
      mult: parseNumber(targetMultiplier, 25), // alias

      // indeksacja wpłat
      indexationExtra: parseNumber(indexationExtra, 0),

      // meta
      updatedAt: Date.now(),
    };
    return plan;
  }

  function savePlanExplicit(plan) {
    if (typeof window === "undefined") return;
    try {
      const json = JSON.stringify(plan);
      for (const key of FIRE_CALC_KEYS) {
        localStorage.setItem(key, json);
      }
      window.dispatchEvent(
        new StorageEvent("storage", { key: FIRE_CALC_KEYS[0], newValue: json })
      );
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

        if (p?.initial != null) setInitial(String(p.initial));
        if (p?.monthly != null) setMonthly(String(p.monthly));
        if (p?.rate != null) setRate(String(p.rate));
        if (p?.years != null) setYears(String(p.years));

        const ann =
          parseNumber(
            p?.annualExpenses ??
              p?.expenses ??
              (p?.monthlyExpenses ? p.monthlyExpenses * 12 : 0),
            0
          );
        if (ann) setAnnualExpenses(String(ann));

        const mult = parseNumber(p?.targetMultiplier ?? p?.mult, 25);
        if (mult) setTargetMultiplier(String(mult));

        const idxExtra = parseNumber(
          p?.indexationExtra ?? p?.wageGrowth ?? 0,
          0
        );
        setIndexationExtra(String(idxExtra));

        break;
      } catch {}
    }
  }, []);

  // Auto-zapis przy zmianie celów
  useEffect(() => {
    savePlan();
  }, [annualExpenses, targetMultiplier, indexationExtra]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ładowanie CPI NBP
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
    load();
    return () => {
      stop = true;
    };
  }, [years]);

  function handleCalculate() {
    const Y = Math.max(0, parseNumber(years, 0));
    const start = new Date();
    const baseYear = start.getFullYear();
    const baseMonth = start.getMonth();

    const nominalRateYear = pct(parseNumber(rate, 0)); // np. 0.10
    const indexExtraReal = pct(parseNumber(indexationExtra, 0)); // realnie ponad inflację

    const baseMonthlyPay = parseNumber(monthly, 0);
    const initialCapital = parseNumber(initial, 0);

    let capital = initialCapital;
    let monthlyPayReal = baseMonthlyPay; // w dzisiejszych zł w danym roku
    let contribAcc = 0;

    const labels = [];
    const capPoints = [];
    const contribPoints = [];
    let reachedAt = null;

    const totalMonths = Y * 12;

    for (let month = 0; month <= totalMonths; month++) {
      // zapis stanu na początku roku
      if (month % 12 === 0) {
        const yr = baseYear + Math.floor((baseMonth + month) / 12);
        labels.push(String(yr));
        capPoints.push(capital);
        contribPoints.push(contribAcc);
      }

      if (month === totalMonths) break;

      const currentYear =
        baseYear + Math.floor((baseMonth + month) / 12);

      // 🔒 Inflacja z NBP z bezpiecznym fallbackiem
      const annualInfl = (() => {
        // brak danych z API -> używamy celu inflacyjnego 2.5%
        if (!nbpCpi?.length) return 0.025;

        const found = nbpCpi.find((r) => r?.year === currentYear);
        if (found && typeof found.cpi === "number") {
          return pct(found.cpi);
        }

        // jeśli brak konkretnego roku -> ostatnia znana wartość lub 2.5%
        const last = nbpCpi[nbpCpi.length - 1];
        const lastCpi = typeof last?.cpi === "number" ? last.cpi : 2.5;
        return pct(lastCpi);
      })();

      // REALNA stopa zwrotu = nominalna - inflacja
      const realRateYear = nominalRateYear - annualInfl;
      const mRate = realRateYear / 12;

      // realna miesięczna wpłata w danym roku
      capital += monthlyPayReal;
      contribAcc += monthlyPayReal;

      // wzrost kapitału o realną stopę
      capital *= 1 + mRate;

      // koniec roku → indeksacja wpłat realnie ponad inflację
      const isEndOfYear = (month + 1) % 12 === 0;
      if (isEndOfYear && indexExtraReal !== 0) {
        monthlyPayReal *= 1 + indexExtraReal;
      }

      // osiągnięcie celu (zapisujemy pierwszy raz)
      if (!reachedAt && capital >= fireTarget) {
        reachedAt = new Date(baseYear, baseMonth + month + 1, 1);
      }
    }

    const contribSimple = baseMonthlyPay * 12 * Y;

    setResult({
      total: capital,
      contrib: contribSimple,
      labels,
      capitalPoints: capPoints,
      contribPoints,
      reachedAt,
    });

    savePlanExplicit(makePlan());

    // Automatyczny scroll do wyników
    setTimeout(() => {
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }

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
        <p className="mt-2 muted">
          Zrób szybkie obliczenie i zobacz, jak blisko jesteś.
        </p>
      </section>

      {/* Komunikat o błędzie CPI */}
      {nbpError && (
        <div className="mb-4 rounded-lg border border-yellow-600/50 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-200">
          Brak danych inflacji NBP — przyjmujemy <b>2.5% inflacji</b>, żeby nie
          zatrzymywać kalkulacji.
        </div>
      )}

      {/* Dwie kolumny */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch auto-rows-fr">
        {/* ZAŁOŻENIA */}
        <div className="card flex flex-col h-full">
          <div className="card-inner flex flex-col flex-1">
            <h2 className="h2 mb-4">Założenia</h2>

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
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {[500, 1000, 1500].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="rounded-md border border-zinc-700 px-2 py-1 hover:bg-zinc-800 whitespace-nowrap"
                      onClick={() => setMonthly(String(v))}
                    >
                      {v.toLocaleString("pl-PL")} zł
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <NumberField
                  label="Oczekiwana roczna stopa zwrotu (nominalnie, %)"
                  value={String(rate)}
                  onChange={setRate}
                  placeholder="np. 7"
                  min={-50}
                  max={50}
                />
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
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

            <button
              className="btn-primary w-full mt-5"
              onClick={handleCalculate}
            >
              Sprawdź swoją drogę
            </button>

            {/* Opcje zaawansowane */}
            <div className="mt-4 space-y-4">
              {/* Inflacja NBP */}
              <div className="muted text-sm flex items-center gap-2">
                Inflacja: ścieżka NBP (API)
                <InfoTip text="Korzystamy z prognozy inflacji (CPI) NBP, a po zakończeniu prognozy przyjmujemy ostatnią znaną wartość (lub cel 2.5%), żeby wszystkie wyniki były w dzisiejszych złotówkach." />
              </div>

              {/* Indeksacja miesięcznych wpłat */}
              <NumberField
                label={
                  <>
                    Indeksacja miesięcznych wpłat (%/rok ponad inflację)
                    <InfoTip text="0% = Twoje wpłaty rosną tylko o inflację (realnie stała kwota w dzisiejszych zł). 5% = co roku realnie zwiększasz swoje wpłaty o ok. 5% (np. dzięki podwyżkom)." />
                  </>
                }
                value={String(indexationExtra)}
                onChange={setIndexationExtra}
                min={0}
                placeholder="np. 0–5"
              />

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

              {/* Krótki opis logiki */}
              <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                Wszystkie wyniki po prawej stronie pokazujemy w{" "}
                <b>dzisiejszych złotówkach</b>. Od nominalnej stopy zwrotu
                odejmujemy inflację (NBP), a indeksacja miesięcznych wpłat
                oznacza dodatkowy realny wzrost Twoich oszczędności ponad
                inflację.
              </p>
            </div>
          </div>
        </div>

        {/* PROGNOZA - tutaj podpinam ref={resultsRef} */}
        <div className="card flex flex-col h-full" ref={resultsRef}>
          <div className="card-inner flex flex-col flex-1">
            <h2 className="h2">Prognoza</h2>

            {/* Grid 2 kolumny na mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Kpi
                label={`Wartość po ${years} latach`}
                value={result ? fmtPLN(result.total) : "—"}
              />
              <Kpi
                label="Suma wpłat"
                value={result ? fmtPLN(result.contrib) : "—"}
              />
              {/* Cel FIRE zajmuje 2 kolumny na mobile */}
              <div className="col-span-2 sm:col-span-1">
                 <Kpi label="Cel FIRE (dziś)" value={fmtPLN(fireTarget)} />
              </div>
            </div>

            {/* Kafelki FIRE */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Kpi
                label="Czy osiągnięty?"
                value={
                  result
                    ? result.total >= fireTarget
                      ? "Tak"
                      : "Nie"
                    : "—"
                }
                compact
              />
              <Kpi
                label="Kiedy?"
                value={
                  result?.reachedAt
                    ? `${MONTHS[result.reachedAt.getMonth()]} ${
                        result.reachedAt.getFullYear()
                      }`
                    : "—"
                }
                compact
              />
            </div>

            {/* WYKRES - FIX: usunięcie overflow-hidden dla tooltipa */}
            <div className="mt-4 flex-1">
              <div className="relative h-80 sm:h-[420px] flex items-center justify-center rounded-lg">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-yellow-400/8 to-transparent rounded-lg" />
                <div className="relative z-10 w-full h-full">
                  {result ? (
                    <FireChart
                      labels={result.labels}
                      capital={result.capitalPoints}
                      contributions={result.contribPoints}
                      goal={0}
                      height="100%"
                    />
                  ) : (
                    <div className="text-zinc-500 text-sm text-center pt-20">
                      Podaj dane i kliknij{" "}
                      <b>„Sprawdź swoją drogę”</b>, aby zobaczyć wykres.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CTA: Zapisz plan */}
            {result && (
              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-zinc-400">
                  Chcesz wrócić do tych ustawień później?
                </div>
                <Link
                  href="/fire-path"
                  onClick={handleSaveClick}
                  className="btn-primary rounded-full px-4 py-2"
                >
                  Zapisz swój plan
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* DEMO: portfel vs S&P 500 */}
      <section className="card mt-8">
        <div className="card-inner">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* tekst + przyciski */}
            <div>
              <h3 className="h2 mb-2">
                Jak wygląda Twój portfel vs. S&amp;P 500?
              </h3>
              <p className="muted">
                Zobacz, jak przykładowy portfel radziłby sobie na tle
                szerokiego rynku. Potem podepnij własne ETF-y i akcje, żeby
                dostać podobną analizę dla siebie.
              </p>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Link
                  href="/portfel-inwestycyjny"
                  className="btn-primary inline-flex items-center justify-center px-4 py-2"
                >
                  Analizuj swój portfel za darmo →
                </Link>

                <Link
                  href="/statystyki"
                  className="btn-primary px-3 py-2 text-sm bg-yellow-400/90 hover:bg-yellow-300 text-black"
                >
                  Zobacz statystyki portfela →
                </Link>
              </div>
            </div>

            {/* wykres demo */}
            <div className="h-52 md:h-56 lg:h-60">
              <DemoChart />
            </div>
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
                Dołącz do społeczności inwestorów FIRE — zadawaj pytania i
                dziel się doświadczeniem.
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
            {[
              "Jak inwestować w ETF?",
              "Jak zjeść budżet domowy?",
              "Dziennik mojej drogi do FIRE",
            ].map((t, i) => (
              <li
                key={i}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/60"
              >
                <Link href="/forum" className="block truncate">
                  {t}
                </Link>
                <div className="mt-1 text-xs text-zinc-400">
                  społeczność FIRE
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Edukacja */}
      <section className="card mt-10">
        <div className="card-inner">
          <h3 className="h2 mb-4">Dowiedz się więcej o FIRE i metodologii</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h4 className="text-lg font-semibold text-zinc-100">
                Niezależność finansowa (FIRE) w praktyce
              </h4>
              <p className="muted mt-1">
                FIRE to prosty cel: zbudować kapitał, który utrzyma Twoje
                wydatki. Nie chodzi o „szybkie triki”, tylko o sensowny plan,
                regularne wpłaty i długi horyzont.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/fire-path" className="btn-primary px-3 py-2">
                  Policz swoją ścieżkę
                </Link>
                <Link
                  href="/forum"
                  className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Zapytaj społeczność →
                </Link>
              </div>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h4 className="text-lg font-semibold text-zinc-100">
                Jak zacząć inwestować małe kwoty
              </h4>
              <p className="muted mt-1">
                Wystarczy stała wpłata (np. 200–500 zł miesięcznie) i trzymanie
                się planu. Procent składany robi robotę, a prosty portfel
                indeksowy to dobre pierwsze podejście.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/kalkulator-inwestycyjny"
                  className="btn-primary px-3 py-2"
                >
                  Kalkulator inwestycyjny
                </Link>
                <Link
                  href="/portfel-inwestycyjny"
                  className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Portfel online
                </Link>
              </div>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h4 className="text-lg font-semibold text-zinc-100">
                Na czym polega FIRE?
              </h4>
              <p className="muted mt-1">
                Cel jest prosty: zbudować kapitał, który pozwoli Ci żyć z
                wypłat z portfela (np. ~4% rocznie) bez konieczności pracy
                zarobkowej. Klucz to <b>regularne wpłaty</b> i{" "}
                <b>długi horyzont</b>.
              </p>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h4 className="text-lg font-semibold text-zinc-100">
                Skąd 25× wydatków?
              </h4>
              <p className="muted mt-1">
                To prosta reguła: 25× rocznych wydatków ≈ kapitał, z którego
                możesz wypłacać ~4% rocznie. Nie jest to gwarancja, ale
                sensowny punkt orientacyjny, by złapać skalę celu.
              </p>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h4 className="text-lg font-semibold text-zinc-100">
                Jaką stopę zwrotu przyjąć?
              </h4>
              <p className="muted mt-1">
                Zacznij konserwatywnie (np. 4–7% rocznie). Wyższe wartości
                zwiększają optymizm w wyniku, ale Twoje wpłaty i czas są
                ważniejsze niż każda cyferka.
              </p>
            </article>

            <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h4 className="text-lg font-semibold text-zinc-100">
                Inflacja i realne stopy zwrotu
              </h4>
              <p className="muted mt-1">
                Kalkulator przelicza nominalne stopy zwrotu i indeksację wpłat
                na wartości realne, czyli w dzisiejszych złotówkach. Dzięki
                temu widzisz, jak naprawdę rośnie Twoja siła nabywcza, a nie
                tylko „napompowane” liczby.
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}