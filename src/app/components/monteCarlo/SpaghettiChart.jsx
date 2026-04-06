// src/app/components/monteCarlo/SpaghettiChart.jsx
"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

export default function SpaghettiChart({ results, totalYears, accumulationYears, currentAge = 30 }) {
  if (!results) return null;

  const fmtPLN = (v) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

  const data = [];
  for (let i = 0; i <= totalYears; i++) {
    const point = {
      year: `Rok ${i}`,
      realYear: i,
      p10: results.p10Path[i],
      p50: results.p50Path[i],
      p90: results.p90Path[i]
    };
    if (results.displayPaths) {
      results.displayPaths.forEach((path, idx) => {
        point[`path_${idx}`] = path[i];
      });
    }
    data.push(point);
  }

  // Własny, czytelny Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const p10 = payload.find(p => p.dataKey === 'p10')?.value;
      const p50 = payload.find(p => p.dataKey === 'p50')?.value;
      const p90 = payload.find(p => p.dataKey === 'p90')?.value;
      
      const realYear = payload[0].payload.realYear;
      const userAgeAtYear = currentAge + realYear; // Obliczamy prawdziwy wiek użytkownika

      return (
        <div className="bg-zinc-950/95 border border-zinc-700 p-4 rounded-xl shadow-2xl h-auto min-w-[240px]">
          {/* Nagłówek z WIEKIEM */}
          <div className="border-b border-zinc-800 pb-2 mb-3">
            <p className="text-white font-bold text-lg">Twój wiek: {userAgeAtYear} lat</p>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Rok symulacji: {realYear}</p>
          </div>
          
          {/* Kontekst kwot */}
          <p className="text-zinc-400 text-xs mb-2">Pozostały kapitał (realnie):</p>
          
          {/* Kwoty posortowane jak na wykresie (Góra -> Dół) */}
          <div className="space-y-1.5 text-sm font-medium">
            {p90 !== undefined && (
              <div className="flex justify-between text-emerald-500">
                <span>Optymistyczny:</span> <span>{fmtPLN(p90)}</span>
              </div>
            )}
            {p50 !== undefined && (
              <div className="flex justify-between text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded">
                <span>Typowy:</span> <span>{fmtPLN(p50)}</span>
              </div>
            )}
            {p10 !== undefined && (
              <div className="flex justify-between text-red-500">
                <span>Pesymistyczny:</span> <span>{fmtPLN(p10)}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 10, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} opacity={0.5} />
          
          <XAxis 
            dataKey="year" 
            stroke="#71717a" 
            tick={{ fill: '#71717a', fontSize: 12 }}
            minTickGap={30}
          />
          
          <YAxis 
            stroke="#71717a" 
            tick={{ fill: '#71717a', fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000000).toFixed(0)} mln`}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '3 3' }} wrapperStyle={{ outline: "none" }} />
          
          <Legend wrapperStyle={{ paddingTop: "15px" }} />

          {results.displayPaths && results.displayPaths.map((_, idx) => (
            <Line 
              key={`path_${idx}`} 
              type="monotone" 
              dataKey={`path_${idx}`} 
              stroke="#eab308" 
              strokeWidth={1} 
              dot={false} 
              activeDot={false}
              opacity={0.15}
              isAnimationActive={false}
              legendType="none" 
            />
          ))}

          {accumulationYears > 0 && accumulationYears < totalYears && (
            <ReferenceLine 
              x={`Rok ${accumulationYears}`} 
              stroke="#eab308" 
              strokeDasharray="4 4" 
              label={{ position: 'top', value: 'Start FIRE', fill: '#eab308', fontSize: 10, fontWeight: 'bold' }} 
            />
          )}

          <Line name="Optymistyczny (90%)" type="monotone" dataKey="p90" stroke="#10b981" strokeWidth={2} dot={false} opacity={0.9} />
          <Line name="Mediana (Typowy)" type="monotone" dataKey="p50" stroke="#eab308" strokeWidth={3} dot={false} />
          <Line name="Pesymistyczny (10%)" type="monotone" dataKey="p10" stroke="#ef4444" strokeWidth={2} dot={false} opacity={0.9} />
          
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}