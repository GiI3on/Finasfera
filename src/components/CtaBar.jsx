// src/components/CtaBar.jsx
"use client";

export default function CtaBar({ onAdd }) {
  return (
    <div className="w-full">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl
                     bg-amber-400 hover:bg-amber-300 active:bg-amber-500
                     text-black font-semibold shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)]
                     transition-colors"
          aria-label="Dodaj transakcję"
        >
          <span className="i-lucide-plus-circle w-5 h-5" />
          Dodaj transakcję
        </button>
      </div>
    </div>
  );
}
