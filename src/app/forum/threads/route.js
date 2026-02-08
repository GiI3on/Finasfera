// src/app/forum/threads/route.js
import { NextResponse } from "next/server";
import { apiCreateThread } from "../apiHandlers";
import { adminDb } from "../../../lib/firebaseAdmin";
import { isAdmin } from "../../../lib/isAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /forum/threads  → tworzy nowy wątek (wywoływane przez modal „Utwórz post”) */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      body: content = "",
      tag,
      isPromoted,
      sponsoredBy,
      promotedUntil,
      promoUrl,

      // autor + flaga anonimowości
      uid,
      name,
      isAnonymous,
    } = body || {};

    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: "Brak treści posta." }, { status: 422 });
    }

    // auto tytuł z 1. linii
    const autoTitle =
      String(content).trim().split(/\n/)[0].slice(0, 120) || "(bez tytułu)";

    // autor z anonimizacją
    const authorName = isAnonymous ? "Anon" : (name || "Użytkownik");

    // 1) create przez handler
    const created = await apiCreateThread({
      title: autoTitle,
      body: String(content || ""),
      tag: tag ? String(tag) : undefined,
      isPromoted: !!isPromoted,
      sponsoredBy: sponsoredBy ? String(sponsoredBy) : undefined,
      promotedUntil: promotedUntil ? String(promotedUntil) : undefined,
      promoUrl: promoUrl ? String(promoUrl) : undefined,

      // dodatkowe pola (handler może zignorować — potem patch)
      authorId: uid || null,
      author: authorName,
      isAnonymous: !!isAnonymous,
      reactions: { like: 0, heart: 0 },
      repliesCount: 0,
      views: 0,
    });

    // 2) best-effort patch w Firestore (spójność)
    try {
      const id =
        created?.id ||
        created?.docId ||
        created?.threadId ||
        (typeof created === "string" ? created : null);

      if (id) {
        const now = new Date();
        const patch = {
          authorId: uid || null,
          author: authorName,
          isAnonymous: !!isAnonymous,
          reactions: { like: 0, heart: 0 },
          repliesCount: 0,
          views: 0,
          createdAt: now,
          lastPostAt: now,
        };

        await adminDb.collection("threads").doc(id).set(patch, { merge: true });
      }
    } catch (_) {}

    return NextResponse.json(created, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: e?.status || 400 }
    );
  }
}

/* DELETE /forum/threads?id=...&uid=... → (admin) usuwa wątek wraz z podkolekcjami */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);

    const id = (searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "Brak id" }, { status: 422 });

    const uid = (searchParams.get("uid") || "").trim();
    if (!(await isAdmin(uid))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const db = adminDb;
    const threadRef = db.collection("threads").doc(id);

    // helper: usuń całą podkolekcję w paczkach
    async function deleteSubcollection(name) {
      while (true) {
        const snap = await threadRef.collection(name).limit(500).get();
        if (snap.empty) break;
        const batch = db.batch();
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // usuń komentarze / posty / reakcje (bezpiecznie)
    await deleteSubcollection("comments");
    await deleteSubcollection("posts");
    await deleteSubcollection("reactions");

    // usuń dokument wątku
    await threadRef.delete();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 400 }
    );
  }
}
