"use client";

import { useState } from "react";
import FireChecklist from "../components/FireChecklist";
import FireProgress from "../components/FireProgress";

export default function FirePathPage() {
  const [checklistProgress, setChecklistProgress] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [partnerMode, setPartnerMode] = useState(false);

  const fireTarget = partnerMode ? 4000000 : 2000000; // przykład
  const firePercent = Math.min(100, Math.round((portfolioValue / fireTarget) * 100));

  const stages = [
    { label: "Pierwsze kroki", percent: 0.5, amount: fireTarget * 0.005 },
    { label: "Darmowy batonik", percent: 1.25, amount: fireTarget * 0.0125 },
    { label: "Pół roku luzu", percent: 2.5, amount: fireTarget * 0.025 },
    { label: "Mini-FIRE", percent: 10, amount: fireTarget * 0.10 },
    { label: "Ćwierć drogi", percent: 25, amount: fireTarget * 0.25 },
    { label: "Półmetek", percent: 50, amount: fireTarget * 0.50 },
    { label: "Lean FIRE", percent: 60, amount: fireTarget * 0.60 },
    { label: "3/4 drogi", percent: 75, amount: fireTarget * 0.75 },
    { label: "Pełne FIRE", percent: 100, amount: fireTarget },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20">
      <h1 className="h1 text-center my-8">Twoja ścieżka FIRE</h1>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-4">
          <h2 className="h2 mb-4">Checklist celów FIRE</h2>
          <FireChecklist onProgressChange={setChecklistProgress} />
          <p className="mt-4 text-sm">Postęp: {checklistProgress}%</p>
        </div>

        <div className="card p-4 flex flex-col items-center justify-center">
          <h2 className="h2 mb-4">Twój postęp FIRE</h2>
          <FireProgress percent={firePercent} />
          <label className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={partnerMode}
              onChange={(e) => setPartnerMode(e.target.checked)}
              className="accent-yellow-400"
            />
            FIRE z partnerem
          </label>
        </div>

        <div className="card p-4">
          <h2 className="h2 mb-4">Wartość portfela</h2>
          <input
            type="number"
            value={portfolioValue}
            onChange={(e) => setPortfolioValue(Number(e.target.value))}
            className="input w-full"
          />
          <p className="mt-2 text-sm">
            Cel: {fireTarget.toLocaleString("pl-PL")} zł
          </p>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="h2 mb-4">🔥 Etapy FIRE</h2>
        <table className="table-auto w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="pb-2">Etap</th>
              <th className="pb-2">% celu</th>
              <th className="pb-2">Kwota</th>
              <th className="pb-2">Postęp</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s, idx) => (
              <tr key={idx}>
                <td>{s.label}</td>
                <td>{s.percent}%</td>
                <td>{s.amount.toLocaleString("pl-PL")} zł</td>
                <td>
                  {portfolioValue >= s.amount ? "✅" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
