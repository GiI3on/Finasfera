// ================================
//  statsDemoEngine.js
//  Silnik statystyk DEMO (offline)
// ================================

// Ten sam portfel, który masz w PortfolioDemo
export const DEMO_GROUPS = [
  {
    key: "PKN",
    name: "PKNORLEN",
    pair: { yahoo: "PKN.WA" },
    totalShares: 59.472,
    avgBuy: 57.07,
    price: 95.19,
    value: 5661.14,
    gain: 2267.31,
    gainPct: 66.81,
    lots: [
      {
        id: "demo-pkn-1",
        name: "PKNORLEN",
        shares: 59.472,
        buyPrice: 57.07,
        buyDate: "2025-01-05",
        pair: { yahoo: "PKN.WA" },
      },
    ],
  },
  {
    key: "NVDA",
    name: "NVIDIA Corporation",
    pair: { yahoo: "NVDA.DE" },
    totalShares: 5,
    avgBuy: 604.77,
    price: 667.66,
    value: 3338.31,
    gain: 314.44,
    gainPct: 10.4,
    lots: [
      {
        id: "demo-nvda-1",
        name: "NVIDIA Corporation",
        shares: 5,
        buyPrice: 604.77,
        buyDate: "2024-01-10",
        pair: { yahoo: "NVDA.DE" },
      },
    ],
  },
  {
    key: "XTB",
    name: "XTB",
    pair: { yahoo: "XTB.WA" },
    totalShares: 43,
    avgBuy: 68.39,
    price: 69.24,
    value: 2977.32,
    gain: 36.54,
    gainPct: 1.24,
    lots: [
      {
        id: "demo-xtb-1",
        name: "XTB",
        shares: 43,
        buyPrice: 68.39,
        buyDate: "2025-02-12",
        pair: { yahoo: "XTB.WA" },
      },
    ],
  },
  {
    key: "KRU",
    name: "KRUK",
    pair: { yahoo: "KRU.WA" },
    totalShares: 6,
    avgBuy: 449.33,
    price: 463.40,
    value: 2780.40,
    gain: 84.40,
    gainPct: 3.13,
    lots: [
      {
        id: "demo-kru-1",
        name: "KRUK",
        shares: 6,
        buyPrice: 449.33,
        buyDate: "2025-03-03",
        pair: { yahoo: "KRU.WA" },
      },
    ],
  },
  {
    key: "ACWI",
    name: "iShares MSCI ACWI",
    pair: { yahoo: "ISAC.L" },
    totalShares: 6,
    avgBuy: 348.07,
    price: 385.80,
    value: 2314.81,
    gain: 126.42,
    gainPct: 10.84,
    lots: [
      {
        id: "demo-acwi-1",
        name: "iShares MSCI ACWI",
        shares: 6,
        buyPrice: 348.07,
        buyDate: "2024-11-05",
        pair: { yahoo: "ISAC.L" },
      },
    ],
  },
  {
    key: "CDR",
    name: "CD PROJEKT",
    pair: { yahoo: "CDR.WA" },
    totalShares: 20,
    avgBuy: 146.94,
    price: 147.88,
    value: 2957.54,
    gain: 18.77,
    gainPct: 0.6,
    lots: [
      {
        id: "demo-cdr-1",
        name: "CD PROJEKT",
        shares: 20,
        buyPrice: 146.94,
        buyDate: "2024-02-15",
        pair: { yahoo: "CDR.WA" },
      },
    ],
  },
  {
    key: "IWDA",
    name: "ETF MSCI World (IWDA)",
    pair: { yahoo: "IWDA.AS" },
    totalShares: 6,
    avgBuy: 348.07,
    price: 384.47,
    value: 2306.84,
    gain: 218.44,
    gainPct: 10.5,
    lots: [
      {
        id: "demo-iwda-1",
        name: "ETF MSCI World (IWDA)",
        shares: 6,
        buyPrice: 348.07,
        buyDate: "2023-11-05",
        pair: { yahoo: "IWDA.AS" },
      },
    ],
  },
];

// ===== pomocnicze obliczenia =====

function generateDemoValueSeries() {
  const start = new Date("2025-01-01");
  const end = new Date("2025-11-25");

  const days = [];
  const oneDay = 24 * 3600 * 1000;

  let current = new Date(start);
  let value = 8000; // startowa wartość portfela demo

  while (current <= end) {
    // lekko rosnący trend z szumem
    const noise = (Math.random() - 0.5) * 80; // +/- 40 PLN
    value += 35 + noise;

    if (value < 3000) value = 3000;

    days.push({
      t: current.toISOString().slice(0, 10),
      value: Math.round(value),
    });

    current = new Date(current.getTime() + oneDay);
  }

  // dopasuj końcową wartość do sumy portfela demo
  const last = days[days.length - 1];
  const TARGET = DEMO_GROUPS.reduce((a, b) => a + Number(b.value || 0), 0);
  const scale = TARGET && last.value ? TARGET / last.value : 1;

  return days.map((d) => ({
    ...d,
    value: Math.round(d.value * scale),
  }));
}

