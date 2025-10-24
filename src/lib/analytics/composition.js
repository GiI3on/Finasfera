// File: src/lib/analytics/composition.js

/* ================= Helpers ================ */
const SYM = (s) => String(s || "").toUpperCase();
const TXT = (s) => String(s || "").toUpperCase();

function capitalize(x) {
  const s = String(x || "");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/** Rozsądne domyślne klasy aktywów + heurystyki */
function normalizeAssetClass(raw, { symbol = "", name = "", sector } = {}) {
  const t = TXT(raw || name || symbol);

  // ETF / fundusze
  if (/(ETF|UCITS|ETP|FUND|FUNDUSZ)/.test(t)) return "ETF/Fundusz";

  // Obligacje (prosty heurystyczny zestaw)
  if (/(BOND|OBLIG|UST|TREAS|TBILL|TSY|TNX)/.test(t)) return "Obligacje";

  // Gotówka
  if (/(CASH|GOTÓW|GOTOW|USDPLN|EURPLN|PLN|KASA)/.test(t)) return "Gotówka";

  // Jeśli mamy sektor (spółka/ETF akcyjny) → domyślnie akcje
  if (sector) return "Akcje";

  // Sufiksy giełdowe – najczęściej akcje
  if (/\.[A-Z]{1,3}$/.test(SYM(symbol))) return "Akcje";

  // Jeżeli użytkownik podał klasę – znormalizuj
  if (raw) {
    const s = String(raw).toLowerCase();
    if (["equity", "stock", "akcje"].includes(s)) return "Akcje";
    if (["bond", "obligacje", "fixedincome"].includes(s)) return "Obligacje";
    if (["etf", "fund", "fundusz"].includes(s)) return "ETF/Fundusz";
    if (["cash", "gotowka"].includes(s)) return "Gotówka";
    if (["commodity", "surowce"].includes(s)) return "Surowce";
    return capitalize(raw);
  }

  // Bez lepszych wskazówek – przyjmij Akcje (żeby nie lądowało w „Inne”)
  return "Akcje";
}

function inferCountryFromYahoo(symbol = "") {
  const s = SYM(symbol);
  if (s.endsWith(".WA")) return "Polska";
  if (s.endsWith(".US")) return "USA";
  if (s.endsWith(".DE") || s.endsWith(".F")) return "Niemcy";
  if (s.endsWith(".PA")) return "Francja";
  if (s.endsWith(".AS")) return "Holandia";
  if (s.endsWith(".MI")) return "Włochy";
  if (s.endsWith(".BR") || s.endsWith(".BE")) return "Belgia";
  if (s.endsWith(".VI")) return "Austria";
  if (s.endsWith(".L"))  return "Wielka Brytania";
  if (s.endsWith(".HK")) return "Hongkong";
  if (s.endsWith(".T"))  return "Japonia";
  if (s.endsWith(".TO") || s.endsWith(".V")) return "Kanada";
  if (s.endsWith(".SW")) return "Szwajcaria";
  if (s.endsWith(".SS") || s.endsWith(".SZ")) return "Chiny";
  if (s.endsWith(".KS") || s.endsWith(".KQ")) return "Korea Płd.";
  if (s.endsWith(".AX")) return "Australia";
  return null;
}

/** Mocniejszy fallback sektorów */
function inferSectorFallback({ symbol = "", name = "" }) {
  const t = TXT(`${symbol} ${name}`);

  // twarde mapowania popularnych PL (możesz rozszerzać)
  const HARD = {
    "PKN.WA": "Energia",
    "PKNORLEN": "Energia",
    "PZU.WA": "Finanse",
    "PEO.WA": "Finanse",
    "PKO.WA": "Finanse",
    "KGH.WA": "Materiały",
    "JSW.WA": "Materiały",
    "CDR.WA": "Technologia",
    "ALLEGRO.WA": "Sprzedaż detaliczna",
    "XTB.WA": "Finanse",
  };
  const symU = SYM(symbol);
  if (HARD[symU]) return HARD[symU];

  if (/(TECH|IT|SOFT|SAAS|CHIP|SEMICON|GAM|CDP|CDPROJEKT)/.test(t)) return "Technologia";
  if (/(BANK|FINAN|INSUR|BROK|XTB|PZU|PKO|PEKAO)/.test(t))         return "Finanse";
  if (/(OIL|GAZ|GAS|LNG|ORLEN|LOTOS|ENERG)/.test(t))               return "Energia";
  if (/(PHARM|MED|LEK|HEALTH|SZPITAL)/.test(t))                    return "Zdrowie";
  if (/(AUTO|MOTO|TESLA|BMW)/.test(t))                             return "Motoryzacja";
  if (/(RETAIL|SKLEP|ECOM|E-COM|ALLEGRO)/.test(t))                 return "Sprzedaż detaliczna";
  if (/(BUDOW|CONSTR|DEVELOPER|DOMDEV|ATREM)/.test(t))             return "Budownictwo";
  if (/(CHEM|METALE|SUROW|KGHM|KETY|JSW)/.test(t))                 return "Materiały";
  if (/(TELCO|MEDIA|TV|RADIO|PLAY|ORANGE)/.test(t))                return "Usługi komunikacyjne";
  if (/(FOOD|SPOŻ|SPOZ|NAPOJ|ŻYW|ZYW)/.test(t))                    return "Dobra konsumpcyjne";
  if (/(ETF|UCITS|FUND|FUNDUSZ|ETP)/.test(t))                      return "ETF/Fundusz";
  return "Inne";
}

/* ============== PUBLIC: buildMetaBySymbol ============== */
export function buildMetaBySymbol(holdings = []) {
  const out = {};
  for (const h of holdings) {
    const symU = SYM(h?.pair?.yahoo || h?.name || h?.key);
    if (!symU) continue;

    const sector = h?.pair?.sector || inferSectorFallback({
      symbol: symU, name: h?.name || h?.pair?.name || "",
    });

    const assetClass = normalizeAssetClass(
      h?.pair?.assetClass || h?.pair?.class,
      { symbol: symU, name: h?.name || h?.pair?.name || "", sector }
    );

    const country =
      h?.pair?.country ||
      inferCountryFromYahoo(symU) ||
      undefined;

    out[symU] = {
      country,
      sector,
      assetClass,
      class: assetClass,
    };
  }
  return out;
}

/* ============== PUBLIC: buildComposition ============== */
export function buildComposition(
  groups = [],
  { mode = "symbol", totalValue = 0, topN = 9, metaBySymbol = {} } = {}
) {
  const tv = Number(totalValue) || groups.reduce((a, g) => a + (Number(g?.value) || 0), 0);
  const byKey = new Map();
  let coveredVal = 0;

  const pickLabel = (g, meta) => {
    if (mode === "symbol") return g.name || g.key || "Instrument";
    if (mode === "assetClass")
      return meta?.assetClass || meta?.class || g?.pair?.assetClass || g?.pair?.class || "Inne";
    if (mode === "sector")
      return meta?.sector || g?.pair?.sector || "Inne";
    if (mode === "country")
      return meta?.country || g?.pair?.country || "Inne";
    return "Inne";
  };

  for (const g of groups) {
    const val = Number(g?.value) || 0;
    if (val <= 0) continue;

    const symU = SYM(g?.key || g?.pair?.yahoo || g?.name || "");
    const meta = metaBySymbol[symU] || {};

    const label = pickLabel(g, meta);
    const key = `${mode}:${label}`;
    if (!byKey.has(key)) byKey.set(key, { key, label, value: 0 });
    byKey.get(key).value += val;

    const covered =
      mode === "symbol" ? true
      : mode === "assetClass" ? !!(meta?.assetClass || meta?.class || g?.pair?.assetClass || g?.pair?.class)
      : mode === "sector"     ? !!(meta?.sector || g?.pair?.sector)
      : mode === "country"    ? !!(meta?.country || g?.pair?.country)
      : false;

    if (covered) coveredVal += val;
  }

  let rows = Array.from(byKey.values()).sort((a, b) => (b.value || 0) - (a.value || 0));

  if (rows.length > topN) {
    const head = rows.slice(0, topN - 1);
    const tail = rows.slice(topN - 1);
    const restVal = tail.reduce((a, x) => a + (x.value || 0), 0);
    head.push({ key: `${mode}:__OTHER__`, label: "Inne", value: restVal });
    rows = head;
  }

  rows = rows.map((r) => ({
    ...r,
    pct: tv > 0 ? (r.value / tv) * 100 : 0,
  }));

  const coverage = tv > 0 ? Math.max(0, Math.min(1, coveredVal / tv)) : 0;

  return { rows, coverage };
}
