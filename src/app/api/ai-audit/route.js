import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ROZSZERZONA LISTA do wyłapywania polskich spółek, by nie udawały "globalnych"
const ETF_KEYWORDS  = ['ETF', 'ACWI', 'VWCE', 'SSAC', 'SP500', 'MSCI', 'IWDA', 'S&P', 'ISHARES', 'VANGUARD'];
const PL_EXCHANGES  = ['GPW', '.PL', '.WA'];
const PL_TICKERS    = ['PKN', 'PKO', 'PZU', 'DNP', 'LPP', 'ALE', 'BHW', 'SPL', 'KGH', 'KRU', 'XTB', 'CDR', 'PEO', 'TPE', 'JSW', 'CPS', 'ALR', 'ACP', 'CCC', 'MBK', 'MIL', 'DOM', 'XTP', 'TEN', 'GPP', 'BOS'];

function classifyHolding(ticker) {
  const sym = (ticker || '').toUpperCase();
  if (ETF_KEYWORDS.some(k => sym.includes(k))) return 'global_etf';
  if (PL_EXCHANGES.some(k => sym.endsWith(k) || sym.includes(k)) || PL_TICKERS.includes(sym.split('.')[0])) return 'pl_stock';
  return 'global_stock'; 
}

function analyzeHoldings(holdings, onboarding) {
  if (!holdings?.length) return null;

  const aggregated = {};
  holdings.forEach(h => {
    const ticker = (h.ticker || h.name || 'Nieznana').toUpperCase();
    const passedName = h.name || ticker; 
    
    const passedValue = Number(h.valuePLN) || Number(h.value) || Number(h.currentValue) || 0;
    const passedRoi = Number(h.profitPct) || Number(h.returnPct) || Number(h.roi) || Number(h.totalReturnPct) || 0;
    const reconstructedBuyValue = passedRoi === -100 ? passedValue : (passedValue / (1 + (passedRoi / 100)));

    if (!aggregated[ticker]) {
      aggregated[ticker] = { ticker, name: passedName, value: 0, buyValue: 0, type: classifyHolding(ticker), thesis: h.thesis || null };
    } else {
      if (h.thesis && (!aggregated[ticker].thesis || !aggregated[ticker].thesis.includes(h.thesis))) {
        aggregated[ticker].thesis = aggregated[ticker].thesis ? aggregated[ticker].thesis + " | " + h.thesis : h.thesis;
      }
    }
    
    aggregated[ticker].value += passedValue;
    aggregated[ticker].buyValue += reconstructedBuyValue;
  });

  const enriched = Object.values(aggregated).map(h => {
    const roi = h.buyValue > 0 ? ((h.value - h.buyValue) / h.buyValue) * 100 : 0;
    let risk_label = 'medium';
    if (roi > 10) risk_label = 'low'; 
    else if (roi < -10) risk_label = 'high';
    return { ...h, roi, risk_label };
  });

  const totalValue = enriched.reduce((sum, h) => sum + h.value, 0);
  if (totalValue === 0) return null; 

  enriched.forEach(h => { h.pct = (h.value / totalValue) * 100; });
  const sorted = [...enriched].sort((a, b) => b.value - a.value);
  
  // STATYSTYKI PODSTAWOWE
  const etfPct = enriched.filter(h => h.type === 'global_etf').reduce((s, h) => s + h.pct, 0);
  const globalStockPct = enriched.filter(h => h.type === 'global_stock').reduce((s, h) => s + h.pct, 0);
  const plPct = enriched.filter(h => h.type === 'pl_stock').reduce((s, h) => s + h.pct, 0);
  const globalPct = etfPct + globalStockPct;

  // 1. DYWERSYFIKACJA (25%)
  let divScore = 50; 
  divScore += (etfPct * 0.4); // Potężna premia za ETFy
  divScore += (globalStockPct * 0.15); // Premia za zagranicę
  if (plPct > 50) divScore -= (plPct - 50) * 0.6; // Kara za over-weight PL
  divScore += Math.min(15, holdings.length * 2); // Niewielka premia za ilość pozycji
  const diversification = Math.max(5, Math.min(100, divScore));

  // 2. RYZYKO KONCENTRACJI (35%)
  const top1 = sorted[0] || {pct: 0, type: 'none'};
  const top2 = sorted[1] || {pct: 0, type: 'none'};
  let concPenalty = 0;
  // Jeśli Top pozycje to ETF, kara jest minimalna (bo ETF ma dywersyfikację w środku). Akcje obrywają mocniej.
  concPenalty += top1.type === 'global_etf' ? top1.pct * 0.3 : top1.pct * 1.2;
  concPenalty += top2.type === 'global_etf' ? top2.pct * 0.3 : top2.pct * 1.2;
  const concentrationRisk = Math.max(10, Math.min(100, 100 - concPenalty + 15));

  // 3. DOPASOWANIE DO CELÓW (30%)
  const portfolioAggressiveness = (100 - etfPct) * 0.5 + (top1.pct) * 0.5; // 0-100
  let alignmentScore = 50;
  const tol = onboarding?.riskTolerance || 'medium';

  if (tol === 'high') {
    alignmentScore = portfolioAggressiveness > 60 ? 95 : 70; // Agresywny portfel = dobrze
  } else if (tol === 'low') {
    alignmentScore = portfolioAggressiveness > 60 ? 25 : 90; // Agresywny portfel dla ostrożnego = tragedia
  } else {
    alignmentScore = (portfolioAggressiveness > 75 || portfolioAggressiveness < 25) ? 50 : 85;
  }
  const goalAlignment = Math.max(10, Math.min(100, alignmentScore));

  // 4. SPÓJNOŚĆ STRATEGII (10%) - Rola Pamiętnika
  let thesisCount = 0;
  let fomoPenalty = 0;
  enriched.forEach(h => {
    if (h.thesis && h.thesis.trim().length > 3) thesisCount++;
    else if (h.pct < 5) fomoPenalty += 12; // Surowa kara za "śmieciowe" pozycje (ogony) bez tezy
  });
  const thesisCoverage = holdings.length > 0 ? (thesisCount / holdings.length) * 100 : 0;
  const strategyConsistency = Math.max(10, Math.min(100, 40 + (thesisCoverage * 0.6) - fomoPenalty));

  // FINALNY WYNIK
  const finalScore = Math.round((diversification * 0.25 + concentrationRisk * 0.35 + goalAlignment * 0.30 + strategyConsistency * 0.10));
  const percentile = Math.min(95, Math.max(5, finalScore - 12 + Math.floor(Math.random() * 8)));

  const bubbleData = enriched.map(h => ({
    ticker: h.ticker, value: h.value, pct: Number((h.pct || 0).toFixed(1)), roi: Number((h.roi || 0).toFixed(1)), risk_label: h.risk_label,
  }));

  return {
    totalValue, globalPct: Math.round(globalPct), polandPct: Math.round(plPct), 
    top2Pct: Number(((top1.pct) + (top2.pct)).toFixed(1)),
    diversification: Math.round(diversification), concentration_risk: Math.round(concentrationRisk),
    goal_alignment: Math.round(goalAlignment), strategy_consistency: Math.round(strategyConsistency),
    finalScore, percentile, enrichedHoldings: enriched, bubbleData
  };
}

