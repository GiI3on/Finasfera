"use client";

export default function CtaBar({ children }) {
  return (
    <div
      className="
        w-full rounded-xl border border-yellow-600/40 bg-yellow-500/15
        shadow-[inset_0_0_20px_rgba(234,179,8,.15)]
        px-3 py-2
      "
    >
      <div className="flex items-center justify-center gap-3">
        {children}
      </div>
    </div>
  );
}
