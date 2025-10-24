// src/app/components/CompanyLogo.jsx
"use client";

export default function CompanyLogo({ symbol, name, size = 24, className = "" }) {
  const src = `/api/logo?symbol=${encodeURIComponent(symbol || "")}`;
  return (
    <img
      src={src}
      alt={name || symbol}
      width={size}
      height={size}
      loading="lazy"
      className={`rounded-full bg-zinc-800 ring-1 ring-zinc-700/40 object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
