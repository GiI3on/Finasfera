// src/lib/isAdmin.js
import "server-only";
import { adminAuth, adminDb } from "./firebaseAdmin";

/**
 * Admin = (custom claim admin === true)  OR  users/{uid}.isAdmin === true  OR  UID w ENV.
 * Pozwala wygodnie zarządzać rolami i mieć awaryjną listę w .env.
 */
export async function isAdmin(uid) {
  if (!uid) return false;

  // ENV awaryjnie (np. ADMIN_UIDS="uid1,uid2")
  const env = (process.env.ADMIN_UIDS || "")
    .split(/[,;\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  if (env.includes(String(uid))) return true;

  // Custom claims (polecane)
  try {
    const user = await adminAuth.getUser(String(uid));
    if (user.customClaims?.admin === true) return true;
  } catch (_) {}

  // Flaga w Firestore
  try {
    const u = await adminDb.collection("users").doc(String(uid)).get();
    if (u.exists && u.data()?.isAdmin === true) return true;
  } catch (_) {}

  return false;
}
