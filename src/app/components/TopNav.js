"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Kalkulator FIRE" },
  { href: "/sciezka-fire", label: "Twoja ścieżka FIRE" },
  { href: "/moj-portfel", label: "Mój portfel" },
];

export default function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/50">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-semibold text-xl tracking-tight">
          <span className="text-zinc-100">Fina</span>
          <span className="text-yellow-400">sfera</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-base font-medium relative transition-colors ${
                  active ? "text-yellow-400" : "text-zinc-300 hover:text-zinc-100"
                }`}
              >
                {l.label}
                {active && (
                  <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-yellow-400/80 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Prawy bok – placeholder logowania */}
        <div className="hidden md:flex">
          <button
            className="btn-primary h-9 px-3"
            onClick={() => alert('TODO: logowanie')}
          >
            Zaloguj się
          </button>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden text-zinc-300 hover:text-zinc-100"
          onClick={() => setOpen((s) => !s)}
          aria-label="Menu"
        >
          ☰
        </button>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div className="md:hidden border-t border-zinc-800 bg-black">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-col gap-2">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`py-1 ${
                    active ? "text-yellow-400" : "text-zinc-300 hover:text-zinc-100"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              );
            })}
            <button
              className="btn-primary h-10 mt-2"
              onClick={() => alert('TODO: logowanie')}
            >
              Zaloguj się
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
