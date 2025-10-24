// src/app/components/ImportHoldingsButton.jsx
"use client";

import { useMemo, useState } from "react";
import { Modal, ModalHeader, ModalBody } from "./TxModals";
import { addHolding } from "../../lib/portfolioStore";

/** Obsługiwane formaty:
 * 1) Własny CSV: yahoo/symbol, shares, buyPrice, buyDate, [name], [currency]
 * 2) Export z myfund.pl (skład portfela): Walor; Liczba jednostek; Śr. cena zakupu [PLN]; [Waluta waloru]; [Data zakupu*]; [ISIN…]
 *    * – jeśli data występuje w którejś kolumnie (różne nazwy), zostanie użyta; inaczej możesz podać „Datę domyślną” w UI.
 */

export default function ImportHoldingsButton({ uid, portfolioId }) {
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState({ ok: 0, fail: 0 });
  const [forceMyFund, setForceMyFund] = useState(false);
  const [overrideDate, setOverrideDate] = useState(""); // „Data domyślna” dla wierszy bez daty

  /* =============== helpers =============== */
  function detectDelimiter(text) {
    const candidates = [";", ",", "\t", "|"];
    let best = ";";
    let bestCount = 0;
    const first = (text.split(/\r?\n/)[0] || "");
    for (const d of candidates) {
      const c = first.split(d).length;
      if (c > bestCount) { bestCount = c; best = d; }
    }
    return best;
  }

  function normHeader(h = "") {
    return h
      .replace(/\uFEFF/g, "")     // BOM
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[()[\]]/g, "")
      .replace(/[-–—]/g, "")
      // polskie znaki
      .replace(/ś|ş|š/g, "s")
      .replace(/ł/g, "l")
      .replace(/ó/g, "o")
      .replace(/ż|ź/g, "z")
      .replace(/ą/g, "a")
      .replace(/ę/g, "e")
      .replace(/ć/g, "c")
      .replace(/ń/g, "n");
  }

  // usuń zwykłe spacje, NBSP i wąskie NBSP, zamień przecinek na kropkę
  const toNum = (v) => {
    if (v == null) return 0;
    const s = String(v)
      .trim()
      .replace(/[\s\u00A0\u202F]/g, "")
      .replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const todayISO = () => new Date().toISOString().slice(0, 10);

  function parseBuyDate(v) {
    if (!v) return null;
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // RRRR-MM-DD
    const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/); // DD.MM.RRRR itp.
    if (m) {
      const [, d, mo, y] = m;
      return `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0,10);
  }

  function parseMyFundWalor(s = "") {
    const t = String(s).trim();
    const m = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (m) {
      return { name: m[1].trim(), ticker: m[2].trim().toUpperCase() };
    }
    return { name: t, ticker: t.toUpperCase() };
  }

  function yahooFromTicker(ticker, waluta = "PLN", grupa = "") {
    const gpwLike =
      (waluta || "").toUpperCase() === "PLN" ||
      (grupa || "").toLowerCase().includes("gpw") ||
      (grupa || "").toLowerCase().includes("akcje");
    if (gpwLike && !/\.[A-Z]{2,4}$/.test(ticker)) return `${ticker}.WA`;
    return ticker;
  }

  /* =============== parsery CSV =============== */
  function detectMyFundHeader(header) {
    const hasWalor = header.some((h) => h.includes("walor"));
    const hasLiczba = header.some((h) =>
      h.includes("liczbajednostek") ||
      h.includes("liczbaakcji") ||
      h.includes("ilosc") ||
      h.includes("sztuk")
    );
    const hasCenaZakupuPLN = header.some((h) =>
      (h.includes("cenazakupu") && h.includes("pln")) ||
      h.includes("srcenazakupupln") ||
      h.includes("sredniacenazakupupln")
    );
    return hasWalor && hasLiczba && hasCenaZakupuPLN;
  }

  function parseCSV_MyFund(text, delim) {
    const errs = [];
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { rows: [], errs: ["Brak wierszy w pliku."] };
    const headerRaw = lines[0].split(delim);
    const header = headerRaw.map(normHeader);

    const idxBy = (nameArr) => {
      for (const n of nameArr) {
        const i = header.indexOf(normHeader(n));
        if (i >= 0) return i;
      }
      const frag = nameArr.map(normHeader);
      const i2 = header.findIndex(h => frag.some(f => h.includes(f)));
      return i2;
    };

    const col = {
      walor: idxBy(["walor"]),
      shares: idxBy(["liczbajednostek","liczbaakcji","ilosc"]),
      buyPricePLN: idxBy(["srcenazakupupln","sredniacenazakupupln","cenazakupupln"]),
      waluta: idxBy(["walutawaloru","waluta"]),
      grupa: idxBy(["grupa","kategoria"]),
      // SZEROKI zestaw możliwych nazw kolumn z datą zakupu
      buyDate: idxBy([
        "datazakupu",
        "datazakupuwaluciewaloru",
        "datazakupuwwaluciewaloru",
        "datazakupuwwalucie",
        "datazakupuwalucieoryginalnej",
        "datazakupuwaloru",
        "datakupu",
        "datatransakcji"
      ]),
      isin: idxBy(["isin"]),
    };

    if (col.walor < 0 || col.shares < 0 || col.buyPricePLN < 0) {
      errs.push("Nie znaleziono wymaganych kolumn myfund: Walor, Liczba jednostek, Śr. cena zakupu [PLN].");
      return { rows: [], errs };
    }

    const out = [];
    for (let li = 1; li < lines.length; li++) {
      const parts = lines[li].split(delim);
      if (parts.length < headerRaw.length) continue;

      const { name, ticker } = parseMyFundWalor(parts[col.walor]);
      const shares = toNum(parts[col.shares]);
      const buyPrice = toNum(parts[col.buyPricePLN]);
      const waluta = col.waluta >= 0 ? String(parts[col.waluta] || "PLN").trim().toUpperCase() : "PLN";
      const grupa = col.grupa >= 0 ? String(parts[col.grupa] || "") : "";
      const yahoo = yahooFromTicker(ticker, waluta, grupa);
      const currency = "PLN";

      const parsedDate = col.buyDate >= 0 ? parseBuyDate(parts[col.buyDate]) : null;

      if (!ticker) { errs.push(`Wiersz ${li+1}: brak tickeru.`); continue; }
      if (shares <= 0) { errs.push(`Wiersz ${li+1}: ilość ≤ 0.`); continue; }
      if (buyPrice <= 0) { errs.push(`Wiersz ${li+1}: cena ≤ 0.`); continue; }

      out.push({
        yahoo,
        name: name || yahoo,
        shares,
        buyPrice,
        buyDate: parsedDate, // może być null – wtedy uzupełnimy overrideDate / today
        currency
      });
    }

    return { rows: out, errs };
  }

  function parseCSV_Generic(text) {
    const errs = [];
    const delim = detectDelimiter(text);
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { rows: [], errs: ["Brak wierszy w pliku."] };

    const headerRaw = lines[0].split(delim);
    const header = headerRaw.map(normHeader);

    if (detectMyFundHeader(header) || forceMyFund) {
      return parseCSV_MyFund(text, delim);
    }

    const idx = (arr) => {
      for (const name of arr) {
        const i = header.indexOf(normHeader(name));
        if (i >= 0) return i;
      }
      return -1;
    };

    const col = {
      symbol: idx(["yahoo","symbol","ticker"]),
      name:   idx(["name","spolka","nazwa"]),
      shares: idx(["shares","ilosc","qty"]),
      buyPrice: idx(["buyprice","price","cena","kurs"]),
      buyDate:  idx(["buydate","date","data"]),
      currency: idx(["currency","waluta"]),
    };

    const requiredMissing = ["symbol","shares","buyPrice","buyDate"].filter(k => col[k] < 0);
    if (requiredMissing.length) {
      errs.push(`Brak kolumn: ${requiredMissing.join(", ")}.`);
      return { rows: [], errs };
    }

    const out = [];
    for (let li = 1; li < lines.length; li++) {
      const parts = lines[li].split(delim);
      const yahoo = (parts[col.symbol] || "").trim();
      const shares = toNum(parts[col.shares]);
      const buyPrice = toNum(parts[col.buyPrice]);
      const buyDate = parseBuyDate(parts[col.buyDate]);
      const name = (col.name >= 0 ? parts[col.name] : "") || yahoo;
      const currency = ((col.currency >= 0 ? parts[col.currency] : "") || "PLN").trim().toUpperCase();

      if (!yahoo) { errs.push(`Wiersz ${li+1}: brak symbolu.`); continue; }
      if (shares <= 0) { errs.push(`Wiersz ${li+1}: ilość ≤ 0.`); continue; }
      if (buyPrice <= 0) { errs.push(`Wiersz ${li+1}: cena ≤ 0.`); continue; }

      out.push({
        yahoo,
        name,
        shares,
        buyPrice,
        buyDate,
        currency
      });
    }

    return { rows: out, errs };
  }

  function parseCSV(text) {
    if (!text.trim()) return { rows: [], errs: ["Wklej zawartość CSV."] };
    try {
      return parseCSV_Generic(text);
    } catch {
      return { rows: [], errs: ["Nie udało się przetworzyć CSV."] };
    }
  }

  // odczyt pliku – UTF-8
  function handleSelectFile(file) {
    if (!file) return;
    const reader1 = new FileReader();
    reader1.onload = () => {
      const text1 = String(reader1.result || "");
      const parsed = parseCSV(text1);
      setRawText(text1);
      setRows(parsed.rows);
      setErrors(parsed.errs);
      setDone({ ok: 0, fail: 0 });
    };
    reader1.readAsText(file, "utf-8");
  }

  function handleParseTextarea() {
    const { rows, errs } = parseCSV(rawText);
    setRows(rows); setErrors(errs); setDone({ ok:0, fail:0 });
  }

  async function handleImport() {
    if (!uid || rows.length === 0) return;
    setBusy(true);
    let ok = 0, fail = 0;

    for (let i = 0; i < rows.length; i += 5) {
      const part = rows.slice(i, i + 5);
      const res = await Promise.allSettled(part.map(r => {
        const finalDate = r.buyDate || overrideDate || todayISO();
        return addHolding(
          uid,
          portfolioId ?? null,
          {
            name: r.name || r.yahoo,
            pair: { yahoo: r.yahoo, currency: r.currency || "PLN" },
            shares: r.shares,
            buyPrice: r.buyPrice,   // już w PLN
            buyDate: finalDate,
          },
          { autoTopUp: false }
        );
      }));
      for (const rr of res) rr.status === "fulfilled" ? ok++ : fail++;
    }

    setBusy(false);
    setDone({ ok, fail });
  }

  const example = useMemo(() => (
`Walor;Liczba jednostek;Śr. cena zakupu [PLN];Waluta waloru;Data zakupu;ISIN
PKNORLEN (PKN);10;72,50;PLN;2023-06-14;PLPKN0000018
XTB;35;34,10;PLN;15.07.2024;PLXTRDM00011
KRUK (KRU);3;398,67;PLN;2022-12-05;PLKRK0000010`
  ), []);

  return (
    <>
      <button
        className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
        onClick={() => setOpen(true)}
      >
        Importuj spółki (CSV)
      </button>

      <Modal open={open} onClose={() => setOpen(false)} maxWidth="max-w-4xl">
        <ModalHeader title="Import spółek z CSV (w tym myfund.pl)" onClose={() => setOpen(false)} />
        <ModalBody>
          <div className="space-y-4">
            <div className="text-sm text-zinc-400">
              Obsługuję CSV z myfund.pl (<em>skład portfela</em>) oraz prosty CSV:
              <code className="ml-1">yahoo/symbol, shares, buyPrice, buyDate[, name, currency]</code>.
              Jeśli w pliku nie ma dat, podaj „Datę domyślną” – zostanie użyta tylko dla wierszy bez własnej daty.
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input type="file" accept=".csv,text/csv" onChange={(e) => handleSelectFile(e.target.files?.[0] || null)} />
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-200"
                onClick={() => navigator.clipboard?.writeText(example)}
              >
                Skopiuj przykład myfund
              </button>
              <label className="flex items-center gap-2 text-sm ml-auto">
                <input
                  type="checkbox"
                  checked={forceMyFund}
                  onChange={(e) => setForceMyFund(e.target.checked)}
                />
                Wymuś tryb myfund
              </label>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-400">Data domyślna:</span>
                <input
                  type="date"
                  className="input"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                />
              </div>
            </div>

            <textarea
              className="input w-full h-40"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={example}
            />
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800"
                onClick={handleParseTextarea}
                type="button"
              >
                Podgląd CSV
              </button>
              <div className="text-sm text-zinc-400 self-center">
                Wykryte wiersze: <span className="text-zinc-200">{rows.length}</span>
              </div>
            </div>

            {!!errors.length && (
              <div className="rounded-lg border border-red-700 bg-red-900/30 text-red-200 text-sm px-3 py-2">
                <div className="font-semibold mb-1">Problemy:</div>
                <ul className="list-disc ml-5">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {rows.length > 0 && (
              <div className="rounded-lg border border-zinc-700 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-900 text-zinc-400">
                    <tr>
                      <th className="text-left p-2">Yahoo</th>
                      <th className="text-left p-2">Nazwa</th>
                      <th className="text-right p-2">Akcje</th>
                      <th className="text-right p-2">Cena (PLN)</th>
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Waluta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const previewDate = r.buyDate || overrideDate || todayISO();
                      return (
                        <tr key={i} className="border-t border-zinc-800">
                          <td className="p-2">{r.yahoo}</td>
                          <td className="p-2">{r.name}</td>
                          <td className="p-2 text-right tabular-nums">{r.shares}</td>
                          <td className="p-2 text-right tabular-nums">{Number(r.buyPrice).toFixed(2)}</td>
                          <td className="p-2">{previewDate}</td>
                          <td className="p-2">{r.currency}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-zinc-400">
                Zaimportowano: <span className="text-emerald-300">{done.ok}</span>
                {" · "}Błędy: <span className="text-red-300">{done.fail}</span>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800"
                  type="button"
                  onClick={() => { setRawText(""); setRows([]); setErrors([]); setDone({ ok:0, fail:0 }); }}
                >
                  Wyczyść
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400 disabled:opacity-60"
                  type="button"
                  disabled={busy || rows.length === 0}
                  onClick={handleImport}
                >
                  {busy ? "Importuję…" : "Importuj"}
                </button>
              </div>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
}
