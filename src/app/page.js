"use client";

import { useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, LinearScale, PointElement, CategoryScale, Tooltip, Legend);

// ===== Utils =====
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(v) ? v : 0);

function sanitizeNumber(str, fallback = 0) {
  const s = String(str ?? "").replace(/[^0-9.,-]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}
function sanitizeInt(str, fallback = 0) {
  const s = String(str ?? "").replace(/[^0-9-]/g, "");
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

// ===== Page =====
export default function Page() {
  // Podstawowe
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(10);
  const [years, setYears] = useState(30);

  // Zaawansowane
  const [showAdv, setShowAdv] = useState(false);
  const [indexMonthly, setIndexMonthly] = useState(true);
  const [useNBPPath, setUseNBPPath] = useState(true);
  const [customWageGrowth, setCustomWageGrowth] = useState(0);
  const [annualExpenses, setAnnualExpenses] = useState(60000);
  const [targetMultiplier, setTargetMultiplier] = useState(25);
  const [realTerms, setRealTerms] = useState(false); // w cenach dzisiejszych

  const fireTarget = sanitizeNumber(annualExpenses) * sanitizeNumber(targetMultiplier);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef(null);

  // ====== API: pobranie prognozy NBP ======
  async function fetchNbpForecast(totalYears) {
    // totalYears – ile lat potrzebujemy; damy zapas +5
    const horizon = Math.max(1, Math.min(60, Number(totalYears) + 5));
    const res = await fetch(`/api/nbp-forecast?years=${horizon}`, { cache: "no-store" });
    if (!res.ok) throw new Error("NBP forecast API error");
    const json = await res.json();
    // json.forecast: [{year: 2025, cpi: 0.035}, ...]  (cpi jako ułamek r/r)
    const map = new Map(json.forecast.map((r) => [r.year, Number(r.cpi) || 0]));
    return (year) => {
      if (map.has(year)) return map.get(year);
      // ekstrapolacja ostatniej znanej wartości:
      const keys = Array.from(map.keys()).sort((a, b) => a - b);
      return keys.length ? map.get(keys[keys.length - 1]) : 0.04;
    };
  }

  // ====== Symulacja ======
  async function handleCalculate() {
    try {
      setLoading(true);

      const horizonYears = sanitizeInt(years, 0);
      const mRate = sanitizeNumber(rate, 0) / 100 / 12;

      let capital = sanitizeNumber(initial, 0);
      let monthlyPay = sanitizeNumber(monthly, 0);
      const initialNum = sanitizeNumber(initial, 0);

      // funkcja zwracająca roczną inflację (ułamek) dla danego roku
      const inflForYear = useNBPPath
        ? await fetchNbpForecast(horizonYears)
        : () => sanitizeNumber(customWageGrowth, 0) / 100;

      const start = new Date();

      const labels = [];
      const capitalYearPoints = [];
      const contribYearPoints = [];

      let contribAcc = 0;
      let inflFactor = 1;
      let reachedAt = null;

      for (let month = 0; month <= horizonYears * 12; month++) {
        if (month % 12 === 0) {
          const yr = start.getFullYear() + Math.floor(month / 12);
          labels.push(String(yr));
          capitalYearPoints.push(capital);
          contribYearPoints.push(initialNum + contribAcc);
        }

        // wpłata
        capital += monthlyPay;
        contribAcc += monthlyPay;

        // wzrost kapitału
        capital *= 1 + mRate;

        // inflacja & indeksacja
        const currentYear = start.getFullYear() + Math.floor(month / 12);
        const yearlyInfl = inflForYear(currentYear) || 0;
        const monthlyInfl = yearlyInfl / 12;

        if (indexMonthly) monthlyPay *= 1 + monthlyInfl;

        // skumulowana inflacja do TEGO miesiąca (do porównań)
        inflFactor *= 1 + monthlyInfl;

        // porównanie celu
        const targetToday = fireTarget;
        const targetNominal = targetToday * inflFactor;
        const capitalReal = capital / inflFactor;

        const hit = realTerms ? capitalReal >= targetToday : capital >= targetNominal;
        if (!reachedAt && hit) {
          const reach = new Date(start.getFullYear(), start.getMonth() + month, 1);
          reachedAt = `${reach.getFullYear()}-${String(reach.getMonth() + 1).padStart(2, "0")}`;
        }
      }

      const totalContrib = initialNum + contribAcc;

      setResult({
        total: capital,
        contrib: totalContrib,
        profit: capital - totalContrib,
        labels,
        capitalPoints: capitalYearPoints,
        contribPoints: contribYearPoints,
        reachedAt,
      });
    } catch (e) {
      console.error(e);
      setResult(null);
      alert("Nie udało się pobrać projekcji NBP. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  // ====== Chart ======
  const emptyTextPlugin = {
    id: "emptyText",
    afterDraw: (chart) => {
      if (result) return;
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "Podaj dane i kliknij „Oblicz”, aby zobaczyć wykres.",
        (chartArea.left + chartArea.right) / 2,
        (chartArea.top + chartArea.bottom) / 2
      );
      ctx.restore();
    },
  };

  const chartData = useMemo(() => {
    const labels =
      result?.labels ?? Array.from({ length: 9 }, (_, i) => String(new Date().getFullYear() + i));

    const cap = result?.capitalPoints ?? Array(labels.length).fill(null);
    const contrib = result?.contribPoints ?? Array(labels.length).fill(null);

    return {
      labels,
      datasets: [
        {
          label: "Kapitał",
          data: cap,
          borderColor: "#facc15",
          backgroundColor: "rgba(250, 204, 21, 0.12)",
          borderWidth: 2,
          fill: true,
          tension: 0.28,
          pointRadius: 0,
        },
        {
          label: "Suma wpłat",
          data: contrib,
          borderColor: "rgba(255,255,255,0.55)",
          borderDash: [6, 6],
          backgroundColor: "transparent",
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
        },
      ],
    };
  }, [result]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: "#a1a1aa", boxWidth: 12, usePointStyle: true, pointStyle: "line" },
        },
        tooltip: {
          intersect: false,
          mode: "index",
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtPLN(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: "#a1a1aa", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#a1a1aa",
            callback: (v) =>
              new Intl.NumberFormat("pl-PL", { notation: "compact", maximumFractionDigits: 1 }).format(v),
          },
        },
      },
    }),
    []
  );

  const chartPlugins = useMemo(() => [emptyTextPlugin], [result]);

  // ====== UI ======
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      {/* Tytuł */}
      <section className="text-center mt-10 mb-6">
        <h1 className="h1">
          Kalkulator <span className="text-yellow-400 typewriter">FIRE</span>
        </h1>
        <p className="mt-2 muted">
          Bezpłatny kalkulator FIRE — oblicz, kiedy osiągniesz swoją niezależność finansową.
        </p>
      </section>

      {/* Dwie kolumny */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Założenia */}
        <div className="card">
          <div className="card-inner">
            <h2 className="h2 mb-4">Założenia</h2>

            <div className="space-y-3">
              <div>
                <label className="muted text-sm">
                  Oszczędności początkowe (zł)
                  <span className="i-badge" title="Ile startowego kapitału masz na początku?">i</span>
                </label>
                <input
                  className="input mt-1"
                  type="number" inputMode="decimal"
                  value={initial}
                  onChange={(e) => setInitial(sanitizeNumber(e.target.value, 0))}
                />
              </div>

              <div>
                <label className="muted text-sm">
                  Wpłaty miesięczne (zł)
                  <span className="i-badge" title="Kwota, którą dokładasz co miesiąc do portfela.">i</span>
                </label>
                <input
                  className="input mt-1"
                  type="number" inputMode="decimal"
                  value={monthly}
                  onChange={(e) => setMonthly(sanitizeNumber(e.target.value, 0))}
                />
              </div>

              <div>
                <label className="muted text-sm">
                  Oczekiwana roczna stopa zwrotu (%)
                  <span className="i-badge" title="Średnia roczna stopa zwrotu z inwestycji (brutto).">i</span>
                </label>
                <input
                  className="input mt-1"
                  type="number" inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(sanitizeNumber(e.target.value, 0))}
                />
              </div>

              <div>
                <label className="muted text-sm">
                  Liczba lat inwestowania
                  <span className="i-badge" title="Jak długo zamierzasz inwestować?">i</span>
                </label>
                <input
                  className="input mt-1"
                  type="number" inputMode="numeric"
                  value={years}
                  onChange={(e) => setYears(sanitizeInt(e.target.value, 0))}
                />
              </div>
            </div>

            {/* Zaawansowane */}
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
                  <div className="flex items-center gap-3">
                    <input
                      id="indexMonthly"
                      type="checkbox"
                      className="h-4 w-4 accent-yellow-400"
                      checked={indexMonthly}
                      onChange={(e) => setIndexMonthly(e.target.checked)}
                    />
                    <label htmlFor="indexMonthly" className="muted text-sm">
                      Indeksuj miesięczne wpłaty
                      <span className="i-badge" title="Wpłaty rosną co miesiąc zgodnie z projekcją CPI NBP lub Twoim % wzrostu.">i</span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                      <label className="muted text-sm">
                        <input
                          type="radio" name="infl" className="mr-2 accent-yellow-400"
                          checked={useNBPPath} onChange={() => setUseNBPPath(true)}
                        />
                        Ścieżka NBP (API)
                      </label>

                      <label className="muted text-sm">
                        <input
                          type="radio" name="infl" className="mr-2 accent-yellow-400"
                          checked={!useNBPPath} onChange={() => setUseNBPPath(false)}
                        />
                        Własny wzrost (%/rok)
                      </label>

                      {!useNBPPath && (
                        <input
                          className="input !w-28"
                          type="number" inputMode="decimal"
                          value={customWageGrowth}
                          onChange={(e) => setCustomWageGrowth(sanitizeNumber(e.target.value, 0))}
                          placeholder="np. 3"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="muted text-sm">
                          Wydatki roczne (cel)
                          <span className="i-badge" title="Ile rocznie chcesz wydawać po osiągnięciu FIRE.">i</span>
                        </label>
                        <input
                          className="input mt-1"
                          type="number" inputMode="decimal"
                          value={annualExpenses}
                          onChange={(e) => setAnnualExpenses(sanitizeNumber(e.target.value, 0))}
                        />
                      </div>

                      <div>
                        <label className="muted text-sm">
                          Mnożnik celu (np. 25×)
                          <span className="i-badge" title="Reguła 4% ≈ kapitał 25× rocznych wydatków.">i</span>
                        </label>
                        <input
                          className="input mt-1"
                          type="number" inputMode="decimal"
                          value={targetMultiplier}
                          onChange={(e) => setTargetMultiplier(sanitizeNumber(e.target.value, 25))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        id="realTerms"
                        type="checkbox" className="h-4 w-4 accent-yellow-400"
                        checked={realTerms} onChange={(e) => setRealTerms(e.target.checked)}
                      />
                      <label htmlFor="realTerms" className="muted text-sm">
                        Pokazuj wyniki w cenach dzisiejszych (real)
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button className="btn-primary w-full mt-5" onClick={handleCalculate} disabled={loading}>
              {loading ? "Liczenie…" : "Oblicz"}
            </button>
          </div>
        </div>

        {/* Prognoza */}
        <div className="card">
          <div className="card-inner space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="h2">Prognoza</h2>
              <div className="muted text-xs">
                Cel FIRE ({realTerms ? "w cenach dzisiejszych" : "nominalnie"})
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="kpi">
                <div className="kpi-label">Wartość po {years} latach</div>
                <div className="kpi-value">{result ? fmtPLN(result.total) : "—"}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Suma wpłat</div>
                <div className="kpi-value">{result ? fmtPLN(result.contrib) : "—"}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Cel FIRE (dziś)</div>
                <div className="kpi-value">{fmtPLN(fireTarget)}</div>
              </div>
            </div>

            {result && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="kpi">
                  <div className="kpi-label">Czy osiągnięty?</div>
                  <div className="kpi-value">{result.reachedAt ? "Tak" : "Nie"}</div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Kiedy?</div>
                  <div className="kpi-value">{result.reachedAt ?? "—"}</div>
                </div>
              </div>
            )}

            <div className="chart-wrap">
              <Line ref={chartRef} data={chartData} options={chartOptions} plugins={[emptyTextPlugin]} />
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
            W opcjach zaawansowanych ustaw wydatki i mnożnik celu, włącz indeksację wpłat i – jeśli chcesz – własny
            wzrost zamiast ścieżki NBP.
          </p>
        </div>
      </section>
    </main>
  );
}
