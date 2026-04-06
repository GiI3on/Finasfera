// src/app/components/monteCarlo/SpaghettiChart.jsx
"use client";

import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from "recharts";

export default function SpaghettiChart({ results, totalYears, accumulationYears }) {
  if (!results) return null;

  // Przerabiamy dane z silnika na format zrozumiały dla Recharts
  const data = [];
  for (let year = 0; year <= totalYears; year++) {
    const row = {
      year: year,
      p10: results.p10Path[year],
      p50: results.p50Path[year],
      p90: results.p90Path[year],
    };
    // Dodajemy 30 losowych ścieżek jako osobne klucze
    results.displayPaths.forEach((path, i) => {
      row[`path_${i}`] = path[year];
    });
    data.push(row);
  }

  // Funkcja formatująca duże liczby do czytelnej formy (np. 1M zamiast 1 000 000)
  const fmtAxis = (val) => new Intl.NumberFormat('pl-PL', { notation: "compact", compactDisplay: "short" }).format(val);

  return (
    <div className="h-[400px] w-full mt-8">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="year" stroke="#a1a1aa" tickFormatter={(val) => `Rok ${val}`} />
          <YAxis stroke="#a1a1aa" tickFormatter={fmtAxis} />
          
          <Tooltip
            formatter={(value, name) => {
              // Ukrywamy brzydkie etykiety dla 30 linii tła
              if (name.startsWith('path_')) return [null, null]; 
              
              const formatted = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(value);
              let label = name;
              if (name === 'p50') label = "Mediana (Typowy)";
              if (name === 'p10') label = "Pesymistyczny (10%)";
              if (name === 'p90') label = "Optymistyczny (90%)";
              return [formatted, label];
            }}
            labelFormatter={(label) => `Rok symulacji: ${label}`}
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
          />
          
          {/* Pionowa linia oznaczająca przejście na FIRE */}
          <ReferenceLine 
            x={accumulationYears} 
            stroke="#FACC15" 
            strokeDasharray="4 4" 
            label={{ position: 'top', value: 'Start FIRE', fill: '#FACC15', fontSize: 12 }} 
          />

          {/* 30 ścieżek tła (bardzo przezroczyste, wyłączone animacje dla wydajności!) */}
          {results.displayPaths.map((_, i) => (
            <Line key={`path_${i}`} type="monotone" dataKey={`path_${i}`} stroke="rgba(250, 204, 21, 0.1)" strokeWidth={1} dot={false} isAnimationActive={false} />
          ))}

          {/* 3 Główne linie percentyli */}
          <Line type="monotone" dataKey="p90" stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="p50" stroke="#FACC15" strokeWidth={3} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="p10" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legenda */}
      <div className="flex justify-center gap-6 mt-4 text-xs text-zinc-400">
        <span className="flex items-center gap-2"><div className="w-3 h-0.5 bg-green-500"></div> Optymistyczny (90%)</span>
        <span className="flex items-center gap-2"><div className="w-3 h-0.5 bg-yellow-500"></div> Mediana (Typowy)</span>
        <span className="flex items-center gap-2"><div className="w-3 h-0.5 bg-red-500"></div> Pesymistyczny (10%)</span>
      </div>
    </div>
  );
}