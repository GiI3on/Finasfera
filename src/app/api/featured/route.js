// src/app/api/featured/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";

/**
 * PROSTE DEMO „Polecane”
 * - na później możesz to przenieść do Firestore
 * - 'position': gdzie wolno pokazywać: 'hero' | 'sidebar' | 'inline'
 */
const ALL = [
  {
    id: "feat_welcome",
    title: "Witamy na forum Finasfery 👋",
    summary: "Zacznij tutaj: jak działa forum, odznaki i dobre praktyki.",
    url: "/forum/powitanie",
    type: "thread",
    position: ["hero", "sidebar"],
    priority: 95,
    sponsored: false,
    tags: ["start", "regulamin"],
    capDaily: 99,
  },
  {
    id: "feat_etf_ebook",
    title: "E-book: ETF od zera (darmowy rozdział)",
    summary: "Poznaj podstawy ETF — jak dobrać, na co uważać i jak unikać prowizji.",
    url: "https://partner.example/ebook-etf?utm_source=finasfera",
    type: "article",
    position: ["hero", "inline", "sidebar"],
    priority: 90,
    sponsored: true,
    tags: ["ETF", "edukacja"],
    capDaily: 3,
  },
  {
    id: "feat_budzet_app",
    title: "Aplikacja do budżetu domowego",
    summary: "Śledź wydatki 2 minuty dziennie. 30 dni premium za 0 zł.",
    url: "https://partner.example/app-budget?utm_source=finasfera",
    type: "article",
    position: ["sidebar", "inline"],
    priority: 70,
    sponsored: true,
    tags: ["budżet"],
    capDaily: 3,
  },
  {
    id: "feat_longread_fire",
    title: "Droga do FIRE — sprawdzony plan w 6 krokach",
    summary: "Przewodnik dla początkujących: od poduszki po konta maklerskie.",
    url: "/forum/p/droga-do-fire",
    type: "thread",
    position: ["inline", "sidebar"],
    priority: 65,
    sponsored: false,
    tags: ["FIRE", "plan"],
    capDaily: 10,
  },
];

function pickForPosition(pos) {
  const p = String(pos || "").toLowerCase();
  if (!p) return ALL;
  return ALL.filter((x) => (x.position || []).includes(p));
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const pos = searchParams.get("pos") || "";
    const list = pickForPosition(pos)
      .filter(Boolean)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return NextResponse.json(list);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
