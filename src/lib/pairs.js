/* Resolver par (yahoo/stooq) oparty o public/data/catalog.json – BEZ użycia fs.
   Działa w komponentach klienckich i na serwerze.
*/

/* ===== helpers ===== */
const norm = (s = "") => String(s).trim();
const normLc = (s = "") => norm(s).toLowerCase();
const isYahooWA = (y = "") => norm(y).toUpperCase().endsWith(".WA");

/* fallback, gdy nie znajdziemy w katalogu */
function fallbackEnsurePairMappings(pairIn = {}) {
  const out = { ...pairIn };
  const y = String(out?.yahoo || out?.symbol || "").toUpperCase().trim();

  if (y.endsWith(".WA")) {
    out.yahoo = y;
    out.stooq = out.stooq || y.slice(0, -3).toLowerCase(); // PKO.WA -> pko
    out.currency = out.currency || "PLN";
  }
  if (!out.stooq && /^[A-Z.^\-]{1,12}$/.test(y) && !y.includes(".")) {
    out.yahoo = y; // np. AAPL
    out.stooq = `${y.toLowerCase()}.us`;
  }
  return out;
}

/* ===== ładowanie katalogu (bez fs) =====
   1) próbujemy statycznie zaimportować JSON (bundlowane przez Next).
   2) fallback: fetch z /public/data/... (działa w przeglądarce i na serwerze Next).
*/
let cachedCatalog = null;
async function loadCatalog() {
  if (cachedCatalog) return cachedCatalog;
  try {
    // statyczny import JSON (Next umie to zbundlować)
    const mod = await import("../../public/data/catalog.json");
    cachedCatalog = Array.isArray(mod.default) ? mod.default : (Array.isArray(mod) ? mod : []);
    if (cachedCatalog.length) return cachedCatalog;
  } catch {}
  try {
    const r = await fetch("/data/catalog.json", { cache: "force-cache" });
    const j = r.ok ? await r.json() : [];
    cachedCatalog = Array.isArray(j) ? j : [];
    return cachedCatalog;
  } catch {
    cachedCatalog = [];
    return cachedCatalog;
  }
}

/* ===== główny resolver =====
   input: "AAPL", "PKN.WA", { yahoo: "SVE.WA" }, "Synthaverse", "tarczyński", itp.
*/
export async function resolvePair(input) {
  const inPair = typeof input === "object" && input ? input : { yahoo: input };
  const want = norm(inPair.yahoo || inPair.symbol || inPair.ticker || inPair.name || "");

  const catalog = await loadCatalog();

  const key = normLc(want);
  let hit =
    catalog.find(it => normLc(it.yahoo || "") === key) ||
    catalog.find(it => normLc(it.stooq || "") === key) ||
    catalog.find(it => normLc(it.name  || "") === key) ||
    catalog.find(it => Array.isArray(it.aliases) && it.aliases.map(s => normLc(s)).includes(key));

  // heurystyka: użytkownik podał kod Stooq (np. "sve")
  if (!hit && key && /^[a-z0-9]{1,6}$/.test(key)) {
    hit = catalog.find(it => normLc(it.stooq || "") === key);
  }

  if (hit) {
    const yahoo = norm(hit.yahoo || inPair.yahoo || "");
    const stooq = norm(hit.stooq || inPair.stooq || (isYahooWA(yahoo) ? yahoo.slice(0, -3).toLowerCase() : ""));
    const out = {
      yahoo: yahoo || undefined,
      stooq: stooq || undefined,
      currency: hit.currency || (isYahooWA(yahoo) ? "PLN" : inPair.currency),
      exchange_name: hit.exchange_name || inPair.exchange_name,
      exchange_mic:  hit.exchange_mic  || inPair.exchange_mic,
      country: hit.country || inPair.country,
      type: hit.type || inPair.type,
      is_primary: hit.is_primary ?? inPair.is_primary,
    };
    if (isYahooWA(out.yahoo)) {
      out.currency = "PLN";
      out.stooq = out.stooq || out.yahoo.slice(0, -3).toLowerCase();
    }
    return out;
  }

  return fallbackEnsurePairMappings(inPair);
}

/* opcjonalna sync-wersja (bez katalogu) */
export function ensurePairMappingsSync(pairIn = {}) {
  return fallbackEnsurePairMappings(pairIn);
}
