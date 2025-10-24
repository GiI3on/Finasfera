"use client";

import { useState } from "react";
import { useAuth } from "../../components/AuthProvider";

export default function PostComposerModal({ onClose }) {
  const { user } = useAuth(); // ← mamy usera z kontekstu
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [anon, setAnon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!body.trim()) {
      setError("Wpisz treść posta");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          tag: tag.trim() || undefined,
          uid: user?.uid || user?.id || null, // ← UŻYWAJ user, nie me
          name:
            user?.displayName ||
            user?.email?.split("@")[0] ||
            user?.name ||
            "Użytkownik",
          isAnonymous: anon,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Błąd podczas publikacji posta");
      }

      setBody("");
      setTag("");
      onClose?.(); // zamknij modal po sukcesie
    } catch (e) {
      console.error(e);
      setError(e.message || "Błąd");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 text-white rounded-2xl p-6 w-[500px] max-w-[90%]">
        <h2 className="text-xl font-bold mb-4">Utwórz post</h2>

        <div className="mb-2 text-sm text-zinc-400">
          {user ? user.displayName || user.email : "Użytkownik"}
        </div>

        <input
          type="text"
          placeholder="Tag (np. ETF)…"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="w-full bg-zinc-800 p-2 rounded mb-3 outline-none"
        />

        <textarea
          placeholder="Napisz coś…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="w-full bg-zinc-800 p-2 rounded resize-none outline-none"
        />

        <label className="flex items-center gap-2 mt-3 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={anon}
            onChange={(e) => setAnon(e.target.checked)}
          />
          Publikuj anonimowo
        </label>

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded w-full"
        >
          {loading ? "Publikuję…" : "Publikuj"}
        </button>

        <button
          onClick={onClose}
          className="mt-3 text-zinc-400 text-sm underline w-full"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}
