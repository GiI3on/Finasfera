// src/app/forum/dev/peek/route.js
import { NextResponse } from "next/server";
import { apiGetThreads } from "../../apiHandlers"; // używamy istniejącej funkcji

export async function GET() {
  try {
    const rows = await apiGetThreads(); // bierze ~30 wątków wg Twojej logiki
    const slim = rows.slice(0, 5).map(t => ({
      id: t.id,
      title: t.title,
      author: t.author,
      createdAt: t.createdAt,
      lastPostAt: t.lastPostAt,
      tag: t.tag || null
    }));
    return NextResponse.json({
      count: rows.length,
      preview: slim,
      note: "Jeśli count>0, dokumenty są w bazie. Jeśli /forum nadal puste, problem leży w route /forum/feed albo w page.js."
    });
  } catch (e) {
    console.error("[/forum/dev/peek] ERROR:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
