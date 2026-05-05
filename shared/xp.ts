// ─────────────────────────────────────────────────────────────────────────────
// Gamification: XP, Norse rank progression, priority → reward mapping.
// Single source of truth shared between server and client.
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
  xpIntoRank: number;         // xp accumulated since the current rank started
  xpToNextRank: number | null; // null if at max rank
  progressPct: number;        // 0..1 toward next rank (1 if maxed)
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
