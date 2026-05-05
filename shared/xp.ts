// ─────────────────────────────────────────────────────────────────────────────
// Gamification: XP, Norse rank progression, four stat tracks, streak & bonus
// constants. Single source of truth shared between server and client.
// ─────────────────────────────────────────────────────────────────────────────

export type Priority = "low" | "medium" | "high" | "urgent";

export const XP_PER_PRIORITY: Record<Priority, number> = {
  low: 20,
  medium: 40,
  high: 70,
  urgent: 100,
};

export const RANKS = [
  { key: "thrall",  name: "Thrall",  threshold: 0,    blurb: "Every saga begins with the first oar stroke." },
  { key: "karl",    name: "Karl",    threshold: 200,  blurb: "Free of doubt. Trusted with the work." },
  { key: "jarl",    name: "Jarl",    threshold: 600,  blurb: "Others row beside you because you keep showing up." },
  { key: "hersir",  name: "Hersir",  threshold: 1500, blurb: "A leader on the field — chosen, not appointed." },
  { key: "skald",   name: "Skald",   threshold: 3000, blurb: "Your work is the story others learn from." },
  { key: "konungr", name: "Konungr", threshold: 6000, blurb: "Sovereign of your craft. The longship answers to you." },
] as const;

export type Rank = typeof RANKS[number];

export interface RankProgress {
  xp: number;
  level: number;              // 1-based, +1 every 100 XP
  rank: Rank;
  nextRank: Rank | null;
  xpIntoRank: number;
  xpToNextRank: number | null;
  progressPct: number;
}

export function getRankProgress(xp: number): RankProgress {
  const safe = Math.max(0, Math.floor(xp || 0));
  let currentIdx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (safe >= RANKS[i].threshold) currentIdx = i;
  }
  const rank = RANKS[currentIdx];
  const nextRank = RANKS[currentIdx + 1] ?? null;
  const xpIntoRank = safe - rank.threshold;
  const xpToNextRank = nextRank ? nextRank.threshold - safe : null;
  const span = nextRank ? nextRank.threshold - rank.threshold : 1;
  const progressPct = nextRank ? Math.min(1, Math.max(0, xpIntoRank / span)) : 1;
  return {
    xp: safe,
    level: Math.floor(safe / 100) + 1,
    rank,
    nextRank,
    xpIntoRank,
    xpToNextRank,
    progressPct,
  };
}

export function xpForPriority(p?: string | null): number {
  if (!p) return XP_PER_PRIORITY.medium;
  const k = p.toLowerCase() as Priority;
  return XP_PER_PRIORITY[k] ?? XP_PER_PRIORITY.medium;
}

// "Done" / "Valhalla" column detection — single source of truth
export function isCompletionColumn(title?: string | null): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  return t.includes("valhalla") || t === "done" || t.startsWith("done ") || t.endsWith(" done");
}

export function isInReviewColumn(title?: string | null): boolean {
  if (!title) return false;
  return title.toLowerCase().includes("in review");
}

// ─── Stat Tracks ─────────────────────────────────────────────────────────────
// Four parallel stats. Each event awarded against one (or none).

export type Stat = "focus" | "initiative" | "stewardship" | "craft";
export const STATS: Stat[] = ["focus", "initiative", "stewardship", "craft"];

export interface StatMeta {
  key: Stat;
  name: string;
  blurb: string;
  color: string;
  earnedHow: string;
}

export const STAT_META: Record<Stat, StatMeta> = {
  focus: {
    key: "focus",
    name: "Focus",
    blurb: "Showing up and finishing your own quests.",
    color: "#0D7377",
    earnedHow: "Earned for completing tasks assigned to you.",
  },
  initiative: {
    key: "initiative",
    name: "Initiative",
    blurb: "Stepping forward and claiming work nobody owned.",
    color: "#D4A843",
    earnedHow: "Earned with a 1.5× bonus for completing factory quests you claimed.",
  },
  stewardship: {
    key: "stewardship",
    name: "Stewardship",
    blurb: "Reviewing the work of others with care.",
    color: "#7c3aed",
    earnedHow: "Earned when you move a card you reviewed out of In Review.",
  },
  craft: {
    key: "craft",
    name: "Craft",
    blurb: "Finishing work you genuinely love.",
    color: "#dc2626",
    earnedHow: "Earned when you complete a 4★ or 5★ rated task — Loved this.",
  },
};

