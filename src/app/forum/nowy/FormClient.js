// src/app/forum/nowy/FormClient.js
"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";

export default function NewThreadForm() {
  const { user } =
    (typeof useAuth === "function" ? useAuth() : { user: null }) || { user: null };
  const params = useSearchParams();
  const router = useRouter();
  const isPromo = params?.get("promo") === "1";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [sponsoredBy, setSponsoredBy] = useState("");
  const [promoUrl, setPromoUrl] = useState("");
  const [promotedUntil, setPromotedUntil] = useState("");
  const [promotionType, setPromotionType] = useState("sidebar");
  const [billing, setBilling] = useState("flat");
  const [budgetPLN, setBudgetPLN] = useState("");

  const [busy, setBusy] = useState(false);
  const canSubmit = title.trim().length >= 4 && body.trim().length >= 10;

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    const uid = user?.uid || user?.id || null;
    const name = user?.displayName || user?.email || user?.name || "Anon";

    setBusy(true);
    try {
      if (isPromo) {
        const res = await fetch("/forum/promo/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            sponsoredBy: sponsoredBy.trim() || null,
            promoUrl: promoUrl.trim() || null,
            promotedUntil: promotedUntil ? new Date(promotedUntil).toISOString() : null,
            promotionType,
            billing,
            budgetPLN: budgetPLN ? Number(budgetPLN) : null,
            actorUid: uid,
            actorName: name,
          }),
        });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({}));
          throw new Error(error || "Nie udało się utworzyć promki");
        }
        const data = await res.json();
        router.push(`/forum/${data.id}`);
        return;
      }

      const res = await fetch("/forum/threads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), uid, name }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || "Nie udało się utworzyć wątku");
      }
      const data = await res.json();
      router.push(`/forum/${data.id}`);
    } catch (e) {
      alert(e?.message || "Błąd");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24">
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/50">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">
            {isPromo ? "Nowy wpis sponsorowany" : "Nowy wątek"}
          </h1>
          <button type="button" onClick={() => router.back()} className="btn-ghost">
            Anuluj
          </button>
        </div>
      </div>

      <div className="card mb-5">
        <div className="card-inner">
          <p className="text-sm text-zinc-400">
            {isPromo
              ? "Wpis zostanie wyraźnie oznaczony jako sponsorowany."
              : "Zadaj pytanie lub rozpocznij dyskusję."}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <section className="card">
          <div className="card-inner space-y-4">
            <div>
              <label className="block text-sm mb-1">Tytuł</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="Krótki, konkretny tytuł…"
              />
              <div className="mt-1 text-[11px] text-zinc-500">Minimum 4 znaki.</div>
            </div>

            <div>
              <label className="block text-sm mb-1">Treść</label>
              <textarea
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="input min-h-[160px]"
                placeholder="Opisz temat lub ofertę…"
              />
              <div className="mt-1 text-[11px] text-zinc-500">
                Minimum 10 znaków. Możesz wkleić linki/formatować akapity.
              </div>
            </div>
          </div>
        </section>

        {isPromo && (
          <section className="rounded-2xl border border-amber-400/40 bg-amber-500/5">
            <div className="card-inner space-y-4">
              <div className="text-sm font-medium text-amber-200">Ustawienia sponsorowane</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Sponsor</label>
                  <input
                    value={sponsoredBy}
                    onChange={(e) => setSponsoredBy(e.target.value)}
                    className="input"
                    placeholder="Nazwa sponsora (widoczne w UI)"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Link docelowy</label>
                  <input
                    value={promoUrl}
                    onChange={(e) => setPromoUrl(e.target.value)}
                    className="input"
                    placeholder="https://…"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Ważne do</label>
                  <input
                    type="date"
                    value={promotedUntil}
                    onChange={(e) => setPromotedUntil(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Rodzaj ekspozycji</label>
                  <select
                    value={promotionType}
                    onChange={(e) => setPromotionType(e.target.value)}
                    className="input"
                  >
                    <option value="sidebar">Sidebar</option>
                    <option value="post">Post w feedzie</option>
                    <option value="spotlight">Spotlight (duży)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Rozliczenie</label>
                  <select
                    value={billing}
                    onChange={(e) => setBilling(e.target.value)}
                    className="input"
                  >
                    <option value="flat">Kwota stała (MVP)</option>
                    <option value="cpm">CPM</option>
                    <option value="cpc">CPC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Budżet (PLN)</label>
                  <input
                    type="number"
                    min="0"
                    value={budgetPLN}
                    onChange={(e) => setBudgetPLN(e.target.value)}
                    className="input"
                    placeholder="np. 500"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="btn-primary h-10 px-5 disabled:opacity-60"
          >
            {busy
              ? "Zapisywanie…"
              : isPromo
              ? "Utwórz wpis sponsorowany"
              : "Utwórz wątek"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-ghost">
            Anuluj
          </button>
        </div>
      </form>
    </main>
  );
}
