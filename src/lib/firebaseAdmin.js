// src/lib/firebaseAdmin.js
import "server-only";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function env(name) {
  const v = process.env[name];
  return typeof v === "string" ? v : "";
}

function readAdminConfig() {
  const projectId =
    env("FIREBASE_PROJECT_ID") || env("GOOGLE_CLOUD_PROJECT") || env("GCLOUD_PROJECT");

  const clientEmail = env("FIREBASE_CLIENT_EMAIL");

  // napraw \n + usuń przypadkowe cudzysłowy na początku/końcu
  const privateKey = env("FIREBASE_PRIVATE_KEY")
    .replace(/\\n/g, "\n")
    .replace(/^"|"$/g, "");

  return { projectId, clientEmail, privateKey };
}

function initAdminIfNeeded() {
  const g = globalThis;

  if (g.__FB_ADMIN_SINGLETON__) return g.__FB_ADMIN_SINGLETON__;

  const { projectId, clientEmail, privateKey } = readAdminConfig();

  // Nie wysypuj buildu – zapamiętaj, że brakuje ENV
  if (!projectId || !clientEmail || !privateKey) {
    g.__FB_ADMIN_SINGLETON__ = { app: null, db: null, auth: null, missing: true };
    return g.__FB_ADMIN_SINGLETON__;
  }

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          projectId,
        });

  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (_) {}

  const auth = getAuth(app);

  g.__FB_ADMIN_SINGLETON__ = { app, db, auth, missing: false };
  return g.__FB_ADMIN_SINGLETON__;
}

function assertReady(s) {
  if (s?.missing || !s?.db) {
    const missing = [];
    if (!env("FIREBASE_PROJECT_ID")) missing.push("FIREBASE_PROJECT_ID");
    if (!env("FIREBASE_CLIENT_EMAIL")) missing.push("FIREBASE_CLIENT_EMAIL");
    if (!env("FIREBASE_PRIVATE_KEY")) missing.push("FIREBASE_PRIVATE_KEY");

    throw new Error(
      `Brak ENV na serwerze: ${missing.join(
        ", "
      )}. Dodaj je w Vercel → PROJECT Settings → Environment Variables (Production/Preview) i zrób Redeploy.`
    );
  }
}

export const adminDb = new Proxy(
  {},
  {
    get(_t, prop) {
      const s = initAdminIfNeeded();
      assertReady(s);
      return s.db[prop];
    },
  }
);

export const adminAuth = new Proxy(
  {},
  {
    get(_t, prop) {
      const s = initAdminIfNeeded();
      assertReady(s);
      return s.auth[prop];
    },
  }
);