// Stat level: +1 per 100 XP within a stat (independent of overall rank).
export interface StatProgress {
  stat: Stat;
  xp: number;
  level: number;
  intoLevel: number;   // 0..99
  toNextLevel: number; // 1..100
  progressPct: number; // 0..1
}

export function getStatProgress(stat: Stat, xp: number): StatProgress {
  const safe = Math.max(0, Math.floor(xp || 0));
  const level = Math.floor(safe / 100) + 1;
  const intoLevel = safe % 100;
  return {
    stat,
    xp: safe,
    level,
    intoLevel,
    toNextLevel: 100 - intoLevel,
    progressPct: intoLevel / 100,
  };
}

// ─── Bonuses ─────────────────────────────────────────────────────────────────

export const INITIATIVE_MULTIPLIER = 1.5;        // factory-claimed completions
export const LOVED_THIS_THRESHOLD = 4;           // interestRating >= this triggers bonus
export const LOVED_THIS_BONUS = 25;              // flat XP credited to Craft
export const REVIEWER_XP = 30;                   // Stewardship XP per review handoff
export const RAID_STREAK_DAILY_XP = 10;          // small Focus credit per Plan Day
export const PULSE_STREAK_DAILY_XP = 5;          // small Focus credit per energy log
export const REST_TOKENS_PER_MONTH = 2;          // forgiveness budget

// ─── Streak helpers ──────────────────────────────────────────────────────────

/** Y-M-D in UTC. Used as the canonical streak day key everywhere. */
export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const ta = Date.parse(a + "T00:00:00Z");
  const tb = Date.parse(b + "T00:00:00Z");
  return Math.round((tb - ta) / 86_400_000);
}

export function currentMonth(d: Date = new Date()): string {
  return d.toISOString().slice(0, 7); // "YYYY-MM"
}

export interface StreakUpdate {
  newStreak: number;
  spentTokens: number;
  remainingTokens: number;
  monthKey: string;
  alreadyCountedToday: boolean;
  brokeStreak: boolean;
}

/**
 * Pure logic for advancing a "pause-don't-reset" streak.
 *  - If today already counted, no-op.
 *  - If yesterday was the last hit, +1.
 *  - If gap > 1 day, auto-spend 1 rest token per missed day; if not enough, reset to 1.
 *  - Tokens reset to REST_TOKENS_PER_MONTH at the start of each calendar month.
 */
export function advanceStreak(opts: {
  lastDate: string | null;
  currentStreak: number;
  remainingTokens: number;
  tokenMonth: string | null;
  today?: string;
}): StreakUpdate {
  const today = opts.today ?? todayKey();
  const monthKey = currentMonth(new Date(today + "T00:00:00Z"));

  // Refresh tokens if we've crossed a month boundary
  let tokens = opts.tokenMonth === monthKey ? opts.remainingTokens : REST_TOKENS_PER_MONTH;

  if (opts.lastDate === today) {
    return {
      newStreak: opts.currentStreak,
      spentTokens: 0,
      remainingTokens: tokens,
      monthKey,
      alreadyCountedToday: true,
      brokeStreak: false,
    };
  }

  if (!opts.lastDate) {
    return {
      newStreak: 1,
      spentTokens: 0,
      remainingTokens: tokens,
      monthKey,
      alreadyCountedToday: false,
      brokeStreak: false,
    };
  }

  const gap = daysBetween(opts.lastDate, today); // days since last hit
  if (gap <= 1) {
    return {
      newStreak: opts.currentStreak + 1,
      spentTokens: 0,
      remainingTokens: tokens,
      monthKey,
      alreadyCountedToday: false,
      brokeStreak: false,
    };
  }

  const missed = gap - 1; // missed weekdays between
  if (missed <= tokens) {
    return {
      newStreak: opts.currentStreak + 1,
      spentTokens: missed,
      remainingTokens: tokens - missed,
      monthKey,
      alreadyCountedToday: false,
      brokeStreak: false,
    };
  }

  // Not enough tokens — streak resets but we still count today.
  return {
    newStreak: 1,
    spentTokens: tokens, // burn what we had trying to save it
    remainingTokens: 0,
    monthKey,
    alreadyCountedToday: false,
    brokeStreak: true,
  };
}
