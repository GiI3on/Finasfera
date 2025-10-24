// Prosty magazyn w pamięci (dev). Później można podmienić na Firestore.
let _seeded = false;

/** twórz slug z tytułu */
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** minimalny model wątku (wewnętrzny) */
function makeThread(partial) {
  const now = new Date().toISOString();
  return {
    id: partial.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)),
    slug: partial.slug || slugify(partial.title || "watek"),
    title: partial.title || "Bez tytułu",
    content: partial.content || "",
    tags: Array.isArray(partial.tags) ? partial.tags : [],
    authorId: partial.authorId || "system",
    authorName: partial.authorName || "Finasfera",
    authorAvatar: partial.authorAvatar || null,
    status: partial.status || "published", // "pending" | "published" | "rejected"
    featuredTier: Number.isFinite(partial.featuredTier) ? partial.featuredTier : 0, // 0 zwykły, 1 boczny, 2 top
    metrics: { views: 0, likes: 0, commentsCount: 0, ...(partial.metrics || {}) },
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
    lastActivityAt: partial.lastActivityAt || now,
    // (opcjonalnie) przypięty – równoważne z TOP
    isPinned: !!partial.isPinned || partial.featuredTier === 2,
  };
}

/** w pamięci */
const DB = {
  threads: [],
  replies: /** { [threadId]: Array<{id, author, body, createdAt}> } */ ({}),
};

function makeExcerpt(txt = "", max = 180) {
  const clean = String(txt).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1) + "…";
}

function ensureSeed() {
  if (_seeded) return;
  _seeded = true;

  // Jeden wpis powitalny (published + featured TOP)
  const welcome = makeThread({
    id: "powitanie",
    slug: "powitanie",
    title: "Witamy na forum Finasfery 👋",
    content:
      "Cześć! To jest testowy wpis powitalny. W tym miejscu będziemy dzielić się aktualnościami, poradami i dyskusjami o FIRE.\n\n" +
      "👉 Z czasem każdy użytkownik będzie mógł dodawać własne wątki (po moderacji).\n\nMiłego korzystania! 💛",
    tags: ["Ogłoszenie"],
    featuredTier: 2, // pokaże się w sekcji TOP (i traktujemy jako przypięty)
    status: "published",
    authorName: "Zespół Finasfera",
    metrics: { likes: 0, commentsCount: 2 },
  });

  DB.threads = [welcome];

  // kilka przykładowych odpowiedzi
  DB.replies[welcome.id] = [
    {
      id: "r1",
      author: "Patryk",
      body: "Super, dzięki za stworzenie tego miejsca!",
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: "r2",
      author: "Anna",
      body: "Cześć wszystkim — trzymam kciuki za Wasze cele FIRE! 🔥",
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  ];
}
ensureSeed();

/* =========================
   POMOCNICZE (wewnętrzne)
   ========================= */

function findThread(keyRaw) {
  if (!keyRaw) return null;
  const key = String(keyRaw).trim().toLowerCase();
  return (
    DB.threads.find((t) => t.id.toLowerCase() === key) ||
    DB.threads.find((t) => (t.slug || "").toLowerCase() === key) ||
    null
  );
}

function normalizeRow(t) {
  // Ujednolicamy nazwy pól pod UI listy i widoku wątku
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    author: t.authorName,
    tag: t.tags?.[0] || "",
    createdAt: t.createdAt,
    likes: Number(t.metrics?.likes || 0),
    comments: Number(t.metrics?.commentsCount || 0),
    isPinned: !!t.isPinned || t.featuredTier === 2,
    isFeatured: t.featuredTier > 0,
    excerpt: makeExcerpt(t.content),
    body: t.content, // dla widoku wątku
  };
}

/* =========================
   API dla komponentów (publiczne)
   ========================= */

/** listuj opublikowane wątki + sekcje polecane */
export function listThreads({ q = "" } = {}) {
  const query = String(q || "").trim().toLowerCase();

  const published = DB.threads.filter((t) => t.status === "published");

  const filtered = query
    ? published.filter((t) => {
        const hay = (t.title + " " + (t.authorName || "") + " " + (t.tags || []).join(" ")).toLowerCase();
        return hay.includes(query);
      })
    : published;

  // Sekcje polecane (TOP – featuredTier 2, SIDE – featuredTier 1)
  const featuredTop = filtered
    .filter((t) => t.featuredTier === 2)
    .sort((a, b) => (b.lastActivityAt || "").localeCompare(a.lastActivityAt || ""))
    .slice(0, 3)
    .map(normalizeRow);

  const featuredSide = filtered
    .filter((t) => t.featuredTier === 1)
    .sort((a, b) => (b.lastActivityAt || "").localeCompare(a.lastActivityAt || ""))
    .slice(0, 5)
    .map(normalizeRow);

  // Zwykłe wątki (bez tych, które są już w polecanych)
  const featuredIds = new Set([...featuredTop, ...featuredSide].map((t) => t.id));
  const normal = filtered
    .filter((t) => !featuredIds.has(t.id))
    .sort((a, b) => {
      // przypięte (isPinned) wyżej, potem ostatnia aktywność
      const pin = (b.featuredTier === 2) - (a.featuredTier === 2);
      if (pin !== 0) return pin;
      return (b.lastActivityAt || "").localeCompare(a.lastActivityAt || "");
    })
    .map(normalizeRow);

  return { featuredTop, featuredSide, normal };
}

export function getThread(idOrSlug) {
  const t = findThread(idOrSlug);
  return t ? normalizeRow(t) : null;
}

export function getReplies(idOrSlug) {
  const t = findThread(idOrSlug);
  if (!t) return [];
  const arr = Array.isArray(DB.replies[t.id]) ? DB.replies[t.id] : [];
  // sort od najstarszej do najnowszej (jak na forum)
  return arr.slice().sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

/** polub wątek (prosto w pamięci) */
export function likeThread(idOrSlug) {
  const t = findThread(idOrSlug);
  if (!t) return false;
  t.metrics.likes = Number(t.metrics.likes || 0) + 1;
  t.updatedAt = new Date().toISOString();
  t.lastActivityAt = t.updatedAt;
  return true;
}

/** dodaj odpowiedź (prosto w pamięci) */
export function addReply(idOrSlug, { author, body }) {
  const t = findThread(idOrSlug);
  if (!t || !String(body || "").trim()) return { ok: false };
  const list = (DB.replies[t.id] = Array.isArray(DB.replies[t.id]) ? DB.replies[t.id] : []);
  list.push({
    id: (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)),
    author: author || "Anon",
    body: String(body).trim(),
    createdAt: new Date().toISOString(),
  });
  t.metrics.commentsCount = Number(t.metrics.commentsCount || 0) + 1;
  t.updatedAt = new Date().toISOString();
  t.lastActivityAt = t.updatedAt;
  return { ok: true };
}

/** proste dodawanie (na razie pending; do moderacji) */
export function createThread({ title, content, tags = [], author }) {
  const t = makeThread({
    title,
    content,
    tags,
    status: "pending",
    authorId: author?.id || "user",
    authorName: author?.name || "Użytkownik",
  });
  DB.threads.unshift(t);
  return normalizeRow(t);
}
