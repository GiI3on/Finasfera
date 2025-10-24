// src/app/components/TxModals.js
"use client";

import React, { useState } from "react";

/* ================== Pomocnicze ================== */
const fmtPLN = (v) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(Number(v || 0));

/* ================== Bazowe prymitywy modala ================== */
/** Prosty, wielokrotnego użytku modal (overlay + kontener) */
export function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <div className="relative z-[91] w-[min(720px,92vw)] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children, onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
      <h3 className="font-semibold">{children}</h3>
      {onClose && (
        <button
          onClick={onClose}
          className="rounded px-2 py-1 text-zinc-300 hover:bg-zinc-800"
          aria-label="Zamknij"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children }) {
  return <div className="px-4 py-3">{children}</div>;
}

export function ModalFooter({ children }) {
  return <div className="flex items-center justify-end gap-2 border-t border-zinc-700 px-4 py-3">{children}</div>;
}

/* ================== Twoje istniejące modale ================== */

export function DepositWithdrawModal({ open, onClose, onSave }) {
  const [type, setType] = useState("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [ts, setTs] = useState(new Date().toISOString().slice(0, 16));
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 grid place-items-center p-3">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
        <h3 className="text-lg font-semibold mb-3">Wpłata / Wypłata</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="muted text-sm w-28">Typ</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="DEPOSIT">Wpłata</option>
              <option value="WITHDRAWAL">Wypłata</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="muted text-sm w-28">Kwota (PLN)</label>
            <input
              className="input"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="np. 2000"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="muted text-sm w-28">Data</label>
            <input type="datetime-local" className="input" value={ts} onChange={(e) => setTs(e.target.value)} />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button className="px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800" onClick={onClose}>
              Anuluj
            </button>
            <button
              className="btn-primary"
              onClick={() => onSave({ type, amount: Number(amount || 0), ts: new Date(ts) })}
            >
              Zapisz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SellModal({ open, lot, onClose, onSave }) {
  const [qty, setQty] = useState(lot?.shares ?? 0);
  const [price, setPrice] = useState("");
  const [fee, setFee] = useState("");
  const [ts, setTs] = useState(new Date().toISOString().slice(0, 16));
  if (!open) return null;

  const max = Number(lot?.shares || 0);
  const val = Number(qty || 0) * Number(price || 0) - (Number(fee || 0) || 0);

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 grid place-items-center p-3">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
        <h3 className="text-lg font-semibold mb-1">
          Sprzedaj – {lot?.name} ({lot?.pair?.yahoo || "—"})
        </h3>
        <p className="muted text-sm mb-3">Dostępne: {max}</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="muted text-sm w-28">Ilość</label>
            <input
              className="input"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(Math.min(max, Math.max(0, Number(e.target.value || 0))))}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="muted text-sm w-28">Cena (PLN)</label>
            <input className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <label className="muted text-sm w-28">Prowizja (PLN)</label>
            <input className="input" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <label className="muted text-sm w-28">Data</label>
            <input type="datetime-local" className="input" value={ts} onChange={(e) => setTs(e.target.value)} />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-zinc-400">
              Wpływ netto: <span className="font-semibold text-zinc-200">{fmtPLN(val)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800" onClick={onClose}>
                Anuluj
              </button>
              <button
                className="btn-primary"
                onClick={() =>
                  onSave({ qty: Number(qty || 0), price: Number(price || 0), fee: Number(fee || 0), ts: new Date(ts) })
                }
                disabled={!qty || !price}
              >
                Sprzedaj
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