function computeDailyReturns(series) {
  const out = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].value;
    const curr = series[i].value;
    const r = prev > 0 ? curr / prev - 1 : 0;
    out.push({ t: series[i].t, r });
  }
  return out;
}

function computeCAGR(series) {
  if (!series.length) return 0;
  const first = series[0].value || 0;
  const last = series[series.length - 1].value || 0;
  const days = series.length;
  if (!first || !last || days <= 1) return 0;
  const years = days / 365;
  if (years < 1) return last / first - 1;
  return Math.pow(last / first, 1 / years) - 1;
}

function computeMaxDrawdown(series) {
  let peak = -Infinity;
  let mdd = 0;
  for (const p of series) {
    const v = Number(p.value) || 0;
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = v / peak - 1;
      if (dd < mdd) mdd = dd;
    }
  }
  return mdd;
}

function computeWinRate(daily) {
  if (!daily.length) return 0;
  const wins = daily.filter((d) => d.r > 0).length;
  return wins / daily.length;
}

function computeVolatility(daily) {
  const n = daily.length;
  if (n <= 1) return 0;
  const mean = daily.reduce((a, b) => a + b.r, 0) / n;
  const varSum = daily.reduce((a, b) => a + (b.r - mean) * (b.r - mean), 0);
  const sd = Math.sqrt(varSum / (n - 1));
  return sd * Math.sqrt(252); // annualizacja
}

function computeSharpe(daily, rfDaily = 0.00005) {
  const n = daily.length;
  if (n <= 1) return null;
  const mean = daily.reduce((a, b) => a + b.r, 0) / n;
  const varSum = daily.reduce((a, b) => a + (b.r - mean) * (b.r - mean), 0);
  const sd = Math.sqrt(varSum / (n - 1));
  if (!(sd > 0)) return null;
  return ((mean - rfDaily) / sd) * Math.sqrt(252);
}

function computeMonthsPlusMinus(daily) {
  const byMonth = new Map();
  for (const d of daily) {
    const ym = String(d.t || "").slice(0, 7);
    const prev = byMonth.get(ym) ?? 1;
    byMonth.set(ym, prev * (1 + (Number(d.r) || 0)));
  }
  let plus = 0,
    minus = 0;
  byMonth.forEach((mult) => {
    const ret = mult - 1;
    if (ret > 0) plus += 1;
    else if (ret < 0) minus += 1;
  });
  return { plus, minus };
}

function buildComposition() {
  const total = DEMO_GROUPS.reduce((a, b) => a + (Number(b.value) || 0), 0) || 1;
  return DEMO_GROUPS.map((g) => ({
    key: g.key,
    name: g.name,
    value: g.value,
    pct: (Number(g.value) / total) * 100,
  }));
}

// ========================================
//  GŁÓWNA FUNKCJA – użyjesz jej w page.jsx
// ========================================
export function getDemoStats(rangeKey = "YTD") {
  const fullSeries = generateDemoValueSeries();

  const mapRangeDays = {
    "1M": 30,
    "3M": 90,
    "6M": 180,
    YTD: 330,
    "1R": 365,
    "5L": 365 * 5,
    MAX: fullSeries.length,
  };

  const cut = mapRangeDays[rangeKey] || fullSeries.length;
  const valueSeriesChart =
    cut >= fullSeries.length ? fullSeries : fullSeries.slice(-cut);

  const daily = computeDailyReturns(valueSeriesChart);

  const last = valueSeriesChart[valueSeriesChart.length - 1] || { value: 0 };
  const first = valueSeriesChart[0] || { value: 0 };

  const periodReturn =
    first.value > 0 ? last.value / first.value - 1 : 0;

  const dailyChange = daily.length ? daily[daily.length - 1].r : 0;

  const dailyProfit =
    valueSeriesChart.length > 1
      ? valueSeriesChart[valueSeriesChart.length - 1].value -
        valueSeriesChart[valueSeriesChart.length - 2].value
      : 0;

  return {
    valueSeriesChart,
    cagrLifetime: computeCAGR(fullSeries),
    maxDrawdown: computeMaxDrawdown(fullSeries),
    winRate: computeWinRate(daily),
    volatility: computeVolatility(daily),
    sharpe: computeSharpe(daily),
    monthsPlusMinus: computeMonthsPlusMinus(daily),
    periodReturn,
    dailyChange,
    dailyProfit,
    composition: buildComposition(),
  };
}
