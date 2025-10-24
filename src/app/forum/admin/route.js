// src/app/forum/admin/route.js
import { NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";
import { isAdmin } from "../../../lib/isAdmin";

/* ===== Usuń pojedynczy wątek ===== */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const threadId = searchParams.get("threadId");

    if (!uid || !(await isAdmin(uid))) {
      return NextResponse.json({ error: "Brak uprawnień administratora." }, { status: 403 });
    }

    if (!threadId) {
      return NextResponse.json({ error: "Brak ID wątku." }, { status: 400 });
    }

    // Usuń główny dokument wątku
    await adminDb.collection("threads").doc(threadId).delete();

    // Usuń komentarze powiązane
    const commentsSnap = await adminDb
      .collection("threads")
      .doc(threadId)
      .collection("comments")
      .get();
    const batch = adminDb.batch();
    commentsSnap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/forum/admin/DELETE] error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

/* ===== Wyczyść testowe wpisy ===== */
export async function POST(req) {
  try {
    const { uid } = await req.json();
    if (!uid || !(await isAdmin(uid))) {
      return NextResponse.json({ error: "Brak uprawnień administratora." }, { status: 403 });
    }

    const snap = await adminDb.collection("threads").where("author", "==", "SeedBot").get();
    const batch = adminDb.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({ ok: true, deleted: snap.size });
  } catch (e) {
    console.error("[/forum/admin/POST] error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
