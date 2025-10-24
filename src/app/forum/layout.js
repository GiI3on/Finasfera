// src/app/forum/layout.js
export const metadata = {
  title: "Forum • Giełda",
};

export default function ForumLayout({ children }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      {/* Pasek sekcji forum (lekki, nie koliduje z lokalnymi topbarami poszczególnych stron) */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/50">
        <div className="mx-auto max-w-6xl px-4 py-2.5 text-sm text-zinc-400">
          Strefa społeczności — dyskusje, pytania, analizy
        </div>
      </div>

      {/* Właściwa treść podstron forum */}
      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}
