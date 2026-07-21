import * as XLSX from "xlsx";

const SUFFIX_MAP = {
  PL: "WA",
  NL: "AS",
  UK: "L",
  FR: "PA",
  DE: "DE",
  US: "",
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
    `Nieznany sufiks giełdy dla "${xtbTicker}" — zostawiono bez zmian.`
  );
  return xtbTicker;
}

const round = (n, d = 6) => {
  const f = 10 ** d;
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
};

const safeNum = (val) => {
  if (typeof val === "number") return val;
  if (val == null || val === "") return 0;
  const str = String(val).replace(/\s/g, "").replace(",", ".");
  const n = Number(str);
  return Number.isNaN(n) ? 0 : n;
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

export async function parseXtbFile(fileOrBuffer) {
  console.log("🚀 FINALNY IMPORTER V7 - NAPRAWIONE DATY AKCJI (TIME TRAVEL BUG FIX)!");

  const buffer =
    typeof Blob !== "undefined" && fileOrBuffer instanceof Blob
      ? await fileOrBuffer.arrayBuffer()
      : fileOrBuffer;

  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  if (!workbook.SheetNames.includes("Cash Operations") || !workbook.SheetNames.includes("Closed Positions")) {
    throw new Error("To nie wygląda na standardowy raport XTB.");
  }

  const warnings = [];
  const coRows = sheetToRows(workbook, "Cash Operations");
  const cpRows = sheetToRows(workbook, "Closed Positions");
  const accountNumber = String(coRows?.[0]?.[1] ?? cpRows?.[0]?.[1] ?? "").trim();

  const coHeaderIdx = findHeaderRowIndex(coRows, "Type");
  const coData = coRows.slice(coHeaderIdx + 1).filter((r) => r && r[0] != null && r[0] !== "" && r[0] !== "Total");
  const accountType = coData.some((r) => String(r[7] || "").trim().toUpperCase() === "IKE") ? "IKE" : "STANDARD";

  const cpHeaderIdx = findHeaderRowIndex(cpRows, "Instrument");
  const cpData = cpRows.slice(cpHeaderIdx + 1).filter((r) => r && r[0] != null && r[0] !== "" && r[0] !== "Profit/loss");

  const closedPositions = cpData.map((r) => ({
    instrument: r[0],
    category: r[1],
    ticker: r[2],
    type: r[3],
    volume: safeNum(r[4]),
    closeTime: toISO(r[8]),
    profitLoss: safeNum(r[10]),
    positionId: r[23] != null ? String(r[23]) : null,
  }));

  const closedTotalByTicker = new Map();
  const cashOperations = [];

  for (const cp of closedPositions) {
    const pnl = cp.profitLoss;
    if (pnl !== 0) {
      cashOperations.push({
        type: pnl > 0 ? "deposit" : "withdraw",
        amount: pnl, 
        date: cp.closeTime,
        note: `Rozliczenie zamkniętej pozycji: ${cp.instrument || cp.ticker}`,
        currency: "PLN",
        excludeFromTWR: true, 
        storno: false,
        linkedTxnId: cp.positionId,
      });
    }
    if (cp.category === "CFD") continue;
    closedTotalByTicker.set(cp.ticker, (closedTotalByTicker.get(cp.ticker) || 0) + cp.volume);
  }

  const buyLotsByTicker = new Map();

  for (const r of coData) {
    const [type, ticker, instrument, time, amount, opId, comment] = r;
    const t = String(type || "").trim();
    const dateISO = toISO(time);

    if (t === "Stock purchase") {
      const m = BUY_COMMENT_RE.exec(comment || "");
      if (!m) continue;
      const shares = parseFloat(m[1]); 
      const costPLN = Math.abs(safeNum(amount));
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

    if (t === "Stock sell") continue; 

    let cfType = null;
    let note = "";
    let excludeFromTWR = true; 
    let finalAmount = safeNum(amount); 
    const tLower = t.toLowerCase();

    if (tLower.includes("deposit") || tLower.includes("wpłata") || tLower.includes("transfer") || tLower.includes("przelew")) {
      cfType = "deposit";
      note = t || "Wpłata środków";
      excludeFromTWR = false; 
      finalAmount = Math.abs(finalAmount); 
    } else if (tLower.includes("withdrawal") || tLower.includes("wypłata")) {
      cfType = "withdraw";
      note = t || "Wypłata środków";
      excludeFromTWR = false; 
      finalAmount = -Math.abs(finalAmount); 
    } else if (tLower.includes("dividend") || tLower.includes("dywidenda")) {
      cfType = "dividend";
      note = `Dywidenda: ${instrument || ticker}`;
      finalAmount = Math.abs(finalAmount); 
    } else if (tLower.includes("tax") || tLower.includes("podatek")) {
      cfType = "tax";
      note = `Podatek: ${instrument || ticker || "odsetki"}`;
      finalAmount = -Math.abs(finalAmount); 
    } else if (tLower.includes("interest") || tLower.includes("odsetki")) {
      cfType = "interest";
      note = "Odsetki od wolnych środków";
      finalAmount = Math.abs(finalAmount); 
    } else if (tLower.includes("swap") || tLower.includes("close trade") || tLower.includes("rollover") || tLower.includes("zamknięcie") || tLower.includes("rolowanie") || tLower.includes("opłata")) {
      cfType = finalAmount >= 0 ? "deposit" : "fee";
      note = `Rozliczenie / Opłata: ${instrument || ticker || t}`;
    } else {
      cfType = finalAmount >= 0 ? "deposit" : "withdraw";
      note = t || "Operacja gotówkowa";
      excludeFromTWR = true; 
    }

    cashOperations.push({
      type: cfType,
      amount: finalAmount,
      date: dateISO,
      note,
      currency: "PLN",
      excludeFromTWR,
      storno: false,
      linkedTxnId: opId != null ? String(opId) : null,
    });
  }

  const holdings = [];
  let totalOpenCostPLN = 0;

  for (const [ticker, lots] of buyLotsByTicker.entries()) {
    let toConsume = closedTotalByTicker.get(ticker) || 0;
    const sorted = [...lots].sort((a, b) => new Date(a.time) - new Date(b.time));

    for (const lot of sorted) {
      let shares = lot.shares;
      if (toConsume >= shares - 1e-9) {
        toConsume -= shares;
        shares = 0;
      } else if (toConsume > 1e-9) {
        shares = shares - toConsume;
        toConsume = 0;
      }

      if (shares <= 1e-9) continue;

      const yahoo = xtbTickerToYahoo(ticker, warnings);
      const buyPrice = round(lot.buyPricePLN, 6);
      const sharesRounded = round(shares, 6);

      // 🛑 TUTAJ BYŁ BŁĄD! Dodajemy pole "date", żeby Finasfera widziała, kiedy kupiłeś akcje.
      holdings.push({
        name: lot.instrument,
        pair: { yahoo },
        shares: sharesRounded,
        buyPrice,
        date: toLocalDateStr(lot.time), // Wymagane przez Finasferę do historii V(t)
        buyDate: toLocalDateStr(lot.time), // Zostawiamy dla bezpieczeństwa
        currency: "PLN",
        sourceTicker: ticker,
        sourceOpId: lot.opId,
      });
      
      totalOpenCostPLN += buyPrice * sharesRounded;
    }
  }

  return {
    accountNumber,
    accountType,
    holdings,
    cashOperations,
    summary: {
      totalOpenCostPLN: round(totalOpenCostPLN, 2),
      tickerCount: new Set(holdings.map((h) => h.sourceTicker)).size,
      cashOpCount: cashOperations.length,
    },
    warnings,
  };
}