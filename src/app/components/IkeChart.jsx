"use client"; // Wymagane dla interaktywności w Next.js

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function IkeChart() {
  // Generowanie danych matematycznych (35 lat)
  const data = [];
  let totalInvested = 0;
  let ikeValue = 0;
  
  for (let year = 1; year <= 35; year++) {
    for(let m = 1; m <= 12; m++) {
      totalInvested += 1000;
      ikeValue = (ikeValue + 1000) * (1 + 0.07 / 12); // 7% rocznie kapitalizowane co miesiąc
    }
    const profit = ikeValue - totalInvested;
    const netValue = totalInvested + (profit * 0.81); // Zwykłe konto (minus 19% podatku Belki)
    
    data.push({
      year: `Rok ${year}`,
      IKE: Math.round(ikeValue),
      Zwykłe: Math.round(netValue),
      Kapitał: totalInvested,
    });
  }

  // Własny wygląd tooltipa po najechaniu myszką
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const ike = payload.find(p => p.dataKey === 'IKE')?.value;
      const zwykle = payload.find(p => p.dataKey === 'Zwykłe')?.value;
      const roznica = ike - zwykle;

      return (
        <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl">
          <p className="text-zinc-300 font-bold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {entry.value.toLocaleString('pl-PL')} zł
            </p>
          ))}
          <div className="mt-3 pt-2 border-t border-zinc-800">
            <p className="text-red-400 text-sm font-bold">
              Strata na podatku: {roznica.toLocaleString('pl-PL')} zł
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full my-12">
      <div className="h-80 md:h-96 w-full bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="year" stroke="#71717a" fontSize={12} tickMargin={10} minTickGap={30} />
            <YAxis 
              stroke="#71717a" 
              fontSize={12} 
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} 
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            <Line type="monotone" dataKey="IKE" name="IKE (Brak podatku)" stroke="#22c55e" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Zwykłe" name="Zwykłe Konto" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Kapitał" name="Wpłacone środki" stroke="#a1a1aa" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-sm text-zinc-500 mt-4 italic">
        *Wykres uwzględnia wpłaty 1000 zł/m-c oraz historyczną stopę zwrotu 7% rocznie.
      </p>
    </div>
  );
}