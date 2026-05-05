import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { requireAuth } from "./auth-middleware";
import {
  getRankProgress, getStatProgress, STATS, advanceStreak, todayKey,
  RAID_STREAK_DAILY_XP, REST_TOKENS_PER_MONTH, currentMonth,
  type Stat,
} from "@shared/xp";

const router = Router();
router.use(requireAuth);

interface UserXpRow {
  xp_total: number | string | null;
  sound_enabled: boolean | null;
  daily_raid_streak: number | null;
  daily_raid_last: string | null;
  honest_pulse_streak: number | null;
  honest_pulse_last: string | null;
  rest_tokens: number | null;
  rest_token_month: string | null;
}
interface XpEventRow {
  id: number; amount: number | string; reason: string;
  source_type: string; source_id: number | null;
  stat: string | null; multiplier: number | string | null;
  created_at: Date | string;
}
interface StatTotalRow { stat: string | null; total: string | number | null }
interface XpAwardRow { awarded: number | string | null; total: number | string | null }

function rowsOf<T>(result: unknown): T[] {
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return Array.isArray(result) ? (result as T[]) : [];
}

// GET /api/xp/me — total XP, derived rank/level, recent events, sound pref,
// per-stat progress, both streaks, and remaining rest tokens.
router.get("/me", async (req, res) => {
  const userId = req.user!.userId;
  const userRes = await db.execute(sql`
    SELECT xp_total, sound_enabled,
           daily_raid_streak, daily_raid_last,
           honest_pulse_streak, honest_pulse_last,
           rest_tokens, rest_token_month
    FROM portal_users WHERE id = ${userId}
  `);
  const u = rowsOf<UserXpRow>(userRes)[0] ?? {} as UserXpRow;
  const xp = Number(u.xp_total ?? 0);
  const soundEnabled = !!u.sound_enabled;

  // Per-stat totals (server-derived, no separate columns)
  const statRes = await db.execute(sql`
    SELECT stat, SUM(amount)::bigint AS total
    FROM xp_events WHERE user_id = ${userId} AND stat IS NOT NULL
    GROUP BY stat
  `);
  const totals: Record<Stat, number> = { focus: 0, initiative: 0, stewardship: 0, craft: 0 };
  for (const r of rowsOf<StatTotalRow>(statRes)) {
    if (r.stat && (r.stat in totals)) totals[r.stat as Stat] = Number(r.total ?? 0);
  }
  const stats = STATS.map(s => getStatProgress(s, totals[s]));

  const eventsRes = await db.execute(sql`
    SELECT id, amount, reason, source_type, source_id, stat, multiplier, created_at
    FROM xp_events WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 30
  `);
  const events = rowsOf<XpEventRow>(eventsRes).map(r => ({
    id: r.id,
    amount: Number(r.amount),
    reason: r.reason,
    sourceType: r.source_type,
    sourceId: r.source_id,
    stat: r.stat,
    multiplier: Number(r.multiplier ?? 1),
    createdAt: r.created_at,
  }));

  // Refresh rest tokens lazily: if we crossed a month boundary, present the
  // refreshed token count even before the next streak hit.
  const monthKey = currentMonth();
  const restTokens = u.rest_token_month === monthKey
    ? Number(u.rest_tokens ?? REST_TOKENS_PER_MONTH)
    : REST_TOKENS_PER_MONTH;

  res.json({
    success: true,
    data: {
      ...getRankProgress(xp),
      soundEnabled,
      recentEvents: events,
      stats,
      streaks: {
        dailyRaid:   { count: Number(u.daily_raid_streak   ?? 0), lastDate: u.daily_raid_last   ?? null },
        honestPulse: { count: Number(u.honest_pulse_streak ?? 0), lastDate: u.honest_pulse_last ?? null },
      },
      restTokens,
      restTokenMonth: monthKey,
    },
  });
});

// POST /api/xp/sound — toggle/set sound preference
router.post("/sound", async (req, res) => {
  const userId = req.user!.userId;
  const enabled = !!req.body?.enabled;
  await db.execute(sql`UPDATE portal_users SET sound_enabled = ${enabled} WHERE id = ${userId}`);
  res.json({ success: true, data: { soundEnabled: enabled } });
});

// POST /api/xp/streak/raid — called by PlanDayWizard.finish(); advances the
// Daily Raid streak (pause-don't-reset, 2 monthly rest tokens). Idempotent
// per UTC day via source_type='raid_streak_day' + day-key as source_id.
router.post("/streak/raid", async (req, res) => {
  const userId = req.user!.userId;
  const userRes = await db.execute(sql`
    SELECT daily_raid_streak, daily_raid_last, rest_tokens, rest_token_month
    FROM portal_users WHERE id = ${userId}
  `);
  const u = rowsOf<UserXpRow>(userRes)[0];
  if (!u) return res.status(404).json({ success: false, error: "User not found" });

  const today = todayKey();
  const update = advanceStreak({
    lastDate: u.daily_raid_last,
    currentStreak: Number(u.daily_raid_streak ?? 0),
    remainingTokens: Number(u.rest_tokens ?? REST_TOKENS_PER_MONTH),
    tokenMonth: u.rest_token_month,
    today,
  });
  await db.execute(sql`
    UPDATE portal_users
    SET daily_raid_streak = ${update.newStreak},
        daily_raid_last   = ${today},
        rest_tokens       = ${update.remainingTokens},
        rest_token_month  = ${update.monthKey}
    WHERE id = ${userId}
  `);

  let xpAwarded: { amount: number; reason: string; newTotal: number; stat: string | null } | null = null;
  if (!update.alreadyCountedToday) {
    const dayKeyInt = Math.round(Date.parse(today + "T00:00:00Z") / 86_400_000);
    const tx = await db.execute(sql`
      WITH inserted AS (
        INSERT INTO xp_events (user_id, amount, reason, source_type, source_id, stat, multiplier)
        VALUES (${userId}, ${RAID_STREAK_DAILY_XP}, 'Daily Raid streak', 'raid_streak_day', ${dayKeyInt}, 'focus', 1.0)
        ON CONFLICT (source_type, source_id) DO NOTHING
        RETURNING amount
      ),
      bumped AS (
        UPDATE portal_users SET xp_total = xp_total + (SELECT amount FROM inserted)
        WHERE id = ${userId} AND EXISTS (SELECT 1 FROM inserted)
        RETURNING xp_total
      )
      SELECT (SELECT amount FROM inserted) AS awarded, (SELECT xp_total FROM bumped) AS total
    `);
    const r = rowsOf<XpAwardRow>(tx)[0];
    if (r && r.awarded != null) {
      xpAwarded = {
        amount: Number(r.awarded),
        reason: `Daily Raid · day ${update.newStreak}`,
        newTotal: Number(r.total ?? 0),
        stat: "focus",
      };
    }
  }

  const xpAwards = xpAwarded ? [xpAwarded] : [];
  res.json({
    success: true,
    data: {
      streak: { count: update.newStreak, lastDate: today },
      restTokens: update.remainingTokens,
      spentTokens: update.spentTokens,
      brokeStreak: update.brokeStreak,
      alreadyCountedToday: update.alreadyCountedToday,
    },
    xpAwarded,
    xpAwards,
  });
});

export default router;
