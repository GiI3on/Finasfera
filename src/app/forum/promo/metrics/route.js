// src/app/forum/promo/metrics/route.js
import { NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const db = adminDb;

export async function POST(req) {
  try {
    const body = await req.json();
    const threadId = body?.threadId;
    const kind = body?.kind; // "impression" | "click"

    if (!threadId || !["impression", "click"].includes(kind)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const threadRef = db.collection("threads").doc(threadId);
    const incField =
      kind === "impression" ? "promoMetrics.impressions" : "promoMetrics.clicks";

    await threadRef.set({ [incField]: FieldValue.increment(1) }, { merge: true });

    const snap = await threadRef.get();
    const data = snap.data() || {};
    const promoMetrics = data.promoMetrics || { impressions: 0, clicks: 0 };

    return NextResponse.json(
      { ok: true, promoMetrics: { impressions: promoMetrics.impressions || 0, clicks: promoMetrics.clicks || 0 } },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 400 });
  }
}
