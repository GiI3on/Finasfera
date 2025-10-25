"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

/** Linki głównej nawigacji */
const links = [
  { href: "/", label: "Kalkulator FIRE" },
  { href: "/fire-path", label: "Twoja ścieżka FIRE" },
  { href: "/moj-portfel", label: "Mój portfel" },
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
          {/* Niezalogowany */}
          {!user && (
            <button className="btn-primary h-9 px-3" onClick={signIn}>
              Zaloguj się
            </button>
          )}

          {/* Zalogowany: avatar + menu */}
          {user && (
            <div
              className="relative"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-zinc-800/60"
                onClick={() => setMenuOpen((s) => !s)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "avatar"}
                    className="h-8 w-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-zinc-700 grid place-items-center text-xs">
                    {initials}
                  </div>
                )}
                <span className="text-sm text-zinc-300 max-w-[140px] truncate">
                  {user.displayName || user.email}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" className="text-zinc-400">
                  <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-700/60 bg-zinc-900/95 shadow-lg overflow-hidden"
                >
                  <div className="px-3 py-2 text-xs text-zinc-400">
                    Zalogowano jako
                    <div className="truncate text-zinc-200 text-sm">
                      {user.email}
                    </div>
                  </div>
                  <Link
                    href="/moj-portfel"
                    className="block px-3 py-2 text-sm hover:bg-zinc-800/70"
                    onClick={() => setMenuOpen(false)}
                  >
                    Mój portfel
                  </Link>
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-800/70 text-red-300"
                    onClick={() => { setMenuOpen(false); signOut(); }}
                  >
                    Wyloguj się
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden text-zinc-300 hover:text-zinc-100 p-2"
          onClick={() => setOpen((s) => !s)}
          aria-label="Otwórz menu"
          aria-expanded={open}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div className="md:hidden border-t border-zinc-800 bg-black">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-col gap-3">
            {links.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`${active ? "text-yellow-400" : "text-zinc-300 hover:text-zinc-100"}`}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              );
            })}

            {/* Auth w mobile */}
            {!user ? (
              <button
                className="btn-primary h-10"
                onClick={() => { setOpen(false); signIn(); }}
              >
                Zaloguj się
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="avatar"
                      className="h-8 w-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-zinc-700 grid place-items-center text-xs">{initials}</div>
                  )}
                  <span className="text-sm text-zinc-300">{user.displayName || user.email}</span>
                </div>
                <button
                  className="text-red-300 hover:text-red-200 underline"
                  onClick={() => { setOpen(false); signOut(); }}
                >
                  Wyloguj
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
