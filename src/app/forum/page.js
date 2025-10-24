// src/app/forum/page.js
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { MiniProfileBar } from "./components/AchievementsUI";

/* ===== Helpers ===== */
const fmtAgo = (iso) => {
  if (!iso) return "";
  const t = new Date(iso);
  const mins = Math.floor((Date.now() - t.getTime()) / 60000);
  if (mins < 60) return `${mins} min temu`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h temu`;
  const d = Math.floor(h / 24);
  return `${d} d temu`;
};

function Avatar({ name, size = 52 }) {
  const initials = String(name || "?")
    .split(" ")
    .map((s) => s[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("");
  return (
    <div
      className="grid place-items-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-zinc-100 font-semibold shadow-inner ring-1 ring-zinc-600/40"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}

const TAG_STYLES = {
  debug: "bg-fuchsia-500/10 text-fuchsia-300 ring-1 ring-fuchsia-500/30",
  ETF: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30",
  Akcje: "bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/30",
};
function Tag({ children }) {
  const key = String(children || "").trim();
  const style =
    TAG_STYLES[key] || "bg-zinc-700/20 text-zinc-200 ring-1 ring-zinc-600/40";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium ${style}`}>
      {key}
    </span>
  );
}

/* ===== API (front) ===== */
async function fetchFeed({ sort, uid, cursor }) {
  const qs = new URLSearchParams();
  if (sort) qs.set("sort", sort);
  if (uid) qs.set("uid", uid);
  if (cursor) qs.set("cursor", cursor);
  const res = await fetch(`/forum/feed?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) return { feed: [], nextCursor: null };
  const data = await res.json().catch(() => ({}));
  if (Array.isArray(data)) return { feed: data, nextCursor: null };
  if (Array.isArray(data.rows)) return { feed: data.rows, nextCursor: data.nextCursor || null };
  if (Array.isArray(data.feed)) return { feed: data.feed, nextCursor: data.nextCursor || null };
  return { feed: [], nextCursor: null };
}

async function fetchSidebar(uid, name) {
  const qs = new URLSearchParams();
  if (uid) qs.set("uid", uid);
  if (name) qs.set("name", name);
  const res = await fetch(`/forum/sidebar?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) return { profile: null, promoted: [] };
  return await res.json();
}

async function postReaction(threadId, uid, type) {
  try {
    const payload = { threadId, uid, type, reaction: type, op: "toggle" };
    const r = await fetch("/forum/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(payload),
    });
    const raw = await r.json().catch(() => ({}));
    const reactions =
      raw?.reactions && typeof raw.reactions === "object" ? raw.reactions : raw;
    const like =
      Number(reactions?.like ?? reactions?.likes ?? reactions?.likeCount ?? 0) || 0;
    const heart =
      Number(reactions?.heart ?? reactions?.hearts ?? reactions?.heartCount ?? 0) || 0;
    const my = raw?.my ?? reactions?.my ?? reactions?.current ?? reactions?.me ?? null;
    return { like, heart, my };
  } catch (e) {
    console.warn("[/forum/reactions] error →", e);
    return {};
  }
}

/* ===== KOMENTARZE: jeden endpoint /forum/comment ===== */
async function createComment({ threadId, user, body }) {
  const res = await fetch("/forum/comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      threadId,
      body,
      uid: user?.uid || user?.id,
      name: user?.displayName || user?.email || user?.name || "Anon",
    }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || "Błąd");
  }
  return res.json();
}

// PREVIEW (top)
async function fetchTopComments(threadId, limit = 2) {
  const qs = new URLSearchParams({ threadId, limit: String(limit), sort: "top" });
  const res = await fetch(`/forum/comment?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data?.comments) ? data.comments : Array.isArray(data) ? data : [];
}

// FULL (all)
async function fetchAllComments(threadId, limit = 200) {
  const qs = new URLSearchParams({ threadId, limit: String(limit), sort: "new" });
  const res = await fetch(`/forum/comment?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.comments)) return data.comments;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/* ===== UI: reakcje i komentarze ===== */
