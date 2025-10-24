// src/app/forum/promo/create/route.js
import { NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { moderateText } from "../../../../lib/forumCore";

const db = adminDb;

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      threadId,
      title,
      body: content,
      sponsoredBy = null,
      promoUrl = null,
      promotedUntil = null,            // ISO string
      promotionType = "sidebar",       // "post" | "sidebar" | "spotlight" (na razie tylko metadane)
      billing = "flat",                // "flat" | "cpm" | "cpc" (na razie metadane)
      budgetPLN = null
    } = body || {};

    // TODO: auth – wyciągnąć actorId z tokenu
    const actor = { id: "demo", name: "Anon" };

    // tryb A: promowanie istniejącego wątku
    if (threadId) {
      const tRef = db.collection("threads").doc(threadId);
      const updates = {
        isPromoted: true,
        sponsoredBy: sponsoredBy || null,
        promoUrl: promoUrl || null,
        promotionType,
        billing,
        budgetPLN: typeof budgetPLN === "number" ? budgetPLN : null,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (promotedUntil) {
        updates.promotedUntil = Timestamp.fromDate(new Date(promotedUntil));
      }
      await tRef.set(updates, { merge: true });

      return NextResponse.json({ ok: true, id: threadId, mode: "promoted_existing" }, { status: 200 });
    }

    // tryb B: tworzenie nowego wątku promo
    if (!title || !content) {
      return NextResponse.json({ error: "Wymagane title i body przy tworzeniu nowej promki." }, { status: 400 });
    }

    // moderacja tytułu i treści
    const titleVerdict = moderateText(title, { allowMarkdown: false, strict: true });
    if (!titleVerdict.ok) {
      return NextResponse.json({ error: "Tytuł narusza zasady." }, { status: 422 });
    }
    const bodyVerdict = moderateText(content, { allowMarkdown: true, strict: false });
    if (!bodyVerdict.ok) {
      return NextResponse.json({ error: bodyVerdict.reason || "Treść wymaga weryfikacji." }, { status: 422 });
    }

    const now = FieldValue.serverTimestamp();
    const threadRef = db.collection("threads").doc();

    await threadRef.set({
      id: threadRef.id,
      slug: threadRef.id,
      title: titleVerdict.sanitized,
      authorId: actor.id,
      author: actor.name,
      tag: "PROMO",
      pinned: false,
      repliesCount: 0,
      views: 0,
      isPromoted: true,
      sponsoredBy: sponsoredBy || null,
      promoUrl: promoUrl || null,
      promotionType,
      billing,
      budgetPLN: typeof budgetPLN === "number" ? budgetPLN : null,
      promoMetrics: { impressions: 0, clicks: 0 },
      promotedUntil: promotedUntil ? Timestamp.fromDate(new Date(promotedUntil)) : null,
      createdAt: now,
      updatedAt: now,
      lastPostAt: now,
    });

    const postRef = threadRef.collection("posts").doc();
    await postRef.set({
      id: postRef.id,
      threadId: threadRef.id,
      authorId: actor.id,
      author: actor.name,
      body: bodyVerdict.sanitized,
      flags: bodyVerdict.flags,
      status: "published",
      createdAt: now,
      updatedAt: now,
    });

    await threadRef.set({ repliesCount: FieldValue.increment(1) }, { merge: true });

    return NextResponse.json({ ok: true, id: threadRef.id, mode: "created_promo" }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 400 });
  }
}
