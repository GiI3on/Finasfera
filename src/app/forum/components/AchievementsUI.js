// src/app/forum/components/AchievementsUI.js

export function rankStyle(rank = "") {
  if (rank.includes("Mentor"))  return "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/40";
  if (rank.includes("Ekspert")) return "bg-yellow-500/20 text-yellow-200 border-yellow-500/40";
  if (rank.includes("Doradca")) return "bg-emerald-500/15 text-emerald-200 border-emerald-500/40";
  if (rank.includes("Aktywny")) return "bg-sky-500/15 text-sky-200 border-sky-500/40";
  return "bg-zinc-700/30 text-zinc-200 border-zinc-600/40";
}

export function AchievementBadge({ label, size = "sm" }) {
  const cls = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center rounded-md border bg-zinc-800/60 text-zinc-100 ${cls}`}
      title={label}
    >
      {label}
    </span>
  );
}

export function StreakFlame({ days = 0 }) {
  if (!days || days < 2) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-orange-500/40 bg-orange-500/15 px-2 py-0.5 text-[11px] text-orange-200"
      title={`Seria: ${days} dni`}
    >
      🔥 {days}
    </span>
  );
}

/** Pasek pod nazwą autora: ranga + 3 najlepsze odznaki + streak */
export function MiniProfileBar({ rank, badges = [], streak = 0 }) {
  const top = badges.slice(0, 3);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${rankStyle(rank)}`}>
        {rank || "Użytkownik"}
      </span>
      {top.map((b) => (
        <AchievementBadge key={b} label={b} />
      ))}
      <StreakFlame days={streak} />
    </div>
  );
}
