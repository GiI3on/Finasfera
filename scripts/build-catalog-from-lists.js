// scripts/build-catalog-from-lists.js
const fs = require("fs");
const path = require("path");

const listsDir = path.join(process.cwd(), "src", "app", "data", "lists");
const outFile = path.join(process.cwd(), "src", "app", "data", "catalog.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeStr(s) {
  return String(s || "").trim();
}

const listFiles = ["wig20.json", "mwig40.json", "swig80.json"].map(f =>
  path.join(listsDir, f)
);

let allRecords = [];

for (const file of listFiles) {
  if (!fs.existsSync(file)) {
    console.warn(`[WARN] Brak pliku: ${file}`);
    continue;
  }
  try {
    const arr = readJson(file);
    if (!Array.isArray(arr)) {
      console.warn(`[WARN] ${file} nie zawiera tablicy`);
      continue;
    }
    allRecords.push(...arr);
  } catch (err) {
    console.error(`[ERROR] Nie można wczytać ${file}:`, err.message);
  }
}

const seen = new Set();
const output = [];

for (const item of allRecords) {
  const obj = {
    name: normalizeStr(item.name),
    yahoo: normalizeStr(item.yahoo),
    stooq: normalizeStr(item.stooq),
    type: normalizeStr(item.type || "EQUITY"),
    exchange: normalizeStr(item.exchange || ""),
    currency: normalizeStr(item.currency || "PLN"),
  };

  if (!obj.name || (!obj.yahoo && !obj.stooq)) continue;

  const key = `${obj.name}::${obj.yahoo}::${obj.stooq}`;
  if (seen.has(key)) continue;

  seen.add(key);
  output.push(obj);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(output, null, 2), "utf8");

console.log(`[OK] Zbudowano katalog: ${output.length} rekordów -> ${outFile}`);
