// src/app/components/NewPortfolioDialog.jsx
"use client";

import { useState } from "react";
import { ACCOUNT_TYPES, normalizeAccountType } from "../../lib/accounts";

export default function NewPortfolioDialog({ open, onClose, onCreate }) {
  const [name, setName] = useState("Nowy portfel");
  const [accountType, setAccountType] = useState("TAXABLE_PL");
  const [baseCurrency, setBaseCurrency] = useState("PLN");
  const [broker, setBroker] = useState("");

  if (!open) return null;

  function resetAndClose() {
    setName("Nowy portfel");
    setAccountType("TAXABLE_PL");
    setBaseCurrency("PLN");
    setBroker("");
    onClose?.();
  }

  async function submit(e) {
    e?.preventDefault?.();
    const payload = {
      name: name?.trim() || "Portfel",
      accountType: normalizeAccountType(accountType),
      baseCurrency: (baseCurrency || "PLN").toUpperCase(),
      broker: broker?.trim() || "",
    };
    await onCreate?.(payload);
    resetAndClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={resetAndClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-3">Nowy portfel</h3>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Nazwa</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mój portfel"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-1">Typ konta</label>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
            >
              <option value="TAXABLE_PL">{ACCOUNT_TYPES.TAXABLE_PL.label}</option>
              <option value="IKE_PL">{ACCOUNT_TYPES.IKE_PL.label}</option>
              <option value="IKZE_PL">{ACCOUNT_TYPES.IKZE_PL.label}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Waluta bazowa</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value.toUpperCase())}
                placeholder="PLN"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Broker (opcjonalnie)</label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                placeholder="np. XTB, mBank IKE"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              onClick={resetAndClose}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-yellow-500 text-black hover:bg-yellow-400"
            >
              Utwórz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
