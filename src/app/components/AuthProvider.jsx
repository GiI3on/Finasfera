// src/app/components/AuthProvider.js
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "../lib/firebaseClient";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut } from "firebase/auth";

const Ctx = createContext({ user: undefined, signIn: async () => {}, signOut: async () => {} });
export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = nie zalogowany, {} = user
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth) {
      console.warn("[auth] auth client not ready (check Firebase env)");
      // nie blokuj UI w nieskończoność:
      setUser(null);
      return;
    }
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        setUser(u || null);
        setError(null);
      },
      (err) => {
        console.error("[auth] onAuthStateChanged error:", err);
        setError(err);
        setUser(null); // pokaż ekran niezalogowany
      }
    );
    return () => unsub();
  }, []);

  async function signIn() {
    if (!auth) return;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      console.error("[auth] signIn error:", e);
      setError(e);
    }
  }

  async function signOut() {
    if (!auth) return;
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.error("[auth] signOut error:", e);
      setError(e);
    }
  }

  const value = useMemo(() => ({ user, error, signIn, signOut }), [user, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
