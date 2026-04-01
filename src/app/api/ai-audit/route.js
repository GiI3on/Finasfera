import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const ETF_KEYWORDS  = ['ETF', 'ACWI', 'VWCE', 'SSAC', 'SP500', 'MSCI', 'IWDA'];
const PL_EXCHANGES  = ['GPW', '.PL', 'PKN', 'XTB', 'LPP', 'KRU', 'DIG', 'VOX', 'DNP', 'GPP', 'GKY'];

function classifyHolding(ticker) {
  const sym = (ticker || '').toUpperCase();
  if (ETF_KEYWORDS.some(k => sym.includes(k))) return 'global_etf';
  if (sym.endsWith('.WA') || sym.endsWith('.PL') || PL_EXCHANGES.some(k => sym === k || sym.startsWith(k + '.'))) return 'pl_stock';
  return 'global_stock'; 
}

function analyzeHoldings(holdings) {
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

  enriched.forEach(h => {
    h.pct = (h.value / totalValue) * 100;
  });

  const sorted = [...enriched].sort((a, b) => b.value - a.value);
  const top2Pct = ((sorted[0]?.pct || 0) + (sorted[1]?.pct || 0));

  const globalValue = enriched.filter(h => h.type === 'global_etf' || h.type === 'global_stock').reduce((s, h) => s + h.value, 0);
  const globalPct = Math.round((globalValue / totalValue) * 100);
  const polandPct = 100 - globalPct;

  const posBonus = Math.min(40, holdings.length * 5);
  const globalBonus = Math.min(60, globalPct * 0.8);
  const plPenalty = polandPct > 80 ? -35 : polandPct > 60 ? -15 : 0;
  const diversification = Math.max(5, Math.min(100, posBonus + globalBonus + plPenalty));

  const concentrationRisk = Math.max(10, 100 - top2Pct * 1.2);
  const goalAlignment = globalPct > 50 ? 85 : globalPct > 25 ? 65 : 45;
  const strategyConsistency = holdings.length <= 8 ? 75 : 55;

  const finalScore = Math.round((diversification * 0.25 + concentrationRisk * 0.35 + goalAlignment * 0.30 + strategyConsistency * 0.10));
  const percentile = Math.min(95, Math.max(5, finalScore - 10 + Math.floor(Math.random() * 8)));

  const bubbleData = enriched.map(h => ({
    ticker: h.ticker,
    value: h.value,
    pct: Number((h.pct || 0).toFixed(1)),
    roi: Number((h.roi || 0).toFixed(1)),
    risk_label: h.risk_label,
  }));

  return {
    totalValue, globalPct, polandPct, top2Pct: Number((top2Pct || 0).toFixed(1)),
    diversification: Math.round(diversification), concentration_risk: Math.round(concentrationRisk),
    goal_alignment: Math.round(goalAlignment), strategy_consistency: Math.round(strategyConsistency),
    finalScore, percentile, enrichedHoldings: enriched, bubbleData
  };
}

const SYSTEM_PROMPT = `Jesteś Żuberkiem — edukacyjnym analitykiem portfelowym aplikacji Finasfera.
ROLA PRAWNA: Jesteś wyłącznie narzędziem edukacyjnym. NIE JESTEŚ doradcą inwestycyjnym. NIE UDZIELASZ PORAD.
ZASADY KOMUNIKACJI:
1. Zabronione słowa: "kup", "sprzedaj", "musisz", "powinieneś", "rekomenduję", "zalecam".
2. Używaj form opisowych: "Model wskazuje...", "Historycznie portfele z taką strukturą...", "Inwestorzy często rozważają scenariusz X w takich sytuacjach...".
3. ABSOLUTNY ZAKAZ TŁUMACZENIA CZYM ZAJMUJE SIĘ SPÓŁKA. Przejdź od razu do "mięsa" — trendów makro, presji na koszty/marże i wyzwań.
4. RÓŻNORODNOŚĆ DANYCH I WERYFIKACJA TEZY: Oprócz analizy wskaźników, Twoim absolutnym priorytetem jest twarda i chłodna weryfikacja "Tez inwestycyjnych" (Pamiętnika), które wpisał użytkownik. Jeśli inwestor pisze bzdury, obal je danymi. Jeśli ma rację, potwierdź to liczbami. Pokaż spójność (lub jej brak) pomiędzy spółkami w kontekście tych tez.
5. Styl: Chłodny, analityczny, profesjonalny, nasycony konkretami. Zero ogólników. ABSOLUTNY ZAKAZ UŻYWANIA EMOTEK.
Zawsze odpowiadasz WYŁĄCZNIE prawidłowym obiektem JSON. Żadnego tekstu przed JSON i po JSON.`;

