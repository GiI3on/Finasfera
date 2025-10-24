// src/app/forum/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* === UI helpers (tylko wygląd) === */
function Avatar({ name = "Użytkownik", size = 36 }) {
  const initials = String(name)
    .split(" ")
    .map((s) => s[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("");
  return (
    <div
      className="grid place-items-center rounded-full bg-zinc-800 text-zinc-100 font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}
const fmtPL = (ts) =>
  new Date(ts || Date.now()).toLocaleString("pl-PL", {
    hour12: false,
  });

export default function ThreadPage({ params }) {
  const { id } = params || {};
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [raw, setRaw] = useState(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`/api/forum/thread?id=${encodeURIComponent(id)}`, { cache: "no-store" });

        const txt = await res.text();

        // Spróbuj sparsować JSON; jeśli HTML/dev overlay – pokażemy surową treść
        try {
          const json = JSON.parse(txt);
          if (!aborted) {
            if (!res.ok && json?.error) setErr(json.error);
            setData(json);
          }
        } catch {
          if (!aborted) {
            setErr("Błąd parsowania JSON (serwer zwrócił HTML z błędem).");
            setRaw(txt.slice(0, 1000)); // pokaż pierwsze 1000 znaków, żeby nie zalać UI
          }
        }
      } catch (e) {
        if (!aborted) setErr(e?.message || "Network error");
      }
    })();
    return () => {
      aborted = true;
    };
  }, [id]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      {/* Główna belka */}
      <div className="sticky top-0 z-10 -mx-4 mb-5 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/50">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Link href="/forum" className="btn-ghost">
            ← Wróć do forum
          </Link>
          <h1 className="text-xl md:text-2xl font-bold">Dyskusja</h1>
        </div>
      </div>

      {/* Stany błędów i ładowania */}
      {err && (
        <div className="card border-red-800/60 bg-red-950/20">
          <div className="card-inner text-sm text-red-300">
            <div className="font-semibold mb-1">Błąd: {String(err)}</div>
            {raw && (
              <details className="mt-2">
                <summary className="cursor-pointer text-red-200/80">Pokaż surową odpowiedź</summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-red-200/70">{raw}</pre>
              </details>
            )}
          </div>
        </div>
      )}

      {!err && !data && <div className="card h-48 animate-pulse" />}

      {!err && data && data.error && (
        <div className="card border-yellow-800/60 bg-yellow-950/20">
          <div className="card-inner text-sm text-yellow-200">{String(data.error)}</div>
        </div>
      )}

      {!err && data && data.thread && (
        <section className="card">
          <div className="card-inner">
            {/* Nagłówek wątku */}
            <header className="flex items-start gap-3">
              <Avatar name={data.thread.author} size={44} />
              <div className="min-w-0">
                <h2 className="text-lg md:text-xl font-semibold leading-tight">
                  {data.thread.title}
                </h2>
                <div className="text-xs text-zinc-400 mt-1">
                  {data.thread.author} • {fmtPL(data.thread.createdAt)}
                </div>
              </div>
            </header>

            {/* Posty wątku */}
            <div className="mt-5 space-y-3">
              {(data.posts || []).map((p) => (
                <article
                  key={p.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={p.author} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-100 truncate">
                          {p.author}
                        </span>
                        <span className="text-xs text-zinc-500">• {fmtPL(p.createdAt)}</span>
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-[15px] leading-6 text-zinc-200">
                        {p.body}
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {!data.posts?.length && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
                  Brak wpisów w tym wątku.
                </div>
              )}
            </div>

            {/* Stopka sekcji */}
            <div className="mt-6 flex items-center justify-between">
              <Link href="/forum" className="btn-ghost">
                ← Wróć do forum
              </Link>
              <Link href={`/forum`} className="btn-primary h-9 px-4">
                Przeglądaj więcej wątków
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
