// src/app/components/AddTransactionButton.jsx
"use client";
import { useState } from "react";
import { Modal, ModalHeader, ModalBody } from "./TxModals";
import TransactionForm from "./TransactionForm";

export default function AddTransactionButton({ uid, portfolioId }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="px-3 py-1.5 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400"
        onClick={() => setOpen(true)}
      >
        Dodaj transakcję
      </button>

      <Modal open={open} onClose={() => setOpen(false)} maxWidth="max-w-3xl">
        <ModalHeader title="Dodaj transakcję" onClose={() => setOpen(false)} />
        <ModalBody>
          <TransactionForm
            uid={uid}
            portfolioId={portfolioId}
            onDone={() => setOpen(false)}
          />
        </ModalBody>
      </Modal>
    </>
  );
}
