// File: src/components/StatsPanel.js
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  LineChart as LineChartIcon,
  BarChart3,
  PieChart as PieChartIcon,
  Calculator,
  Download,
  Plus,
  X as XIcon
} from 'lucide-react';

/* ---------- helpers ---------- */
const PLN = (n) => (n || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });
const PCT = (n, d = 2) => `${((n || 0) * 100).toFixed(d)}%`;
const byDate = (a, b) => String(a.date).localeCompare(String(b.date));

function dayReturns(series) {
  const out = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].value || 1;
    out.push({ date: series[i].date, ret: (series[i].value - prev) / prev });
  }
  return out;
}
function stdev(a){ if(!a.length) return 0; const m=a.reduce((x,y)=>x+y,0)/a.length; const v=a.reduce((x,y)=>x+(y-m)*(y-m),0)/(a.length-1||1); return Math.sqrt(v); }
function maxDrawdown(s){ let p=-Infinity,m=0; for(const x of s){ p=Math.max(p,x.value); m=Math.min(m,(x.value-p)/(p||1)); } return Math.abs(m); }
function CAGR(s){ if(s.length<2) return 0; const t0=+new Date(s[0].date), t1=+new Date(s.at(-1).date); const y=(t1-t0)/(365.25*24*3600*1000); if(y<=0) return 0; return Math.pow((s.at(-1).value||1)/(s[0].value||1),1/y)-1; }
function quantile(arr, q){ if(!arr.length) return 0; const s=[...arr].sort((a,b)=>a-b); const pos=(s.length-1)*q; const b=Math.floor(pos), r=pos-b; return s[b+1]!==undefined ? s[b]+r*(s[b+1]-s[b]) : s[b]; }

/* heat kolor do tabeli miesięcznej / widgetu */
function heatClass(v) {
  if (v == null) return 'bg-zinc-900/40 text-zinc-400';
  if (v >= 0.10) return 'bg-emerald-500/40 text-emerald-100';
  if (v >= 0.05) return 'bg-emerald-500/30 text-emerald-100';
  if (v >= 0.02) return 'bg-emerald-500/20 text-emerald-100';
  if (v >  0.00) return 'bg-emerald-500/10 text-emerald-100';
  if (v <= -0.10) return 'bg-red-500/40 text-red-100';
  if (v <= -0.05) return 'bg-red-500/30 text-red-100';
  if (v <= -0.02) return 'bg-red-500/20 text-red-100';
  return 'bg-red-500/10 text-red-100';
}

/* ---- fallback sample ---- */
const sample = {
  navSeries: Array.from({length:200}).map((_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(200-i));
    const base=10000, drift=0.00025, vol=0.01;
    return { date:d.toISOString().slice(0,10), value: base*Math.exp(drift*i+vol*Math.sin(i/6)) };
  }),
  holdings: [
    { ticker:'LPP.WA', name:'LPP', qty:1, avgPrice:11111, lastPrice:16900, sector:'Consumer' },
    { ticker:'PKN.WA', name:'PKNORLEN', qty:26, avgPrice:64.04, lastPrice:83.27, sector:'Energy' },
    { ticker:'TSLA', name:'Tesla', qty:1, avgPrice:1111, lastPrice:1222.51, sector:'Auto' },
    { ticker:'KTY.WA', name:'Grupa Kęty', qty:1, avgPrice:700, lastPrice:927, sector:'Materials' },
    { ticker:'XTB.WA', name:'XTB', qty:2, avgPrice:20, lastPrice:77.38, sector:'Financials' },
    { ticker:'PZU.WA', name:'PZU', qty:1, avgPrice:40, lastPrice:62.8, sector:'Financials' },
  ],
};

