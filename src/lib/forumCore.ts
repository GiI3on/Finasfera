// src/lib/forumCore.ts
// Jeden plik: mocna moderacja + osiągnięcia/rangi + utilsy.

export type Verdict = {
  ok: boolean;
  sanitized: string;
  flags: string[];
  reason?: string;
  score: number; // 0..100
};

type Options = {
  allowMarkdown?: boolean;
  strict?: boolean;
};

// ====== SŁOWNIKI (mocna moderacja) ======
const PROFANITIES = [
  "kurwa","chuj","pizda","spierdal","pierdol","skurwysyn","zajeb","jebac","jebane",
  "suka","dziwka","debilu","idioto","idiota","cwel","pedał","pedal","matkojeb",
  "fuck","shit","bitch","asshole","motherfucker","dick","cunt","bastard"
];

const HATE_SPEECH = [
  "spalcie ich","won do gazu","ludzie gorszego sortu","podludzie","zabić ich","nienawidzę tej grupy"
];

const EXPLICIT_SEX = ["porno","sex tape","gwałt","gwałcić","child porn","bestiality"];
const SEXUAL_MINOR = ["lolita","cp","child sex","dziecko seksual"];
const SELF_HARM = ["zabiję się","chcę umrzeć","nienawidzę życia","skrzywdzę się","self harm","cutting myself"];

const CONSPIRACY = [
  "plandemia","teoria spiskowa","new world order","nwo","5g zabija","płaska ziemia","flat earth","chemtrails",
  "globalna zmowa","ukrywana prawda","deep state steruje","jaszczury rządzą"
];

const SCAM_ADS = [
  "gwarantowany zysk","pewny zysk","zarób 100% w tydzień","100% pewne","wejdź w link i zainwestuj",
  "krypto bot zarobek","promocja tylko dziś","kup kurs i będziesz bogaty","sekret milionerów"
];

const CRYPTO_SCAM = ["giveaway elon","double your crypto","airdrop free btc","metamask seed","podaj seed","fraud token"];

const BANNED_SHORTENERS = ["bit.ly","goo.gl","tinyurl.com","ow.ly","rb.gy","is.gd"];
const BANNED_INVITES = ["discord.gg","t.me","telegram.me"];

// DOZWOLONE DOMENY (allowlista) – mniej fałszywych trafień niż „ban-all”
const ALLOWLIST_DOMAINS = [
  // Twoja domena – PODMIEŃ na swoją
  "twojadomena.pl",
  // popularne platformy
  "youtube.com","youtu.be","facebook.com","fb.com","x.com","twitter.com",
  "linkedin.com","instagram.com","tiktok.com",
  // inne sensowne
  "github.com","gitlab.com","medium.com"
];

// ====== UTILS ======
const HTML_TAG_RE = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

