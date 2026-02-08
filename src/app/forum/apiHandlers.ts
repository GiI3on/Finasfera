// src/app/forum/apiHandlers.ts
import { adminDb } from "../../lib/firebaseAdmin";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { moderateText, badgesFromStats, computeRank } from "../../lib/forumCore";
import { isAdmin } from "../../lib/isAdmin";


/* ────────────────────────────────────────────────────────────
   DEBUG & HELPERS
───────────────────────────────────────────────────────────── */
const db: Firestore = adminDb as unknown as Firestore;

const RESERVED_IDS = new Set(["__ALL__", "__ID__", "__NAME__"]);
const isReservedId = (s?: string | null) => !!s && RESERVED_IDS.has(s);

const toIso = (v: any) =>
  v?.toDate?.()?.toISOString?.() || (typeof v === "string" ? v : null);

const dbg = (...args: any[]) => console.log("[forum/apiHandlers]", ...args);
const warn = (...args: any[]) => console.warn("[forum/apiHandlers:WARN]", ...args);
const err  = (...args: any[]) => console.error("[forum/apiHandlers:ERR]", ...args);

dbg("INIT OK");

/* ────────────────────────────────────────────────────────────
   Typy
───────────────────────────────────────────────────────────── */
type ThreadRow = {
  id: string;
  slug: string;
  title: string;
  author: string;
  authorId: string;
  tag: string | null;
  pinned: boolean;
  isPromoted: boolean;
  sponsoredBy: string | null;
  promotedUntil: string | null;
  promoUrl?: string | null;
  repliesCount: number;
  views: number;
  createdAt: string | null;
  updatedAt: string | null;
  lastPostAt: string | null;
  authorRank?: string;
  authorBadges?: string[];
};

