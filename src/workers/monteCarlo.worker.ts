// src/workers/monteCarlo.worker.ts
import { runSimulation } from '../lib/monteCarlo/engine';
import { MonteCarloInputs } from '../lib/monteCarlo/types';

// Nasłuchujemy na wiadomości z głównego wątku aplikacji
self.addEventListener('message', (event: MessageEvent<MonteCarloInputs>) => {
  try {
    const inputs = event.data;
    
    // Uruchamiamy nasz ciężki silnik matematyczny
    const results = runSimulation(inputs);
    
    // Odsyłamy gotowe (i odchudzone) wyniki z powrotem do aplikacji
    self.postMessage({ type: 'COMPLETE', payload: results });
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', payload: { message: error.message || "Błąd symulacji" } });
  }
});