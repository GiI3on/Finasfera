import { NextResponse } from "next/server";
import { apiCreatePost } from "../apiHandlers";

export async function POST(req) {
  try {
    const payload = await req.json();
    const post = await apiCreatePost(payload);
    return NextResponse.json({ post }, { status: 201 });
  } catch (e) {
    const msg = e?.message || "Server error";
    const code = e?.status || 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
