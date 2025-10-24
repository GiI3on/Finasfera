// src/lib/firePathChecklist.js
"use client";

/**
 * Moduł obsługuje checklistę FIRE.
 * Działa z Firestore (gdy dostępne) oraz lokalnie (fallback – localStorage).
 */

// ====== Bezpieczny import Firebase ======
let db = null;
try {
  const firebase = require("../firebase");
  db = firebase.db || firebase.firestore || null;
} catch {
  db = null;
}

// Łagodny import funkcji Firestore
let fs = {};
try {
  fs = require("firebase/firestore");
} catch {
  fs = {};
}

const { doc, getDoc, setDoc, onSnapshot, serverTimestamp } = fs;

/** =========================================================
 *  KANON ZADAŃ – skrócone, neutralne i równe długości
 *  (tak by mieściły się w kapsułkach bez brzydkich łamań)
 *  ========================================================= */
export const DEFAULT_LEVELS_CANON = [
  {
    id: "basic",
    name: "Podstawy",
    tasks: [
      "Utworzono budżet domowy",
      "Zidentyfikowano stałe koszty (abon., rach.)",
      "Włączono powiadomienia bankowe",
      "Lista celów na 12 miesięcy",
      "Poduszka 1 mies. wydatków",
      "Automatyczna wpłata oszczędności",
      "Pierwsza inwestycja/ETF z planu",
      "Konto oszcz./IKE/IKZE/PPK",
      "Przegląd subskrypcji – rezygnacje",
      "Zapas gotówki na awarie (≥500 zł)",
    ],
  },
  {
    id: "steady",
    name: "Stabilizacja",
    tasks: [
      "Stała wpłata miesięczna ustalona",
      "Poduszka 3–6 mies. wydatków",
      "Plan spłaty długów (jeśli są)",
      "Automatyzacja wpłat inwest.",
      "Pierwszy rebalancing roczny",
      "Koszty portfela < 0,60% rocznie",
      "12 mies. wpłat bez przerw",
      "Benchmark do porównań wybrany",
      "Prosty plan alokacji (np. 80/20)",
      "Dziennik decyzji (krótkie notatki)",
    ],
  },
  {
    id: "invest",
    name: "Inwestowanie",
    tasks: [
      "Śr. zwrot ≥ 4% przez 3 lata (netto)",
      "Śr. zwrot ≥ 6% przez 5 lat (netto)",
      "Śr. zwrot ≥ 7% przez 7 lat (netto)",
      "Dochód pasywny ≥ 50% wydatków/mies.",
      "10 lat na rynku bez łamania planu",
      "Dywersyfikacja: ≥3 klasy aktywów",
      "Plan alokacji spisany i trzymany",
      "Ścieżka podatkowa zoptymalizowana",
      "Roczne podsumowanie decyzji",
      "Test: 1 mies. z pasywnego dochodu",
    ],
  },
  {
    id: "lifestyle",
    name: "Styl życia FIRE",
    tasks: [
      "Minimalizm zakupowy (lista, budżet)",
      "1 nawyk oszczędzania tygodniowo",
      "Reguła anty-FOMO na spadki/wzrosty",
      "Cyfrowy porządek: backup finansów",
      "Dzień bez aplikacji giełdowych/tydz.",
      "Edukacja: 1 książka/rok o finansach",
      "Zdrowe zamienniki zamiast zakupów",
      "Plan prezentów bez długów",
      "Tydzień bez dostaw jedzenia",
      "Wolontariat/mentoring finansowy",
    ],
  },
  {
    id: "extreme",
    name: "Ekstremalne",
    tasks: [
      "Wartość portfela = 50% celu",
      "Wartość portfela = 75% celu",
      "Wartość portfela = 100% celu",
      "Dochód pasywny ≥ 120% wydatków/mies.",
      "Śr. zwrot ≥ 8% przez 10 lat (netto)",
      "Koszt portfela < 0,30% rocznie",
      "5 lat bez panic-sell (trzymanie planu)",
      "Plan + środki na 12 mies. bez dochodu",
      "Instrukcja finansowa dla bliskich",
      "Mentoring: wsparcie początkującego",
    ],
  },
];

/* =========================================================
   Firestore helpers
   ========================================================= */
function refFor(uid) {
  if (!db || !uid || typeof doc !== "function") return null;
  try {
    return doc(db, "users", uid, "meta", "firePathChecklist");
  } catch {
    return null;
  }
}

/* ================== API: GET ================== */
export async function getChecklist(uid) {
  const r = refFor(uid);
  if (!r || typeof getDoc !== "function") return null;

  try {
    const snap = await getDoc(r);
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data?.levels) ? data.levels : null;
    }
    return null;
  } catch {
    return null;
  }
}

/* ================== API: SET ================== */
export async function setChecklist(uid, levels) {
  const r = refFor(uid);
  if (!r || typeof setDoc !== "function") return;

  try {
    await setDoc(
      r,
      {
        levels,
        updatedAt:
          typeof serverTimestamp === "function" ? serverTimestamp() : null,
        v: 3, // bump wersji, jeśli chcesz wymusić odświeżenie u wszystkich
      },
      { merge: true }
    );
  } catch {
    // ignore
  }
}

/* ================ API: LISTEN ================ */
export function listenChecklist(uid, cb) {
  const r = refFor(uid);
  if (!r || typeof onSnapshot !== "function") {
    // brak Firestore – brak live-sync
    return () => {};
  }

  try {
    return onSnapshot(r, (snap) => {
      if (!snap.exists()) return cb(null);
      const data = snap.data();
      cb(Array.isArray(data?.levels) ? data.levels : null);
    });
  } catch {
    return () => {};
  }
}
