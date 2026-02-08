export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const threadId = String(body?.threadId || "").trim();
    const uid = String(body?.uid || "").trim();
    const type = String(body?.type || body?.reaction || "").trim(); // like | heart

    if (!threadId || !uid || !["like", "heart"].includes(type)) {
      return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
    }

    const threadRef = adminDb.collection("threads").doc(threadId);
    const myReactRef = threadRef.collection("reactions").doc(uid);

    await adminDb.runTransaction(async (t) => {
      const threadSnap = await t.get(threadRef);
      const threadData = threadSnap.exists ? threadSnap.data() : {};
      const prev = threadData?.reactions || { like: 0, heart: 0 };

      const mySnap = await t.get(myReactRef);
      const prevType = mySnap.exists ? mySnap.data()?.type : null;

      let like = Number(prev.like || 0);
      let heart = Number(prev.heart || 0);

      if (prevType === type) {
        if (type === "like")  like  = Math.max(0, like  - 1);
        if (type === "heart") heart = Math.max(0, heart - 1);
        t.delete(myReactRef);
      } else {
        if (type === "like")  like  += 1;
        if (type === "heart") heart += 1;
        if (prevType === "like")  like  = Math.max(0, like  - 1);
        if (prevType === "heart") heart = Math.max(0, heart - 1);
        t.set(myReactRef, { type, updatedAt: new Date() });
      }

      t.update(threadRef, { reactions: { like, heart } });
    });

    const [thr, mine] = await Promise.all([threadRef.get(), myReactRef.get()]);
    const r = thr.data()?.reactions || { like: 0, heart: 0 };
    const my = mine.exists ? mine.data()?.type : null;

    return NextResponse.json({ ok: true, like: r.like, heart: r.heart, myReaction: my });
  } catch (e) {
    console.error("[POST /forum/reactions] ERROR:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