type FeedCursor = { lastPostAtMs: number; id: string };
function encodeCursor(c: FeedCursor | null): string | null {
  if (!c) return null;
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}
function decodeCursor(s?: string | null): FeedCursor | null {
  if (!s) return null;
  try {
    const obj = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
    if (typeof obj?.lastPostAtMs === "number" && typeof obj?.id === "string") return obj as FeedCursor;
    return null;
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────────────
   THREADS (lista)
───────────────────────────────────────────────────────────── */
export async function apiGetThreads(): Promise<ThreadRow[]> {
  dbg("apiGetThreads:start");
  try {
    let snap;
    try {
      snap = await db
        .collection("threads")
        .orderBy("pinned", "desc")
        .orderBy("lastPostAt", "desc")
        .limit(30)
        .get();
    } catch {
      warn("apiGetThreads: fallback (orderBy createdAt)");
      snap = await db.collection("threads").orderBy("createdAt", "desc").limit(30).get();
    }

    const base: ThreadRow[] = snap.docs.map((d) => {
      const t: any = d.data();
      return {
        id: d.id,
        slug: t.slug || d.id,
        title: t.title,
        author: t.author || "Użytkownik",
        authorId: t.authorId || "",
        tag: t.tag || null,
        pinned: !!t.pinned,
        isPromoted: !!t.isPromoted,
        sponsoredBy: t.sponsoredBy || null,
        promotedUntil: toIso(t.promotedUntil),
        promoUrl: t.promoUrl || null,
        repliesCount: t.repliesCount || 0,
        views: t.views || 0,
        createdAt: toIso(t.createdAt),
        updatedAt: toIso(t.updatedAt),
        lastPostAt: toIso(t.lastPostAt),
      };
    });

    dbg("apiGetThreads:ok", { count: base.length });
    return base;
  } catch (e) {
    err("apiGetThreads:error", (e as any)?.message || e);
    return [];
  }
}

/* ────────────────────────────────────────────────────────────
   CREATE THREAD
───────────────────────────────────────────────────────────── */
export async function apiCreateThread(payload: {
  title: string;
  body: string;
  tag?: string | null;
  isPromoted?: boolean;
  sponsoredBy?: string | null;
  promotedUntil?: string | null;
  promoUrl?: string | null;
}) {
  dbg("apiCreateThread:start", { title: payload?.title, tag: payload?.tag });
  const { title, body, tag, isPromoted, sponsoredBy, promotedUntil, promoUrl } = payload;
  if (!title || !body) throw new Error("Brak tytułu lub treści.");

  const user = { id: "demo", name: "Anon" }; // TODO auth

  const titleVerdict = moderateText(title, { allowMarkdown: false, strict: true });
  if (!titleVerdict.ok) { const e: any = new Error("Tytuł narusza zasady."); e.status = 422; throw e; }

  const bodyVerdict = moderateText(body, { allowMarkdown: true, strict: false });
  if (!bodyVerdict.ok && bodyVerdict.flags.some((f) => ["profanity","hate","explicit","sexual_minor","self_harm","conspiracy"].includes(f))) {
    const e: any = new Error(bodyVerdict.reason || "Treść zablokowana."); e.status = 422; throw e;
  }

  const now = FieldValue.serverTimestamp();
  const threadRef = db.collection("threads").doc();
  const slug = threadRef.id;

  await threadRef.set({
    id: threadRef.id, slug,
    title: titleVerdict.sanitized,
    authorId: user.id, author: user.name,
    tag: tag || null, pinned: false, repliesCount: 0, views: 0,
    isPromoted: !!isPromoted, sponsoredBy: sponsoredBy || null,
    promotedUntil: promotedUntil ? Timestamp.fromDate(new Date(promotedUntil)) : null,
    promoUrl: promoUrl || null,
    createdAt: now, updatedAt: now, lastPostAt: now,
    reactions: { like: 0, heart: 0 },
  });

  const status = bodyVerdict.ok ? "published" : "pending";
  const postRef = threadRef.collection("posts").doc();

  await postRef.set({
    id: postRef.id, threadId: threadRef.id, authorId: user.id, author: user.name,
    body: bodyVerdict.sanitized, flags: bodyVerdict.flags, status, createdAt: now, updatedAt: now,
  });

  if (status === "published") {
    await threadRef.set({ repliesCount: FieldValue.increment(1) }, { merge: true });
  }

  dbg("apiCreateThread:ok", { id: threadRef.id });
  return { id: threadRef.id, slug, title: titleVerdict.sanitized, tag: tag || null };
}

/* ────────────────────────────────────────────────────────────
   THREAD + POSTS
───────────────────────────────────────────────────────────── */
export async function apiGetThreadWithPosts(id: string) {
  dbg("apiGetThreadWithPosts:start", { id });
  if (isReservedId(id)) throw new Error(`Użyto zarezerwowanego ID: "${id}"`);

  const tDoc = await db.collection("threads").doc(id).get();
  if (!tDoc.exists) return null;

  const t: any = tDoc.data();
  const thread = {
    id, slug: t.slug || id, title: t.title,
    author: t.author || "Użytkownik", authorId: t.authorId || "",
    tag: t.tag || null, pinned: !!t.pinned,
    repliesCount: t.repliesCount || 0, views: t.views || 0,
    createdAt: toIso(t.createdAt), updatedAt: toIso(t.updatedAt), lastPostAt: toIso(t.lastPostAt),
    acceptedPostId: t.acceptedPostId || null,
  };

  const postsSnap = await db.collection("threads").doc(id).collection("posts")
    .orderBy("createdAt", "asc").limit(300).get();

  const ALLOWED = new Set(["published", "pending"]);
  const posts = postsSnap.docs
    .map((d) => d.data() as any)
    .filter((p) => ALLOWED.has(p?.status || "published"))
    .map((p) => ({
      id: p.id,
      author: p.author || "Użytkownik",
      body: p.body,
      status: p.status || "published",
      createdAt: toIso(p.createdAt),
    }));

  await db.collection("threads").doc(id).set({ views: FieldValue.increment(1) }, { merge: true });
  dbg("apiGetThreadWithPosts:ok", { posts: posts.length });
  return { thread, posts };
}

/* ────────────────────────────────────────────────────────────
   SIDEBAR (poprawiony)
───────────────────────────────────────────────────────────── */
export async function apiGetSidebarData(uid?: string, displayName?: string) {
  dbg("apiGetSidebarData:start", { uid, displayName });
  const userId = uid || "guest";
  const visibleName = displayName || (uid ? "Użytkownik" : "Gość");

  let stats: any = { postsCount: 0, badges: [], rank: "Gość" };
  if (uid) {
    const statDoc = await db.collection("userStats").doc(userId).get();
    stats = statDoc.exists ? (statDoc.data() as any) : stats;
    const postsCount = stats.postsCount || 0;
    stats.rank = stats.rank || computeRank(postsCount);
  }

const profile = {
  uid: userId,
  name: visibleName,
  rank: stats.rank,
  badges: Array.isArray(stats.badges) ? stats.badges : [],
  postsCount: stats.postsCount || 0,
  milestones: [1, 10, 50, 100, 200],
  isAdmin: uid ? await isAdmin(uid) : false,
};


  const now = new Date();
  let promoted: Array<{ id: string; title: string; sponsoredBy: string | null; promoUrl: string | null }> = [];

  try {
    const threadsSnap = await db.collection("threads")
      .where("isPromoted", "==", true)
      .limit(12)
      .get();

    promoted = threadsSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((t) => !t.promotedUntil || t.promotedUntil.toDate() > now)
      .sort((a, b) => {
        const aTs = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
        const bTs = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
        return bTs - aTs;
      })
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        title: t.title,
        sponsoredBy: t.sponsoredBy || null,
        promoUrl: t.promoUrl || null,
      }));
  } catch (e) {
    warn("apiGetSidebarData:promoted:fallback", (e as any)?.message || e);
    promoted = [];
  }

  dbg("apiGetSidebarData:ok", { badges: profile.badges?.length || 0, promoted: promoted.length });
  return { profile, promoted };
}

