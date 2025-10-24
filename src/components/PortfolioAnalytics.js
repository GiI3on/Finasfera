// File: src/components/PortfolioAnalytics.js
'use client';

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  LineChart as LineChartIcon,
  BarChart3,
  PieChart as PieChartIcon,
  Calculator
} from 'lucide-react';

/* ---------- Helpers ---------- */
function formatPLN(n) {
  return (n || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });
}
function formatPct(n, digits = 2) {
  return `${((n || 0) * 100).toFixed(digits)}%`;
}
function dayReturns(series) {
  const res = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].value || 1;
    res.push({ date: series[i].date, ret: (series[i].value - prev) / prev });
  }
  return res;
}
function stdev(arr) {
  if (!arr.length) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (arr.length - 1 || 1);
  return Math.sqrt(variance);
}
function maxDrawdown(series) {
  let peak = -Infinity, mdd = 0;
  for (const p of series) {
    peak = Math.max(peak, p.value);
    mdd = Math.min(mdd, (p.value - peak) / (peak || 1));
  }
  return Math.abs(mdd);
}
function CAGR(series) {
  if (series.length < 2) return 0;
  const startDate = new Date(series[0].date).getTime();
  const endDate = new Date(series[series.length - 1].date).getTime();
  const years = (endDate - startDate) / (365.25 * 24 * 3600 * 1000);
  if (years <= 0) return 0;
  const startVal = series[0].value || 1;
  const endVal = series.at(-1).value || 1;
  return Math.pow(endVal / startVal, 1 / years) - 1;
}

/* ---------- Fallback sample (gdy nie podasz data) ---------- */
const sample = {
  navSeries: Array.from({ length: 200 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (200 - i));
    const base = 10000, drift = 0.00025, vol = 0.01;
    return { date: d.toISOString().slice(0, 10), value: base * Math.exp(drift * i + vol * Math.sin(i / 6)) };
  }),
  holdings: [
    { ticker: 'LPP.WA', name: 'LPP', qty: 1,  avgPrice: 11111, lastPrice: 16900,   sector: 'Consumer'  },
    { ticker: 'PKN.WA', name: 'PKNORLEN', qty: 26, avgPrice: 64.04, lastPrice: 83.27, sector: 'Energy'    },
    { ticker: 'TSLA',   name: 'Tesla', qty: 1,  avgPrice: 1111,  lastPrice: 1222.51, sector: 'Auto'      },
    { ticker: 'KTY.WA', name: 'Grupa Kęty', qty: 1, avgPrice: 700, lastPrice: 927,   sector: 'Materials' },
    { ticker: 'XTB.WA', name: 'XTB', qty: 2,  avgPrice: 20,   lastPrice: 77.38,      sector: 'Financials'},
    { ticker: 'PZU.WA', name: 'PZU', qty: 1,  avgPrice: 40,   lastPrice: 62.8,       sector: 'Financials'},
  ],
  transactions: [],
};

/* ---------- Mini UI zgodny z Twoimi klasami ---------- */
const Card = ({ className = '', children }) => (
  <div className={['card', className].join(' ')}>
    <div className="card-inner">{children}</div>
  </div>
);

