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
    blurb: "Showing up day after day with intention.",
    color: "#0D7377",
    earnedHow: "Earned by finishing your Daily Raid (Plan Day).",
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
    blurb: "Sharpening your skills through deliberate learning.",
    color: "#dc2626",
    earnedHow: "Earned when you finish a course lesson in the LMS.",
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

/** True if the YYYY-MM-DD key falls on a Mon-Fri (UTC). Saturday/Sunday are
 *  treated as non-workdays — streaks skip them automatically without spending
 *  rest tokens. */
export function isWorkday(dateKey: string): boolean {
  const dow = new Date(dateKey + "T00:00:00Z").getUTCDay();
  return dow >= 1 && dow <= 5;
}

/** Count workdays strictly between `after` (exclusive) and `before` (exclusive).
 *  Used to compute "missed workdays" between the previous streak hit and today. */
export function workdaysBetweenExclusive(after: string, before: string): number {
  const start = Date.parse(after + "T00:00:00Z");
  const end   = Date.parse(before + "T00:00:00Z");
  if (end <= start + 86_400_000) return 0;
  let count = 0;
  for (let t = start + 86_400_000; t < end; t += 86_400_000) {
    const dow = new Date(t).getUTCDay();
    if (dow >= 1 && dow <= 5) count++;
  }
  return count;
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
 *  - Weekends (Sat/Sun UTC) are skipped automatically: a hit on Friday and
 *    the next hit on Monday counts as consecutive — no token spent.
 *  - For each *missed workday* between the previous hit and today, we spend
 *    one Rest Day token. If not enough tokens remain, the streak resets to 1.
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
  const tokens = opts.tokenMonth === monthKey ? opts.remainingTokens : REST_TOKENS_PER_MONTH;

  // Workday-only: weekends never advance the streak, never award XP, never
  // spend tokens. Returning alreadyCountedToday=true makes the caller no-op.
  if (!isWorkday(today)) {
    return {
      newStreak: opts.currentStreak,
      spentTokens: 0,
      remainingTokens: tokens,
      monthKey,
      alreadyCountedToday: true,
      brokeStreak: false,
    };
  }

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

  // Workdays missed strictly between the last hit and today (exclusive of both).
  // Weekends never count as missed days, so they consume no tokens.
  const missedWorkdays = workdaysBetweenExclusive(opts.lastDate, today);

  if (missedWorkdays === 0) {
    return {
      newStreak: opts.currentStreak + 1,
      spentTokens: 0,
      remainingTokens: tokens,
      monthKey,
      alreadyCountedToday: false,
      brokeStreak: false,
    };
  }

  if (missedWorkdays <= tokens) {
    return {
      newStreak: opts.currentStreak + 1,
      spentTokens: missedWorkdays,
      remainingTokens: tokens - missedWorkdays,
      monthKey,
      alreadyCountedToday: false,
      brokeStreak: false,
    };
  }

  // Pause-don't-reset: when we cannot fully bridge missed workdays with
  // tokens, we hold the streak count where it was (no reset to 1, no increment
  // for today), spend whatever tokens remain, and let lastDate advance so the
  // next valid workday continues from the held count.
  return {
    newStreak: opts.currentStreak,
    spentTokens: tokens,
    remainingTokens: 0,
    monthKey,
    alreadyCountedToday: false,
    brokeStreak: false,
  };
}
