"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

/** Linki głównej nawigacji */
const links = [
  { href: "/", label: "Symulator Celu" },
  { href: "/fire-path", label: "Etapy Wolności" },
  { href: "/moj-portfel", label: "Śledzenie Akcji" },
  { href: "/statystyki",  label: "Statystyki" },
  { href: "/forum", label: "Forum" },
];

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function TopNav() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signIn, signOut } = useAuth();

  // ⬇️ Zamknij wszystkie panele/menu przy każdej zmianie ścieżki
  useEffect(() => {
    setOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const initials =
    user?.displayName
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-md supports-[backdrop-filter]:bg-black/60">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-semibold text-xl tracking-tight shrink-0">
          <span className="text-zinc-100">Fina</span>
          <span className="text-yellow-400">sfera</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {links.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
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

        {/* Prawy bok: auth */}
        <div className="hidden md:flex items-center">
          {!user && (
            <button className="btn-primary h-9 px-3" onClick={signIn}>
              Zaloguj się
            </button>
          )}

          {user && (
            <div
              className="relative"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-zinc-800/60 transition-colors"
                onClick={() => setMenuOpen((s) => !s)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "avatar"}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-zinc-800"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-zinc-700 grid place-items-center text-xs ring-2 ring-zinc-800">
                    {initials}
                  </div>
                )}
                <span className="text-sm text-zinc-300 max-w-[140px] truncate hidden lg:block">
                  {user.displayName || user.email}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" className={`text-zinc-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}>
                  <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-700/60 bg-zinc-900 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-4 py-3 border-b border-zinc-800/50">
                    <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Zalogowano jako</p>
                    <p className="truncate text-zinc-200 text-sm font-medium mt-1">
                      {user.email}
                    </p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/moj-portfel"
                      className="block px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      Mój portfel
                    </Link>
                    <button
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors mt-1"
                      onClick={() => { setMenuOpen(false); signOut(); }}
                    >
                      Wyloguj się
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile burger button */}
        <button
          className="md:hidden p-2 -mr-2 text-zinc-300 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
          onClick={() => setOpen((s) => !s)}
          aria-label="Otwórz menu"
          aria-expanded={open}
        >
          {open ? (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
               {/* ⬇️ TUTAJ BYŁ BŁĄD: strokeJoin -> strokeLinejoin */}
               <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              {/* ⬇️ TUTAJ BYŁ BŁĄD: strokeJoin -> strokeLinejoin */}
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile panel (Overlay) */}
      {open && (
        <div className="md:hidden absolute top-14 left-0 w-full bg-zinc-950 border-b border-zinc-800 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col p-4 space-y-1">
            {links.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    active 
                      ? "bg-yellow-400/10 text-yellow-400" 
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              );
            })}

            <div className="h-px bg-zinc-800 my-2 mx-4" />

            {/* Auth w mobile */}
            {!user ? (
              <button
                className="btn-primary w-full h-11 text-base mt-2"
                onClick={() => { setOpen(false); signIn(); }}
              >
                Zaloguj się
              </button>
            ) : (
              <div className="px-4 py-2">
                <div className="flex items-center gap-3 mb-4">
                   {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="avatar"
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-zinc-800"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-zinc-700 grid place-items-center text-sm">{initials}</div>
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium text-white truncate">{user.displayName}</span>
                    <span className="text-xs text-zinc-500 truncate">{user.email}</span>
                  </div>
                </div>
                
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-zinc-800 text-red-400 hover:bg-zinc-900 transition-colors text-sm font-medium"
                  onClick={() => { setOpen(false); signOut(); }}
                >
                  Wyloguj się
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}