function Kpi({ title, value, positive }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{title}</div>
      <div className={['kpi-value', positive ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value, negative }) {
  return (
    <div className="stat-chip">
      <div className="stat-label">{label}</div>
      <div className={['stat-value', negative ? 'stat-bad' : ''].join(' ')}>{value}</div>
    </div>
  );
}

/* ---------- GŁÓWNY KOMPONENT ---------- */
export default function PortfolioAnalytics({ data = sample }) {
  const [range, setRange] = useState('YTD'); // '1M' | '3M' | 'YTD' | '1R' | 'MAX'
  const [search, setSearch] = useState('');

  // NAV wg zakresu
  const navSeries = useMemo(() => {
    const full = [...(data.navSeries || [])].sort((a, b) => a.date.localeCompare(b.date));
    const now = new Date();
    let from = null;
    if (range === '1M') { from = new Date(now); from.setMonth(from.getMonth() - 1); }
    if (range === '3M') { from = new Date(now); from.setMonth(from.getMonth() - 3); }
    if (range === 'YTD') { from = new Date(now.getFullYear(), 0, 1); }
    if (range === '1R') { from = new Date(now); from.setFullYear(from.getFullYear() - 1); }
    if (!from) return full;
    return full.filter(p => new Date(p.date) >= from);
  }, [data.navSeries, range]);

  // KPI
  const returns = useMemo(() => dayReturns(navSeries), [navSeries]);
  const dailyPL = useMemo(
    () => navSeries.length < 2 ? 0 : navSeries.at(-1).value - navSeries.at(-2).value,
    [navSeries]
  );
  const totalPL = useMemo(
    () => navSeries.length ? navSeries.at(-1).value - navSeries[0].value : 0,
    [navSeries]
  );
  const totalPct = useMemo(
    () => navSeries.length ? (navSeries.at(-1).value / (navSeries[0].value || 1) - 1) : 0,
    [navSeries]
  );

  // Statystyki
  const stats = useMemo(() => {
    const rets = returns.map(r => r.ret);
    const volDaily = stdev(rets);
    const volYear = volDaily * Math.sqrt(252);
    const cagr = CAGR(navSeries);
    const mdd = maxDrawdown(navSeries);
    const sharpe = (cagr - 0.02) / (volYear || 1);
    return { cagr, volYear, mdd, sharpe };
  }, [returns, navSeries]);

  // Tabela walorów
  const holdings = useMemo(
    () => (data.holdings || []).filter(h =>
      (`${h.ticker} ${h.name}`.toLowerCase().includes(search.toLowerCase()))
    ),
    [data.holdings, search]
  );
  const rows = useMemo(() => holdings.map(h => {
    const value = (h.qty || 0) * (h.lastPrice || 0);
    const cost = (h.qty || 0) * (h.avgPrice || 0);
    const pl = value - cost;
    const pct = cost ? pl / cost : 0;
    return { ...h, value, cost, pl, pct };
  }), [holdings]);

  const totalValue = rows.reduce((a, b) => a + (b.value || 0), 0);
  const sectors = useMemo(() => {
    const by = {};
    for (const r of rows) {
      const key = r.sector || 'Inne';
      by[key] = (by[key] || 0) + (r.value || 0);
    }
    return Object.entries(by).map(([name, value]) => ({ name, value }));
  }, [rows]);

  return (
    <div className="w-full space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi title="Dzisiejszy zysk" value={formatPLN(dailyPL)} positive={dailyPL >= 0} />
        <Kpi title="Całkowity zysk" value={formatPLN(totalPL)} positive={totalPL >= 0} />
        <Kpi title="Zwrot" value={formatPct(totalPct)} positive={totalPct >= 0} />
      </div>

      {/* Wykres NAV */}
      <Card>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <LineChartIcon className="w-5 h-5" />
            <h3 className="h2">Wartość portfela</h3>
          </div>
          {/* segmented switch */}
          <div className="segmented">
            {['1M', '3M', 'YTD', '1R', 'MAX'].map(r => (
              <button key={r} data-active={String(r === range)} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={navSeries} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={24} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatPLN(v).replace('PLN', 'zł')} width={90} />
              <Tooltip formatter={(v) => formatPLN(v)} labelFormatter={(l) => `Data: ${l}`} />
              <Area type="monotone" dataKey="value" stroke="currentColor" fill="url(#g)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Statystyki + dzienny zwrot */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Stat label="CAGR" value={formatPct(stats.cagr)} />
          <Stat label="Zmienność (roczna)" value={formatPct(stats.volYear)} />
          <Stat label="Max drawdown" value={formatPct(stats.mdd)} negative />
          <Stat label="Sharpe (≈)" value={Number(stats.sharpe).toFixed(2)} />
        </div>

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5" />
            <h4 className="font-semibold">Dzienny zwrot</h4>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={dayReturns(navSeries)} margin={{ left: 10, right: 10 }}>
                <XAxis dataKey="date" hide minTickGap={24} />
                <YAxis tickFormatter={(v) => `${(v * 100).toFixed(2)}%`} width={60} />
                <Tooltip formatter={(v) => `${(v * 100).toFixed(2)}%`} labelFormatter={(l) => `Data: ${l}`} />
                <Bar dataKey="ret" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Alokacje */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <PieChartIcon className="w-5 h-5" />
            <h4 className="font-semibold">Sektory</h4>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sectors} dataKey="value" nameKey="name" outerRadius={110} label>
                  {sectors.map((_, i) => (<Cell key={i} />))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v) => formatPLN(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-5 h-5" />
            <h4 className="font-semibold">Wartość / Koszt</h4>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={rows}>
                <XAxis dataKey="ticker" />
                <YAxis tickFormatter={(v) => formatPLN(v).replace('PLN', 'zł')} width={80} />
                <Tooltip formatter={(v) => formatPLN(v)} />
                <Bar dataKey="cost" name="Koszt" />
                <Bar dataKey="value" name="Wartość" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Tabela walorów */}
      <Card>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <input
            placeholder="Szukaj waloru…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 bg-zinc-900/60 border border-zinc-700 rounded-xl px-3 py-2"
          />
          <div className="text-sm opacity-80">
            Wartość portfela: <span className="font-semibold">{formatPLN(totalValue)}</span>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>
                <th className="py-2 pr-4">Spółka</th>
                <th className="py-2 pr-4">Ilość</th>
                <th className="py-2 pr-4">Śr. cena</th>
                <th className="py-2 pr-4">Kurs</th>
                <th className="py-2 pr-4">Wartość</th>
                <th className="py-2 pr-4">Zysk/Strata</th>
                <th className="py-2 pr-4">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h, i) => {
                const pos = (h.pl || 0) >= 0;
                return (
                  <tr key={i} className="border-t border-white/10">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{h.name}</div>
                      <div className="opacity-60 text-xs">{h.ticker}</div>
                    </td>
                    <td className="py-2 pr-4">{h.qty}</td>
                    <td className="py-2 pr-4">{formatPLN(h.avgPrice)}</td>
                    <td className="py-2 pr-4">{formatPLN(h.lastPrice)}</td>
                    <td className="py-2 pr-4">{formatPLN(h.value)}</td>
                    <td className={['py-2 pr-4', pos ? 'text-emerald-500' : 'text-red-500'].join(' ')}>
                      {formatPLN(h.pl)}
                    </td>
                    <td className={['py-2 pr-4', pos ? 'text-emerald-500' : 'text-red-500'].join(' ')}>
                      {formatPct(h.pct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
