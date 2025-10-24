// CommonJS (require), żeby działało bez "type": "module"
const fs = require("fs");
const path = require("path");

// Ścieżki
const listsDir = path.join(process.cwd(), "src", "app", "data", "lists");
const outFile  = path.join(process.cwd(), "src", "app", "data", "catalog.json");

// Pomocnicze
function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function isArr(a) {
  return Array.isArray(a);
}
function normStr(s) {
  return String(s || "").trim();
}

// Wczytaj listy
const listFiles = ["wig20.json", "mwig40.json", "swig80.json"].map(f => path.join(listsDir, f));
const lists = [];
for (const f of listFiles) {
  if (!fs.existsSync(f)) {
    console.warn(`[WARN] Brak pliku listy: ${f}`);
    continue;
  }
  try {
    const arr = readJson(f);
    if (!isArr(arr)) {
      console.warn(`[WARN] ${f} nie zawiera tablicy`);
      continue;
    }
    lists.push(...arr);
  } catch (e) {
    console.warn(`[WARN] Błąd czytania ${f}:`, e.message);
  }
}

// Znormalizuj -> usuń duplikaty po (yahoo, stooq, name)
const seen = new Set();
const out = [];

for (const row of lists) {
  const obj = {
    name:   normStr(row.name),
    yahoo:  normStr(row.yahoo),
    stooq:  normStr(row.stooq),
    type:   normStr(row.type || "EQUITY"),
    // exchange/currency są opcjonalne – jeśli masz, zostaw:
    exchange: normStr(row.exchange || ""),
    currency: normStr(row.currency || "")
  };

  // minimalne sanity — musi być nazwa i przynajmniej jedno z tickerów
  if (!obj.name || (!obj.yahoo && !obj.stooq)) continue;

  const key = `${obj.name}::${obj.yahoo}::${obj.stooq}`;
  if (seen.has(key)) continue;
  seen.add(key);
  out.push(obj);
}

// Zapisz
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(out, null, 2), "utf8");

console.log(`[OK] Zbudowano katalog: ${out.length} rekordów -> ${outFile}`);