const SYSTEM_PROMPT = `Jesteś Żuberkiem — edukacyjnym analitykiem portfelowym aplikacji Finasfera.
ROLA PRAWNA: Jesteś wyłącznie narzędziem edukacyjnym. NIE JESTEŚ doradcą inwestycyjnym. NIE UDZIELASZ PORAD INWESTYCYJNYCH.

ZASADY KOMUNIKACJI (KRYTYCZNE):
1. ZAKAZANE SŁOWA: "kup", "sprzedaj", "musisz", "powinieneś", "rekomenduję", "zalecam", "dokup".
2. UNIKAJ TRUIZMÓW: Kategoryczny zakaz pisania frazesów typu "Nvidia rośnie przez boom na AI". Szukaj mniej oczywistych wyzwań (np. wyceny wskaźnikowe, marże, prawo).
3. ABSOLUTNY ZAKAZ tłumaczenia czym zajmuje się spółka. Przejdź od razu do twardych danych i trendów.
4. RYZYKA: Każde wymienione ryzyko w "top_risks" MUSI zaczynać się od konkretnego tickera/nazwy spółki, której dotyczy (np. "PKN.WA stanowi 18%...").
5. WERYFIKACJA TEZY: Oprócz wskaźników, priorytetem jest weryfikacja "Tez inwestycyjnych" z Pamiętnika użytkownika. Zderz je z rzeczywistością makro.
6. SCENARIUSZE ZAMIAST NAKAZÓW: W sekcji "action_steps" nigdy nie pisz co użytkownik ma zrobić. Pisz jakie są OPOCJE. Używaj formatu: "Obserwacja rynkowa -> Scenariusz A (utrzymanie struktury) oznacza X -> Scenariusz B (dywersyfikacja) oznacza Y".
7. CUDZYSŁÓW: Twoja główna ocena ("narrative") MUSI zawsze zaczynać się i kończyć znakiem cudzysłowu.
8. Styl: Chłodny, analityczny, bez emotikonów. Zawsze odpowiadasz w formacie JSON.`;

