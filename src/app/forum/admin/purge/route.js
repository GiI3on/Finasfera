// src/app/forum/admin/purge/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


import { NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { isAdmin } from "../../../../lib/isAdmin";

// DELETE /forum/admin/purge?uid=...
export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const uid = url.searchParams.get("uid") || "";
    if (!(await isAdmin(uid))) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // Znajdź testowe wątki
    const candidates = await adminDb.collection("threads")
      .where("author", "in", ["SeedBot"])
      .get();

    const debugQuery = await adminDb.collection("threads")
      .where("tag", "==", "debug")
      .get();

    // złącz unikatowe dokumenty
    const toDeleteMap = new Map();
    candidates.forEach(d => toDeleteMap.set(d.id, d));
    debugQuery.forEach(d => toDeleteMap.set(d.id, d));

    const toDelete = Array.from(toDeleteMap.values());
    let deletedThreads = 0;
    let deletedComments = 0;
    let deletedReactions = 0;

    // helper do skasowania subkolekcji
    async function deleteSubcollection(docRef, sub) {
      const batchSize = 300;
      while (true) {
        const snap = await docRef.collection(sub).limit(batchSize).get();
        if (snap.empty) break;
        const batch = adminDb.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        if (sub === "comments") deletedComments += snap.size;
        if (sub === "reactions") deletedReactions += snap.size;
      }
    }

    // kasowanie
    for (const doc of toDelete) {
      const ref = adminDb.collection("threads").doc(doc.id);
      await deleteSubcollection(ref, "comments");
      await deleteSubcollection(ref, "reactions");
      await ref.delete();
      deletedThreads += 1;
    }

    return NextResponse.json({ ok: true, deletedThreads, deletedComments, deletedReactions }, { status: 200 });
  } catch (e) {
    console.error("[purge] ERROR", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