function ReactionBar({ item, me, onReact, pending }) {
  const like = Number(item?.reactions?.like ?? 0);
  const heart = Number(item?.reactions?.heart ?? 0);

  const base =
    "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition ring-1";
  const off =
    "ring-zinc-700/60 bg-zinc-900/40 text-zinc-200 hover:bg-zinc-800/70";
  const on =
    "ring-yellow-400/60 bg-yellow-300/10 text-yellow-200 shadow-[0_0_0_2px_rgba(250,204,21,0.15)]";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`${base} ${me === "like" ? on : off}`}
        onClick={() => onReact(item.id, "like")}
        aria-label="Lubię to"
        disabled={pending}
      >
        👍 <span className="tabular-nums">{like}</span>
      </button>
      <button
        type="button"
        className={`${base} ${me === "heart" ? on : off}`}
        onClick={() => onReact(item.id, "heart")}
        aria-label="Serce"
        disabled={pending}
      >
        ❤️ <span className="tabular-nums">{heart}</span>
      </button>
      <div className="ml-auto text-xs text-zinc-400 flex items-center gap-3">
        <span className="inline-flex items-center gap-1">💬 {item.repliesCount || 0}</span>
        <span className="inline-flex items-center gap-1">👁 {item.views || 0}</span>
      </div>
    </div>
  );
}

function CommentBox({ threadId, user, onAdded }) {
  const [txt, setTxt] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!txt.trim()) return;
    if (!user?.uid && !user?.id) {
      alert("Zaloguj się, aby dodać komentarz.");
      return;
    }
    setBusy(true);
    try {
      const { comment } = await createComment({ threadId, user, body: txt });
      onAdded?.(comment);
      setTxt("");
    } catch (e) {
      alert(e?.message || "Błąd");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start gap-3">
      <Avatar name={user?.displayName || user?.email || user?.name || "Anon"} size={40} />
      <div className="flex-1">
        <textarea
          rows={2}
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          placeholder="Dodaj odpowiedź…"
          className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-sm outline-none focus:ring-2 focus:ring-yellow-400/30"
        />
        <div className="mt-2">
          <button onClick={submit} disabled={busy} className="rounded-xl bg-yellow-400 text-black px-4 py-2 text-sm font-semibold hover:bg-yellow-300 disabled:opacity-60">
            Wyślij
          </button>
        </div>
      </div>
    </div>
  );
}

