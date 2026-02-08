// src/lib/firebaseAdmin.js
import "server-only";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

/** Bezpieczne pobranie ENV (string albo pusty) */
function env(name) {
  const v = process.env[name];
  return typeof v === "string" ? v : "";
}

/** Buduje credential z ENV i wali czytelnym błędem, gdy brakuje danych */
function buildAdminConfigOrThrow() {
  const projectId =
    env("FIREBASE_PROJECT_ID") || env("GOOGLE_CLOUD_PROJECT") || env("GCLOUD_PROJECT");

  const clientEmail = env("FIREBASE_CLIENT_EMAIL");

  // napraw \n + usuń przypadkowe cudzysłowy na początku/końcu
  const privateKey = env("FIREBASE_PRIVATE_KEY")
    .replace(/\\n/g, "\n")
    .replace(/^"|"$/g, "");

  const missing = [];
  if (!projectId) missing.push("FIREBASE_PROJECT_ID");
  if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");

  if (missing.length) {
    throw new Error(
      `Brak zmiennych ENV na serwerze: ${missing.join(
        ", "
      )}. Ustaw je w Vercel → Project Settings → Environment Variables (Production/Preview/Development) i zrób Redeploy.`
    );
  }

  return {
    projectId,
    credential: cert({ projectId, clientEmail, privateKey }),
  };
}

// Singleton między reloadami (dev/HMR) i w lambdzie
const g = globalThis;

if (!g.__FB_ADMIN_SINGLETON__) {
  const { projectId, credential } = buildAdminConfigOrThrow();

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential,
          projectId,
        });

  const db = getFirestore(app);

  // settings() można ustawić tylko raz
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (_) {}

  const auth = getAuth(app);

  g.__FB_ADMIN_SINGLETON__ = { app, db, auth };
}

const { db: adminDb, auth: adminAuth } = g.__FB_ADMIN_SINGLETON__;

export { adminDb, adminAuth };
