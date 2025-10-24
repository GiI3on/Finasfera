// src/lib/firebaseAdmin.js
import 'server-only';
import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";


/** Buduje credential z env albo z GOOGLE_APPLICATION_CREDENTIALS */
function buildCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }
  return applicationDefault();
}

// Użyj globalThis, żeby zachować singleton między reloadami (dev/HMR)
const g = globalThis;

if (!g.__FB_ADMIN_SINGLETON__) {
  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: buildCredential(),
        });

  const db = getFirestore(app);
  // settings() wolno ustawić tylko raz – dlatego owijamy w try/catch
  try {
    // jeśli ktoś już ustawił, Firestore rzuci błędem — ignorujemy
    db.settings({ ignoreUndefinedProperties: true });
  } catch (_) {
    // no-op
  }

  const auth = getAuth(app);

  g.__FB_ADMIN_SINGLETON__ = {
    app,
    db,
    auth,
  };
}

const { db: adminDb, auth: adminAuth } = g.__FB_ADMIN_SINGLETON__;

export { adminDb, adminAuth };
