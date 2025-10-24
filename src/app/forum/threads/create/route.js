// src/app/forum/threads/create/route.js
import { NextResponse } from "next/server";
import { apiCreateThread } from "../../apiHandlers";

export async function POST(req) {
  try {
    const body = await req.json(); // { title, body, tag?, uid?, name? }
    const row = await apiCreateThread(body);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: e?.status || 400 });
  }
}
