// src/app/forum/dev/seed/route.js
import { NextResponse } from "next/server";
import { apiCreateThread } from "../../apiHandlers"; // ⬅️ korzystamy z istniejącej logiki

export async function GET() {
  try {
    const row = await apiCreateThread({
      title: "Testowy wątek (seed)",
      body: "To jest pierwszy post w testowym wątku. Jeśli go widzisz w /forum, feed działa.",
      tag: "debug",
      uid: "seedbot",
      name: "SeedBot",
      isPromoted: false,
    });

    return NextResponse.json({ ok: true, id: row.id, row }, { status: 200 });
  } catch (e) {
    console.error("[/forum/dev/seed] ERROR:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
