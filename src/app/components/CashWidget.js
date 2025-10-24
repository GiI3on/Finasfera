// src/app/components/CashWidget.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { addCashflow, listCashflows, computeCashBalance, CF } from "../lib/cashflowStore";

export default function CashWidget({ holdings }) {
  const { user } = useAuth();
  const [cashflows, setCashflows] = useState([]);
  const [divAmt, setDivAmt] = useState("");
  const [divDate, setDivDate] = useState(() => new Date().toISOString().slice(0,10));
  const [divNote, setDivNote] = useState("");

  async function refresh() {
    if (!user) return;
    const rows = await listCashflows(user.uid, { from: "1900-01-01" });
    setCashflows(rows);
  }

  useEffect(() => { refresh(); }, [user]);

  const balance = useMemo(()=> computeCashBalance({ cashflows, holdings }), [cashflows, holdings]);

  async function setTargetBalance() {
    if (!user) return;
    const cur = Number(balance || 0);
    const input = prompt("Ustaw saldo gotówki (PLN):", String(Math.max(0, cur)));
    if (input == null) return;
    const target = Number(input.replace(",", "."));
    if (!Number.isFinite(target)) return;
    const delta = target - cur;
    if (Math.abs(delta) < 0.005) return;
    if (delta > 0) {
      await addCashflow(user.uid, { type: CF.DEPOSIT_ADJ, amount: delta, date: new Date().toISOString().slice(0,10), note: "Korekta salda" });
    } else {
      await addCashflow(user.uid, { type: CF.WITHDRAWAL_ADJ, amount: Math.abs(delta), date: new Date().toISOString().slice(0,10), note: "Korekta salda" });
    }
    refresh();
  }

  async function addDividend() {
    if (!user) return;
    const amt = Number(divAmt);
    if (!Number.isFinite(amt) || amt <= 0) return;
    await addCashflow(user.uid, { type: CF.DIVIDEND, amount: amt, date: divDate, note: divNote || "Dywidenda" });
    setDivAmt(""); setDivNote("");
    refresh();
  }

  const fmtPLN = (v)=> new Intl.NumberFormat("pl-PL",{style:"currency",currency:"PLN"}).format(Number(v||0));

  if (!user) return null;

  return (
    <section className="card">
      <div className="card-inner space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="muted text-sm">Saldo gotówki</div>
            <div className="text-2xl font-semibold">{fmtPLN(balance)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-primary" onClick={setTargetBalance}>Ustaw saldo…</button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700/60 p-3">
          <div className="font-semibold mb-2">Dodaj dywidendę</div>
          <div className="flex items-center gap-2 flex-wrap">
            <input className="input !w-40 text-right" placeholder="Kwota (PLN)" inputMode="decimal" value={divAmt} onChange={(e)=>setDivAmt(e.target.value)} />
            <input className="input !w-44" type="date" value={divDate} onChange={(e)=>setDivDate(e.target.value)} />
            <input className="input flex-1 min-w-[180px]" placeholder="Komentarz (opcjonalnie)" value={divNote} onChange={(e)=>setDivNote(e.target.value)} />
            <button className="btn-primary" onClick={addDividend}>Dodaj</button>
          </div>
        </div>
      </div>
    </section>
  );
}
