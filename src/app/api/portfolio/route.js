// src/app/api/portfolio/route.js

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const scope = (searchParams.get("scope") || "all").toLowerCase();

  // MOCKOWANE DANE — zastąpisz to potem realnym odczytem z Firestore
  const mockValues = {
    all: 520000,      // np. suma wszystkich portfeli użytkownika
    current: 345000,  // np. aktualnie aktywny portfel
  };

  const value = Number.isFinite(mockValues[scope])
    ? mockValues[scope]
    : mockValues.all;

  return new Response(
    JSON.stringify({
      value,
      currency: "PLN",
      scope,
      updatedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    }
  );
}
