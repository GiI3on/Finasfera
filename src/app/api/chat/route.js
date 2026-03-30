import { GoogleGenerativeAI } from "@google/generative-ai";

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

        // Dobór instrukcji w zależności od trybu
      // ... wewnątrz POST ...
const systemInstruction = mode === 'news' 
  ? `Jesteś Ekspertem Finasfera. Dzisiejsza data: ${currentDate}. 
     ZADANIE: Podaj SZYBKI BRIEFING rynkowy dla portfela (max 80 słów).
     Użyj 3 konkretnych punktów dlaczego te spółki dziś rosną/spadają. 
     Nie używaj bloków markdown (backticks). Pisz bezpośrednio tekst.`
  : `Jesteś Ekspertem Finasfera. Dzisiejsza data: ${currentDate}.
     ZADANIE: Pełny Audyt (max 120 słów). 
     Struktura: ### SKŁAD (Tabela), ### RYZYKO (3 punkty), ### REKOMENDACJA (1 zdanie).
     Nie używaj bloków markdown (backticks).`;
// ...

        const prompt = `
          DATA: ${currentDate} | PORTFEL: ${portfolioName}
          SKŁAD: ${holdingsSummary}
          
          POLECENIE: ${systemInstruction}
          PYTANIE UŻYTKOWNIKA: ${message}
          
          STYL: Agresywnie konkretny, techniczny, zero zbędnych wstępów.
        `;

        const result = await model.generateContent(prompt);
        return Response.json({ text: result.response.text() });
      } catch (err) { continue; }
    }
  } catch (error) {
    return Response.json({ text: "Błąd połączenia." }, { status: 500 });
  }
}