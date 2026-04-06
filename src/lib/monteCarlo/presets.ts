// src/lib/monteCarlo/presets.ts

export const PRESETS = {
  CONSERVATIVE: {
    annualReturn: 0.055,     // 5.5% rocznie
    annualVolatility: 0.08,  // 8% zmienności
    label: "Konserwatywny",
    description: "Portfel zdominowany przez obligacje. Niższy zwrot, wyższy spokój ducha i płytsze krachy."
  },
  MODERATE: {
    annualReturn: 0.075,     // 7.5% rocznie
    annualVolatility: 0.14,  // 14% zmienności
    label: "Umiarkowany",
    description: "Zbalansowany portfel globalny (np. 80% akcje / 20% obligacje). Klasyczne podejście do emerytury."
  },
  AGGRESSIVE: {
    annualReturn: 0.09,      // 9% rocznie
    annualVolatility: 0.18,  // 18% zmienności
    label: "Agresywny",
    description: "W 100% akcyjny. Wyższy potencjał zysku, ale przygotuj się na potężne i bolesne wahania."
  },
  CUSTOM: {
    annualReturn: 0.08,      
    annualVolatility: 0.15,  
    label: "Własny",
    description: "Ustaw własne parametry rynku, używając suwaków poniżej."
  }
};