function normalizeWhitespace(s: string) {
  return (s || "")
    .replace(/\r/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripHtmlIfNeeded(s: string, allowMarkdown?: boolean) {
  if (allowMarkdown) return s;
  return s.replace(HTML_TAG_RE, "");
}

function hasAllowedDomain(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    return ALLOWLIST_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function stripBannedLinks(s: string) {
  let out = s;

  // usuń wyraźnie zbanowane
  const ban = [...BANNED_SHORTENERS, ...BANNED_INVITES];
  for (const d of ban) {
    const re = new RegExp(`https?:\\/\\/(?:www\\.)?${d.replace(/\./g,"\\.")}[^\\s]*`,"gi");
    out = out.replace(re, "[link usunięty]");
  }

  // wytnij „javascript:”, „mailto:”, „tg://”
  out = out.replace(/\b(?:mailto:|tg:\/\/|javascript:)[^\s]+/gi, "[link usunięty]");

  // opcjonalnie: wszystkie niedozwolone domeny zamień na placeholder (poza allowlistą)
  out = out.replace(/https?:\/\/[^\s)]+/gi, (match) => (hasAllowedDomain(match) ? match : "[link usunięty]"));

  return out;
}

function percentCaps(s: string) {
  const letters = s.replace(/[^a-zA-ZĄĆĘŁŃÓŚŹŻąćęłńóśźż]/g, "");
  if (!letters.length) return 0;
  const caps = letters.replace(/[a-ząćęłńóśźż]/g, "");
  return (caps.length / letters.length) * 100;
}
function countLinks(s: string) { return (s.match(/https?:\/\//gi) || []).length; }
function hasLongRepeats(s: string) { return /(.)\1{6,}/.test(s) || /([^\w\s])\1{4,}/.test(s); }

// ====== MODERACJA ======
export function moderateText(input: string, opts: Options = {}): Verdict {
  const allowMarkdown = !!opts.allowMarkdown;
  const strict = !!opts.strict;

  let raw = String(input || "");
  raw = stripHtmlIfNeeded(raw, allowMarkdown);
  raw = normalizeWhitespace(raw);

  const lc = raw.toLowerCase();
  const flags: string[] = [];
  let score = 0;

  const listCheck = (arr: string[], flag: string, pts: number) => {
    for (const w of arr) {
      if (lc.includes(w)) { flags.push(flag); score += pts; return true; }
    }
    return false;
  };

  // hard
  const hard =
    listCheck(PROFANITIES, "profanity", 40) ||
    listCheck(HATE_SPEECH, "hate", 40) ||
    listCheck(EXPLICIT_SEX, "explicit", 40) ||
    listCheck(SEXUAL_MINOR, "sexual_minor", 100) ||
    listCheck(SELF_HARM, "self_harm", 40) ||
    listCheck(CONSPIRACY, "conspiracy", 45);

  // soft
  const soft =
    listCheck(SCAM_ADS, "aggressive_marketing", 35) ||
    listCheck(CRYPTO_SCAM, "crypto_scam", 40);

  const links = countLinks(lc);
  if (links >= (strict ? 2 : 3)) { flags.push("excessive_links"); score += 25; }

  if (percentCaps(raw) >= (strict ? 55 : 65) && raw.length >= 30) { flags.push("capslock"); score += 10; }
  if (hasLongRepeats(raw)) { flags.push("repeats"); score += 10; }

  const sanitized = stripBannedLinks(raw);

  const hardBan = hard || flags.includes("sexual_minor");
  const softBan = soft || flags.includes("excessive_links") || flags.includes("capslock") || flags.includes("repeats");
  const ok = !hardBan && !softBan;

  let reason: string | undefined;
  if (hardBan) reason = "Treść narusza zasady (wulgaryzmy/nienawiść/teorie spiskowe/niebezpieczne treści).";
  else if (softBan) reason = "Treść wymaga weryfikacji moderatora.";

  return { ok, sanitized, flags, reason, score: Math.max(0, Math.min(100, score)) };
}

// ====== Osiągnięcia / rangi ======
export function computeRank(postsCount = 0) {
  if (postsCount >= 200) return "Mistrz";
  if (postsCount >= 100) return "Ekspert";
  if (postsCount >= 50)  return "Bywalec";
  if (postsCount >= 10)  return "Aktywny";
  if (postsCount >= 1)   return "Nowicjusz";
  return "Gość";
}

export function badgesFromStats(stats: { postsCount?: number; badges?: string[] } = {}) {
  const out = new Set(stats.badges || []);
  const posts = stats.postsCount || 0;
  if (posts >= 1) out.add("Pierwszy post");
  if (posts >= 10) out.add("Aktywny");
  if (posts >= 50) out.add("Stały bywalec");
  if (posts >= 100) out.add("Ekspert dyskusji");
  return Array.from(out);
}

// ====== Przydatne utilsy dla UI ======
export const fmtAgo = (iso?: string) => {
  if (!iso) return "";
  const t = new Date(iso);
  const mins = Math.floor((Date.now() - t.getTime()) / 60000);
  if (mins < 60) return `${mins} min temu`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h temu`;
  const d = Math.floor(h / 24);
  return `${d} d temu`;
};

// ====== Dodatki ======
export function nextMilestone(posts: number, milestones = [1, 10, 50, 100, 200]) {
  return milestones.find((m) => m > posts) ?? null;
}

export function sanitizeLink(url: string) {
  try {
    const u = new URL(url);
    if (!hasAllowedDomain(url)) return null;
    // zwróć obiekt pomocniczy do użycia w UI
    return {
      href: u.toString(),
      target: "_blank",
      rel: "nofollow ugc",
    };
  } catch {
    return null;
  }
}