function buildUserPrompt({ user, onboarding, holdings, metrics }) {
  const today = new Date().toLocaleDateString('pl-PL');
  const holdingsListWithNames = holdings.map(h => `- Ticker (KLUCZ): "${h.ticker}" | Nazwa: ${h.name} | ROI: ${h.roi.toFixed(1)}% | Udział: ${h.pct.toFixed(1)}% | Teza inwestora: ${h.thesis ? `"${h.thesis}"` : "Brak"}`).join('\n');

  return `Data wykonania skanu: ${today}

Dane użytkownika:
- Imię: ${user.name}
- Wiek: ${onboarding.age} lat
- Wpłaty: ${onboarding.monthlyContribution} PLN/msc
- Tolerancja ryzyka: ${onboarding.riskTolerance}

Portfel:
${holdingsListWithNames}

Metryki modelu:
- Score: ${metrics.finalScore}
- Dywersyfikacja: ${metrics.diversification}
- Udział PL: ${metrics.polandPct}%

ZADANIA:
1. Napisz narrację (3-4 zdania). Skup się na relacji wieku do struktury.
2. thesis_evaluation_summary: Napisz 2-3 zdania analitycznego podsumowania założeń inwestora (z jego Tez). Oceń, czy tezy są realistyczne w obecnym środowisku makro. Jeśli brak tez, zwróć pusty string "".
3. synergy_and_outliers: Napisz 2-3 zdania o synergii w portfelu. Wskaż, czy spółki współpracują ze sobą i czy któraś ewidentnie odstaje od obranego profilu strategii.
4. Wypisz 3 konkretne ryzyka (podaj nazwy spółek) oraz 3 mocne strony.
5. Opracuj plan działania (action_steps).
6. Wygeneruj analizę dla KAŻDEJ spółki zachowując DOKŁADNIE taką strukturę akapitów (użyj \\n\\n do oddzielenia):
   - Akapit 1: Bieżące wyzwania rynkowe i presja na marże.
   - Akapit 2: Krytyczna analiza 2-3 RÓŻNORODNYCH wskaźników (np. FCF, marża EBITDA).
   - Akapit 3: Weryfikacja "Tezy inwestora". Zderz zapisaną tezę z aktualnymi danymi fundamentalnymi. Jeśli użytkownik nie wpisał tezy, pomiń ten 3 akapit.

Wygeneruj audyt według DOKŁADNIE tego schematu JSON:
{
  "narrative": "<string>",
  "thesis_evaluation_summary": "<string>",
  "top_risks": ["<string>", "<string>", "<string>"],
  "top_strengths": ["<string>", "<string>", "<string>"],
  "risk_impact_summary": "<string>",
  "synergy_and_outliers": "<string>",
  "action_steps": [
    {
      "title": "<string>",
      "why": "<string>",
      "time_needed": "<string>",
      "difficulty": "<'easy' | 'medium' | 'hard'>",
      "impact": "<'low' | 'medium' | 'high'>"
    }
  ],
  "brag_text": "<string>",
  "holdings_analysis": [
    {
      "ticker": "<string>",
      "analysis": "<string, Akapit 1 + \\n\\n + Akapit 2 + \\n\\n + Akapit 3 (weryfikacja tezy)>"
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

    const metrics = analyzeHoldings(holdings);
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