/* ---- mini UI ---- */
const Card = ({ className = '', children }) => <div className={['card', className].join(' ')}><div className="card-inner">{children}</div></div>;
const Segmented = ({ value, onChange, options }) => (
  <div className="segmented">
    {options.map(o => <button key={o} data-active={String(o===value)} onClick={()=>onChange(o)}>{o}</button>)}
  </div>
);
function Kpi({ title, value, positive }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{title}</div>
      <div className={['kpi-value', positive ? 'text-emerald-400' : 'text-red-400'].join(' ')}>{value}</div>
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

/* ---- main ---- */
export default function StatsPanel({ data = sample }) {
  const [range, setRange] = useState('YTD');
  const [tab, setTab] = useState('overview'); // overview | performance | allocation | holdings | widgets
  const [search, setSearch] = useState('');
  const [bench, setBench] = useState('Brak');
  const [benchSeries, setBenchSeries] = useState([]);

  /* benchmark loader */
  useEffect(() => {
    let stop = false;
    async function load(sym) {
      const candidates = {
        WIG20: [{ yahoo: '^WIG20' }, { stooq: 'wig20' }],
        SPY:   [{ yahoo: 'SPY' }],
      }[sym] || [];
      for (const pair of candidates) {
        try {
          const res = await fetch('/api/history', {
            method:'POST', headers:{'content-type':'application/json'},
            body: JSON.stringify({ pair, range:'max', interval:'1d' })
          });
          if (!res.ok) continue;
          const json = await res.json();
          const raw = Array.isArray(json?.historyPLN) ? json.historyPLN : (Array.isArray(json?.history) ? json.history : []);
          const safe = raw.filter(p=>p?.t&&Number.isFinite(p?.close)).map(p=>({date:p.t, value:p.close}));
          if (!stop) setBenchSeries(safe);
          return;
        } catch {}
      }
      if (!stop) setBenchSeries([]);
    }
    if (bench==='Brak') { setBenchSeries([]); return; }
    load(bench); return ()=>{ stop=true; };
  }, [bench]);

  /* nav by range */
  const navSeries = useMemo(() => {
    const full=[...(data.navSeries||[])].sort(byDate);
    const now=new Date(); let from=null;
    if (range==='1M'){ from=new Date(now); from.setMonth(from.getMonth()-1); }
    if (range==='3M'){ from=new Date(now); from.setMonth(from.getMonth()-3); }
    if (range==='YTD'){ from=new Date(now.getFullYear(),0,1); }
    if (range==='1R'){ from=new Date(now); from.setFullYear(from.getFullYear()-1); }
    return from ? full.filter(p=>new Date(p.date)>=from) : full;
  }, [data.navSeries, range]);

  /* benchmark normalized to 100 at visible range start */
  const benchNorm = useMemo(() => {
    if (!benchSeries.length) return [];
    const map = new Map(benchSeries.map(p=>[p.date.slice(0,10), p.value]));
    const aligned = navSeries.map(p=>({ date:p.date, b: map.get(p.date.slice(0,10)) ?? null }));
    const first = aligned.find(x=>x.b!=null)?.b;
    if (!first) return [];
    return aligned.map(x=>({ date:x.date, value: x.b!=null ? (x.b/first)*100 : null }));
  }, [benchSeries, navSeries]);

  /* kpi */
  const rets = useMemo(()=>dayReturns(navSeries), [navSeries]);
  const dailyPL = useMemo(()=> navSeries.length<2?0:navSeries.at(-1).value-navSeries.at(-2).value, [navSeries]);
  const totalPL = useMemo(()=> navSeries.length?navSeries.at(-1).value-navSeries[0].value:0, [navSeries]);
  const totalPct= useMemo(()=> navSeries.length?(navSeries.at(-1).value/(navSeries[0].value||1)-1):0, [navSeries]);

  const stats = useMemo(()=>{
    const rd = rets.map(r=>r.ret);
    const volDaily = stdev(rd);
    const volYear  = volDaily*Math.sqrt(252);
    const cagr = CAGR(navSeries);
    const mdd  = maxDrawdown(navSeries);
    const sharpe = (cagr-0.02)/(volYear||1);
    return { cagr, volYear, mdd, sharpe };
  }, [rets, navSeries]);

  /* holdings + allocation */
  const rows = useMemo(()=> (data.holdings||[])
    .filter(h => (`${h.ticker} ${h.name}`.toLowerCase().includes(search.toLowerCase())))
    .map(h => {
      const value=(h.qty||0)*(h.lastPrice||0);
      const cost =(h.qty||0)*(h.avgPrice ||0);
      const pl=value-cost;
      return { ...h, value, cost, pl, pct: cost ? pl/cost : 0 };
    }), [data.holdings, search]);

  const totalValue = rows.reduce((a,b)=>a+(b.value||0),0);
  const sectors = useMemo(()=>{
    const by={}; for(const r of rows){ const k=r.sector||'Inne'; by[k]=(by[k]||0)+(r.value||0); }
    return Object.entries(by).map(([name,value])=>({name,value}));
  }, [rows]);

  const best  = useMemo(()=> [...rows].sort((a,b)=>(b.pct||0)-(a.pct||0))[0]||null, [rows]);
  const worst = useMemo(()=> [...rows].sort((a,b)=>(a.pct||0)-(b.pct||0))[0]||null, [rows]);

  /* daily returns axis domain (bez outlierów) */
  const domainRet = useMemo(()=>{
    const arr = rets.map(r=>r.ret);
    if (!arr.length) return [-0.15, 0.15];
    const q05 = quantile(arr, 0.05), q95 = quantile(arr, 0.95);
    const min = Math.min(q05*1.2, -0.15), max = Math.max(q95*1.2, 0.15);
    return [min, max];
  }, [rets]);

  /* monthly matrix */
  function monthlyMatrix(series, monthsBack = 24) {
    const ends = new Map();
    const sorted = [...series].sort(byDate);
    for (const p of sorted) { ends.set(String(p.date).slice(0,7), p); }
    const keys = Array.from(ends.keys()).sort();
    const last = keys.slice(-monthsBack);
    const retByKey = new Map();
    for (let i=1;i<last.length;i++){
      const k=last[i], prev=last[i-1];
      retByKey.set(k, (ends.get(k).value/(ends.get(prev).value||1))-1 );
    }
    const byYear = {};
    for (const k of last){
      const [Y,M]=k.split('-').map(Number);
      byYear[Y]=byYear[Y]||Array(12).fill(null);
      byYear[Y][M-1] = retByKey.has(k)? retByKey.get(k): null;
    }
    const order = Object.keys(byYear).map(Number).sort((a,b)=>b-a);
    return { order, rows: byYear, lastKeys:last };
  }
  const mm = useMemo(()=>monthlyMatrix(navSeries, 24), [navSeries]);

  /* export */
  function exportCSV(type){
    let csv='';
    if(type==='holdings'){
      csv=['Ticker,Nazwa,Ilość,Śr.cena,Kurs,Wartość,PL,%,Sektor'].join(',')+'\n'+
        rows.map(r=>[r.ticker,r.name,r.qty,r.avgPrice,r.lastPrice,r.value,r.pl,(r.pct||0),r.sector||''].join(',')).join('\n');
    } else {
      csv='Data,NAV\n'+navSeries.map(p=>`${p.date},${p.value}`).join('\n');
    }
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`${type}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  /* =====================  WIDŻETY (custom dashboard)  ===================== */
  const WIDGET_TYPES = [
    { type: 'nav',        label: 'Wartość portfela' },
    { type: 'bench',      label: 'Benchmark (=100)' },
    { type: 'daily',      label: 'Dzienny zwrot' },
    { type: 'drawdown',   label: 'Drawdown' },
    { type: 'sectors',    label: 'Sektory' },
    { type: 'valueCost',  label: 'Wartość vs Koszt' },
    { type: 'top5',       label: 'Top / Bottom 5' },
    { type: 'monthly12',  label: 'Miesięczne (12m)' },
  ];
  const LS_KEY = 'finasfera.widgets.v1';

  const [widgets, setWidgets] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    // domyślne
    return [
      { id: 'w1', type: 'nav' },
      { id: 'w2', type: 'daily' },
      { id: 'w3', type: 'sectors' },
    ];
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(widgets)); } catch {}
  }, [widgets]);

  const addWidget = (type) => {
    const id = 'w' + Math.random().toString(36).slice(2, 9);
    setWidgets((w) => [...w, { id, type }]);
  };
  const removeWidget = (id) => setWidgets((w) => w.filter(x => x.id !== id));
  const clearWidgets  = () => setWidgets([]);

  /* render pojedynczej karty */
  function WidgetCard({ title, onRemove, children }) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60">
          <div className="text-sm text-zinc-300">{title}</div>
          <button className="text-zinc-400 hover:text-zinc-100" onClick={onRemove} title="Usuń widżet">
            <XIcon className="w-4 h-4"/>
          </button>
        </div>
        <div className="p-3">{children}</div>
      </div>
    );
  }

  function renderWidget(w) {
    switch (w.type) {
      case 'nav':
        return (
          <WidgetCard title="Wartość portfela" onRemove={() => removeWidget(w.id)}>
            <div className="h-56">
              <ResponsiveContainer>
                <ComposedChart data={navSeries}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                  <XAxis dataKey="date" hide/>
                  <YAxis tickFormatter={(v)=>PLN(v).replace('PLN','zł')} width={60}/>
                  <Tooltip formatter={(v)=>PLN(v)} labelFormatter={(l)=>`Data: ${l}`}/>
                  <Area dataKey="value" stroke="currentColor" fill="url(#navFillMini)" strokeWidth={2}/>
                  <defs>
                    <linearGradient id="navFillMini" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        );
      case 'bench':
        return (
          <WidgetCard title="Benchmark (=100)" onRemove={() => removeWidget(w.id)}>
            <div className="h-56">
              <ResponsiveContainer>
                <ComposedChart data={navSeries.map((p,i)=>({ date:p.date, bench: benchNorm[i]?.value ?? null }))}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                  <XAxis dataKey="date" hide/>
                  <YAxis width={50}/>
                  <Tooltip formatter={(v)=>`${Number(v).toFixed(2)}`} labelFormatter={(l)=>`Data: ${l}`}/>
                  <Line dataKey="bench" stroke="#facc15" dot={false} strokeWidth={2}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        );
      case 'daily':
        return (
          <WidgetCard title="Dzienny zwrot" onRemove={() => removeWidget(w.id)}>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={rets}>
                  <XAxis dataKey="date" hide/>
                  <YAxis domain={domainRet} tickFormatter={(v)=>`${(v*100).toFixed(1)}%`} width={60}/>
                  <Tooltip formatter={(v)=>`${(v*100).toFixed(2)}%`} labelFormatter={(l)=>`Data: ${l}`}/>
                  <Bar dataKey="ret"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        );
      case 'drawdown': {
        // seria drawdown (u<0)
        let peak = -Infinity;
        const dd = navSeries.map(p => {
          peak = Math.max(peak, p.value);
          return { date: p.date, dd: p.value / (peak || 1) - 1 };
        });
        return (
          <WidgetCard title="Drawdown" onRemove={() => removeWidget(w.id)}>
            <div className="h-56">
              <ResponsiveContainer>
                <ComposedChart data={dd}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                  <XAxis dataKey="date" hide/>
                  <YAxis tickFormatter={(v)=>`${(v*100).toFixed(0)}%`} width={50}/>
                  <Tooltip formatter={(v)=>`${(v*100).toFixed(2)}%`} labelFormatter={(l)=>`Data: ${l}`}/>
                  <Area dataKey="dd" stroke="#ef4444" fill="#ef444410" strokeWidth={2}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        );
      }
      case 'sectors':
        return (
          <WidgetCard title="Sektory" onRemove={() => removeWidget(w.id)}>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={sectors} dataKey="value" nameKey="name" outerRadius={90} label>
                    {sectors.map((_,i)=>(<Cell key={i}/>))}
                  </Pie>
                  <Tooltip formatter={(v)=>PLN(v)}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        );
      case 'valueCost':
        return (
          <WidgetCard title="Wartość vs Koszt" onRemove={() => removeWidget(w.id)}>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={rows}>
                  <XAxis dataKey="ticker" />
                  <YAxis tickFormatter={(v)=>PLN(v).replace('PLN','zł')} width={70}/>
                  <Tooltip formatter={(v)=>PLN(v)}/>
                  <Bar dataKey="cost" name="Koszt"/><Bar dataKey="value" name="Wartość"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </WidgetCard>
        );
      case 'top5': {
        const sorted = [...rows].sort((a,b)=>(b.pct||0)-(a.pct||0));
        const top = sorted.slice(0,5);
        const bot = sorted.slice(-5).reverse();
        return (
          <WidgetCard title="Top / Bottom 5" onRemove={() => removeWidget(w.id)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-emerald-400 mb-1">Top 5</div>
                <ul className="space-y-1">
                  {top.map((r,i)=>(
                    <li key={i} className="flex justify-between border-b border-white/10 py-1">
                      <span className="text-zinc-200">{r.ticker}</span>
                      <span className="text-emerald-400">{PCT(r.pct)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm text-red-400 mb-1">Bottom 5</div>
                <ul className="space-y-1">
                  {bot.map((r,i)=>(
                    <li key={i} className="flex justify-between border-b border-white/10 py-1">
                      <span className="text-zinc-200">{r.ticker}</span>
                      <span className="text-red-400">{PCT(r.pct)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </WidgetCard>
        );
      }
      case 'monthly12': {
        // ostatnie 12 m-cy (jako mini heatmapa)
        const last12 = mm.lastKeys.slice(-12);
        const series = last12.map((k,i)=>{
          if (i===0) return { k, r: null };
          const prev = last12[i-1];
          const map = new Map(navSeries.map(p=>[p.date.slice(0,10), p.value]));
          const r = ( (map.get(k) || 0) / (map.get(prev) || 1) ) - 1;
          return { k, r };
        });
        return (
          <WidgetCard title="Miesięczne (12m)" onRemove={() => removeWidget(w.id)}>
            <div className="grid grid-cols-6 gap-2">
              {series.map((x,i)=>(
                <div key={i} className={`rounded-md px-2 py-2 text-center text-xs ${heatClass(x.r)}`}>
                  <div className="opacity-70">{x.k.slice(5)}</div>
                  <div className="font-semibold">{x.r==null ? '—' : PCT(x.r,1)}</div>
                </div>
              ))}
            </div>
          </WidgetCard>
        );
      }
      default:
        return null;
    }
  }

  /* UI */
  return (
    <div className="w-full space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Kpi title="Wartość portfela" value={PLN(totalValue)} positive />
        <Kpi title="Dzienny wynik" value={PLN(dailyPL)} positive={dailyPL>=0}/>
        <Kpi title="Całkowity wynik" value={PLN(totalPL)} positive={totalPL>=0}/>
        <Kpi title="Zwrot" value={PCT(totalPct,2)} positive={totalPct>=0}/>
        <div className="kpi">
          <div className="kpi-label">Best / Worst</div>
          <div className="kpi-value text-zinc-300 text-base">
            {best ? <span className="text-emerald-400">{best.ticker} {PCT(best.pct,2)}</span> : '—'}
            <span className="mx-2 text-zinc-500">·</span>
            {worst ? <span className="text-red-400">{worst.ticker} {PCT(worst.pct,2)}</span> : '—'}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <Segmented value={range} onChange={setRange} options={['1M','3M','YTD','1R','MAX']} />
        <div className="toolbar-right">
          <span className="badge">Benchmark</span>
          <select value={bench} onChange={(e)=>setBench(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm">
            <option>Brak</option><option>WIG20</option><option>SPY</option>
          </select>
          <button className="btn-ghost flex items-center gap-2" onClick={()=>exportCSV('holdings')} title="Eksport pozycji do CSV">
            <Download className="w-4 h-4"/> Eksport
          </button>
        </div>
      </div>

      {/* NAV + benchmark */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <LineChartIcon className="w-5 h-5"/><h3 className="h2">Wartość portfela</h3>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <ComposedChart data={navSeries.map((p,i)=>({ date:p.date, nav:p.value, bench: benchNorm[i]?.value ?? null }))}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
              <XAxis dataKey="date" tick={{ fontSize:12, fill:'rgba(255,255,255,0.65)' }} minTickGap={24}/>
              <YAxis tick={{ fontSize:12, fill:'rgba(255,255,255,0.65)' }} tickFormatter={(v)=>PLN(v).replace('PLN','zł')} width={90}/>
              <Tooltip labelFormatter={(l)=>`Data: ${l}`} formatter={(v,n)=> n==='bench' ? [`${Number(v).toFixed(2)}`, 'Benchmark = 100'] : [PLN(v),'Portfel'] }/>
              <Area dataKey="nav" type="monotone" stroke="currentColor" fill="url(#navFill)" strokeWidth={2}/>
              <defs>
                <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {benchNorm.length ? <Line dataKey="bench" type="monotone" stroke="#facc15" dot={false} strokeWidth={2}/> : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Tabs */}
      <div className="segmented">
        {[
          ['overview','Podsumowanie'],
          ['performance','Wyniki'],
          ['allocation','Alokacja'],
          ['holdings','Pozycje'],
          ['widgets','Widżety'],
        ].map(([k,l])=>(
          <button key={k} data-active={String(k===tab)} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {/* PODSUMOWANIE */}
      {tab==='overview' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Stat label="CAGR" value={PCT(stats.cagr,2)}/>
            <Stat label="Zmienność (roczna)" value={PCT(stats.volYear,2)}/>
            <Stat label="Max drawdown" value={PCT(stats.mdd,2)} negative/>
            <Stat label="Sharpe (≈)" value={Number((stats.cagr-0.02)/(stats.volYear||1)).toFixed(2)}/>
          </div>

          <Card>
            <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-5 h-5"/><h4 className="font-semibold">Dzienny zwrot</h4></div>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={rets} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                  <XAxis dataKey="date" hide/>
                  <YAxis domain={domainRet} tickFormatter={(v)=>`${(v*100).toFixed(2)}%`} width={60} tick={{ fill:'rgba(255,255,255,0.65)' }}/>
                  <Tooltip formatter={(v)=>`${(v*100).toFixed(2)}%`} labelFormatter={(l)=>`Data: ${l}`}/>
                  <Bar dataKey="ret"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* WYNIKI (miesiące) */}
      {tab==='performance' && (
        <Card>
          <div className="mb-3 font-semibold">Miesięczne stopy zwrotu (ostatnie 24 m-c)</div>
          <div className="overflow-auto">
            <table className="w-full text-sm monthly">
              <thead className="opacity-70">
                <tr>
                  <th className="text-left pr-3 py-2">Rok</th>
                  {['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'].map((m,i)=>(
                    <th key={i} className="text-center px-2 py-2">{m}</th>
                  ))}
                  <th className="text-right px-2 py-2">YTD</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const order = Object.keys(mm.rows).map(Number).sort((a,b)=>b-a);
                  return order.map((Y)=>{
                    const row = mm.rows[Y];
                    const ytd = row.reduce((acc, v)=> v==null?acc: (acc+1)*(v+1)-1, 0);
                    return (
                      <tr key={Y} className="border-t border-white/10">
                        <td className="text-left pr-3 py-1.5">{Y}</td>
                        {row.map((v,idx)=>(
                          <td key={idx} className="px-1 py-1">
                            <div className={`cell ${heatClass(v)}`}>{v==null ? '—' : PCT(v,1)}</div>
                          </td>
                        ))}
                        <td className="text-right px-2 py-1.5 font-semibold">{PCT(ytd,1)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ALOKACJA */}
      {tab==='allocation' && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center gap-2 mb-2"><PieChartIcon className="w-5 h-5"/><h4 className="font-semibold">Sektory</h4></div>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={sectors} dataKey="value" nameKey="name" outerRadius={110} label>
                    {sectors.map((_,i)=>(<Cell key={i}/>))}
                  </Pie>
                  <Legend/><Tooltip formatter={(v)=>PLN(v)}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-2"><Calculator className="w-5 h-5"/><h4 className="font-semibold">Wartość / Koszt</h4></div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={rows}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                  <XAxis dataKey="ticker" tick={{ fill:'rgba(255,255,255,0.65)' }}/>
                  <YAxis tickFormatter={(v)=>PLN(v).replace('PLN','zł')} width={80} tick={{ fill:'rgba(255,255,255,0.65)' }}/>
                  <Tooltip formatter={(v)=>PLN(v)}/>
                  <Bar dataKey="cost" name="Koszt"/><Bar dataKey="value" name="Wartość"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* POZYCJE */}
      {tab==='holdings' && (
        <Card>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <input className="input w-64" placeholder="Szukaj waloru…" value={search} onChange={(e)=>setSearch(e.target.value)} />
            <div className="text-sm opacity-80">
              Wartość portfela: <span className="font-semibold">{PLN(totalValue)}</span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left opacity-70">
                <tr>
                  <th className="py-2 pr-4">Spółka</th>
                  <th className="py-2 pr-4 text-right">Ilość</th>
                  <th className="py-2 pr-4 text-right">Śr. cena</th>
                  <th className="py-2 pr-4 text-right">Kurs</th>
                  <th className="py-2 pr-4 text-right">Wartość</th>
                  <th className="py-2 pr-4 text-right">Zysk/Strata</th>
                  <th className="py-2 pr-4 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((h,i)=>{
                  const pos=(h.pl||0)>=0;
                  return (
                    <tr key={i} className="border-t border-white/10">
                      <td className="py-2 pr-4"><div className="font-medium">{h.name}</div><div className="opacity-60 text-xs">{h.ticker}{h.sector?` · ${h.sector}`:''}</div></td>
                      <td className="py-2 pr-4 text-right">{h.qty}</td>
                      <td className="py-2 pr-4 text-right">{PLN(h.avgPrice)}</td>
                      <td className="py-2 pr-4 text-right">{PLN(h.lastPrice)}</td>
                      <td className="py-2 pr-4 text-right">{PLN(h.value)}</td>
                      <td className={`py-2 pr-4 text-right ${pos?'text-emerald-500':'text-red-500'}`}>{PLN(h.pl)}</td>
                      <td className={`py-2 pr-4 text-right ${pos?'text-emerald-500':'text-red-500'}`}>{PCT(h.pct,2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-end">
            <button className="btn-ghost flex items-center gap-2" onClick={()=>exportCSV('holdings')}>
              <Download className="w-4 h-4"/> Eksport CSV
            </button>
          </div>
        </Card>
      )}

      {/* WIDŻETY – personalizowany dashboard */}
      {tab==='widgets' && (
        <section className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-400">Dodaj widżet:</div>
              <div className="flex flex-wrap gap-2">
                {WIDGET_TYPES.map(w=>(
                  <button key={w.type} className="btn-ghost flex items-center gap-1" onClick={()=>addWidget(w.type)}>
                    <Plus className="w-4 h-4"/>{w.label}
                  </button>
                ))}
                {widgets.length ? (
                  <button className="btn-ghost" onClick={clearWidgets}>Wyczyść wszystkie</button>
                ) : null}
              </div>
            </div>
          </Card>

          {widgets.length === 0 ? (
            <div className="text-sm text-zinc-400">Brak widżetów. Użyj przycisków powyżej, aby dodać karty.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {widgets.map(w => (
                <div key={w.id}>{renderWidget(w)}</div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
