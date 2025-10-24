// src/app/api/portfolios/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";
import { getApps } from "firebase-admin/app";

// <<< USTAWIENIA >>>
const HARDCODED_UID = "JxiWdF2JWWX1LhQXSAZ0S76me43"; // ← Twój UID z Firestore
const HARDCODED_PORTFOLIO_ID = "testPortfolio"; // ← nasz nowy portfel

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";

    // Meta dane projektu Firebase
    const app = getApps()[0];
    const options = app.options || {};
    const projectId = options.projectId || process.env.FIREBASE_PROJECT_ID || null;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || null;

    // 1️⃣ Pobierz wszystkie portfele użytkownika
    const snap = await adminDb
      .collection("users")
      .doc(HARDCODED_UID)
      .collection("portfolios")
      .get();

    const portfolios = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // 2️⃣ Pobierz konkretny portfel testowy (testPortfolio)
    const testDoc = await adminDb
      .collection("users")
      .doc(HARDCODED_UID)
      .collection("portfolios")
      .doc(HARDCODED_PORTFOLIO_ID)
      .get();

    // 3️⃣ Tryb debug – wyświetla szczegóły
    if (debug) {
      return NextResponse.json({
        meta: {
          projectId,
          clientEmail,
          uidUsed: HARDCODED_UID,
          portfoliosCount: portfolios.length,
          testDocPath: `users/${HARDCODED_UID}/portfolios/${HARDCODED_PORTFOLIO_ID}`,
          testDocExists: testDoc.exists,
          testDocData: testDoc.exists ? testDoc.data() : null,
        },
        portfolios,
      });
    }

    // 4️⃣ Zwróć same portfele (normalny tryb)
    return NextResponse.json(portfolios);
  } catch (err) {
    console.error("[/api/portfolios] ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load portfolios", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
