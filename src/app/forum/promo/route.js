import { NextResponse } from "next/server";

export async function GET() {
  // Na razie zwracamy pustą listę promocji / 404 – wybierz jedną wersję.

  // WERSJA A: pusta odpowiedź OK
  return NextResponse.json({ ok: true, promoted: [] }, { status: 200 });

  // WERSJA B: jeśli ma być wyłączone
  // return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
}
