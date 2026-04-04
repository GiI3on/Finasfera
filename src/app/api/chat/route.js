import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Dodajemy czas dla Vercela, żeby nie zabijał funkcji po 10 sekundach
export const maxDuration = 60; 

export async function POST(req) {
  try {
    const { message, portfolioName, holdings, currentDate, mode } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash"];
    
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const holdingsSummary = holdings?.length > 0 
          ? holdings.map(h => `${h.name}: ${h.shares}szt`).join(', ')
          : "Brak pozycji.";

        const systemInstruction = mode === 'news' 
          ? `Jesteś Ekspertem Finasfera. Dzisiejsza data: ${currentDate}. 
             ZADANIE: Podaj SZYBKI BRIEFING rynkowy dla portfela (max 80 słów).
             Użyj 3 konkretnych punktów dlaczego te spółki dziś rosną/spadają. 
             Nie używaj bloków markdown (backticks). Pisz bezpośrednio tekst.`
          : `Jesteś Ekspertem Finasfera. Dzisiejsza data: ${currentDate}.
             ZADANIE: Pełny Audyt (max 120 słów). 
             Struktura: ### SKŁAD (Tabela), ### RYZYKO (3 punkty), ### REKOMENDACJA (1 zdanie).
             Nie używaj bloków markdown (backticks).`;

        const prompt = `
          DATA: ${currentDate} | PORTFEL: ${portfolioName}
          SKŁAD: ${holdingsSummary}
          
          POLECENIE: ${systemInstruction}
          PYTANIE UŻYTKOWNIKA: ${message}
          
          STYL: Agresywnie konkretny, techniczny, zero zbędnych wstępów.
        `;

        const result = await model.generateContent(prompt);
        return Response.json({ text: result.response.text() });
      } catch (err) { 
        // Wypisujemy błąd w logach Vercela, żeby wiedzieć co się zepsuło
        console.error(`[API Chat] Błąd modelu ${modelName}:`, err.message);
        continue; 
      }
    }
    
    // 2. TUTEJ BYŁ BŁĄD! 
    // Jeśli pętla przetestowała oba modele i żaden nie zadziałał, 
    // musimy grzecznie zwrócić błąd do przeglądarki!
    return Response.json({ text: "Wystąpił problem z kluczem API lub modele są obecnie przeciążone." }, { status: 503 });

  } catch (error) {
    return Response.json({ text: "Błąd połączenia z serwerem." }, { status: 500 });
  }
}