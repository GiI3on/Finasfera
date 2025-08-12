"use client";

import { useEffect, useState } from "react";
import FireChart from "./components/FireChart";

/* helpers */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 })
    .format(Number.isFinite(v) ? Math.round(v) : 0);
const toInt = (str, fb = 0) => {
  const d = String(str ?? "").replace(/[^\d]/g, "");
  if (!d) return fb;
  const n = parseInt(d, 10);
  return Number.isFinite(n) ? n : fb;
};
const normalizeRate = (x) => {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? n / 100 : n;
};
const MONTHS = ["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"];

/* podpowiedź „i” */
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

export default function Page() {
  // Podstawowe
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(10);
  const [years, setYears] = useState(30);

  // Zaawansowane (UI)
  const [showAdv, setShowAdv] = useState(false);
  const [useNBPPath, setUseNBPPath] = useState(true);
  const [customWageGrowth, setCustomWageGrowth] = useState(0);
  const [annualExpenses, setAnnualExpenses] = useState(60000);
  const [targetMultiplier, setTargetMultiplier] = useState(25);
  const [showGoal, setShowGoal] = useState(false); // domyślnie ukryte

  const fireTarget = annualExpenses * targetMultiplier;

  // Wynik
  const [result, setResult] = useState(null);

  // CPI NBP
  const [nbpCpi, setNbpCpi] = useState([]);
  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch(`/api/nbp-forecast?years=${Math.max(1, years + 2)}`, { cache: "no-store" });
        const json = await res.json();
        if (!stop) setNbpCpi(Array.isArray(json?.forecast) ? json.forecast : []);
      } catch {
        if (!stop) setNbpCpi([]);
      }
    }
    if (useNBPPath) load();
    return () => { stop = true; };
  }, [useNBPPath, years]);

  function handleCalculate() {
    const Y = Math.max(0, toInt(years, 0));
    const start = new Date();
    const baseYear = start.getFullYear();
    const baseMonth = start.getMonth(); // 0..11
    const mRate = (Number(rate) || 0) / 100 / 12;

    let capital = toInt(initial, 0);
    let monthlyPay = toInt(monthly, 0);
    let contribAcc = 0;

    const labels = [];
    const capPoints = [];
    const contribPoints = [];
    let reachedAt = null;

    for (let month = 0; month <= Y * 12; month++) {
      if (month % 12 === 0) {
        const yr = baseYear + Math.floor((baseMonth + month) / 12);
        labels.push(String(yr));
        capPoints.push(Number.isFinite(capital) ? capital : 0);
        contribPoints.push(contribAcc);
      }

      capital += monthlyPay;
      contribAcc += monthlyPay;
      capital *= 1 + mRate;

      // indeksacja wpłat (NBP lub własny %)
      let yearly = 0;
      if (useNBPPath) {
        const yr = baseYear + Math.floor((baseMonth + month) / 12);
        yearly = normalizeRate(nbpCpi.find((r) => r.year === yr)?.cpi ?? 0);
      } else {
        yearly = normalizeRate(customWageGrowth);
      }
      if (yearly) monthlyPay *= 1 + yearly / 12;

      if (showGoal && !reachedAt && capital >= fireTarget) {
        reachedAt = new Date(baseYear, baseMonth + month, 1); // dokładny msc/rok
      }
    }

    const contribSimple = toInt(monthly, 0) * 12 * Y; // bez indeksacji (do kafelka)
    setResult({
      total: capital,
      contrib: contribSimple,
      labels,
      capitalPoints: capPoints,
      contribPoints,
      reachedAt,
    });
  }

  const waitingForNBP = useNBPPath && nbpCpi.length === 0;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      {/* Tytuł */}
      <section className="text-center mt-10 mb-6">
        <h1 className="h1">
          Kalkulator <span className="text-yellow-400 typewriter">FIRE</span>
        </h1>
        <p className="mt-2 muted">Bezpłatny kalkulator FIRE — oblicz, kiedy osiągniesz swoją niezależność finansową.</p>
      </section>

      {/* Dwie kolumny */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start auto-rows-fr">
        {/* Założenia */}
        <div className="card h-full flex flex-col">
          <div className="card-inner flex-1 flex flex-col">
            <h2 className="h2 mb-4">Założenia</h2>

            <div className="space-y-3">
              <Field label="Oszczędności początkowe (zł)" value={initial} onChange={(v)=>setInitial(toInt(v,0))} />
              <Field label="Wpłaty miesięczne (zł)" value={monthly} onChange={(v)=>setMonthly(toInt(v,0))} />
              <Field label="Oczekiwana roczna stopa zwrotu (%)" value={rate} onChange={(v)=>setRate(toInt(v,0))} />
              <Field label="Liczba lat inwestowania" value={years} onChange={(v)=>setYears(toInt(v,0))} />
            </div>

            <button
              className="btn-primary w-full mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleCalculate}
              disabled={waitingForNBP}
            >
              {waitingForNBP ? "Ładowanie CPI NBP…" : "Oblicz"}
            </button>

            <div className="mt-4">
              <button
                type="button"
                className="muted text-sm underline hover:text-zinc-300"
                onClick={() => setShowAdv((v) => !v)}
              >
                {showAdv ? "Ukryj" : "Opcje zaawansowane"}
              </button>

              {showAdv && (
                <div className="mt-3 space-y-4">
                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-yellow-400" checked readOnly />
                    <span className="muted">
                      Indeksuj miesięczne wpłaty
                      <InfoTip text="Każdego miesiąca wpłata rośnie o 1/12 rocznej stopy (CPI NBP lub własny %)." />
                    </span>
                  </label>

                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="muted text-sm">
                      <input type="radio" name="infl" className="mr-2 accent-yellow-400"
                        checked={useNBPPath} onChange={() => setUseNBPPath(true)} />
                      Ścieżka NBP (API)
                      <InfoTip text="Prognoza inflacji (CPI) NBP dla kolejnych lat." />
                    </label>
                    <label className="muted text-sm">
                      <input type="radio" name="infl" className="mr-2 accent-yellow-400"
                        checked={!useNBPPath} onChange={() => setUseNBPPath(false)} />
                      Własny wzrost (%/rok)
                      <InfoTip text="Stały roczny % indeksacji wpłat, np. 3%." />
                    </label>
                    {!useNBPPath && (
                      <input className="input !w-28" inputMode="numeric"
                        value={customWageGrowth} onChange={(e)=>setCustomWageGrowth(toInt(e.target.value,0))}
                        placeholder="np. 3" />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="muted text-sm">
                        Wydatki roczne (cel)
                        <InfoTip text="Twoje roczne wydatki dziś. Cel = wydatki × mnożnik." />
                      </label>
                      <input className="input mt-1" inputMode="numeric"
                        value={annualExpenses} onChange={(e)=>setAnnualExpenses(toInt(e.target.value,0))} />
                    </div>
                    <div>
                      <label className="muted text-sm">
                        Mnożnik celu (np. 25×)
                        <InfoTip text="Reguła 4% ≈ 25× wydatków." />
                      </label>
                      <input className="input mt-1" inputMode="numeric"
                        value={targetMultiplier} onChange={(e)=>setTargetMultiplier(toInt(e.target.value,25))} />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-yellow-400"
                      checked={showGoal}
                      onChange={(e) => {
                        setShowGoal(e.target.checked);
                        // przelicz automatycznie, żeby kafelki od razu się zaktualizowały
                        handleCalculate();
                      }}
                    />
                    <span className="muted">
                      Pokaż cel FIRE (kafle)
                      <InfoTip text="Pokazuje, czy i kiedy przekraczasz cel. Na wykresie celu nie rysujemy." />
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Prognoza */}
        <div className="card h-full flex flex-col">
          <div className="card-inner flex-1 flex flex-col space-y-4">
            <h2 className="h2">Prognoza</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Kpi label={`Wartość po ${years} latach`} value={result ? fmtPLN(result.total) : "—"} />
              <Kpi label="Suma wpłat" value={result ? fmtPLN(result.contrib) : "—"} />
              <Kpi label="Cel FIRE (dziś)" value={fmtPLN(fireTarget)} />
            </div>

            {showGoal && result && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="flex-1 min-h-[360px]">
              <FireChart
                labels={result?.labels ?? []}
                capital={result?.capitalPoints ?? []}
                contributions={result?.contribPoints ?? []}
                goal={0}
                height={360}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Edukacja */}
      <section className="card mt-10">
        <div className="card-inner">
          <h3 className="h2 mb-2">Dowiedz się więcej o FIRE i metodologii</h3>
          <p className="muted">
            Reguła 4% sugeruje, że gdy kapitał ≈ <b>25× rocznych wydatków</b>, można bezpiecznie wypłacać ~4% rocznie.
            Indeksacja wpłat jest włączona; wybierz ścieżkę NBP lub własny wzrost.
          </p>
        </div>
      </section>
    </main>
  );
}

/* małe komponenty */
function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="muted text-sm">{label}</label>
      <input className="input mt-1" inputMode="numeric" value={value} onChange={(e)=>onChange(e.target.value)} />
    </div>
  );
}
function Kpi({ label, value }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}
