// src/app/forum/components/PostCard.jsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CommentBox from "./CommentBox";

function Avatar({ name, size = 32 }) {
  const initials = String(name || "?")
    .split(" ")
    .map((s) => s[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("");
  return (
    <div
      className="grid place-items-center rounded-full bg-zinc-800 text-zinc-200 font-semibold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials || "?"}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-black bg-yellow-500/90">
      {children}
    </span>
  );
}

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

export default function PostCard({ item, user, onLocalReact, onLocalComment }) {
  const [busyReact, setBusyReact] = useState(false);
  const me = item.myReaction;
  const like = item.reactions?.like || 0;
  const heart = item.reactions?.heart || 0;

  async function toggle(type) {
    if (!user?.uid && !user?.id) {
      alert("Zaloguj się, aby reagować.");
      return;
    }
    onLocalReact?.(item.id, type);
    setBusyReact(true);
    try {
      await fetch("/api/forum/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: item.id,
          uid: user?.uid || user?.id,
          type,
        }),
      });
    } catch {}
    setBusyReact(false);
  }

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={item.author} />
          <div className="min-w-0">
            <div className="font-medium truncate">{item.author}</div>
            <div className="text-xs text-zinc-400">{fmtAgo(item.lastPostAt || item.createdAt)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">{item.tag && <Pill>{item.tag}</Pill>}</div>
      </div>

      {/* body */}
      <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
      {item.firstBody && <div className="mt-2 whitespace-pre-wrap text-zinc-200">{item.firstBody}</div>}

      {/* reactions */}
      <div className="mt-3 flex items-center gap-3 text-sm">
        <button
          disabled={busyReact}
          className={`rounded-md border px-3 py-1 ${
            me === "like" ? "bg-zinc-200 text-black border-zinc-400" : "border-zinc-700 hover:bg-zinc-800/60"
          }`}
          onClick={() => toggle("like")}
        >
          👍 {like}
        </button>
        <button
          disabled={busyReact}
          className={`rounded-md border px-3 py-1 ${
            me === "heart" ? "bg-zinc-200 text-black border-zinc-400" : "border-zinc-700 hover:bg-zinc-800/60"
          }`}
          onClick={() => toggle("heart")}
        >
          ❤️ {heart}
        </button>
        <span className="text-zinc-400 ml-auto">
          💬 {item.repliesCount || 0} • 👁 {item.views || 0}
        </span>
      </div>

      {/* quick reply */}
      <CommentBox
        threadId={item.id}
        user={user}
        onAdded={() => {
          onLocalComment?.(item.id);
        }}
      />

      {/* link */}
      <div className="mt-3 text-sm">
        <Link href={`/forum/${item.id}`} className="text-yellow-400 hover:underline">
          Przejdź do dyskusji
        </Link>
      </div>
    </article>
  );
}
