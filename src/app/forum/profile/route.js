// src/app/forum/profile/route.js
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
}
