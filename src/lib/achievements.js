export const RANKS = [
  { name: "Nowy inwestor", min: 0 },
  { name: "Aktywny członek", min: 10 },
  { name: "Doradca", min: 50 },
  { name: "Ekspert finansowy", min: 100 },
  { name: "Mentor", min: 200 },
];

export const BADGES = [
  { id: "first_post",  label: "Pierwszy post", when: (s) => s.posts >= 1 },
  { id: "reacts_10",   label: "10 reakcji",   when: (s) => s.reactionsReceived >= 10 },
  { id: "comments_10", label: "Pomocny",      when: (s) => s.commentsGiven >= 10 },
  { id: "etf_analyst", label: "ETF Analityk", when: (s) => (s.tags?.ETF || 0) >= 10 },
  { id: "streak_7",    label: "Seria 7 dni",  when: (_s, u) => (u.dayStreak || 0) >= 7 },
];

export function computeRank(stats) {
  const p = stats?.posts || 0;
  return [...RANKS].reverse().find(r => p >= r.min)?.name || RANKS[0].name;
}

export function computeBadges(stats, userDoc) {
  const have = new Set(userDoc?.badges || []);
  BADGES.forEach(b => { if (b.when(stats, userDoc)) have.add(b.label); });
  return Array.from(have);
}
