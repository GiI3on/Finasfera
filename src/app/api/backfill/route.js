import { NextResponse } from "next/server";
import { backfillMissingBuyFlows } from "../../../lib/portfolioStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  const pid = searchParams.get("pid"); // opcjonalne

  if (!uid) {
    return NextResponse.json({ ok: false, error: "uid is required" }, { status: 400 });
  }
  try {
    const created = await backfillMissingBuyFlows(uid, pid || null);
    return NextResponse.json({ ok: true, created });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