/* ────────────────────────────────────────────────────────────
   Reakcje (toggle) — NAPRAWIONE
───────────────────────────────────────────────────────────── */
export async function apiToggleReaction(payload: { threadId: string; uid?: string; type: "like" | "heart" }) {
  dbg("apiToggleReaction:start", payload);
  const { threadId, uid, type } = payload;
  if (!threadId || !uid) throw new Error("Brak użytkownika lub wątku.");
  if (isReservedId(threadId)) throw new Error(`Użyto zarezerwowanego ID: "${threadId}"`);

  const threadRef = db.collection("threads").doc(threadId);
  const userReactRef = threadRef.collection("reactions").doc(uid);
  let newMy: "like" | "heart" | null = null;

  await db.runTransaction(async (trx) => {
    const curReact = await trx.get(userReactRef);
    const cur = curReact.exists ? (curReact.data() as any) : null;
    const prevType: "like" | "heart" | null = cur?.type || null;

    if (prevType === type) {
      newMy = null;
      await trx.set(userReactRef, { type: null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      await trx.update(threadRef, { [`reactions.${type}`]: FieldValue.increment(-1) });
    } else {
      newMy = type;
      await trx.set(userReactRef, { type, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      await trx.update(threadRef, { [`reactions.${type}`]: FieldValue.increment(1) });
      if (prevType) {
        await trx.update(threadRef, { [`reactions.${prevType}`]: FieldValue.increment(-1) });
      }
    }
  });

  const after = await threadRef.get();
  const r: any = after.data()?.reactions || {};
  const out = { like: Number(r.like || 0), heart: Number(r.heart || 0), my: newMy };
  dbg("apiToggleReaction:ok", out);
  return out;
}

/* ────────────────────────────────────────────────────────────
   DODANE: CREATE POST (dla /forum/posts/route.js)
───────────────────────────────────────────────────────────── */
export async function apiCreatePost(payload: {
  threadId: string;
  body: string;
  uid?: string;
  name?: string;
  isAnonymous?: boolean;
}) {
  const tid = String(payload?.threadId || "").trim();
  const body = String(payload?.body || "").trim();
  const uid = String(payload?.uid || "anon").trim();
  const name = String(payload?.name || "Użytkownik").trim();

  if (!tid || !body) {
    const e: any = new Error("missing threadId/body");
    e.status = 400;
    throw e;
  }

  const threadRef = db.collection("threads").doc(tid);
  const postsRef = threadRef.collection("posts");

  const now = FieldValue.serverTimestamp();
  const postRef = postsRef.doc();

  const post = {
    id: postRef.id,
    threadId: tid,
    authorId: uid,
    author: name,
    body,
    status: "published",
    createdAt: now,
    updatedAt: now,
    accepted: false,
  };

  await postRef.set(post);
  await threadRef.set(
    { lastPostAt: now, repliesCount: FieldValue.increment(1) },
    { merge: true }
  );

  return {
    id: postRef.id,
    threadId: tid,
    authorId: uid,
    author: name,
    body,
    status: "published",
    createdAt: new Date().toISOString(),
  };
}

/* ────────────────────────────────────────────────────────────
   DODANE: ACCEPT ANSWER (dla /forum/threads/[id]/accept/route.js)
───────────────────────────────────────────────────────────── */
export async function apiAcceptAnswer(payload: { threadId: string; postId: string }) {
  const tid = String(payload?.threadId || "").trim();
  const pid = String(payload?.postId || "").trim();
  if (!tid || !pid) {
    const e: any = new Error("missing ids");
    e.status = 400;
    throw e;
  }

  const threadRef = db.collection("threads").doc(tid);
  const postRef = threadRef.collection("posts").doc(pid);

  await db.runTransaction(async (trx) => {
    trx.set(
      postRef,
      { accepted: true, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    trx.set(
      threadRef,
      { acceptedPostId: pid, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  });

  return { ok: true, acceptedPostId: pid };
}