function buildUserPrompt({ user, onboarding, holdings, metrics }) {
  const today = new Date().toLocaleDateString('pl-PL');
  const holdingsListWithNames = holdings.map(h => `- Ticker: "${h.ticker}" | Nazwa: ${h.name} | ROI: ${h.roi.toFixed(1)}% | Udział: ${h.pct.toFixed(1)}% | Teza inwestora: ${h.thesis ? `"${h.thesis}"` : "Brak"}`).join('\n');

  return `Data wykonania skanu: ${today}

Dane użytkownika:
- Imię: ${user.name}
- Wiek: ${onboarding.age} lat
- Wpłaty: ${onboarding.monthlyContribution} PLN/msc
- Tolerancja ryzyka: ${onboarding.riskTolerance} (Niska/Średnia/Wysoka)

Portfel:
${holdingsListWithNames}

Metryki wyliczone przez silnik matematyczny:
- Score: ${metrics.finalScore}/100
- Dywersyfikacja: ${metrics.diversification}/100
- Ryzyko koncentracji: ${metrics.concentration_risk}/100
- Spójność z celem: ${metrics.goal_alignment}/100
- Udział PL: ${metrics.polandPct}% | Udział Zagranicy: ${metrics.globalPct}%

ZADANIA DLA JSON:
1. narrative: Napisz 3-4 zdania podsumowania. ZAWSZE otwórz i zamknij cudzysłowem ("..."). Odnieś się do tolerancji ryzyka użytkownika vs to co faktycznie zbudował.
2. thesis_evaluation_summary: 2-3 zdania podsumowania Pamiętnika (tez) inwestora. Czy tezy mają sens w obecnym makro? Jeśli brak tez: skrytykuj impulsywne zakupy.
3. synergy_and_outliers: 2-3 zdania o synergii. Która spółka łamie koncepcję portfela i odstaje statystycznie?
4. top_risks: Wypisz 3 konkretne ryzyka. KAŻDE MUSI zawierać nazwę konkretnej spółki z portfela.
5. top_strengths: Wypisz 3 mocne strony obecnej alokacji.
6. action_steps: Zamiast "Poleceń", opisz "Obszary analityczne". (Zobacz schemat JSON w sekcji "why" poniżej - ZAWSZE używaj Scenariuszy A i B).
7. holdings_analysis: Analiza dla KAŻDEJ spółki zachowująca podział na 3 akapity (oddzielone \\n\\n):
   - Akapit 1: Bieżące wyzwania/ryzyka makro.
   - Akapit 2: Krytyczna ocena wyceny rynkowej/wskaźników.
   - Akapit 3: Ostra weryfikacja Tezy użytkownika. Jeśli jej brak - pomiń akapit 3.

WYMAGANY SCHEMAT JSON:
{
  "narrative": "\"<string>\"",
  "thesis_evaluation_summary": "<string>",
  "top_risks": ["<string (musi zawierać ticker)>", "<string>", "<string>"],
  "top_strengths": ["<string>", "<string>", "<string>"],
  "risk_impact_summary": "<string>",
  "synergy_and_outliers": "<string>",
  "action_steps": [
    {
      "title": "<string np. Obszar: Zależność od sektora Tech>",
      "why": "<string np. Scenariusz A (utrzymanie): zwiększa to zyski przy hossie, ale naraża na... Scenariusz B (dywersyfikacja): zabezpiecza kapitał kosztem...>",
      "time_needed": "<string>",
      "difficulty": "<'easy' | 'medium' | 'hard'>",
      "impact": "<'low' | 'medium' | 'high'>"
    }
  ],
  "holdings_analysis": [
    {
      "ticker": "<string>",
      "analysis": "<string, Akapit 1 + \\n\\n + Akapit 2 + \\n\\n + Akapit 3>"
    }
  ]
}`;
}

export async function POST(req) {
  try {
    const { user, holdings, onboarding } = await req.json();
    if (!holdings?.length) return NextResponse.json({ error: 'Brak danych portfela.' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Brak klucza API w konfiguracji serwera' }, { status: 500 });

    // Zmienione wywołanie, żeby przekazać onboarding (dla wieku i ryzyka)
    const metrics = analyzeHoldings(holdings, onboarding);
    if (!metrics) return NextResponse.json({ error: 'Nie można przeanalizować pustego portfela.' }, { status: 400 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: SYSTEM_PROMPT });
    const userPromptText = buildUserPrompt({ user: { name: user?.name ?? 'Inwestor', account_type: user?.account_type ?? 'IKE' }, onboarding, holdings: metrics.enrichedHoldings, metrics });

    const result = await model.generateContent(userPromptText);
    const rawText = result.response.text();

    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    parsed.score = metrics.finalScore;
    parsed.percentile = metrics.percentile;
    parsed.score_breakdown = { diversification: metrics.diversification, concentration_risk: metrics.concentration_risk, goal_alignment: metrics.goal_alignment, strategy_consistency: metrics.strategy_consistency };
    parsed.total_value = metrics.totalValue;
    parsed.pos_count = metrics.enrichedHoldings.length;
    parsed.poland_pct = metrics.polandPct;
    parsed.global_pct = metrics.globalPct;
    parsed.bubble_data = metrics.bubbleData;

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('[ai-audit] Error:', error.message);
    const isJsonError = error instanceof SyntaxError;
    return NextResponse.json({ error: isJsonError ? 'Model zwrócił nieprawidłowy format — spróbuj ponownie' : error.message }, { status: 500 });
  }
}