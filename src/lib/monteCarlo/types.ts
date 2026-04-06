// src/lib/monteCarlo/types.ts

export interface MonteCarloInputs {
  // 1. Kapitał
  initialCapital: number;          // PLN, pobrane z Firebase lub wpisane ręcznie
  
  // 2. Horyzont czasowy
  totalYears: number;              // całkowity horyzont (np. 30 lat)
  accumulationYears: number;       // ile lat fazy wzrostu (dopłaty) przed przejściem na FIRE
  
  // 3. Przepływy pieniężne
  monthlyContribution: number;     // PLN/miesiąc (w fazie akumulacji)
  monthlyWithdrawal: number;       // PLN/miesiąc (koszty życia w fazie FIRE)
  
  // 4. Inflacja i parametry rynku
  inflationRate: number;           // roczna, np. 0.025 (2.5%)
  annualReturn: number;            // oczekiwany roczny zwrot nominalny, np. 0.08 (8%)
  annualVolatility: number;        // odchylenie standardowe roczne, np. 0.15 (15%)
  
  // 5. Zaawansowane (zgodnie z naszymi ustaleniami)
  simulationCount: number;         // liczba ścieżek, domyślnie 1000
  annualFees: number;              // TER ETF + koszty, domyślnie 0.002 (0.2%)
  
  // Parametry rozkładu t-Studenta (ukryte pod maską)
  degreesOfFreedom?: number;       // domyślnie 4 (grube ogony)
  maxYearlyDrop?: number;          // domyślnie 0.60 (-60%)
  maxYearlyGain?: number;          // domyślnie 0.80 (+80%)
}

export interface MonteCarloResults {
  // Wykresy: żeby nie zamrozić przeglądarki, wysyłamy tylko 30 losowych ścieżek z 1000
  displayPaths: number[][];        // [30_losowych_ścieżek][rok]
  
  // Percentyle rok po roku (do narysowania 3 głównych, grubych linii)
  p10Path: number[];               // Pesymistyczny (10. percentyl) w każdym roku
  p50Path: number[];               // Mediana (50. percentyl) w każdym roku
  p90Path: number[];               // Optymistyczny (90. percentyl) w każdym roku
  
  // Główne wskaźniki (KPI)
  successRate: number;             // % scenariuszy bez bankructwa
  medianFinalValue: number;        
  p10FinalValue: number;           
  p90FinalValue: number;           
  
  // Metadane
  computationTimeMs: number;       
  simulationCount: number;         
}