// src/lib/monteCarlo/types.ts

export interface MonteCarloInputs {
  initialCapital: number;
  monthlyContribution: number;
  currentAge: number;
  fireAge: number;
  retirementAge: number;
  maxAge: number;
  currentNetIncome: number;
  inflationRate: number;
  annualReturn: number;
  annualVolatility: number;
  simulationCount: number;
  annualFees: number;
  degreesOfFreedom?: number;
  maxYearlyDrop?: number;
  maxYearlyGain?: number;
}

export interface MonteCarloResults {
  safeMonthlyWithdrawal: number;
  medianMonthlyWithdrawal: number;
  optimisticMonthlyWithdrawal: number;
  zusPension: number;
  successRate: number;
  totalYears: number;
  accumulationYears: number;
  displayPaths: number[][];
  p10Path: number[];
  p50Path: number[];
  p90Path: number[];
  computationTimeMs: number;
  simulationCount: number;
}