import { NextResponse } from "next/server";
import { apiGetThreadWithPosts } from "../../apiHandlers";

export async function GET(_req, { params }) {
  const data = await apiGetThreadWithPosts(params.id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
