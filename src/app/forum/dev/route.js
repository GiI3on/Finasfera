// src/app/forum/dev/route.js
import { NextResponse } from "next/server";

export async function GET() {
  // Możesz zwrócić 404 jeśli endpoint nie ma działać w produkcji:
  return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
}
