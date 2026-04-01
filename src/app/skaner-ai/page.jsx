'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../lib/firebase';
import { listPortfolios, listenHoldings } from '../../lib/portfolioStore';
import { resolvePair } from '../../lib/pairs';
import { Treemap, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

const DIFFICULTY_CLS = {
  easy:   'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
  medium: 'text-amber-400   border-amber-500/30   bg-amber-500/5',
  hard:   'text-red-400     border-red-500/30     bg-red-500/5',
};

const IMPACT_CLS = {
  high:   'text-sky-400    border-sky-500/30  bg-sky-500/5',
  medium: 'text-zinc-300   border-zinc-600    bg-zinc-800/60',
  low:    'text-zinc-600   border-zinc-800    bg-transparent',
};

function formatPLN(n) {
  if (n === undefined || n === null || isNaN(n)) return '0 PLN';
  return n?.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' PLN';
}

function getBubbleColor(roi) {
  if (roi <= -20) return '#991b1b'; 
  if (roi < 0) return '#dc2626'; 
  if (roi === 0) return '#52525b'; 
  if (roi < 20) return '#16a34a'; 
  return '#166534'; 
}

const CustomizedTreemapContent = (props) => {
  const { x, y, width, height, name, roi, onClick } = props;
  if (!name || name === 'Portfolio') return null; 

  const color = getBubbleColor(roi);
  const isLargeEnough = width > 45 && height > 40;
  const area = width * height;
  const fontSizeTicker = Math.min(18, Math.max(11, Math.sqrt(area) * 0.12));
  const fontSizeRoi = Math.max(10, fontSizeTicker * 0.75);

  return (
    <g onClick={() => onClick(name)} className="cursor-pointer group">
      <rect 
        x={x + 2} 
        y={y + 2} 
        width={Math.max(0, width - 4)} 
        height={Math.max(0, height - 4)} 
        fill={color} 
        rx={8} 
        ry={8}
        stroke="#27272a" 
        strokeWidth={1} 
        className="transition-all duration-300 group-hover:brightness-125 group-hover:stroke-zinc-300" 
      />
      {isLargeEnough && (
        <g style={{ pointerEvents: 'none' }} fontFamily="sans-serif">
          <text x={x + width / 2} y={y + height / 2 - 2} textAnchor="middle" fill="#ffffff" fontSize={fontSizeTicker} fontWeight="bold" letterSpacing="0.03em">
            {name.length > 8 ? name.slice(0, 8) + '..' : name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + fontSizeRoi + 2} textAnchor="middle" fill="#ffffff" fillOpacity={0.9} fontSize={fontSizeRoi} fontWeight="600">
            {roi > 0 ? '+' : ''}{roi}%
          </text>
        </g>
      )}
    </g>
  );
};

const CustomTreemapTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const actualData = data.name ? data : data.payload; 
    if (!actualData || !actualData.name || actualData.name === 'Portfolio') return null;

    const color = getBubbleColor(actualData.roi);
    return (
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-2xl text-sm min-w-[180px]">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-bold text-white text-base tracking-tight">{actualData.name}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between gap-6 text-zinc-400">
            <span>Zysk / Strata:</span>
            <span className="font-semibold" style={{ color: color }}>{actualData.roi > 0 ? '+' : ''}{actualData.roi}%</span>
          </div>
          <div className="flex justify-between gap-6 text-zinc-400">
            <span>Udział:</span>
            <span className="font-semibold text-white">{actualData.pct}%</span>
          </div>
          <div className="flex justify-between gap-6 text-zinc-400">
            <span>Wartość:</span>
            <span className="font-semibold text-white">{formatPLN(actualData.valuePLN)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

function priceNowFrom({ quote, hist, avgBuy, buyPrice }) {
  const live = Number.isFinite(quote?.pricePLN) ? quote.pricePLN : (Number.isFinite(quote?.price) ? quote.price : null);
  if (Number.isFinite(live) && live > 0) return live;
  let lastFromHist = null;
  if (Array.isArray(hist) && hist.length) {
    for (let i = hist.length - 1; i >= 0; i--) {
      const c = Number(hist[i]?.close);
      if (Number.isFinite(c) && c > 0) { lastFromHist = c; break; }
    }
  }
  if (Number.isFinite(lastFromHist) && lastFromHist > 0) return lastFromHist;
  const prev = Number.isFinite(quote?.prevClosePLN) ? quote.prevClosePLN : null;
  if (Number.isFinite(prev) && prev > 0) return prev;
  const approx = Number.isFinite(avgBuy) && avgBuy > 0 ? avgBuy : (Number.isFinite(buyPrice) && buyPrice > 0 ? buyPrice : 0);
  return approx > 0 ? approx : 0;
}

function OnboardingForm({ holdings, portfolios, selectedPortfolioId, onSelectPortfolio, onSubmit, loading, isDataFetching }) {
  const [form, setForm] = useState({ age: '', monthlyContribution: '', riskTolerance: 'medium' });

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('finasfera_fire_settings');
      if (savedSettings) setForm(f => ({ ...f, ...JSON.parse(savedSettings) }));
    } catch(e) {}
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.age > 0 && form.monthlyContribution !== '' && holdings.length > 0 && !isDataFetching;

  return (
    <div className="min-h-[70vh] flex flex-col justify-center max-w-lg mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-white tracking-tight leading-snug">
          Zanim zaczniemy,<br />
          <span className="text-amber-400">powiedz mi o swoim celu.</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-3 leading-relaxed">Bez tych danych Żuberek nie wie czym mierzyć sukces Twojego portfela. 3 pytania, 30 sekund.</p>
      </div>

      {portfolios.length > 1 && (
        <div className="mb-6">
          <label className="block text-[11px] text-zinc-500 uppercase tracking-widest mb-2">Portfel do analizy</label>
          <select value={selectedPortfolioId} onChange={e => onSelectPortfolio(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm px-4 py-3 rounded-xl outline-none focus:border-zinc-600 transition-colors">
            <option value="">Portfel główny (suma)</option>
            {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-5 mb-8">
        <div>
          <label className="block text-[11px] text-zinc-500 uppercase tracking-widest mb-2">Twój wiek</label>
          <input type="number" min="18" placeholder="np. 25" value={form.age} onChange={e => set('age', Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-amber-500/60 transition-colors placeholder:text-zinc-700" />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 uppercase tracking-widest mb-2">Ile wpłacasz miesięcznie? (PLN)</label>
          <input type="number" min="0" placeholder="np. 2000" value={form.monthlyContribution} onChange={e => set('monthlyContribution', Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-amber-500/60 transition-colors placeholder:text-zinc-700" />
        </div>
        <div>
          <label className="block text-[11px] text-zinc-500 uppercase tracking-widest mb-2">Jak reagujesz gdy portfel spada 20%?</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ val: 'low', label: 'Sprzedaję', sub: 'Niska tolerancja' }, { val: 'medium', label: 'Czekam', sub: 'Średnia tolerancja' }, { val: 'high', label: 'Dokupuję', sub: 'Wysoka tolerancja' }].map(opt => (
              <button key={opt.val} onClick={() => set('riskTolerance', opt.val)} className={`p-3 rounded-xl border text-left transition-all ${form.riskTolerance === opt.val ? 'border-amber-500/60 bg-amber-500/8 text-white' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'}`}>
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-[10px] mt-0.5 opacity-60">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 text-[12px]">
        <span className={`w-2 h-2 rounded-full ${isDataFetching ? 'bg-amber-500 animate-pulse' : (holdings.length > 0 ? 'bg-emerald-400' : 'bg-red-500')}`} />
        <span className="text-zinc-400">
          {holdings.length > 0 ? <>Wykryto <strong className="text-white">{holdings.length}</strong> aktywów w portfelu</> : <>Szukam Twoich aktywów...</>}
          {isDataFetching && holdings.length > 0 && <span className="ml-2 text-amber-500/80 italic">(oczekiwanie na ceny z giełdy...)</span>}
        </span>
      </div>

      <button onClick={() => onSubmit(form)} disabled={!valid || loading} className="w-full py-4 bg-amber-400 text-black font-bold text-sm rounded-xl hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-3">
        {loading ? <><span className="w-4 h-4 border-2 border-black/25 border-t-black rounded-full animate-spin" /> Żuberek analizuje...</> : isDataFetching ? 'Czekam na ceny z giełdy...' : 'Uruchom pełną analizę →'}
      </button>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-6 mt-10">
      <span className="text-[14px] font-bold tracking-[0.15em] uppercase text-amber-400">{children}</span>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

function ScoreBar({ label, value }) {
  const color = value >= 70 ? '#22c55e' : value >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <span className="text-[12px] text-zinc-500">{label}</span>
        <span className="text-[12px] text-zinc-300 font-mono font-semibold">{value}</span>
      </div>
      <div className="h-[3px] bg-zinc-900 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function Report({ report }) {
  const [selectedTicker, setSelectedTicker] = useState(null);
  const sc = report.score;
  const scClass = sc >= 70 ? 'text-emerald-400' : sc >= 45 ? 'text-amber-400' : 'text-red-400';

  const treeData = useMemo(() => {
    if (!report.bubble_data || report.bubble_data.length === 0) return [];
    return [{
      name: 'Portfolio',
      children: report.bubble_data.map(b => ({
        name: b.ticker,
        size: Math.max(1, b.value), 
        roi: b.roi,
        pct: b.pct,
        valuePLN: b.value
      }))
    }];
  }, [report.bubble_data]);

  const currentAnalysis = useMemo(() => {
    if (!selectedTicker || !report.holdings_analysis) return null;
    return report.holdings_analysis.find(h => h.ticker.toUpperCase() === selectedTicker.toUpperCase())?.analysis;
  }, [selectedTicker, report.holdings_analysis]);

  return (
    <div className="space-y-8 pb-16">
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl mb-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Informacja edukacyjna</p>
        <p className="text-[13px] text-zinc-400 leading-relaxed">
          Poniższy audyt został wygenerowany przez sztuczną inteligencję (Żuberek AI) w oparciu o modele statystyczne. Stanowi on materiał analityczny i poglądowy. Przedstawione wnioski i punkty akcji nie są rekomendacją inwestycyjną.
        </p>
      </div>

      <section>
        <SectionLabel>Ocena Żuberka</SectionLabel>
        <blockquote className="border-l-2 border-amber-400 pl-6">
          <p className="text-[17px] text-zinc-200 font-light leading-relaxed">"{report.narrative}"</p>
        </blockquote>
      </section>

      {/* NOWA SEKCJA: Podsumowanie Tez */}
      {report.thesis_evaluation_summary && (
        <section className="mt-8">
          <SectionLabel>Audyt Pamiętnika Inwestora</SectionLabel>
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl">
            <p className="text-[14px] text-zinc-300 leading-relaxed">
              {report.thesis_evaluation_summary}
            </p>
          </div>
        </section>
      )}

      <section>
        <SectionLabel>Wynik portfela</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-[88px] leading-none font-black tracking-tighter ${scClass}`}>{sc}</span>
              <span className="text-zinc-700 text-3xl font-light">/100</span>
            </div>
            <p className="text-zinc-400 text-sm mb-1">{sc >= 70 ? 'Solidny portfel' : sc >= 45 ? 'Potencjał do poprawy' : 'Wymaga uwagi'}</p>
            
            <div className="mt-4 mb-3">
              <span className="text-amber-400 text-xl sm:text-2xl font-bold tracking-tight">Lepszy niż {report.percentile}% portfeli</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 text-[11px]">{report.pos_count} pozycji · {formatPLN(report.total_value)}</span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-500/80 text-[11px]">PL: {report.poland_pct}% | Świat: {report.global_pct}%</span>
            </div>
          </div>
          <div className="space-y-4 mt-2">
            <ScoreBar label="Dywersyfikacja"       value={report.score_breakdown?.diversification ?? 0} />
            <ScoreBar label="Ryzyko koncentracji"  value={report.score_breakdown?.concentration_risk ?? 0} />
            <ScoreBar label="Dopasowanie do celów" value={report.score_breakdown?.goal_alignment ?? 0} />
            <ScoreBar label="Spójność strategii"   value={report.score_breakdown?.strategy_consistency ?? 0} />
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Mapa zyskowności (Heatmap)</SectionLabel>
        <div className="mb-6">
          <div className="bg-zinc-900 border border-zinc-800 px-5 py-4 rounded-xl mb-6 inline-flex items-center gap-4 shadow-sm w-full sm:w-auto">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl shrink-0">👆</div>
            <div>
               <p className="text-sm text-zinc-200 font-semibold mb-0.5">Interaktywna mapa portfela</p>
               <p className="text-xs text-zinc-500">Kliknij na dowolny kafelek, aby przeczytać weryfikację tezy dla spółki</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mb-6">
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium"><span className="w-2.5 h-2.5 rounded-sm bg-[#16a34a]" />Zyskowna ({'>'} 0%)</span>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium"><span className="w-2.5 h-2.5 rounded-sm bg-[#52525b]" />Około zera (0%)</span>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium"><span className="w-2.5 h-2.5 rounded-sm bg-[#dc2626]" />Stratna ({'<'} 0%)</span>
          </div>

          <div className="h-[400px] w-full py-4 bg-[#09090b] rounded-3xl border border-zinc-800/50 p-2 sm:p-4 mb-4">
            {treeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treeData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="none"
                  content={<CustomizedTreemapContent onClick={(name) => setSelectedTicker(name)} />}
                  isAnimationActive={false}
                >
                  <RechartsTooltip content={<CustomTreemapTooltip />} cursor={false} />
                </Treemap>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Brak danych do wyświetlenia mapy.</div>
            )}
          </div>
        </div>

        {/* NOWA SEKCJA: Synergia i odchylenia */}
        {report.synergy_and_outliers && (
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl mb-8 mt-2">
            <h4 className="text-[13px] font-bold text-amber-400 uppercase tracking-widest mb-3">Synergia i spójność portfela</h4>
            <p className="text-[14px] text-zinc-300 leading-relaxed">
              {report.synergy_and_outliers}
            </p>
          </div>
        )}
        
        {report.risk_impact_summary && (
          <p className="text-[13px] text-red-300/90 mb-6 font-medium leading-relaxed bg-red-950/30 p-5 rounded-xl border border-red-900/50 mt-8">
            {report.risk_impact_summary}
          </p>
        )}
        
        {report.top_risks && report.top_risks.length > 0 && (
          <div className="space-y-3">
            <SectionLabel>Zidentyfikowane Ryzyka</SectionLabel>
            {report.top_risks.map((risk, i) => (
              <div key={i} className="flex gap-4 items-start bg-red-950/20 p-4 rounded-xl border border-red-900/30">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-900/50 flex items-center justify-center text-[11px] font-bold text-red-300 mt-0.5">{i + 1}</span>
                <p className="text-[14px] text-red-200/90 leading-relaxed">{risk}</p>
              </div>
            ))}
          </div>
        )}

        {report.top_strengths && report.top_strengths.length > 0 && (
          <div className="space-y-3">
            <SectionLabel>Mocne strony portfela</SectionLabel>
            {report.top_strengths.map((strength, i) => (
              <div key={i} className="flex gap-4 items-start bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/30">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-900/50 flex items-center justify-center text-[11px] font-bold text-emerald-300 mt-0.5">{i + 1}</span>
                <p className="text-[14px] text-emerald-200/90 leading-relaxed">{strength}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Plan działania w modelu edukacyjnym</SectionLabel>
        <div className="space-y-0 mt-8">
          {(report.action_steps || []).map((step, i) => (
            <div key={i} className="flex gap-6 group">
              <div className="flex flex-col items-center flex-shrink-0 pt-1">
                <div className="w-8 h-8 rounded-full border-2 border-zinc-800 bg-zinc-950 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:border-amber-500/50 group-hover:text-amber-400 transition-colors">{i + 1}</div>
                {i < (report.action_steps.length - 1) && <div className="w-px flex-1 bg-zinc-800/80 my-3" />}
              </div>
              <div className={`pb-10 flex-1 ${i === report.action_steps.length - 1 ? 'pb-0' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 className="text-base font-bold text-white tracking-wide">{step.title}</h3>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded border ${DIFFICULTY_CLS[step.difficulty] || DIFFICULTY_CLS.medium}`}>
                      {step.difficulty === 'easy' ? 'łatwe' : step.difficulty === 'medium' ? 'średnie' : 'trudne'}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded border ${IMPACT_CLS[step.impact] || IMPACT_CLS.medium}`}>
                      wpływ: {step.impact === 'high' ? 'wysoki' : step.impact === 'medium' ? 'średni' : 'niski'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed mb-3">{step.why}</p>
                <span className="text-xs text-zinc-600 font-mono flex items-center gap-1.5">⏱ Czas analizy: {step.time_needed}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedTicker && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedTicker(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-zinc-950 border-l border-zinc-800 p-8 shadow-2xl overflow-y-auto transform transition-transform translate-x-0">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-900">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">Analiza fundamentalna</p>
                <h4 className="text-white text-2xl font-bold tracking-tight">{selectedTicker}</h4>
              </div>
              <button onClick={() => setSelectedTicker(null)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 p-2 rounded-full">
                ✕
              </button>
            </div>
            
            <p className="text-[15px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {currentAnalysis || "Żuberek AI nie przygotował jeszcze analizy dla tego aktywa. Spróbuj wykonać skan ponownie."}
            </p>

            <div className="mt-8 pt-6 border-t border-zinc-900">
               <p className="text-[11px] text-zinc-600 leading-relaxed">Powyższa analiza jest generowana automatycznie w oparciu o modele językowe i nie uwzględnia nagłych zdarzeń rynkowych. Dane mają charakter edukacyjny i nie stanowią porady inwestycyjnej.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function SkanerAIPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelected] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const [fsHoldings, setFsHoldings] = useState([]);
  const [pairsById, setPairsById] = useState({});
  const [quotes, setQuotes] = useState({});
  const [seriesByIdDaily, setSeriesByIdDaily] = useState({});
  const [isDataFetching, setIsDataFetching] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      listPortfolios(user.uid).then(setPortfolios).catch(() => {});
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) { setFsHoldings([]); return; }
    const unsub = listenHoldings(user.uid, selectedPortfolioId || null, (rows) => {
      setFsHoldings(Array.isArray(rows) ? rows : []);
    });
    return () => unsub?.();
  }, [user?.uid, selectedPortfolioId]);

  useEffect(() => {
    if (!fsHoldings.length) { setPairsById({}); return; }
    let alive = true;
    (async () => {
      try {
        const entries = await Promise.all(
          fsHoldings.map(async (h) => {
            const base = h?.pair || { yahoo: h?.pair?.yahoo || h?.name };
            const pair = await resolvePair(base);
            return [h.id, pair];
          })
        );
        if (alive) setPairsById(Object.fromEntries(entries));
      } catch {
        if (alive) setPairsById({});
      }
    })();
    return () => { alive = false; };
  }, [fsHoldings]);

  const quotesSig = useMemo(
    () => fsHoldings.map(h => `${h.id}|${(pairsById[h.id]?.yahoo || h?.pair?.yahoo || h?.name || "").toUpperCase()}`).sort().join(";"),
    [fsHoldings, pairsById]
  );

  useEffect(() => {
    if (!user?.uid || !fsHoldings.length) { setQuotes({}); return; }
    const controller = new AbortController();
    (async () => {
      try {
        const list = fsHoldings
          .map(h => String(pairsById[h.id]?.yahoo || h?.pair?.yahoo || h?.name || "").toUpperCase())
          .filter(Boolean);
        if (!list.length) { setQuotes({}); return; }

        const url = `/api/quote?symbols=${encodeURIComponent(list.join(","))}`;
        const r = await fetch(url, { signal: controller.signal });
        if (!r.ok) { setQuotes({}); return; }
        const j = await r.json().catch(() => ({}));
        const bySym = j?.quotes || (j?.yahoo ? { [j.yahoo]: j } : {});

        const out = {};
        for (const h of fsHoldings) {
          const sym = String((pairsById[h.id]?.yahoo || h?.pair?.yahoo || h?.name || "")).toUpperCase();
          const q = bySym[sym] || null;
          out[h.id] = q ? { pricePLN: q.pricePLN, prevClosePLN: q.prevClosePLN, price: q.price } : null;
        }
        if (!controller.signal.aborted) setQuotes(out);
      } catch (e) {}
    })();
    return () => controller.abort();
  }, [user?.uid, quotesSig]);

  useEffect(() => {
    if (!user?.uid || !fsHoldings.length) { setSeriesByIdDaily({}); setIsDataFetching(false); return; }
    const controller = new AbortController();
    setIsDataFetching(true); 
    
    (async () => {
      try {
        const items = fsHoldings.map((h) => ({
          id: h.id,
          shares: Number(h.shares) || 0,
          pair: pairsById[h.id] || (h.pair || { yahoo: h?.pair?.yahoo || h?.name }),
        }));
        
        const symbols = Array.from(new Set(items.map((it) => String(it.pair?.yahoo || "").toUpperCase()).filter(Boolean)));

        const r = await fetch("/api/history/bulk", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ symbols, range: "1y", interval: "1d" }),
          signal: controller.signal,
        });
        
        const j = r.ok ? await r.json().catch(() => ({})) : {};
        const results = j?.results || {};

        const byId = {};
        for (const it of items) {
          const y = String(it.pair?.yahoo || "").toUpperCase();
          const arr = Array.isArray(results[y]) ? results[y] : [];
          const hist = (arr || []).map((p) => ({ t: p?.t, close: Number.isFinite(Number(p?.close)) ? Number(p.close) : null })).filter((p) => p.t && p.close != null);
          byId[it.id] = { history: hist, shares: it.shares };
        }

        if (!controller.signal.aborted) {
          setSeriesByIdDaily(byId);
          setIsDataFetching(false); 
        }
      } catch (e) {
        if (e?.name !== "AbortError" && !controller.signal.aborted) setIsDataFetching(false);
      }
    })();
    return () => controller.abort();
  }, [user?.uid, quotesSig]);

  const holdings = useMemo(() => {
    if (isDataFetching) return [];

    const byKey = new Map();
    for (const h of fsHoldings) {
      const pair = pairsById[h.id] || h.pair || { yahoo: h.name };
      const sym = String(pair?.yahoo || h.name || "Nieznana").toUpperCase();

      if (!byKey.has(sym)) {
        // DODANE: thesis będzie zbierać notatki ze wszystkich zakupów danej spółki
        byKey.set(sym, { key: sym, name: h.name, lots: [], totalShares: 0, costSum: 0 });
      }
      const g = byKey.get(sym);
      const shares = Number(h.shares) || 0;
      const buy = Number(h.buyPrice) || 0;

      if (shares <= 0) continue;

      g.lots.push(h);
      g.totalShares += shares;
      g.costSum += buy * shares;
    }

    const out = [];
    for (const g of byKey.values()) {
      const avgBuy = g.totalShares > 0 ? g.costSum / g.totalShares : 0;
      let price = 0;

      for (const lot of g.lots) {
        const q = quotes[lot.id];
        const hist = seriesByIdDaily[lot.id]?.history || [];
        price = priceNowFrom({ quote: q, hist, avgBuy, buyPrice: lot.buyPrice });
        if (price > 0) break;
      }

      const valuePLN = price * g.totalShares;
      const gain = valuePLN - g.costSum;
      const profitPct = g.costSum > 0 ? (gain / g.costSum) * 100 : 0;

      let safeValue = valuePLN;
      if (safeValue <= 0) safeValue = 1;

      // DODANE: Złożenie pamiętnika ze wszystkich transz (lotów) do jednego stringa
      const theses = g.lots.map(l => l.note).filter(Boolean);
      const combinedThesis = theses.length > 0 ? Array.from(new Set(theses)).join(" | ") : null;

      out.push({
        ticker: g.key,
        name: g.name, 
        shares: g.totalShares,
        valuePLN: safeValue,
        value: safeValue,
        profitPct: profitPct,
        thesis: combinedThesis // <--- PRZEKAZUJEMY TEZĘ DO BACKENDU
      });
    }

    return out.sort((a, b) => b.valuePLN - a.valuePLN);
  }, [fsHoldings, pairsById, quotes, seriesByIdDaily, isDataFetching]);

  useEffect(() => {
    try {
      const savedReport = localStorage.getItem('finasfera_ai_report');
      if (savedReport) setReport(JSON.parse(savedReport));
    } catch(e) {}
  }, []);

  const clearReport = () => {
    setReport(null);
    setError(null);
    localStorage.removeItem('finasfera_ai_report');
  };

  const runAudit = async (onboardingData) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    localStorage.setItem('finasfera_fire_settings', JSON.stringify(onboardingData));

    try {
      const res = await fetch('/api/ai-audit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  abortRef.current.signal,
        body: JSON.stringify({
          user: { name: user?.displayName?.split(' ')[0] ?? 'Inwestor', accountType: 'IKE' },
          onboarding: onboardingData,
          holdings, // Przekazujemy holdings (z "thesis") do modelu
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Błąd serwera');
      const data = await res.json();
      setReport(data);
      localStorage.setItem('finasfera_ai_report', JSON.stringify(data));
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e.message);
    } finally { setLoading(false); }
  };

  if (loadingAuth) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><span className="w-5 h-5 border-2 border-zinc-800 border-t-amber-400 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[15px] text-zinc-600 uppercase tracking-[0.2em] mb-1 font-bold">Finasfera Intelligence</p>
            <h1 className="text-4xl font-extrabold tracking-tight">Żuberek <span className="text-amber-400">AI</span></h1>
          </div>
          {report && (
            <button onClick={clearReport} className="px-5 py-2.5 bg-transparent border border-zinc-700 hover:bg-zinc-900 hover:border-zinc-500 text-zinc-300 hover:text-white text-[13px] font-bold rounded-xl transition-all flex items-center gap-2">
              ← Nowy skan
            </button>
          )}
        </header>

        <p className="text-xs text-zinc-600 mb-12 italic border-b border-zinc-900 pb-4">
          Moduł o charakterze ściśle edukacyjnym. Pamiętaj, że inwestowanie wiąże się z ryzykiem utraty kapitału. Nie doradzamy, co kupić lub sprzedać.
        </p>

        {error && <div className="mb-8 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-sm text-red-400">⚠ {error}</div>}

        {!report ? (
          <OnboardingForm 
            holdings={holdings} 
            portfolios={portfolios} 
            selectedPortfolioId={selectedPortfolioId} 
            onSelectPortfolio={setSelected} 
            onSubmit={runAudit} 
            loading={loading}
            isDataFetching={isDataFetching} 
          />
        ) : (
          <>
            <Report report={report} />
            <div className="mt-16 pt-8 border-t border-zinc-900 text-center">
              <p className="text-[11px] text-zinc-600 leading-relaxed max-w-xl mx-auto">
                Analizy wygenerowane przez Żuberek AI bazują na ogólnodostępnych danych i modelach sztucznej inteligencji. Treści zawarte w tej sekcji mają na celu budowę świadomości inwestycyjnej i zarządzania ryzykiem. Żadna informacja zawarta w raporcie nie stanowi usługi doradztwa inwestycyjnego.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}