// src/lib/monteCarlo/engine.ts
import { MonteCarloInputs, MonteCarloResults } from './types';

function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); 
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function randomStudentT(df: number): number {
  const z = randomNormal();
  let v = 0;
  for (let i = 0; i < df; i++) {
    const n = randomNormal();
    v += n * n; 
  }
  return z / Math.sqrt(v / df);
}

function getZusReplacementRate(retirementYear: number): number {
  if (retirementYear <= 2026) return 0.50;
  if (retirementYear >= 2060) return 0.24;
  const points = [
    { y: 2026, r: 0.50 }, { y: 2030, r: 0.45 }, { y: 2040, r: 0.385 },
    { y: 2050, r: 0.28 }, { y: 2060, r: 0.24 }
  ];
  for (let i = 0; i < points.length - 1; i++) {
    if (retirementYear >= points[i].y && retirementYear <= points[i + 1].y) {
      const p1 = points[i]; const p2 = points[i + 1];
      const progress = (retirementYear - p1.y) / (p2.y - p1.y);
      return p1.r + progress * (p2.r - p1.r);
    }
  }
  return 0.24;
}

export function runSimulation(inputs: MonteCarloInputs): MonteCarloResults {
  const startTime = performance.now();
  const {
    initialCapital, monthlyContribution, currentAge, fireAge, retirementAge = 65, maxAge = 85,
    currentNetIncome, inflationRate, annualReturn, annualVolatility,
    simulationCount = 1000, annualFees = 0.002, degreesOfFreedom = 4.5,
  } = inputs;

  const totalYears = Math.max(fireAge - currentAge + 1, maxAge - currentAge);
  const totalMonths = totalYears * 12;
  const accumulationMonths = Math.max(0, (fireAge - currentAge) * 12);
  const zusStartMonth = Math.max(0, (retirementAge - currentAge) * 12);
  const zusPension = currentNetIncome * getZusReplacementRate(2026 + (retirementAge - currentAge));

  const marketShocks = new Float32Array(simulationCount * totalMonths);
  const tScale = Math.sqrt((degreesOfFreedom - 2) / degreesOfFreedom);
  
  for (let m = 1; m <= totalMonths; m++) {
    let ret = annualReturn;
    let vol = annualVolatility;
    
    // Dynamiczny GLIDE PATH - Zależny od wybranego presetu
    if (m >= accumulationMonths - 36 && m < accumulationMonths + 84) {
      ret = annualReturn * 0.7; // Redukcja zwrotu na czas FIRE
      vol = annualVolatility * 0.5; // Redukcja zmienności o 50% (Namiot obligacji)
    } else if (m >= accumulationMonths + 84) {
      ret = annualReturn * 0.85; 
      vol = annualVolatility * 0.75; 
    }

    const monthlyDrift = (ret - 0.5 * vol * vol) / 12;
    const monthlyVol = vol * Math.sqrt(1 / 12);

    for (let p = 0; p < simulationCount; p++) {
      // Usunięto circuit breaker - ufamy matematyce t-Studenta
      let shock = Math.exp(monthlyDrift + monthlyVol * (randomStudentT(degreesOfFreedom) * tScale));
      marketShocks[(m - 1) * simulationCount + p] = shock;
    }
  }

  // Flaga storePaths zapobiega gigantycznemu wyciekowi pamięci w przeglądarce
  function testWithdrawal(withdrawalAmount: number, storePaths: boolean = false) {
    let successes = 0;
    let finalPaths: Float64Array[] = [];
    
    if (storePaths) {
      finalPaths = Array.from({ length: totalYears + 1 }, () => new Float64Array(simulationCount));
      for (let p = 0; p < simulationCount; p++) finalPaths[0][p] = initialCapital;
    }

    for (let p = 0; p < simulationCount; p++) {
      let capital = initialCapital;
      let isBankrupt = false;

      for (let m = 1; m <= totalMonths; m++) {
        if (!isBankrupt) {
          capital *= marketShocks[(m - 1) * simulationCount + p];
          const infl = Math.pow(1 + inflationRate, m / 12);

          if (m <= accumulationMonths) {
            capital += (monthlyContribution * infl);
          } else {
            let need = (m > zusStartMonth) ? Math.max(0, withdrawalAmount - zusPension) : withdrawalAmount;
            if (capital / infl < initialCapital * 0.3) need *= 0.8; // Guardrails
            capital -= (need * infl);
          }

          if (capital <= 0) { capital = 0; isBankrupt = true; }
          
          if (m % 12 === 0) {
            capital *= (1 - annualFees);
            if (storePaths) finalPaths[m / 12][p] = capital;
          }
        } else if (m % 12 === 0 && storePaths) {
          finalPaths[m / 12][p] = 0;
        }
      }
      if (!isBankrupt) successes++;
    }
    return { rate: (successes / simulationCount) * 100, paths: finalPaths };
  }

  // Dynamiczny limit Binary Search na podstawie kapitału z uwzględnieniem odsetek
  const dynamicHigh = Math.max(200000, initialCapital * 0.15);

  let lowS = 0, highS = dynamicHigh, safeW = 0;
  for (let i = 0; i < 18; i++) {
    let mid = (lowS + highS) / 2;
    if (testWithdrawal(mid, false).rate >= 85.0) { safeW = mid; lowS = mid; } else { highS = mid; }
  }

  let lowM = 0, highM = dynamicHigh, medianW = 0;
  for (let i = 0; i < 18; i++) {
    let mid = (lowM + highM) / 2;
    if (testWithdrawal(mid, false).rate >= 50.0) { medianW = mid; lowM = mid; } else { highM = mid; }
  }

  let lowO = 0, highO = dynamicHigh * 1.5, optW = 0;
  for (let i = 0; i < 18; i++) {
    let mid = (lowO + highO) / 2;
    if (testWithdrawal(mid, false).rate >= 15.0) { optW = mid; lowO = mid; } else { highO = mid; }
  }

  // Po znalezieniu kwot, uruchamiamy model ostatni raz DLA WYKRESU, by zapisać ścieżki
  const bestData = testWithdrawal(safeW, true);

  const p10: number[] = [], p50: number[] = [], p90: number[] = [];
  for (let y = 0; y <= totalYears; y++) {
    const defl = Math.pow(1 + inflationRate, y);
    const sorted = Array.from(bestData.paths[y]).map(v => v / defl).sort((a, b) => a - b);
    p10.push(sorted[Math.floor(simulationCount * 0.10)]);
    p50.push(sorted[Math.floor(simulationCount * 0.50)]);
    p90.push(sorted[Math.floor(simulationCount * 0.90)]);
  }

  const disp: number[][] = [];
  for (let i = 0; i < 30; i++) {
    const s: number[] = [];
    for (let y = 0; y <= totalYears; y++) s.push(bestData.paths[y][i] / Math.pow(1 + inflationRate, y));
    disp.push(s);
  }

  return {
    safeMonthlyWithdrawal: safeW,
    medianMonthlyWithdrawal: medianW,
    optimisticMonthlyWithdrawal: optW,
    zusPension,
    successRate: bestData.rate,
    totalYears, accumulationYears: fireAge - currentAge,
    displayPaths: disp, p10Path: p10, p50Path: p50, p90Path: p90,
    computationTimeMs: Math.round(performance.now() - startTime),
    simulationCount,
  };
}