"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, googleProvider } from "../lib/firebaseClient";
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from "firebase/auth";

const Ctx = createContext({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ustaw trwałość sesji i język
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        auth.useDeviceLanguage?.();
      } catch (e) {
        console.error("[Auth] setPersistence error:", e);
      } finally {
        if (!cancelled) setLoading((l) => l); // no-op, czekamy na onAuthStateChanged
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Nasłuch stanu użytkownika (z porządkiem sprzątania)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const api = useMemo(
    () => ({
      user,
      loading,
      signIn: async () => {
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (e) {
          // Safari/iOS lub blokada popupu — fallback do redirect
          const code = (e && e.code) || "";
          const blocked =
            code === "auth/popup-blocked" ||
            code === "auth/popup-closed-by-user" ||
            code === "auth/cancelled-popup-request";
          if (blocked) {
            await signInWithRedirect(auth, googleProvider);
            return;
          }
          console.error("[Auth] signIn error:", e);
          alert("Nie udało się otworzyć logowania. Spróbuj ponownie.");
        }
      },
      signOut: async () => {
        try {
          await fbSignOut(auth);
        } catch (e) {
          console.error("[Auth] signOut error:", e);
          alert("Wylogowanie nie powiodło się. Spróbuj ponownie.");
        }
      },
    }),
    [user, loading]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
