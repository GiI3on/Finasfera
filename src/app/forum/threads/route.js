export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { apiCreateThread } from "../apiHandlers";
// ⬇⬇⬇ poprawna ścieżka do src/lib/firebaseAdmin z poziomu: src/app/forum/threads/route.js
import { adminDb } from "../../../lib/firebaseAdmin";

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

      // ⬇⬇⬇ DODANE: autor i flaga anonimowości
      uid,
      name,
      isAnonymous,
    } = body || {};

    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: "Brak treści posta." }, { status: 422 });
    }

    // Nie używamy już pola "title" od użytkownika — generujemy krótki tytuł z treści:
    const autoTitle =
      String(content).trim().split(/\n/)[0].slice(0, 120) || "(bez tytułu)";

    // Nazwa autora z uwzględnieniem anonimizacji
    const authorName = isAnonymous ? "Anon" : (name || "Użytkownik");

    // 1) Tworzenie wątku przez Twój handler (jak dotychczas)
    const created = await apiCreateThread({
      title: autoTitle,                 // ← automatyczny tytuł
      body: String(content || ""),
      tag: tag ? String(tag) : undefined,
      isPromoted: !!isPromoted,
      sponsoredBy: sponsoredBy ? String(sponsoredBy) : undefined,
      promotedUntil: promotedUntil ? String(promotedUntil) : undefined,
      promoUrl: promoUrl ? String(promoUrl) : undefined,

      // Przekazujemy też pola autora – jeśli apiCreateThread je zapisuje, super:
      authorId: uid || null,
      author: authorName,
      isAnonymous: !!isAnonymous,

      // I startowe reakcje (na wszelki wypadek)
      reactions: { like: 0, heart: 0 },

      // DOBRA PRAKTYKA: count na 0 (jeśli Twój handler to respektuje)
      repliesCount: 0,
      views: 0,
    });

    // 2) DOPILNUJEMY spójności w dokumencie (gdyby apiCreateThread zignorował powyższe)
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
          // jeśli nie istnieją, ustaw bezpieczne domyślne:
          reactions: { like: 0, heart: 0 },
          repliesCount: 0,
          views: 0,
        };

        // Ustaw daty, tylko jeśli dokument ich nie ma (set merge je po prostu doda)
        patch.createdAt = now;
        patch.lastPostAt = now;

        await adminDb.collection("threads").doc(id).set(patch, { merge: true });
      }
    } catch (_) {
      // cicho — to tylko „best-effort” patch
    }

    return NextResponse.json(created, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: e?.status || 400 }
    );
  }
}

/* DELETE /forum/threads?id=... → (admin) usuwa wątek wraz z podkolekcjami */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Brak id" }, { status: 422 });

    const db = adminDb;
    const threadRef = db.collection("threads").doc(id);

    // ⬇⬇⬇ usuń comments (zamiast posts — spójne z resztą projektu)
    const commentsSnap = await threadRef.collection("comments").limit(500).get();
    const batch1 = db.batch();
    commentsSnap.forEach((d) => batch1.delete(d.ref));
    await batch1.commit();

    // usuń reactions
    const reactSnap = await threadRef.collection("reactions").limit(500).get();
    const batch2 = db.batch();
    reactSnap.forEach((d) => batch2.delete(d.ref));
    await batch2.commit();

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
