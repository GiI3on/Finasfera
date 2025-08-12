import list from "../../data/popular-pl.json";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  if (!q) return Response.json([]);

  // lokalna baza
  const local = list.filter(x => x.name.toLowerCase().includes(q));

  // yahoo search fallback
  let remote = [];
  try {
    const y = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}`, { cache: "no-store" })
      .then(r => r.json());
    const items = y?.quotes || [];
    remote = items
      .filter(it =>
        (it.symbol?.endsWith(".WA") || it.exchDisp === "WAR" || it.exchange === "WAR") &&
        !/FUT|WARRANT|BOND|PREFERRED/i.test(it.typeDisp || "")
      )
      .slice(0, 10)
      .map(it => ({
        name: it.shortname || it.longname || it.symbol,
        yahoo: it.symbol,
        // prosta heurystyka dla stooq (zwykle mały ticker bez .wa)
        stooq: (it.symbol || "").replace(".WA","").toLowerCase()
      }));
  } catch {
    remote = [];
  }

  // scal, unikaj duplikatów po symbolu yahoo
  const map = new Map();
  [...local, ...remote].forEach(x => map.set(x.yahoo || `${x.stooq}:${x.name}`, x));
  return Response.json(Array.from(map.values()).slice(0, 10));
}
