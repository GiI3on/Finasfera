/**
 * lib/xtbImporter.js
 * ---------------------------------------------------------------------------
 * Parser raportów XTB (.xlsx: "Cash Operations" + "Closed Positions") do
 * formatu danych używanego przez Finasferę.
 *
 * KLUCZOWY PROBLEM, KTÓRY TEN MODUŁ ROZWIĄZUJE:
 * XTB w eksporcie NIE daje osobnego arkusza "Open Positions" — są tylko
 * "Cash Operations" (surowe zdarzenia gotówkowe, w tym każdy zakup akcji)
 * i "Closed Positions" (już zamknięte/sprzedane loty). Otwarte pozycje
 * trzeba więc zrekonstruować:
 *
 *   1) z "Cash Operations" wyciągamy KAŻDY pojedynczy zakup (typ "Stock
 *      purchase"), parsując z kolumny Comment dokładną liczbę akcji
 *      i cenę, np. "OPEN BUY 3/3.3887 @ 120.180" -> 3 szt. @ 120.180
 *      (druga linia z tego samego zlecenia: "OPEN BUY 0.3887/3.3887 @ 120.180")
 *   2) z "Closed Positions" liczymy, ile wolumenu danego tickera zostało
 *      W SUMIE zamknięte (sprzedane)
 *   3) metodą FIFO "zjadamy" najstarsze zakupy zamkniętym wolumenem —
 *      to, co zostaje, to REALNIE otwarte pozycje, z zachowaniem
 *      oryginalnej ceny i daty zakupu per lot.
 *
 * Zweryfikowane 1:1 na prawdziwych plikach (IKE_51483202...xlsx) — wynik
 * (9 tickerów, dokładne ilości i średnie ceny) idealnie zgadza się ze
 * zrzutem ekranu z apki XTB.
 *
 * WAŻNE (waluta): "buyPrice" liczymy jako (kwota_PLN_z_operacji / liczba_akcji),
 * NIE jako liczbę z komentarza. Dla polskich spółek to to samo, ale dla
 * zagranicznych ETF-ów (np. ISAC.UK, SXR8.DE) cena w komentarzu jest w
 * walucie notowania (USD/GBP/EUR), a Twoja apka liczy zysk/stratę względem
 * pricePLN z /api/quote — więc buyPrice MUSI być w PLN.
 *
 * WAŻNE (data): "buyDate" zapisujemy jako lokalną datę "YYYY-MM-DD" —
 * DOKŁADNIE tą samą logiką co isoLocal() w Twoim lib/portfolioStore.js —
 * bo addHolding() nie normalizuje tego pola samo (w przeciwieństwie do
 * addCashflow(), które normalizuje pole "date").
 * ---------------------------------------------------------------------------
 */

import * as XLSX from "xlsx";

/* =========================================================================
   Mapowanie tickera XTB -> ticker Yahoo Finance (pod pair.yahoo)
   ========================================================================= */
// Pewne (sprawdzone): każda polska spółka/ETF na XTB ma sufiks ".PL",
// a Yahoo Finance dla GPW używa ".WA". To pokrywa większość tickerów.
// Reszta (LSE/Euronext/USA) to najlepsze możliwe dopasowanie na podstawie
// standardowych konwencji giełdowych — jeśli jakiś zagraniczny ticker się
// nie doładuje w /api/quote, dopisz go tutaj (to jedyne miejsce do zmiany).
const SUFFIX_MAP = {
  PL: "WA", // Warszawa (GPW) — pewne
  NL: "AS", // Amsterdam (Euronext)
  UK: "L", // Londyn (LSE)
  FR: "PA", // Paryż (Euronext)
  DE: "DE", // Xetra/Frankfurt — Yahoo używa tego samego sufiksu
  US: "", // USA — Yahoo nie używa sufiksu
};

export function xtbTickerToYahoo(xtbTicker, warnings) {
  if (!xtbTicker) return "";
  const idx = xtbTicker.lastIndexOf(".");
  if (idx === -1) return xtbTicker;
  const base = xtbTicker.slice(0, idx);
  const suffix = xtbTicker.slice(idx + 1).toUpperCase();
  if (suffix in SUFFIX_MAP) {
    const mapped = SUFFIX_MAP[suffix];
    return mapped ? `${base}.${mapped}` : base;
  }
  warnings?.push(
    `Nieznany sufiks giełdy dla "${xtbTicker}" — zostawiono bez zmian. Jeśli notowania się nie załadują, dopisz mapowanie w SUFFIX_MAP (lib/xtbImporter.js).`
  );
  return xtbTicker;
}

/* =========================================================================
   Drobne pomoce
   ========================================================================= */
const round = (n, d = 6) => {
  const f = 10 ** d;
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
};

// Pełny ISO (z czasem) — używany do sortowania lotów w FIFO.
function toISO(value) {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Lokalna data "YYYY-MM-DD" — ta sama logika co isoLocal() w portfolioStore.js.
// Używana dla holdings.buyDate, żeby wyglądały tak samo jak wpisy dodane
// ręcznie przez "Dodaj transakcję".
function toLocalDateStr(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function findHeaderRowIndex(rows, firstCellEquals) {
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i]?.[0] ?? "").trim() === firstCellEquals) return i;
  }
  return -1;
}

