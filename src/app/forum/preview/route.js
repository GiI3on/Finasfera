// src/app/forum/comments/preview/route.js
import { NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin";

// GET /forum/comments/preview?threadId=...&limit=2&sort=top
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const threadId = url.searchParams.get("threadId");
    const limit = Math.min(Number(url.searchParams.get("limit") || 2), 5);
    // sort=top: wymagane pole denormalizowane "score" w komentarzu (np. likeCount, heartCount)
    // fallback: createdAt desc
    const sort = url.searchParams.get("sort") || "top";
    if (!threadId) return NextResponse.json({ comments: [] }, { status: 200 });

    let q = adminDb.collection("threads").doc(threadId).collection("comments");
    if (sort === "top") {
      q = q.orderBy("score", "desc").orderBy("createdAt", "desc");
    } else {
      q = q.orderBy("createdAt", "desc");
    }
    const snap = await q.limit(limit).get();
    const comments = snap.docs.map((d) => {
      const c = d.data() || {};
      return {
        id: d.id,
        uid: c.uid || null,
        name: c.name || "Użytkownik",
        body: c.body || "",
        createdAt: c.createdAt?.toDate?.()?.toISOString?.() || c.createdAt || null,
        score: Number(c.score ?? 0),
      };
    });

    return NextResponse.json({ comments }, { status: 200 });
  } catch (e) {
    console.error("[/forum/comments/preview] ERROR:", e);
    return NextResponse.json({ comments: [] }, { status: 200 });
  }
}
