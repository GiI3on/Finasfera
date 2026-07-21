/**
 * lib/xtbImporter.js
 * ---------------------------------------------------------------------------
 * Parser raportów XTB (.xlsx: "Cash Operations" + "Closed Positions") do
 * formatu danych używanego przez Finasferę.
 */

import * as XLSX from "xlsx";

/* =========================================================================
   Mapowanie tickera XTB -> ticker Yahoo Finance (pod pair.yahoo)
   ========================================================================= */
const SUFFIX_MAP = {
  PL: "WA", // Warszawa (GPW)
  NL: "AS", // Amsterdam (Euronext)
  UK: "L", // Londyn (LSE)
  FR: "PA", // Paryż (Euronext)
  DE: "DE", // Xetra/Frankfurt
  US: "", // USA
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

function toISO(value) {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

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

const BUY_COMMENT_RE = /OPEN BUY\s+([\d.]+)(?:\/[\d.]+)?\s*@\s*([\d.]+)/i;

/* =========================================================================
   GŁÓWNA FUNKCJA
   ========================================================================= */
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
  const sellOperations = []; // Zbieramy historię sprzedaży

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
      continue;
    }

    if (t === "Stock sell") {
      // Zapisujemy wpływy ze sprzedaży zamkniętych pozycji!
      sellOperations.push({
        type: "sell",
        amount: Number(amount) || 0, // W Excelu ta kwota jest dodatnia
        date: dateISO,
        note: `Sprzedaż zamkniętej pozycji: ${instrument || ticker}`,
        currency: "PLN",
        excludeFromTWR: true, // Zysk/Strata to wynik inwestycji, nie wpłata zewnętrzna
        storno: false,
        linkedTxnId: opId != null ? String(opId) : null,
      });
      continue;
    }

    let cfType = null;
    let note = "";
    let excludeFromTWR = true; // Domyślnie TRUE (dywidendy, podatki nie zniekształcają TWR)

    switch (t) {
      case "Deposit":
        cfType = "deposit";
        note = "Wpłata środków";
        excludeFromTWR = false; // Zewnętrzna wpłata -> musi być korygowana w TWR
        break;
      case "Withdrawal":
        cfType = "withdraw";
        note = "Wypłata środków";
        excludeFromTWR = false; // Zewnętrzna wypłata -> musi być korygowana w TWR
        break;
      case "IKE deposit":
        cfType = Number(amount) >= 0 ? "deposit" : "withdraw";
        note =
          Number(amount) >= 0
            ? "Wpłata na konto IKE (transfer wewnętrzny)"
            : "Transfer środków na konto IKE";
        excludeFromTWR = false; // Zewnętrzna wpłata -> musi być korygowana w TWR
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
        cfType = "fee";
        note = `Rozliczenie CFD: ${instrument || ticker || t}`;
        break;
      default:
        warnings.push(
          `Nieznany typ operacji gotówkowej: "${t}" (${dateISO}) — zaimportowano jako 'manual'.`
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
      excludeFromTWR,
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
      let consumedShares = 0; 

      // Wyliczamy, ile akcji z tego lotu zostało w przeszłości sprzedane
      if (toConsume >= shares - 1e-9) {
        consumedShares = shares;
        toConsume -= shares;
        shares = 0;
      } else if (toConsume > 1e-9) {
        consumedShares = toConsume;
        shares = shares - toConsume;
        toConsume = 0;
      }

      // Rekonstrukcja ubytku gotówki dla ZAMKNIĘTYCH pozycji
      if (consumedShares > 1e-9) {
        const consumedCostPLN = lot.buyPricePLN * consumedShares;
        cashOperations.push({
          type: "buy",
          amount: -round(consumedCostPLN, 2), // kwota ujemna jako zakup
          date: lot.time,
          note: `Zakup zamkniętej już pozycji: ${lot.instrument}`,
          currency: "PLN",
          excludeFromTWR: true, // wewnętrzny przypływ/odpływ
          storno: false,
          linkedTxnId: lot.opId,
        });
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
        ).toFixed(4)}) niż wynika z historii zakupów w tym pliku.`
      );
    }
  }

  // Zrzucamy na koniec wszystkie operacje sprzedaży, żeby podbiły saldo gotówki
  cashOperations.push(...sellOperations);

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