// src/lib/marketSnap.js

// weekend? (0 = nd, 6 = sob)
export function isWeekend(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  const wd = d.getUTCDay();
  return wd === 0 || wd === 6;
}

// cofnij datę do poprzedniego dnia roboczego (pon–pt)
export function prevWeekday(dateStr) {
  let d = new Date(dateStr + "T12:00:00Z");
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

// wyciągnij ostatnie zamknięcie ≤ targetDate z /api/history
export async function snapToLastClose({ pair, targetDate }) {
  // pair może być np. { yahoo: "PKN.WA" } lub dowolny obiekt, który Twoje /api/history rozumie
  const body = { pair, range: "6mo", interval: "1d" };

  const r = await fetch("/api/history", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok) return null;

  const json = await r.json().catch(() => ({}));
  const arr =
    (Array.isArray(json.historyPLN) && json.historyPLN) ||
    (Array.isArray(json.history) && json.history) ||
    [];

  if (!arr.length) return null;

  const tMax = new Date(targetDate + "T23:59:59Z").getTime();
  let best = null;

  for (const p of arr) {
    const ts = p?.t ?? p?.date ?? p?.Date ?? p?.time ?? p?.timestamp ?? null;
    if (!ts) continue;
    const tt = new Date(ts).getTime();
    if (Number.isFinite(tt) && tt <= tMax) best = p;
  }

  if (!best) return null;

  const price = Number(best.close ?? best.price ?? best.adjClose ?? best.c);
  if (!Number.isFinite(price)) return null;

  const dateISO = new Date(best.t || best.date || best.time || best.timestamp)
    .toISOString()
    .slice(0, 10);

  return { dateISO, price };
}
