'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import SeoLandingSection from '../components/SeoLandingSection';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../lib/firebase';
import { 
  listPortfolios, 
  listenHoldings, 
  listenGlobalTheses,
  listenCashBalance, 
  saveAiAuditScore,  
  listenAiAuditHistory 
} from '../../lib/portfolioStore';
import { resolvePair } from '../../lib/pairs';
import { Treemap, ResponsiveContainer, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from 'recharts'; 
import { useAuth } from '../components/AuthProvider'; 

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

const LOADING_STEPS = [
  "Żuberek weryfikuje dane z giełdy...",
  "Przeliczam dywersyfikację sektorową...",
  "Analizuję wpisy z Pamiętnika Inwestora...",
  "Sprawdzam macierz korelacji aktywów...",
  "Wykrywam ryzyka koncentracji...",
  "Dopasowuję strategię do Twojego profilu...",
  "Przygotowuję finalny plan działania..."
];

const DEMO_REPORT = {
  score: 62,
  percentile: 65,
  pos_count: 6,
  total_value: 24500,
  poland_pct: 45,
  global_pct: 55,
  narrative: "Portfel przykładowego inwestora o średniej tolerancji ryzyka, charakteryzujący się mocną ekspozycją na amerykański sektor technologiczny oraz polski sektor finansowy. Widoczna jest próba dywersyfikacji, jednak koncentracja w największych spółkach wprowadza podwyższoną zmienność.",
  thesis_evaluation_summary: "Tezy inwestycyjne wydają się skupiać wokół długoterminowego wzrostu spółek technologicznych (AI, chmura) oraz stabilnych dywidend z lokalnego rynku. Jest to solidne podejście, choć wymaga monitorowania wycen spółek wzrostowych na amerykańskiej giełdzie.",
  score_breakdown: {
    diversification: 58,
    concentration_risk: 42,
    goal_alignment: 70,
    strategy_consistency: 80
  },
  bubble_data: [
    { ticker: "NVDA", value: 6500, roi: 45.2, pct: 26.5 },
    { ticker: "AAPL", value: 5000, roi: 12.4, pct: 20.4 },
    { ticker: "XTB.WA", value: 4500, roi: 22.1, pct: 18.3 },
    { ticker: "PKO.WA", value: 4000, roi: 8.5, pct: 16.3 },
    { ticker: "CDR.WA", value: 2500, roi: -15.4, pct: 10.2 },
    { ticker: "CASH", value: 2000, roi: 0, pct: 8.1 }
  ],
  holdings_analysis: [
    { ticker: "NVDA", analysis: "NVIDIA jest absolutnym liderem w segmencie chipów AI, co uzasadnia imponującą stopę zwrotu. Wysoka wycena wskaźnikowa (P/E) oznacza jednak podwyższone ryzyko przy ewentualnym spowolnieniu zamówień od firm technologicznych." },
    { ticker: "AAPL", analysis: "Stabilny filar portfela z ogromnymi zasobami gotówki. Oczekuje się, że dalszy rozwój usług subskrypcyjnych zrekompensuje nieco wolniejszą sprzedaż sprzętu." },
    { ticker: "XTB.WA", analysis: "Dynamiczny wzrost liczby klientów oraz sprzyjające środowisko rynkowe w Europie napędzają wyniki XTB. Ekspozycja na tę spółkę to mocny zakład na wysoką zmienność na światowych giełdach." },
    { ticker: "PKO.WA", analysis: "Solidna spółka dywidendowa, której wyniki silnie zależą od stóp procentowych w Polsce. Działa jako defensywna przeciwwaga dla agresywnej części technologicznej." },
    { ticker: "CDR.WA", analysis: "CD Projekt znajduje się w fazie przejściowej między dużymi premierami. Ujemna stopa zwrotu odzwierciedla koszty deweloperskie i długi czas oczekiwania na kolejne hity. Wymaga cierpliwości." },
    { ticker: "CASH", analysis: "Płynna gotówka stanowi naturalny bufor bezpieczeństwa. W okresach podwyższonej zmienności pozwala na uśrednianie w dół (dokupywanie akcji po przecenie)." }
  ],
  synergy_and_outliers: "W portfelu występuje synergia między defensywnym charakterem polskich banków a agresywnym wzrostem amerykańskich gigantów. Gotówka pełni rolę stabilizatora.",
  risk_impact_summary: "Zidentyfikowano ryzyko walutowe (PLN/USD) oraz wrażliwość na wyceny w sektorze tech.",
  top_risks: [
    "Wysoka koncentracja w sektorze technologicznym USA.",
    "Znaczna ekspozycja na polski sektor finansowy podatny na zmiany polityczne."
  ],
  top_strengths: [
    "Solidny fundament wzrostowy dzięki rynkowym liderom z USA.",
    "Dobra równowaga walutowa (USD a PLN) i zachowany bufor gotówkowy."
  ],
  action_steps: [
    { title: "Redukcja koncentracji w topowych spółkach", difficulty: "medium", impact: "high", why: "Zrównoważenie wag największych pozycji zmniejszy wrażliwość na korektę.", time_needed: "1-2 godziny" }
  ]
};

function QuotaExceededMessage() {
  return (
    <div className="p-8 bg-zinc-900/80 border border-amber-500/30 rounded-2xl text-center max-w-2xl mx-auto my-8 shadow-xl shadow-amber-500/5 animate-in fade-in zoom-in-95 duration-500">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-amber-500/50 bg-amber-500/10 mb-4">
        <span className="text-amber-500 font-black text-xl">!</span>
      </div>
      <h3 className="text-xl font-black text-white uppercase tracking-wider mb-3">Dzienny limit audytów wyczerpany</h3>
      <p className="text-zinc-400 leading-relaxed text-sm mb-6">Finasfera znajduje się obecnie w fazie darmowego, wczesnego dostępu. Aby utrzymać to narzędzie bezpłatnym, korzystamy z puli zapytań OpenAI, która na dziś została wykorzystana.</p>
      <div className="p-4 bg-black/50 border border-zinc-800 rounded-xl inline-block">
        <span className="text-amber-500 font-bold text-sm uppercase tracking-widest">Zapraszamy jutro po odnowieniu limitów</span>
      </div>
    </div>
  );
}

function formatPLN(n) {
  if (n === undefined || n === null || isNaN(n)) return '0 PLN';
  return n?.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' PLN';
}

function getBubbleColor(roi, ticker) {
  if (ticker === 'CASH') return '#3f3f46'; 
  if (roi <= -20) return '#991b1b'; 
  if (roi < 0) return '#dc2626'; 
  if (roi === 0) return '#52525b'; 
  if (roi < 20) return '#16a34a'; 
  return '#166534'; 
}

// =======================================================================
// POPRAWIONA, CZYTELNA MAPA (HEATMAP)
// =======================================================================
const CustomizedTreemapContent = (props) => {
  const { x, y, width, height, name, roi, onClick } = props;
  if (!name || name === 'Portfolio') return null; 

  const color = getBubbleColor(roi, name);
  const isLargeEnough = width > 50 && height > 45;
  const area = width * height;
  const fontSizeTicker = Math.min(22, Math.max(12, Math.sqrt(area) * 0.12));
  const fontSizeRoi = Math.max(10, fontSizeTicker * 0.65);

  return (
    <g onClick={() => onClick(name)} className="cursor-pointer group">
      {/* Tło kafelka z solidnym odstępem (margin) tworzącym luki między nimi */}
      <rect 
        x={x + 3} 
        y={y + 3} 
        width={Math.max(0, width - 6)} 
        height={Math.max(0, height - 6)} 
        fill={color} 
        rx={8} 
        ry={8}
        stroke="#09090b" /* Kolor tła aplikacji (czarny) jako fizyczna bariera */
        strokeWidth={1} 
        className="transition-all duration-300 group-hover:brightness-110" 
      />
      {/* Wewnętrzny efekt obramowania (3D/Highlight), by kafelki się nie zlewały */}
      <rect
        x={x + 4}
        y={y + 4}
        width={Math.max(0, width - 8)}
        height={Math.max(0, height - 8)}
        fill="transparent"
        rx={7}
        ry={7}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1}
        style={{ pointerEvents: 'none' }}
      />
      {isLargeEnough && (
        <g style={{ pointerEvents: 'none' }} fontFamily="sans-serif">
          <text x={x + width / 2} y={y + height / 2 - 2} textAnchor="middle" fill="#ffffff" fillOpacity={0.95} fontSize={fontSizeTicker} fontWeight="bold" letterSpacing="0.03em">
            {name.length > 8 ? name.slice(0, 8) + '..' : name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + fontSizeRoi + 4} textAnchor="middle" fill="#ffffff" fillOpacity={0.7} fontSize={fontSizeRoi} fontWeight="600">
            {name === 'CASH' ? 'Bufor' : `${roi > 0 ? '+' : ''}${roi}%`}
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

    const color = getBubbleColor(actualData.roi, actualData.name);
    return (
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-2xl text-sm min-w-[180px] z-50 relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-bold text-white text-base tracking-tight">{actualData.name}</span>
        </div>
        <div className="space-y-2">
          {actualData.name !== 'CASH' && (
            <div className="flex justify-between gap-6 text-zinc-400">
              <span>Zysk / Strata:</span>
              <span className="font-semibold" style={{ color: color }}>{actualData.roi > 0 ? '+' : ''}{actualData.roi}%</span>
            </div>
          )}
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

function OnboardingForm({ holdings, portfolios, selectedPortfolioId, onSelectPortfolio, onSubmit, loading, isDataFetching, loadingStep }) {
  const [form, setForm] = useState({ age: '', monthlyContribution: '', riskTolerance: 'medium' });

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('finasfera_fire_settings');
      if (savedSettings) setForm(f => ({ ...f, ...JSON.parse(savedSettings) }));
    } catch(e) {}
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.age > 0 && form.monthlyContribution !== '' && holdings.length > 0 && !isDataFetching;

  // =======================================================================
  // DEDYKOWANY EKRAN ŁADOWANIA (Gdy loading = true)
  // =======================================================================
  if (loading) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center max-w-lg mx-auto text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative w-32 h-32 mb-4">
          <div className="absolute inset-0 border-[5px] border-zinc-800 border-t-amber-400 rounded-full animate-[spin_2s_linear_infinite]"></div>
          <div className="absolute inset-4 border-[5px] border-zinc-800 border-b-emerald-400 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🤖</div>
        </div>
        
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Żuberek AI pracuje</h2>
        
        <div className="h-10 flex items-center justify-center px-8 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full w-full max-w-sm">
           <p className="text-amber-400 font-mono text-[13px] font-semibold animate-pulse tracking-wide text-center">{LOADING_STEPS[loadingStep]}</p>
        </div>
        
        <p className="text-zinc-500 text-xs leading-relaxed max-w-[280px] mx-auto mt-6">
          Budowanie modeli statystycznych i analiza może potrwać <strong className="text-zinc-400">do 30 sekund</strong>. Prosimy nie odświeżać strony.
        </p>
      </div>
    );
  }

  // STANDARDOWY FORMULARZ
  return (
    <div className="min-h-[70vh] flex flex-col justify-center max-w-lg mx-auto animate-in fade-in duration-500">
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
            <option value="">Portfel główny (suma wszystkich portfeli)</option>
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
              <button key={opt.val} onClick={() => set('riskTolerance', opt.val)} className={`p-3 rounded-xl border text-left transition-all ${form.riskTolerance === opt.val ? 'border-amber-500/60 bg-amber-500/8 text-amber-500' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700'}`}>
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
          {holdings.length > 0 ? <>Wykryto <strong className="text-white">{holdings.length}</strong> aktywów (w tym gotówkę)</> : <>Szukam Twoich aktywów...</>}
          {isDataFetching && holdings.length > 0 && <span className="ml-2 text-amber-500/80 italic">(oczekiwanie na ceny z giełdy...)</span>}
        </span>
      </div>

      <button onClick={() => onSubmit(form)} disabled={!valid} className="relative w-full py-4 bg-amber-400 text-black font-bold text-[13px] uppercase tracking-widest rounded-xl hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 overflow-hidden">
        {isDataFetching ? 'Czekam na ceny z giełdy...' : 'Uruchom pełną analizę AI →'}
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
      <div className="h-[4px] bg-zinc-900 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function Report({ report, history }) {
  const [selectedTicker, setSelectedTicker] = useState(null);
  const sc = report.score;
  const scColor = sc >= 70 ? '#10b981' : sc >= 45 ? '#f59e0b' : '#ef4444';
  
  // Ponieważ nowo dodany wynik jest zawsze na indexie 0 (najświeższy), 
  // poprzedni skan znajduje się na indexie 1.
  const prevScore = history && history.length > 1 ? history[1].score : null;
  const diff = prevScore !== null ? sc - prevScore : null;

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
    <div className="space-y-8 pb-16 animate-in fade-in duration-700 slide-in-from-bottom-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          
          <div className="flex flex-col items-center md:items-start">
            
            {/* ZEGAR GAUGE CHART - IDEALNE PÓŁKOŁO (twarde piksele zamiast procentów) */}
            <div className="relative w-[240px] h-[120px] mx-auto md:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={[{value: sc}, {value: 100 - sc}]} 
                    cx="50%" 
                    cy="100%" 
                    startAngle={180} 
                    endAngle={0} 
                    innerRadius={80}  /* Zmiana na sztywną wartość */
                    outerRadius={110} /* Zmiana na sztywną wartość */
                    dataKey="value" 
                    stroke="none" 
                    isAnimationActive={true}
                  >
                    <Cell fill={scColor} />
                    <Cell fill="#27272a" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                <span className="text-6xl font-black leading-none tracking-tighter" style={{ color: scColor }}>{sc}</span>
              </div>
            </div>
            {/* KONIEC ZEGARA */}
            
            <div className="text-center md:text-left mt-4 w-full">
              <p className="text-zinc-400 text-[15px] font-medium">{sc >= 70 ? 'Solidny, bezpieczny portfel' : sc >= 45 ? 'Akceptowalne ryzyko, potencjał do poprawy' : 'Wysokie ryzyko, wymaga uwagi'}</p>
              
              <div className="mt-4">
                {diff !== null && diff !== 0 && (
                  <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm ${diff > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                    {diff > 0 ? '▲ Wzrost o' : '▼ Spadek o'} {Math.abs(diff)} pkt względem poprzedniego skanu
                  </div>
                )}
                {diff === 0 && history.length > 1 && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-800/50 text-zinc-400 border border-zinc-700">
                    ▶ Wynik bez zmian względem poprzedniego skanu
                  </div>
                )}
                {(history.length === 0 || history.length === 1) && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[11.5px] font-bold bg-amber-500/10 text-amber-500/90 border border-amber-500/20">
                    📌 To Twój pierwszy audyt. Zmiany punktowe pojawią się przy kolejnym skanowaniu.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-5">
                <span className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium text-[11px]">{report.pos_count} pozycji · {formatPLN(report.total_value)}</span>
                <span className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-500/90 font-medium text-[11px]">Lepszy niż {report.percentile}% portfeli</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
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
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium"><span className="w-2.5 h-2.5 rounded-sm bg-[#3f3f46]" />Gotówka / Bufor</span>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium"><span className="w-2.5 h-2.5 rounded-sm bg-[#dc2626]" />Stratna ({'<'} 0%)</span>
          </div>

          <div className="h-[450px] w-full py-4 bg-[#09090b] rounded-3xl border border-zinc-800/80 p-2 sm:p-4 mb-4 shadow-inner">
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
          <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setSelectedTicker(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-zinc-950 border-l border-zinc-800 p-8 shadow-2xl overflow-y-auto transform transition-transform translate-x-0">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-900">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">Analiza fundamentalna</p>
                <h4 className="text-white text-2xl font-bold tracking-tight">{selectedTicker}</h4>
              </div>
              <button onClick={() => setSelectedTicker(null)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 p-2 rounded-full">
                ✕
              </button>
            </div>
            
            <p className="text-[15px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {currentAnalysis || "Żuberek AI nie przygotował jeszcze analizy dla tego aktywa. Z reguły dla samej gotówki analiza nie jest generowana."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function SkanerAIPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const { signIn } = useAuth(); 
  
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelected] = useState('');
  const [report, setReport] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  
  const [error, setError] = useState(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false); 
  const abortRef = useRef(null);

  const [fsHoldings, setFsHoldings] = useState([]);
  const [cashBalance, setCashBalance] = useState(0); 
  const [history, setHistory] = useState([]);        
  const [pairsById, setPairsById] = useState({});
  const [quotes, setQuotes] = useState({});
  const [seriesByIdDaily, setSeriesByIdDaily] = useState({});
  const [isDataFetching, setIsDataFetching] = useState(false);
  const [globalTheses, setGlobalTheses] = useState({});

  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const interval = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 3500); 
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (user?.uid) {
      listPortfolios(user.uid).then(setPortfolios).catch(() => {});
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const off = listenAiAuditHistory(user.uid, selectedPortfolioId, (rows) => setHistory(rows || []));
    return () => off();
  }, [user?.uid, selectedPortfolioId]);

  useEffect(() => {
    if (!user?.uid) return;
    if (typeof listenGlobalTheses === "function") {
      const off = listenGlobalTheses(user.uid, (data) => setGlobalTheses(data || {}));
      return () => off();
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) { setCashBalance(0); return; }
    if (selectedPortfolioId === '') {
      const unsubs = [];
      const mapByPid = new Map();
      const emit = () => {
        let sum = 0;
        for (const bal of mapByPid.values()) sum += bal;
        setCashBalance(sum);
      };
      const attach = (pid) => {
        const off = listenCashBalance(user.uid, pid, (data) => {
          mapByPid.set(pid, data.balance || 0);
          emit();
        });
        if (typeof off === 'function') unsubs.push(off);
      };
      attach(null);
      portfolios.forEach(p => attach(p.id));
      return () => unsubs.forEach(u => u());
    } else {
      const unsub = listenCashBalance(user.uid, selectedPortfolioId, (data) => {
        setCashBalance(data.balance || 0);
      });
      return () => unsub?.();
    }
  }, [user?.uid, selectedPortfolioId, portfolios]);

  useEffect(() => {
    if (!user?.uid) { setFsHoldings([]); return; }
    if (selectedPortfolioId === '') {
      const unsubs = [];
      const mapByPid = new Map();
      const emit = () => {
        const merged = [];
        for (const [pid, rows] of mapByPid.entries()) {
          for (const r of (rows || [])) {
            merged.push({ ...r, id: `${pid || "MAIN"}__${r.id}` });
          }
        }
        setFsHoldings(merged);
      };
      const attach = (pid) => {
        const off = pid
          ? listenHoldings(user.uid, pid, (rows) => { mapByPid.set(pid, rows || []); emit(); })
          : listenHoldings(user.uid, null, (rows) => { mapByPid.set(null, rows || []); emit(); });
        if (typeof off === 'function') unsubs.push(off);
      };
      attach(null);
      portfolios.forEach(p => attach(p.id));
      return () => { unsubs.forEach(u => { try { u(); } catch {} }); };
    } else {
      const unsub = listenHoldings(user.uid, selectedPortfolioId, (rows) => setFsHoldings(Array.isArray(rows) ? rows : []));
      return () => unsub?.();
    }
  }, [user?.uid, selectedPortfolioId, portfolios]);

  useEffect(() => {
    if (!fsHoldings.length) { setPairsById({}); return; }
    let alive = true;
    (async () => {
      try {
        const entries = await Promise.all(fsHoldings.map(async (h) => {
          const base = h?.pair || { yahoo: h?.pair?.yahoo || h?.name };
          const pair = await resolvePair(base);
          return [h.id, pair];
        }));
        if (alive) setPairsById(Object.fromEntries(entries));
      } catch {
        if (alive) setPairsById({});
      }
    })();
    return () => { alive = false; };
  }, [fsHoldings]);

  const quotesSig = useMemo(() => fsHoldings.map(h => `${h.id}|${(pairsById[h.id]?.yahoo || h?.pair?.yahoo || h?.name || "").toUpperCase()}`).sort().join(";"), [fsHoldings, pairsById]);

  useEffect(() => {
    if (!user?.uid || !fsHoldings.length) { setQuotes({}); return; }
    const controller = new AbortController();
    (async () => {
      try {
        const list = fsHoldings.map(h => String(pairsById[h.id]?.yahoo || h?.pair?.yahoo || h?.name || "").toUpperCase()).filter(Boolean);
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
        const items = fsHoldings.map((h) => ({ id: h.id, shares: Number(h.shares) || 0, pair: pairsById[h.id] || (h.pair || { yahoo: h?.pair?.yahoo || h?.name }) }));
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

      if (!byKey.has(sym)) byKey.set(sym, { key: sym, name: h.name, lots: [], totalShares: 0, costSum: 0 });
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

      const globalThesisText = globalTheses[g.key] || "";
      const localTheses = g.lots.map(l => l.note).filter(Boolean);
      const combinedLocal = localTheses.length > 0 ? Array.from(new Set(localTheses)).join(" | ") : "";
      
      let finalThesis = globalThesisText;
      if (combinedLocal) {
        finalThesis = finalThesis ? `${finalThesis} (Notatki z transakcji: ${combinedLocal})` : combinedLocal;
      }

      out.push({
        ticker: g.key, name: g.name, shares: g.totalShares,
        valuePLN: safeValue, value: safeValue, profitPct: profitPct,
        thesis: finalThesis || null
      });
    }

    if (cashBalance > 0) {
      out.push({
        ticker: "CASH",
        name: "Wolna gotówka na rachunku",
        shares: cashBalance,
        valuePLN: cashBalance,
        value: cashBalance,
        profitPct: 0,
        thesis: "Kapitał ochronny, bufor bezpieczeństwa gotowy do zainwestowania w aktywa w czasie przecen."
      });
    }

    return out.sort((a, b) => b.valuePLN - a.valuePLN);
  }, [fsHoldings, pairsById, quotes, seriesByIdDaily, isDataFetching, globalTheses, cashBalance]);

  useEffect(() => {
    try {
      const savedReport = localStorage.getItem('finasfera_ai_report');
      if (savedReport) setReport(JSON.parse(savedReport));
    } catch(e) {}
  }, []);

  const clearReport = () => {
    setReport(null);
    setError(null);
    setIsQuotaExceeded(false);
    localStorage.removeItem('finasfera_ai_report');
  };

  const runAudit = async (onboardingData) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    setIsQuotaExceeded(false);
    localStorage.setItem('finasfera_fire_settings', JSON.stringify(onboardingData));

    try {
      const res = await fetch('/api/ai-audit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  abortRef.current.signal,
        body: JSON.stringify({
          user: { name: user?.displayName?.split(' ')[0] ?? 'Inwestor', accountType: 'IKE' },
          onboarding: onboardingData,
          holdings, 
        }),
      });
      
      if (res.status === 429) {
         setIsQuotaExceeded(true);
         setLoading(false);
         return;
      }
      
      if (!res.ok) throw new Error((await res.json()).error || 'Błąd serwera');
      const data = await res.json();
      
      await saveAiAuditScore(user.uid, selectedPortfolioId, data.score);

      setReport(data);
      localStorage.setItem('finasfera_ai_report', JSON.stringify(data));
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (e.message.toLowerCase().includes("quota") || e.message.includes("429") || e.message.toLowerCase().includes("rate limit")) {
          setIsQuotaExceeded(true);
      } else {
          setError(e.message);
      }
    } finally { setLoading(false); }
  };

  if (loadingAuth) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><span className="w-5 h-5 border-2 border-zinc-800 border-t-amber-400 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="max-w-3xl mx-auto px-6 py-12">
        
        {!user ? (
          <div className="mb-14 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3">
              Skaner AI — <span className="text-amber-400">raport demo</span>
            </h1>
            <p className="text-[15px] text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              To jest przykładowy raport pokazujący, jak w praktyce działa Żuberek AI. Dane są statyczne i służą wyłącznie celom podglądowym — Twój realny raport będzie w 100% dopasowany do Twojego portfela.
            </p>
            <div className="mt-8">
              <button onClick={signIn} className="px-8 py-3 bg-amber-400 hover:bg-white text-black font-black text-[13px] tracking-widest uppercase rounded-full shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all active:scale-95">
                Zaloguj się i wykonaj darmowy audyt
              </button>
            </div>
          </div>
        ) : (
          <header className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[15px] text-zinc-600 uppercase tracking-[0.2em] mb-1 font-bold">Finasfera Intelligence</p>
              <h1 className="text-4xl font-extrabold tracking-tight">Żuberek <span className="text-amber-400">AI</span></h1>
            </div>
            {(report || isQuotaExceeded) && (
              <button onClick={clearReport} className="px-5 py-2.5 bg-transparent border border-zinc-700 hover:bg-zinc-900 hover:border-zinc-500 text-zinc-300 hover:text-white text-[13px] font-bold rounded-xl transition-all flex items-center gap-2">
                ← Nowy skan
              </button>
            )}
          </header>
        )}

        {user && !loading && (
          <p className="text-xs text-zinc-600 mb-12 italic border-b border-zinc-900 pb-4">
            Moduł o charakterze ściśle edukacyjnym. Pamiętaj, że inwestowanie wiąże się z ryzykiem utraty kapitału. Nie doradzamy, co kupić lub sprzedać.
          </p>
        )}

        {error && <div className="mb-8 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-sm text-red-400">⚠ {error}</div>}

        {!user ? (
          <Report report={DEMO_REPORT} history={[]} />
        ) : isQuotaExceeded ? (
          <QuotaExceededMessage />
        ) : !report ? (
          <OnboardingForm 
            holdings={holdings} 
            portfolios={portfolios} 
            selectedPortfolioId={selectedPortfolioId} 
            onSelectPortfolio={setSelected} 
            onSubmit={runAudit} 
            loading={loading}
            isDataFetching={isDataFetching}
            loadingStep={loadingStep}
          />
        ) : (
          <>
            <Report report={report} history={history} />
            <div className="mt-16 pt-8 border-t border-zinc-900 text-center">
              <p className="text-[11px] text-zinc-600 leading-relaxed max-w-xl mx-auto">
                Analizy wygenerowane przez Żuberek AI bazują na ogólnodostępnych danych i modelach sztucznej inteligencji. Treści zawarte w tej sekcji mają na celu budowę świadomości inwestycyjnej i zarządzania ryzykiem. Żadna informacja zawarta w raporcie nie stanowi usługi doradztwa inwestycyjnego.
              </p>
            </div>
          </>
        )}
      </div>

      {!user && (
        <div className="max-w-3xl mx-auto px-6">
          <SeoLandingSection
            title="Jak działa Skaner AI portfela inwestycyjnego?"
            description="Żuberek AI to inteligentny asystent inwestycyjny..."
            features={[]} 
            faq={[]} 
            cta={{ label: "Zaloguj się i uruchom audyt AI →", href: "/moj-portfel" }}
          />
        </div>
      )}
    </div>
  );
}