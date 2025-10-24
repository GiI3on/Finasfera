import { NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { computeRank, computeBadges } from "../../../../lib/achievements";

export async function POST(req) {
  try {
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ ok:false, error:"missing uid" }, { status:400 });

    const ref = adminDb.collection("users").doc(uid);
    const snap = await ref.get();
    const user = snap.exists ? snap.data() : { stats: {} };

    const rank = computeRank(user.stats || {});
    const badges = computeBadges(user.stats || {}, user);

    await ref.set({ rank, badges }, { merge: true });
    return NextResponse.json({ ok:true, rank, badges });
  } catch (e) {
    return NextResponse.json({ ok:false, error:e?.message || "server" }, { status:500 });
  }
}
