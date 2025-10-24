// src/app/api/search/indexLocal.js
import catalog from "../../data/catalog.json" assert { type: "json" };

const norm = (s="") =>
  s.toString().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

const baseSym = s => (s.includes(".") ? s.split(".")[0] : s);

function isGpw(it) {
  return (it.exchange_name || "").toUpperCase() === "GPW" || (it.yahoo || "").toUpperCase().endsWith(".WA");
}

function scoreLocal(query, it) {
  const q = norm(query), qUp = query.toUpperCase();
  const name = it.name || "", nn = norm(name);
  const sym = it.yahoo || it.ticker_native || "", symUp = sym.toUpperCase();
  const baseUp = baseSym(symUp);

  let s = 0;
  if (symUp === qUp || baseUp === qUp) s += 1200;
  if (baseUp.startsWith(qUp)) s += 350;
  if (nn.includes(q)) s += 400;
  if (nn.includes(q) && isGpw(it)) s += 650;

  if (isGpw(it)) s += 600;
  if ((it.currency || "").toUpperCase() === "PLN") s += 500;

  if (baseUp.length <= 4 && isGpw(it)) s += 300;

  // aliasy
  for (const a of it.aliases || []) {
    const an = norm(a);
    if (an === q) s += 900;
    else if (an.startsWith(q)) s += 300;
    else if (an.includes(q)) s += 200;
  }
  return s;
}

export async function localSearch(query, limit = 12) {
  if (!query?.trim()) return [];
  const ranked = catalog
    .map(it => ({ it, score: scoreLocal(query, it) }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .map(({ it }) => it);

  const seen = new Set();
  const out = [];
  for (const it of ranked) {
    const key = `${(it.yahoo||"").toUpperCase()}__${(it.exchange_mic||"").toUpperCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
    if (out.length >= limit) break;
  }
  return out;
}
