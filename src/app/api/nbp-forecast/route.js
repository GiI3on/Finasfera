// src/app/api/nbp-forecast/route.js
import { NextResponse } from "next/server";
import { NBP_CPI_FORECAST, NBP_FORECAST_META } from "../../data/nbpForecast";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const years = Math.max(1, Math.min(60, Number(searchParams.get("years") || 10)));

  const base = [...NBP_CPI_FORECAST].sort((a, b) => a.year - b.year);
  if (base.length === 0) {
    return NextResponse.json({ forecast: [], meta: NBP_FORECAST_META }, { status: 200 });
  }

  const startYear = base[0].year;
  const lastYear = startYear + years - 1;

  const out = [];
  let lastCpi = base[base.length - 1].cpi;

  for (let y = startYear; y <= lastYear; y++) {
    const found = base.find((r) => r.year === y);
    out.push({ year: y, cpi: found ? found.cpi : lastCpi });
    if (found) lastCpi = found.cpi;
  }

  return NextResponse.json({ forecast: out, meta: NBP_FORECAST_META }, { status: 200 });
}
