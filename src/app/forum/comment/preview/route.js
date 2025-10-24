// src/app/forum/comment/route.js
import { NextResponse } from "next/server";
import { adminDb } from "../../../../../lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/* ===== Pomocnik: znajdź wątek po docId / id / publicId ===== */
async function resolveThreadRef(threadId) {
  const threads = adminDb.collection("threads");
  const idStr = String(threadId);

  // 1) docId
  const directRef = threads.doc(idStr);
  const directSnap = await directRef.get();
  if (directSnap.exists) return directRef;

  // 2) pole "id" (string lub number)
  const byId = await threads.where("id", "==", idStr).limit(1).get();
  if (!byId.empty) return threads.doc(byId.docs[0].id);

  const n = Number(idStr);
  if (Number.isFinite(n)) {
    const byIdNum = await threads.where("id", "==", n).limit(1).get();
    if (!byIdNum.empty) return threads.doc(byIdNum.docs[0].id);
  }

  // 3) pole "publicId"
  const byPublic = await threads.where("publicId", "==", idStr).limit(1).get();
  if (!byPublic.empty) return threads.doc(byPublic.docs[0].id);
  if (Number.isFinite(n)) {
    const byPublicNum = await threads.where("publicId", "==", n).limit(1).get();
    if (!byPublicNum.empty) return threads.doc(byPublicNum.docs[0].id);
  }

  return null;
}

/* ============================================================
   GET /forum/comment?threadId=...&limit=200&sort=new|top
   -> pobiera komentarze (preview i pełne)
   ============================================================ */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const threadId = (url.searchParams.get("threadId") || "").trim();
    const limitRaw = Number(url.searchParams.get("limit") || 200);
    const sort = (url.searchParams.get("sort") || "new").toLowerCase();

    if (!threadId)
      return NextResponse.json({ error: "missing threadId" }, { status: 400 });

    const threadRef = await resolveThreadRef(threadId);
    if (!threadRef)
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    let q = threadRef.collection("comments");
    if (sort === "top") {
      try {
        q = q.orderBy("score", "desc").orderBy("createdAt", "desc");
      } catch {
        q = q.orderBy("createdAt", "desc");
      }
    } else {
      q = q.orderBy("createdAt", "desc");
    }

    const lim = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(1000, limitRaw))
      : 200;
    q = q.limit(lim);

    const snap = await q.get();
    const comments = snap.docs.map((d) => {
      const data = d.data() || {};
      const createdAt =
        data?.createdAt && typeof data.createdAt?.toDate === "function"
          ? data.createdAt.toDate().toISOString()
          : data?.createdAt
          ? new Date(data.createdAt).toISOString()
          : null;

      return {
        id: d.id,
        uid: data.uid || null,
        name: data.name || data.author || "Użytkownik",
        body: data.body || "",
        createdAt,
        score: Number(data.score || 0),
      };
    });

    return NextResponse.json({ comments }, { status: 200 });
  } catch (e) {
    console.error("[GET /forum/comment] ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST /forum/comment
   body: { threadId, uid?, name?, body }
   -> dodaje komentarz
   ============================================================ */
export async function POST(req) {
  try {
    const payload = await req.json().catch(() => ({}));
    const threadId = String(payload?.threadId || "").trim();
    let uid = String(payload?.uid || "").trim();
    const name = String(payload?.name || "Użytkownik").trim();
    const body = String(payload?.body || "").trim();

    if (!threadId || !body) {
      return NextResponse.json(
        { ok: false, error: "missing threadId / body" },
        { status: 400 }
      );
    }
    if (!uid) uid = "anon";

    const now = new Date();
    const threadRef =
      (await resolveThreadRef(threadId)) ||
      adminDb.collection("threads").doc(String(threadId));
    const commentsRef = threadRef.collection("comments");

    const newComment = { uid, name, body, createdAt: now, score: 0 };
    const doc = await commentsRef.add(newComment);

    // aktualizacje pomocnicze (nie blokują)
    threadRef
      .update({
        repliesCount: FieldValue.increment(1),
        lastPostAt: now,
      })
      .catch(() => {});

    const userRef = adminDb.collection("users").doc(uid);
    adminDb
      .runTransaction(async (t) => {
        const snap = await t.get(userRef);
        const data = snap.exists ? snap.data() : {};
        let last = null;
        const raw = data?.lastActiveAt || null;
        if (raw)
          last =
            typeof raw?.toDate === "function"
              ? raw.toDate()
              : raw instanceof Date
              ? raw
              : new Date(raw);
        let dayStreak = Number(data?.dayStreak || 0);
        const today = new Date();
        let diffDays = 999;
        if (last) {
          const lastUTC = Date.UTC(
            last.getFullYear(),
            last.getMonth(),
            last.getDate()
          );
          const todayUTC = Date.UTC(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          );
          diffDays = Math.round((todayUTC - lastUTC) / 86400000);
        }
        if (!last) dayStreak = 1;
        else if (diffDays === 0) dayStreak = Math.max(dayStreak, 1);
        else if (diffDays === 1) dayStreak = dayStreak + 1;
        else if (diffDays > 1) dayStreak = 1;

        t.set(
          userRef,
          {
            name,
            stats: { commentsGiven: FieldValue.increment(1) },
            lastActiveAt: today,
            dayStreak,
          },
          { merge: true }
        );
      })
      .catch(() => {});

    return NextResponse.json(
      {
        ok: true,
        comment: { id: doc.id, ...newComment, createdAt: now.toISOString() },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[POST /forum/comment] ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE /forum/comment?threadId=...&commentId=...
   -> usuwa komentarz (opcjonalnie admin)
   ============================================================ */
export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const threadId = (url.searchParams.get("threadId") || "").trim();
    const commentId = (url.searchParams.get("commentId") || "").trim();

    if (!threadId || !commentId) {
      return NextResponse.json(
        { ok: false, error: "missing ids" },
        { status: 400 }
      );
    }

    const threadRef =
      (await resolveThreadRef(threadId)) ||
      adminDb.collection("threads").doc(String(threadId));

    await threadRef
      .collection("comments")
      .doc(commentId)
      .delete()
      .catch(() => {});
    await threadRef
      .update({
        repliesCount: FieldValue.increment(-1),
        lastPostAt: new Date(),
      })
      .catch(() => {});

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[DELETE /forum/comment] ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
