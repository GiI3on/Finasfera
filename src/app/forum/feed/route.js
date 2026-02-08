// src/app/forum/feed/route.js

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { apiGetThreads } from "../apiHandlers";
import { adminDb } from "../../../lib/firebaseAdmin";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const uid = url.searchParams.get("uid") || undefined;

    const rows = await apiGetThreads();
    const db = adminDb;

    const feed = await Promise.all(
      rows.map(async (t) => {
        let my = null;
        if (uid) {
          try {
            const r = await db
              .collection("threads")
              .doc(t.id)
              .collection("reactions")
              .doc(uid)
              .get();
            const rv = r.exists ? r.data() : null;
            my = rv?.type || null;
          } catch (_) {
            my = null;
          }
        }

        // 🔽 Pobierz dokument z Firestore, żeby mieć najnowsze dane (reactions + author)
        let like = Number(t?.reactions?.like ?? 0);
        let heart = Number(t?.reactions?.heart ?? 0);
        let author = t?.author || "Użytkownik";
        let isAnonymous = !!t?.isAnonymous;

        try {
          const doc = await adminDb.collection("threads").doc(t.id).get();
          if (doc.exists) {
            const td = doc.data();
            like = Number(td?.reactions?.like ?? like);
            heart = Number(td?.reactions?.heart ?? heart);
            author = td?.isAnonymous ? "Anon" : (td?.author || author);
            isAnonymous = !!td?.isAnonymous;
          }
        } catch (e) {
          console.warn("Firestore thread fetch failed:", e);
        }

        // Profil autora (ranga / odznaki / streak)
        let authorRank = "Użytkownik";
        let authorBadges = [];
        let authorStreak = 0;

        if (t.authorId) {
          try {
            const u = await db.collection("users").doc(t.authorId).get();
            const ud = u.exists ? u.data() : null;
            authorRank = ud?.rank || authorRank;
            authorBadges = Array.isArray(ud?.badges)
              ? ud.badges.slice(0, 6)
              : [];
            authorStreak = Number(ud?.dayStreak || 0);
          } catch (_) {}
        }

        // Normalizacja dat
        const toISO = (v) =>
          v && typeof v?.toDate === "function"
            ? v.toDate().toISOString()
            : v
            ? new Date(v).toISOString()
            : null;

        return {
          id: t.id,
          title: t.title,
          author,
          authorId: t.authorId || "",
          authorRank,
          authorBadges,
          authorStreak,

          tag: t.tag || null,
          createdAt: toISO(t.createdAt),
          lastPostAt: toISO(t.lastPostAt),
          repliesCount: Number(t.repliesCount || 0),
          views: Number(t.views || 0),
          isPromoted: !!t.isPromoted,
          sponsoredBy: t.sponsoredBy || null,
          promoUrl: t.promoUrl || null,

          firstBody: t.firstBody || t.body || "",
          reactions: { like, heart },
          myReaction: my,
          isAnonymous,
        };
      })
    );

    return NextResponse.json({ feed, nextCursor: null });
  } catch (e) {
    console.error("[/forum/feed] ERROR:", e);
    return NextResponse.json(
      { feed: [], nextCursor: null, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
