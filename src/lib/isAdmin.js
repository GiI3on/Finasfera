// src/lib/isAdmin.js
import { adminAuth, adminDb } from "./firebaseAdmin";

/**
 * Admin = (custom claim admin === true)  OR  users/{uid}.isAdmin === true  OR  UID w ENV.
 * Pozwala wygodnie zarządzać rolami i mieć awaryjną listę w .env.
 */
console.log("ENV_ADMIN_UIDS:", process.env.ADMIN_UIDS);

export async function isAdmin(uid) {
  if (!uid) return false;

  // ENV awaryjnie (np. ADMIN_UIDS="uid1,uid2")
  const env = (process.env.ADMIN_UIDS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (env.includes(uid)) return true;

  // Custom claims (polecane)
  try {
    const user = await adminAuth.getUser(uid);
    if (user.customClaims?.admin === true) return true;
  } catch (_) {}

  // Flaga w Firestore
  try {
    const u = await adminDb.collection("users").doc(uid).get();
    if (u.exists && u.data()?.isAdmin === true) return true;
  } catch (_) {}

  return false;
}
