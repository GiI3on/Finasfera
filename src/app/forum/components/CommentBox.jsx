// src/app/forum/components/CommentBox.jsx
"use client";

import { useState } from "react";

function Avatar({ name, size = 28 }) {
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

export default function CommentBox({ threadId, user, onAdded }) {
  const [txt, setTxt] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!txt.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/forum/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          body: txt,
          uid: user?.uid || user?.id,
          name: user?.displayName || user?.email || user?.name || "Anon",
        }),
      });
      if (res.ok) {
        setTxt("");
        onAdded?.();
      } else {
        const { error } = await res.json().catch(() => ({ error: "Błąd" }));
        alert(error || "Błąd");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex items-start gap-3">
      <Avatar name={user?.displayName || user?.email || user?.name || "Anon"} />
      <div className="flex-1">
        <textarea
          rows={2}
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          placeholder="Napisz komentarz…"
          className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm outline-none placeholder:text-zinc-500"
        />
        <div className="mt-2">
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-yellow-400 disabled:opacity-60"
          >
            Wyślij
          </button>
        </div>
      </div>
    </div>
  );
}
