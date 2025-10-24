// src/lib/firebase.js
import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// UŻYJ SWOICH ZMIENNYCH/CONFIGU: poniżej przykład z env
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Jeżeli masz już gdzieś zainicjalizowane, to to go nie zdubluje:
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Eksport bazy (Firestore) – tego oczekuje cashflowStore
export const db = getFirestore(app);
