// src/app/forum/threads/[id]/accept/route.js
import { NextResponse } from "next/server";
import { apiAcceptAnswer } from "../../../apiHandlers";

export async function POST(_req, { params }) {
  try {
    const threadId = params?.id;
    if (!threadId) return NextResponse.json({ error: "Brak id wątku" }, { status: 400 });

    const body = await _req.json();
    const postId = body?.postId;
    if (!postId) return NextResponse.json({ error: "Brak postId" }, { status: 400 });

    // TODO: auth – wyciągnij actorId z tokenu, na razie pomijamy dla wersji MVP
    const res = await apiAcceptAnswer({ threadId, postId });
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 400 });
  }
}
