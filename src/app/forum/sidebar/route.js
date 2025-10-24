import { NextResponse } from "next/server";
import { apiGetSidebarData } from "../apiHandlers";
import { adminDb } from "../../../lib/firebaseAdmin";

// ENV: ADMIN_UIDS="uid1,uid2,uid3"
function isEnvAdmin(uid) {
  if (!uid) return false;
  const raw = process.env.ADMIN_UIDS || "";
  const list = raw.split(",").map(s => s.trim()).filter(Boolean);
  return list.includes(uid);
}

// Firestore: kolekcja admins/{uid} z { isAdmin: true }
async function isFirestoreAdmin(uid) {
  try {
    if (!uid) return false;
    const snap = await adminDb.collection("admins").doc(uid).get();
    const data = snap.exists ? snap.data() : null;
    return !!(data && data.isAdmin);
  } catch {
    return false;
  }
}

// GET /forum/sidebar?uid=...&name=...
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const name = searchParams.get("name");

    // bazowe dane (rank/badges/promoted itp.)
    const base = await apiGetSidebarData(uid || undefined, name || undefined);

    // DEV: na localhost (NODE_ENV !== 'production') pokaż panel zawsze
    let isAdmin = process.env.NODE_ENV !== "production";

    // PROD: whitelist z ENV lub Firestore
    if (!isAdmin) {
      const flagEnv = isEnvAdmin(uid);
      const flagFs = await isFirestoreAdmin(uid);
      isAdmin = flagEnv || flagFs;
    }

    // dopnij isAdmin + uid do profilu
    const profile = { ...(base?.profile || {}), isAdmin, uid };

    return NextResponse.json(
      { profile, promoted: base?.promoted || [] },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: (e && e.message) || "Server error" },
      { status: 500 }
    );
  }
}
