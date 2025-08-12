// src/app/api/quote/route.js
import { NextResponse } from "next/server";
import { getQuoteYahooStooq, convertQuoteToPLN } from "../../lib/providers";

export async function POST(req) {
  try {
    const { pair } = await req.json(); // { yahoo, stooq }
    if (!pair?.yahoo && !pair?.stooq) {
      return NextResponse.json({ error: "Missing pair" }, { status: 400 });
    }
    const raw = await getQuoteYahooStooq(pair);           // {price, prevClose, currency}
    const withPLN = await convertQuoteToPLN(raw);         // + pricePLN, prevClosePLN, fxRate
    return NextResponse.json(withPLN);
  } catch (e) {
    console.error("quote error:", e);
    return NextResponse.json({ pricePLN: null, prevClosePLN: null, currency: null }, { status: 200 });
  }
}