// Komentarze: podgląd → pełna lista inline
function CommentsBlock({ threadId, initialCount = 0, canAdmin, uid, user, onDeletedComment, onAddedComment }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [preview, setPreview] = useState([]);
  const [all, setAll] = useState([]);

  const ref = useRef(null);

  useEffect(() => {
    if (!initialCount || expanded) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(async (entries) => {
      const vis = entries[0]?.isIntersecting;
      if (vis && !previewLoaded) {
        setPreviewLoaded(true);
        const data = await fetchTopComments(threadId, 2);
        setPreview(data || []);
      }
    }, { rootMargin: "100px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [threadId, initialCount, expanded, previewLoaded]);

  async function expand() {
    if (expanded) return;
    setExpanded(true);
    setLoading(true);
    const data = await fetchAllComments(threadId, 200);
    setAll(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function refreshAfterAdd() {
    if (expanded) {
      const data = await fetchAllComments(threadId, 200);
      setAll(Array.isArray(data) ? data : []);
    } else {
      const data = await fetchTopComments(threadId, 2);
      setPreview(data || []);
    }
    onAddedComment?.();
  }

  if (!initialCount && preview.length === 0) {
    return (
      <div className="mt-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 px-3 py-3">
        <CommentBox threadId={threadId} user={user} onAdded={refreshAfterAdd} />
      </div>
    );
  }

  if (!expanded) {
    return (
      <div ref={ref} className="mt-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
        {preview.length === 0 ? (
          <div className="px-3 py-2 text-xs text-zinc-500">Najlepsze komentarze pojawią się tutaj.</div>
        ) : (
          <ul className="divide-y divide-zinc-800/80">
            {preview.map((c) => (
              <li key={c.id} className="px-3 py-2">
                <div className="flex items-start gap-2">
                  <Avatar name={c.name || c.author || "Użytkownik"} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="font-medium text-zinc-200">{c.name || c.author || "Użytkownik"}</span>
                      <span>•</span>
                      <span>{fmtAgo(c.createdAt)}</span>
                      {canAdmin && (
                        <button
                          className="ml-auto rounded-md border border-red-900/60 bg-red-900/20 px-2 py-[2px] text-[11px] text-red-300 hover:bg-red-900/30"
                          onClick={async () => {
                            if (!confirm("Usunąć ten komentarz?")) return;
                            const res = await fetch(`/forum/comment?threadId=${threadId}&commentId=${c.id}`, { method: "DELETE" });
                            const json = await res.json().catch(() => ({}));
                            if (json?.ok) {
                              setPreview((prev) => prev.filter((x) => x.id !== c.id));
                              onDeletedComment?.();
                            } else {
                              alert(json?.error || "Nie udało się usunąć komentarza.");
                            }
                          }}
                          title="Usuń komentarz (admin)"
                        >
                          Usuń
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-zinc-200 whitespace-pre-wrap">{c.body}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="px-3 py-2 border-t border-zinc-800/80 text-sm flex items-center justify-between">
      <button onClick={expand} className="text-yellow-400 hover:underline">
  Wyświetl wszystkie komentarze ({initialCount})
</button>

        </div>
        <div className="px-3 pb-3">
          <CommentBox threadId={threadId} user={user} onAdded={refreshAfterAdd} />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
      <div className="px-3 py-2 border-b border-zinc-800/80 flex items-center justify-between">
       <div className="text-sm text-zinc-300">Komentarze</div>

        <button onClick={() => setExpanded(false)} className="text-xs text-zinc-400 hover:text-zinc-200">
          Zwiń
        </button>
      </div>

      {loading ? (
        <div className="px-3 py-4 text-sm text-zinc-400">Ładowanie…</div>
      ) : all.length === 0 ? (
        <div className="px-3 py-4 text-sm text-zinc-400">Brak komentarzy.</div>
      ) : (
        <ul className="divide-y divide-zinc-800/80">
          {all.map((c) => (
            <li key={c.id} className="px-3 py-2">
              <div className="flex items-start gap-2">
                <Avatar name={c.name || c.author || "Użytkownik"} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="font-medium text-zinc-200">{c.name || c.author || "Użytkownik"}</span>
                    <span>•</span>
                    <span>{fmtAgo(c.createdAt)}</span>
                  </div>
                  <div className="text-sm text-zinc-200 whitespace-pre-wrap">{c.body}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="px-3 pb-3">
        <CommentBox threadId={threadId} user={user} onAdded={refreshAfterAdd} />
      </div>
    </div>
  );
}

/* ===== Karta wątku ===== */
function ThreadCard({ item, user, onReact, onReplied, canAdmin, pending }) {
  const uid = user?.uid || user?.id;

  return (
   <article className="rounded-3xl border border-zinc-800/70 bg-zinc-950/70 backdrop-blur-sm hover:border-yellow-400/30 transition">
      <div className="p-4 md:p-6">
        {/* Head */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={item.author} size={44} />
            <div className="min-w-0">
              <div className="font-semibold truncate text-zinc-100">{item.author}</div>
              <div className="text-xs text-zinc-400">{fmtAgo(item.lastPostAt || item.createdAt)}</div>
              <MiniProfileBar
                rank={item.authorRank}
                badges={item.authorBadges}
                streak={item.authorStreak}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {item.isPromoted && (
              <span className="inline-flex items-center rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-200">
                Sponsorowane
              </span>
            )}
            {item.tag && <Tag>{item.tag}</Tag>}
            {canAdmin && (
              <button
                className="rounded-md border border-red-900/60 bg-red-900/20 px-2 py-1 text-xs text-red-300 hover:bg-red-900/30"
                onClick={async () => {
                  if (!confirm("Usunąć wątek wraz z komentarzami i reakcjami?")) return;
                  const qs = new URLSearchParams({ id: item.id, uid: String(uid || "") });
                  const res = await fetch(`/forum/threads?${qs.toString()}`, { method: "DELETE" });
                  const json = await res.json().catch(() => ({}));
                  if (!json?.ok) alert(json?.error || "Nie udało się usunąć wątku.");
                  else window.dispatchEvent(new CustomEvent("thread-deleted", { detail: { id: item.id } }));
                }}
                title="Usuń wątek (admin)"
              >
                Usuń
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="mt-4">
          <h3 className="text-[17px] md:text-xl font-bold leading-tight tracking-tight text-zinc-50">
            {item.title}
          </h3>
          {item.firstBody && (
            <div className="mt-3">
              <div className="text-[15px] leading-7 whitespace-pre-wrap text-zinc-200">
                {item.firstBody}
              </div>
            </div>
          )}
        </div>

        {/* Reactions */}
        <div className="mt-5">
          <ReactionBar item={item} me={item.myReaction} onReact={onReact} pending={pending} />
        </div>

        {/* Komentarze */}
        <CommentsBlock
          threadId={item.id}
          initialCount={item.repliesCount || 0}
          canAdmin={canAdmin}
          uid={uid}
          user={user}
          onDeletedComment={() => onReplied?.(item.id)}
          onAddedComment={() => onReplied?.(item.id)}
        />
      </div>
    </article>
  );
}

/* ===== Sidebar ===== */
function MilestoneBar({ postsCount = 0, milestones = [1, 10, 50, 100, 200] }) {
  const next = milestones.find((m) => m > postsCount) ?? null;
  const prev = [...milestones].reverse().find((m) => m <= postsCount) ?? 0;
  const min = prev;
  const max = (next ?? postsCount) || 1;
  const rel = Math.max(0, Math.min(1, (postsCount - min) / Math.max(1, max - min)));
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
       <span>{postsCount} postów</span>
<span>{next ? `Kolejny etap: ${next}` : "Maks."}</span>

      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-400" style={{ width: `${rel * 100}%` }} />
      </div>
    </div>
  );
}

function Sidebar({ data }) {
  const p = data?.profile;
  const promoted = data?.promoted || [];
  const isAdmin = !!p?.isAdmin;

  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/60 p-5">
        <div className="flex items-center gap-3">
          <Avatar name={p?.name || "Gość"} />
          <div>
            <div className="font-bold text-lg leading-tight text-zinc-50">{p?.name || "Gość"}</div>
            <div className="text-xs text-zinc-400">{p?.rank || "Gość"}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(p?.badges || []).slice(0, 8).map((b) => (
            <span key={b} className="inline-flex items-center rounded-md bg-zinc-800/70 text-zinc-100 px-2 py-0.5 text-xs ring-1 ring-zinc-700/70">
              {b}
            </span>
          ))}
          {!p?.badges?.length && (
            <span className="text-xs text-zinc-500">Brak odznak — dołącz do dyskusji!</span>
          )}
        </div>
        <MilestoneBar postsCount={p?.postsCount || 0} milestones={p?.milestones || [1, 10, 50, 100, 200]} />

        {isAdmin && (
          <div className="mt-5 rounded-2xl border border-red-900/50 bg-red-900/10 p-3.5">
            <div className="text-xs font-semibold text-red-300 mb-2">Panel administratora</div>
            <button
              className="w-full rounded-xl border border-red-900/60 bg-red-900/20 px-3 py-2 text-sm text-red-200 hover:bg-red-900/30"
              onClick={async () => {
                if (!confirm("Usunąć wpisy testowe (SeedBot/debug)?")) return;
                const qs = new URLSearchParams({ uid: String(p?.uid || p?.id || "") });
                const res = await fetch(`/forum/admin/purge?${qs.toString()}`, { method: "DELETE" });
                const json = await res.json().catch(() => ({}));
                if (!json?.ok) alert(json?.error || "Nie udało się wykonać czyszczenia.");
                else location.reload();
              }}
            >
              Wyczyść wpisy testowe
            </button>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-emerald-800/40 bg-emerald-900/20 p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <span className="inline-flex items-center rounded-md bg-emerald-400/20 px-2 py-0.5 text-emerald-200">Sponsorowane</span>
          Polecane materiały
        </div>
        {promoted.length === 0 ? (
          <div className="text-sm text-emerald-300/80">Aktualnie brak poleceń.</div>

        ) : (
          <div className="space-y-3">
            {promoted.map((m) => (
              <div key={m.id} className="rounded-2xl border border-emerald-800/50 bg-emerald-900/25 p-3.5">
                <div className="text-sm font-semibold text-zinc-100 line-clamp-2">{m.title}</div>
                {m.sponsoredBy && <div className="text-xs text-emerald-300 mt-1">Sponsor: {m.sponsoredBy}</div>}
                <div className="mt-2">
                  <Link
                    href={m.promoUrl || `/forum/${m.id}`}
                    target={m.promoUrl ? "_blank" : undefined}
                    rel={m.promoUrl ? "nofollow sponsored" : undefined}
                    className="inline-block rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-emerald-400"
                  >
                    Zobacz
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}

/* ===== Strona ===== */
export default function ForumPage() {
  const { user } =
    (typeof useAuth === "function" ? useAuth() : { user: null }) || { user: null };
  const uid = user?.uid || user?.id || null;
  const displayName = user?.displayName || user?.email || user?.name || null;

  const [sort, setSort] = useState("active"); // active | new | top
  const [feed, setFeed] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [sidebar, setSidebar] = useState(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reactPending, setReactPending] = useState({});
  const [composerOpen, setComposerOpen] = useState(false);

  async function refetchAll() {
    const [{ feed: rows, nextCursor: cur }, side] = await Promise.all([
      fetchFeed({ sort, uid, cursor: null }),
      fetchSidebar(uid, displayName),
    ]);
    setFeed(rows);
    setNextCursor(cur);
    setSidebar(side);
  }

  useEffect(() => {
    function onDeleted(e) {
      const id = e?.detail?.id;
      if (!id) return;
      setFeed((prev) => prev.filter((x) => String(x.id) !== String(id)));
    }
    window.addEventListener("thread-deleted", onDeleted);
    return () => window.removeEventListener("thread-deleted", onDeleted);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refetchAll();
      setLoading(false);
    })();
  }, [sort, uid, displayName]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const { feed: rows, nextCursor: cur } = await fetchFeed({ sort, uid, cursor: nextCursor });
    setFeed((prev) => [...prev, ...rows]);
    setNextCursor(cur);
    setLoadingMore(false);
  }

  const filtered = useMemo(() => {
    const nq = q.trim().toLowerCase();
    if (!nq) return feed;
    return feed.filter((x) =>
      (x.title + " " + x.firstBody + " " + (x.tag || "") + " " + (x.author || "")).toLowerCase().includes(nq)
    );
  }, [feed, q]);

  async function toggleReact(threadId, type) {
    const myUid = user?.uid || user?.id;
    if (!myUid) {
      alert("Zaloguj się, aby reagować.");
      return;
    }
    if (reactPending[threadId]) return;

    setReactPending((p) => ({ ...p, [threadId]: true }));

    // optimistic
    let prevSnapshot = null;
    setFeed((prev) =>
      prev.map((x) => {
        if (String(x.id) !== String(threadId)) return x;
        const prevMe = x.myReaction || null;
        const r = {
          like: Number(x?.reactions?.like ?? 0),
          heart: Number(x?.reactions?.heart ?? 0),
        };
        prevSnapshot = { myReaction: prevMe, reactions: { ...r } };

        let nextMe = prevMe;
        if (prevMe === type) {
          nextMe = null;
          if (type === "like") r.like = Math.max(0, r.like - 1);
          if (type === "heart") r.heart = Math.max(0, r.heart - 1);
        } else {
          nextMe = type;
          if (type === "like") r.like += 1;
          if (type === "heart") r.heart += 1;
          if (prevMe === "like") r.like = Math.max(0, r.like - 1);
          if (prevMe === "heart") r.heart = Math.max(0, r.heart - 1);
        }

        return { ...x, myReaction: nextMe, reactions: r };
      })
    );

    try {
      const res = await postReaction(threadId, myUid, type);
      if (typeof res?.like !== "undefined" || typeof res?.heart !== "undefined") {
        setFeed((prev) =>
          prev.map((x) =>
            String(x.id) === String(threadId)
              ? {
                  ...x,
                  reactions: {
                    like: Number(res.like ?? x?.reactions?.like ?? 0),
                    heart: Number(res.heart ?? x?.reactions?.heart ?? 0),
                  },
                  myReaction:
                    typeof res.my !== "undefined" ? (res.my || null) : x.myReaction,
                }
              : x
          )
        );
      }
    } catch {
      if (prevSnapshot) {
        setFeed((prev) =>
          prev.map((x) =>
            String(x.id) === String(threadId)
              ? { ...x, ...prevSnapshot }
              : x
          )
        );
      }
    } finally {
      setReactPending((p) => {
        const n = { ...p };
        delete n[threadId];
        return n;
      });
    }
  }

  const canAdmin = !!sidebar?.profile?.isAdmin;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28">
      {/* topbar */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-zinc-800/60 bg-zinc-950/60 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/40">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[12px] uppercase tracking-widest text-zinc-400">Finasfera</div>
<h1 className="text-2xl md:text-[28px] font-black tracking-tight text-zinc-50">Forum</h1>

            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="inline-flex rounded-full bg-zinc-900/60 ring-1 ring-zinc-700/60 p-1">
                {["active", "new", "top"].map((k) => (
                  <button
                    key={k}
                    onClick={() => setSort(k)}
                    className="px-3 py-1.5 text-sm rounded-full data-[on=true]:bg-yellow-400 data-[on=true]:text-black"
                    data-on={sort === k}
                  >
                    {k === "active" ? "Aktywne" : k === "new" ? "Najnowsze" : "Najciekawsze"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setComposerOpen(true)}
                className="rounded-xl bg-yellow-400 text-black px-4 py-2 text-sm font-semibold hover:bg-yellow-300"
              >
                Nowy wątek
              </button>
            </div>
          </div>

          <div className="mt-3">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Szukaj postów…"
                className="w-full bg-transparent px-3 py-2 outline-none text-sm placeholder:text-zinc-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(260px,320px)_1fr] gap-6">
        {/* SIDEBAR */}
        <Sidebar data={sidebar} />

        {/* FEED */}
        <section className="space-y-5">
          {loading && (
            <>
              <div className="rounded-3xl h-[160px] bg-zinc-900/60 ring-1 ring-zinc-800/80 animate-pulse" />
              <div className="rounded-3xl h-[160px] bg-zinc-900/60 ring-1 ring-zinc-800/80 animate-pulse" />
            </>
          )}

          {!loading &&
            filtered.map((item) => (
              <ThreadCard
                key={item.id}
                item={item}
                user={user}
                onReact={toggleReact}
                onReplied={(id) =>
                  setFeed((prev) =>
                    prev.map((x) =>
                      String(x.id) === String(id)
                        ? { ...x, repliesCount: (x.repliesCount || 0) + 1 }
                        : x
                    )
                  )
                }
                canAdmin={canAdmin}
                pending={!!reactPending[item.id]}
              />
            ))}

          {!loading && nextCursor && (
            <div className="pt-2">
              <button onClick={loadMore} disabled={loadingMore} className="w-full rounded-2xl bg-zinc-900/70 ring-1 ring-zinc-800/80 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-60">
                {loadingMore ? "Ładowanie…" : "Załaduj więcej"}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* FAB (mobile) */}
      <button
        onClick={() => setComposerOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 rounded-full bg-yellow-400 text-black px-5 py-4 font-bold shadow-lg"
      >
        + Nowy
      </button>

      {/* Modal */}
      <PostComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={() => refetchAll()}
        me={user}
      />
    </main>
  );
}

/* ===== Modal: tworzenie posta ===== */
/* ===== Modal: tworzenie posta (FB-style, bez tytułu) ===== */
/* ===== Modal: tworzenie posta (FB-style, bez tytułu) ===== */
function PostComposerModal({ open, onClose, onCreated, me }) {
  const [tag, setTag] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [anon, setAnon] = useState(false); // ← NOWE: tryb anonimowy

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  async function submit() {
    if (!body.trim()) return alert("Dodaj treść posta.");
    setBusy(true);
    try {
      const res = await fetch("/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          tag: tag.trim() || undefined,
          uid:  me?.uid || me?.id || null,
          name: me?.displayName || me?.email || me?.name || "Użytkownik",
          isAnonymous: anon, // ← WYŚLIJEMY DO BACKENDU
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) throw new Error(json?.error || "Nie udało się dodać wątku.");
      setBody(""); setTag("");
      onClose?.();
      onCreated?.(json);
    } catch (e) {
      alert(e?.message || "Błąd");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const rawName = me?.displayName || me?.email || me?.name || "Użytkownik";
  const headerName = anon ? "Anon" : rawName; // ← podgląd nazwy gdy anonimowo

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-3 md:p-6 overflow-auto">
        <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          {/* Head */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="font-semibold">Utwórz post</div>
            <button
              onClick={onClose}
              className="rounded-full w-8 h-8 grid place-items-center hover:bg-zinc-800"
              aria-label="Zamknij"
            >
              ✕
            </button>
          </div>

          {/* Who + toggle anon */}
          <div className="px-4 pt-3 flex items-center gap-3">
            <Avatar name={headerName} size={40} />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{headerName}</div>
             <div className="text-xs text-zinc-400">
  {anon ? "Post anonimowy" : "Post publiczny"}
</div>
            </div>

            {/* Przełącznik Anonimowo */}
            <label className="inline-flex items-center gap-2 text-xs text-zinc-300 select-none">
              <input
                type="checkbox"
                className="accent-yellow-400"
                checked={anon}
                onChange={(e) => setAnon(e.target.checked)}
              />
              Anonimowo
            </label>
          </div>

          {/* Body */}
          <div className="px-4 py-3 space-y-2">
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Tag (np. ETF, Akcje) — opcjonalnie"

              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400/30"
            />
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Napisz coś…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400/30"
            />
          </div>

          {/* Actions */}
          <div className="px-4 pb-4">
            <button
              onClick={submit}
              disabled={busy}
              className="w-full rounded-xl bg-yellow-400 text-black px-4 py-2.5 text-sm font-semibold hover:bg-yellow-300 disabled:opacity-60"
            >
              {busy ? "Publikuję…" : "Publikuj"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

