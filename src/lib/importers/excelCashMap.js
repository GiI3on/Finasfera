// src/lib/importers/excelCashMap.js
// Mapper wierszy z Excela (MyFund / własny) -> przepływy gotówkowe (CF) do TWR.
// Zwracane obiekty mają format zgodny z addCashOperation / listenCashBalance:
//
//   {
//     date: 'YYYY-MM-DD',
//     amount: number,            // wpłata +, wypłata -
//     currency: 'PLN' | string,
//     note: string,
//     kind: 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND' | 'FEE' | 'TAX' | 'INTERNAL' | 'UNKNOWN',
//     excludeFromTWR: boolean,   // do TWR tylko DEPOSIT/WITHDRAWAL (false), reszta true
//   }
//
// Uwaga: niczego nie zapisuje – zwraca tylko zmapowane obiekty.

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseDatePL(input) {
  if (!input) return null;
  const raw = String(input).trim();

  //  DD.MM.YYYY
  const m = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // próba ISO/Date
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return null;
}

function parseNumberPL(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  // zamień przecinek na kropkę, usuń spacje tysięcy
  const s = String(v).replace(/\s+/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// zrób jeden sklejony „opis” z możliwych pól
function rowText(row) {
  return norm(
    [
      row.Operacja, row.operation, row.operacja,
      row.Komentarz, row.komentarz, row.Comment, row.comment,
      row.Opis, row.opis, row.Description, row.description, row.desc,
      row.Typ, row.typ, row.Kind, row.kind, row.Category, row.category,
      row.Title, row.title,
    ].filter(Boolean).join(" | ")
  );
}

const DEPOSIT_WORDS = [
  "wplata", "wpłata", "zasilenie", "doplat", "doladow", "doładow",
  "przelew przychodzacy", "przelew przychodzący", "deposit", "topup",
  "transfer in", "wpłata automatyczna", "wplata automatyczna",
];
const WITHDRAW_WORDS = [
  "wyplata", "wypłata", "przelew wychodzacy", "przelew wychodzący",
  "withdraw", "withdrawal", "transfer out", "wyprowadzenie", "wypłata automatyczna",
];
const INTERNAL_WORDS = [
  // dywidendy/odsetki
  "dywidend", "dividend", "odsetk",
  // transakcje
  "kupno", "zakup", "sprzedaz", "sprzedaż", "sprzed",
  // opłaty/podatki
  "prowiz", "fee", "tax", "podatek",
  // inne wewnętrzne
  "reinvest", "re-inwest", "umorzenie", "odkup", "split", "scal", "korekta", "przeksi",
];

function containsAny(text, words) {
  return words.some((w) => text.includes(w));
}

/** Mapa jednego wiersza Excela -> CF (albo null jeśli nie umiemy sklasyfikować) */
export function mapExcelRowToCashFlow(row) {
  const t = rowText(row);
  const date = parseDatePL(row.Data || row.Date || row.data || row.date);
  const currency = String(row.Waluta || row.currency || "PLN").toUpperCase();
  const note = String(row.Operacja || row.operation || row.opis || row.Komentarz || "").trim();

  // preferuj kolumnę "Wartość" / "Kwota"
  let amt = parseNumberPL(row.Wartość ?? row.Wartosc ?? row.kwota ?? row.Kwota ?? row.Amount ?? row.amount);

  // STRICte: tylko pewne kategorie trafiają do CF
  if (containsAny(t, DEPOSIT_WORDS)) {
    amt = Math.abs(amt);
    return { date, amount: amt, currency, note, kind: "DEPOSIT", excludeFromTWR: false };
  }
  if (containsAny(t, WITHDRAW_WORDS)) {
    amt = -Math.abs(amt);
    return { date, amount: amt, currency, note, kind: "WITHDRAWAL", excludeFromTWR: false };
  }
  if (t.includes("dywidend") || t.includes("dividend")) {
    // Dywidendy – zostawiamy w cash-flowach informacyjnie, ale wyłączone z TWR
    if (amt === 0) amt = parseNumberPL(row["Kwota dywidendy"] || row["Dividend"]);
    return { date, amount: Math.abs(amt), currency, note, kind: "DIVIDEND", excludeFromTWR: true };
  }
  if (t.includes("prowiz") || t.includes("fee")) {
    return { date, amount: -Math.abs(amt || parseNumberPL(row.Prowizje)), currency, note, kind: "FEE", excludeFromTWR: true };
  }
  if (t.includes("podatek") || t.includes("tax")) {
    return { date, amount: -Math.abs(amt || parseNumberPL(row.Podatek)), currency, note, kind: "TAX", excludeFromTWR: true };
  }

  // operacje wewnętrzne (kupno/sprzedaż itd.) – ignorujemy w CF do TWR
  if (containsAny(t, INTERNAL_WORDS)) {
    return { date, amount: 0, currency, note, kind: "INTERNAL", excludeFromTWR: true };
  }

  // nie rozpoznaliśmy – zwróć UNKNOWN (domyślnie wykluczone z TWR)
  return { date, amount: 0, currency, note, kind: "UNKNOWN", excludeFromTWR: true };
}

/** Wygodny wrapper na wiele wierszy */
export function mapExcelRowsToCashFlows(rows = []) {
  const flows = [];
  const skipped = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    const m = mapExcelRowToCashFlow(r);
    if (!m || !m.date) { skipped.push(r); continue; }
    // agregacja po dacie (ten sam dzień może mieć kilka wierszy tego samego typu)
    const key = m.date;
    const idx = flows.findIndex((x) => x.date === key && x.currency === m.currency && x.kind === m.kind && x.excludeFromTWR === m.excludeFromTWR);
    if (idx >= 0) {
      flows[idx].amount += m.amount;
      flows[idx].note = [flows[idx].note, m.note].filter(Boolean).join(" | ");
    } else {
      flows.push({ ...m });
    }
  }
  return { flows, skipped };
}
