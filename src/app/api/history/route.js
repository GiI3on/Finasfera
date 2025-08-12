// src/app/api/history/route.js
import { NextResponse } from "next/server";
import { getHistoryYahooStooq, convertHistoryToPLN } from "../../lib/providers";

export async function POST(req) {
  try {
    const { pair, range = "1y", interval = "1d" } = await req.json();
    if (!pair?.yahoo && !pair?.stooq) {
      return NextResponse.json([], { status: 400 });
    }
    const { currency, history } = await getHistoryYahooStooq(pair, range, interval);
    const { historyPLN, fxRate } = await convertHistoryToPLN(currency, history);
    return NextResponse.json({ historyPLN, fxRate, currency });
  } catch (e) {
    console.error("history error:", e);
    return NextResponse.json({ historyPLN: [], fxRate: 1, currency: "PLN" }, { status: 200 });
  }
}
