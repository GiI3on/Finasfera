// src/app/api/fx/route.js

export async function GET() {
  try {
    const today = new Date();
    const start = new Date();
    start.setFullYear(today.getFullYear() - 10); // ~10 lat

    const fmt = (d) => d.toISOString().slice(0, 10);

    async function fetchNBP(code) {
      // tabela A, średni kurs
      const url = `https://api.nbp.pl/api/exchangerates/rates/A/${code}/${fmt(
        start
      )}/${fmt(today)}/?format=json`;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json();
      const map = {};
      (j?.rates || []).forEach((r) => {
        map[r.effectiveDate] = r.mid;
      });
      return map;
    }

    const [USD, EUR] = await Promise.all([fetchNBP("USD"), fetchNBP("EUR")]);
    return Response.json({ USD, EUR });
  } catch (e) {
    console.error("FX error:", e);
    return Response.json({ USD: {}, EUR: {} }, { status: 200 });
  }
}
