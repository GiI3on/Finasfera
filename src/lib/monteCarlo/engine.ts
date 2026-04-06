// src/lib/monteCarlo/engine.ts
import { MonteCarloInputs, MonteCarloResults } from './types';

/**
 * Generator liczb pseudolosowych z rozkładu normalnego N(0,1)
 * Metoda Box-Mullera.
 */
function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); 
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generator z rozkładu t-Studenta o zadanej liczbie stopni swobody (df).
 * Generuje "grube ogony" naśladujące rzeczywiste załamania giełdowe.
 */
function randomStudentT(df: number): number {
  const z = randomNormal();
  let v = 0;
  for (let i = 0; i < df; i++) {
    const n = randomNormal();
    v += n * n; // Rozkład Chi-kwadrat
  }
  return z / Math.sqrt(v / df);
}

/**
 * Główna funkcja symulacji
 */
export function runSimulation(inputs: MonteCarloInputs): MonteCarloResults {
  const startTime = performance.now();

  const {
    initialCapital,
    totalYears,
    accumulationYears,
    monthlyContribution,
    monthlyWithdrawal,
    inflationRate,
    annualReturn,
    annualVolatility,
    simulationCount = 1000,
    annualFees = 0.002,
    degreesOfFreedom = 4, // 4 stopnie swobody = potężne grube ogony
    maxYearlyDrop = 0.60, // Max -60% rocznie (kaganiec)
    maxYearlyGain = 0.80, // Max +80% rocznie (kaganiec)
  } = inputs;

  const totalMonths = totalYears * 12;
  const accumulationMonths = accumulationYears * 12;

  // Przeliczenie rocznych parametrów na krok miesięczny
  // Dryf: (μ - σ^2 / 2) / 12
  const monthlyDrift = (annualReturn - 0.5 * annualVolatility * annualVolatility) / 12;
  // Zmienność: σ * sqrt(1/12)
  const monthlyVol = annualVolatility * Math.sqrt(1 / 12);
  
  // Zabezpieczenie (ucięcie / truncation) w skali miesięcznej log-zwrotów
  const maxMonthlyLogReturn = Math.log(1 + maxYearlyGain) / 12;
  const minMonthlyLogReturn = Math.log(1 - maxYearlyDrop) / 12;

  // Korekta wariancji dla t-Studenta, aby pasowała do oczekiwanej annualVolatility
  // Wariancja t-Studenta to df / (df - 2). Musimy przeskalować wylosowaną liczbę.
  const tScale = Math.sqrt((degreesOfFreedom - 2) / degreesOfFreedom);

  // Tablice do przechowywania wyników. 
  // Aby nie zabrakło RAMu, zapamiętujemy tylko wartości roczne!
  const yearlyValues: number[][] = Array.from({ length: totalYears + 1 }, () => new Float64Array(simulationCount) as any);
  let successfulPaths = 0;

  // PĘTLA GŁÓWNA: Symulacja N scenariuszy
  for (let path = 0; path < simulationCount; path++) {
    let currentCapital = initialCapital;
    yearlyValues[0][path] = currentCapital;
    let isBankrupt = false;

    // Pętla po miesiącach
    for (let month = 1; month <= totalMonths; month++) {
      if (isBankrupt) {
        if (month % 12 === 0) yearlyValues[month / 12][path] = 0;
        continue;
      }

      // 1. Zmiana rynkowa (Model z uciętym t-Studentem)
      const tRandom = randomStudentT(degreesOfFreedom) * tScale;
      let monthlyLogReturn = monthlyDrift + monthlyVol * tRandom;
      
      // Zastosowanie ucięcia (Truncation)
      if (monthlyLogReturn > maxMonthlyLogReturn) monthlyLogReturn = maxMonthlyLogReturn;
      if (monthlyLogReturn < minMonthlyLogReturn) monthlyLogReturn = minMonthlyLogReturn;

      currentCapital *= Math.exp(monthlyLogReturn);

      // 2. Przepływy pieniężne (wpłaty / wypłaty z inflacją)
      if (month <= accumulationMonths) {
        currentCapital += monthlyContribution;
      } else {
        // Obliczamy ile lat upłynęło od początku emerytury (FIRE), by nałożyć inflację na wydatki
        const yearsIntoFire = Math.floor((month - accumulationMonths - 1) / 12);
        const adjustedWithdrawal = monthlyWithdrawal * Math.pow(1 + inflationRate, yearsIntoFire);
        currentCapital -= adjustedWithdrawal;
      }

      // Bankructwo?
      if (currentCapital <= 0) {
        currentCapital = 0;
        isBankrupt = true;
      }

      // 3. Zapis roczny i odliczenie kosztów rocznych (TER)
      if (month % 12 === 0) {
        if (!isBankrupt) {
          currentCapital *= (1 - annualFees);
        }
        yearlyValues[month / 12][path] = currentCapital;
      }
    }

    if (!isBankrupt) {
      successfulPaths++;
    }
  }

  // OBLICZANIE WYNIKÓW I PERCENTYLI
  const p10Path: number[] = [];
  const p50Path: number[] = [];
  const p90Path: number[] = [];

  for (let year = 0; year <= totalYears; year++) {
    // Sortujemy wyniki z danego roku, aby znaleźć percentyle
    const sortedYear = Array.from(yearlyValues[year]).sort((a, b) => a - b);
    
    p10Path.push(sortedYear[Math.floor(simulationCount * 0.10)]);
    p50Path.push(sortedYear[Math.floor(simulationCount * 0.50)]);
    p90Path.push(sortedYear[Math.floor(simulationCount * 0.90)]);
  }

  // Wylosowanie 30 ścieżek do wyświetlenia na wykresie
  const displayPaths: number[][] = [];
  const displayCount = Math.min(30, simulationCount);
  for (let i = 0; i < displayCount; i++) {
    const randomPathIdx = Math.floor(Math.random() * simulationCount);
    const singlePath: number[] = [];
    for (let year = 0; year <= totalYears; year++) {
      singlePath.push(yearlyValues[year][randomPathIdx]);
    }
    displayPaths.push(singlePath);
  }

  const endTime = performance.now();

  return {
    displayPaths,
    p10Path,
    p50Path,
    p90Path,
    successRate: (successfulPaths / simulationCount) * 100,
    medianFinalValue: p50Path[totalYears],
    p10FinalValue: p10Path[totalYears],
    p90FinalValue: p90Path[totalYears],
    computationTimeMs: Math.round(endTime - startTime),
    simulationCount,
  };
}