function sheetToRows(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
}

// "OPEN BUY 3/3.3887 @ 120.180"  -> shares=3
// "OPEN BUY 0.3887/3.3887 @ 120.180" -> shares=0.3887
// "OPEN BUY 25 @ 37.700"  (bez ułamka) -> shares=25
const BUY_COMMENT_RE = /OPEN BUY\s+([\d.]+)(?:\/[\d.]+)?\s*@\s*([\d.]+)/i;

/* =========================================================================
   GŁÓWNA FUNKCJA
   ========================================================================= */
/**
 * @param {ArrayBuffer|Blob|File} fileOrBuffer
 * @returns {Promise<{
 *   accountNumber: string,
 *   accountType: "IKE" | "STANDARD",
 *   holdings: Array<{name:string, pair:{yahoo:string}, shares:number, buyPrice:number, buyDate:string, sourceTicker:string, sourceOpId:string}>,
 *   cashOperations: Array<{type:string, amount:number, date:string, note:string, currency:"PLN", excludeFromTWR:boolean, storno:boolean, linkedTxnId:string}>,
 *   closedPositions: Array<object>,
 *   summary: {totalOpenCostPLN:number, tickerCount:number, cashOpCount:number},
 *   warnings: string[]
 * }>}
 */
export async function parseXtbFile(fileOrBuffer) {
  const buffer =
    typeof Blob !== "undefined" && fileOrBuffer instanceof Blob
      ? await fileOrBuffer.arrayBuffer()
      : fileOrBuffer;

  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  if (
    !workbook.SheetNames.includes("Cash Operations") ||
    !workbook.SheetNames.includes("Closed Positions")
  ) {
    throw new Error(
      "To nie wygląda na standardowy raport XTB — brakuje arkuszy 'Cash Operations' i/lub 'Closed Positions'."
    );
  }

  const warnings = [];

  const coRows = sheetToRows(workbook, "Cash Operations");
  const cpRows = sheetToRows(workbook, "Closed Positions");

  const accountNumber = String(
    coRows?.[0]?.[1] ?? cpRows?.[0]?.[1] ?? ""
  ).trim();

  /* ---------- Cash Operations: nagłówek + dane ---------- */
  const coHeaderIdx = findHeaderRowIndex(coRows, "Type");
  if (coHeaderIdx === -1) {
    throw new Error("Nie znaleziono nagłówka kolumn w arkuszu 'Cash Operations'.");
  }
  const coData = coRows
    .slice(coHeaderIdx + 1)
    .filter((r) => r && r[0] != null && r[0] !== "" && r[0] !== "Total");

  const accountType = coData.some(
    (r) => String(r[7] || "").trim().toUpperCase() === "IKE"
  )
    ? "IKE"
    : "STANDARD";

  /* ---------- Closed Positions: nagłówek + dane ---------- */
  const cpHeaderIdx = findHeaderRowIndex(cpRows, "Instrument");
  if (cpHeaderIdx === -1) {
    throw new Error("Nie znaleziono nagłówka kolumn w arkuszu 'Closed Positions'.");
  }
  const cpData = cpRows
    .slice(cpHeaderIdx + 1)
    .filter((r) => r && r[0] != null && r[0] !== "" && r[0] !== "Profit/loss");

  const closedPositions = cpData.map((r) => ({
    instrument: r[0],
    category: r[1],
    ticker: r[2],
    type: r[3],
    volume: Number(r[4]) || 0,
    openPrice: Number(r[5]) || 0,
    openTime: toISO(r[6]),
    closePrice: Number(r[7]) || 0,
    closeTime: toISO(r[8]),
    product: r[9],
    profitLoss: Number(r[10]) || 0,
    grossProfit: Number(r[11]) || 0,
    purchaseValue: r[12] == null || r[12] === "" ? null : Number(r[12]),
    saleValue: r[13] == null || r[13] === "" ? null : Number(r[13]),
    commission: Number(r[16]) || 0,
    positionId: r[23] != null ? String(r[23]) : null,
  }));

  // Suma zamkniętego wolumenu per ticker — z pominięciem CFD (dźwignia,
  // nie jest to "trzymana akcja" w sensie długoterminowego portfela).
  const closedTotalByTicker = new Map();
  for (const cp of closedPositions) {
    if (cp.category === "CFD") continue;
    closedTotalByTicker.set(
      cp.ticker,
      (closedTotalByTicker.get(cp.ticker) || 0) + cp.volume
    );
  }

  /* ---------- Przejście po Cash Operations ---------- */
  const buyLotsByTicker = new Map();
  const cashOperations = [];

  for (const r of coData) {
    const [type, ticker, instrument, time, amount, opId, comment, product] = r;
    const t = String(type || "").trim();
    const dateISO = toISO(time);

    if (t === "Stock purchase") {
      const m = BUY_COMMENT_RE.exec(comment || "");
      if (!m) {
        warnings.push(
          `Nie udało się rozpoznać komentarza zakupu: "${comment}" (${ticker}, ${dateISO}) — pozycja pominięta.`
        );
        continue;
      }
      const shares = parseFloat(m[1]);
      const costPLN = Math.abs(Number(amount));
      if (!(shares > 0)) continue;

      const lot = {
        ticker,
        instrument,
        time: dateISO,
        shares,
        buyPricePLN: costPLN / shares,
        opId: opId != null ? String(opId) : null,
      };
      if (!buyLotsByTicker.has(ticker)) buyLotsByTicker.set(ticker, []);
      buyLotsByTicker.get(ticker).push(lot);
      // Uwaga: celowo NIE tworzymy tu osobnej operacji gotówkowej — addHolding()
      // w Twoim portfolioStore.js sam dolicza cashflow typu "buy" (-koszt) przy
      // każdym dodanym holdingu. Dublowanie tego tutaj podwoiłoby odpływ gotówki.
      continue;
    }

    if (t === "Stock sell") {
      // Zamknięcia są już w komplecie w arkuszu "Closed Positions" (z P/L),
      // więc surowej operacji gotówkowej też nie duplikujemy.
      continue;
    }

    let cfType = null;
    let note = "";

    switch (t) {
      case "Deposit":
        cfType = "deposit";
        note = "Wpłata środków";
        break;
      case "Withdrawal":
        cfType = "withdraw";
        note = "Wypłata środków";
        break;
      case "IKE deposit":
        cfType = Number(amount) >= 0 ? "deposit" : "withdraw";
        note =
          Number(amount) >= 0
            ? "Wpłata na konto IKE (transfer wewnętrzny)"
            : "Transfer środków na konto IKE (transfer wewnętrzny)";
        break;
      case "Dividend":
        cfType = "dividend";
        note = `Dywidenda: ${instrument || ticker}`;
        break;
      case "Withholding tax":
        cfType = "tax";
        note = `Podatek u źródła: ${instrument || ticker}`;
        break;
      case "Free funds interest":
        cfType = "interest";
        note = "Odsetki od wolnych środków";
        break;
      case "Free funds interest tax":
        cfType = "tax";
        note = "Podatek od odsetek od wolnych środków";
        break;
      case "Swap":
      case "Close trade":
        // Rozliczenia dotyczące pozycji CFD (dźwignia) — poza zakresem
        // długoterminowego portfela akcyjnego, ale wciąż realny ruch gotówki.
        cfType = "fee";
        note = `Rozliczenie CFD: ${instrument || ticker || t}`;
        break;
      default:
        warnings.push(
          `Nieznany typ operacji gotówkowej: "${t}" (${dateISO}) — zaimportowano jako 'manual', sprawdź ręcznie.`
        );
        cfType = "manual";
        note = t || "Operacja gotówkowa";
    }

    cashOperations.push({
      type: cfType,
      amount: Number(amount) || 0,
      date: dateISO,
      note,
      currency: "PLN",
      excludeFromTWR: false,
      storno: false,
      linkedTxnId: opId != null ? String(opId) : null,
    });
  }

  /* ---------- FIFO: rekonstrukcja otwartych lotów ---------- */
  const holdings = [];
  let totalOpenCostPLN = 0;

  for (const [ticker, lots] of buyLotsByTicker.entries()) {
    let toConsume = closedTotalByTicker.get(ticker) || 0;
    const sorted = [...lots].sort(
      (a, b) => new Date(a.time) - new Date(b.time)
    );

    for (const lot of sorted) {
      let shares = lot.shares;

      if (toConsume >= shares - 1e-9) {
        toConsume -= shares; // lot w całości sprzedany
        continue;
      }
      if (toConsume > 1e-9) {
        shares = shares - toConsume; // lot częściowo sprzedany
        toConsume = 0;
      }
      if (shares <= 1e-9) continue;

      const yahoo = xtbTickerToYahoo(ticker, warnings);
      const buyPrice = round(lot.buyPricePLN, 6);
      const sharesRounded = round(shares, 6);

      holdings.push({
        name: lot.instrument,
        pair: { yahoo },
        shares: sharesRounded,
        buyPrice,
        buyDate: toLocalDateStr(lot.time),
        sourceTicker: ticker,
        sourceOpId: lot.opId,
      });
      totalOpenCostPLN += buyPrice * sharesRounded;
    }

    if (toConsume > 1e-6) {
      warnings.push(
        `${ticker}: wg historii zamknięto więcej wolumenu (${(
          closedTotalByTicker.get(ticker) || 0
        ).toFixed(4)}) niż wynika z historii zakupów w tym pliku. ` +
          `Możliwe przyczyny: transakcje sprzed zakresu eksportu albo split akcji — sprawdź ręcznie.`
      );
    }
  }

  return {
    accountNumber,
    accountType,
    holdings,
    cashOperations,
    closedPositions,
    summary: {
      totalOpenCostPLN: round(totalOpenCostPLN, 2),
      tickerCount: new Set(holdings.map((h) => h.sourceTicker)).size,
      cashOpCount: cashOperations.length,
    },
    warnings,
  };
}