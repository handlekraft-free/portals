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

// GET /api/xp/today — XP events created since local midnight (server time).
// Used by SagaRecapModal for end-of-day summary.
router.get("/today", async (req, res) => {
  const userId = req.user!.userId;
  // Local midnight on the server. Good enough — recap fires on the user's clock too.
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const eventsRes = await db.execute(sql`
    SELECT id, amount, reason, source_type, source_id, stat, multiplier, created_at
    FROM xp_events
    WHERE user_id = ${userId} AND created_at >= ${start.toISOString()}
    ORDER BY created_at ASC
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
  const total = events.reduce((s, e) => s + e.amount, 0);
  const byStat: Record<string, number> = {};
  for (const e of events) {
    if (e.stat) byStat[e.stat] = (byStat[e.stat] ?? 0) + e.amount;
  }
  // Quests shipped today = events tied to a card move into Done (sourceType
  // includes "card_complete"/"completed:" reasons). We approximate from the
  // events we already have to avoid an extra query.
  const questsShipped = events.filter(e =>
    e.sourceType?.startsWith("card_complete") ||
    /^completed:/i.test(e.reason ?? "") ||
    /^quest complete/i.test(e.reason ?? ""),
  ).length;
  // Pull current streak + rank progress for the recap headline.
  const userRes = await db.execute(sql`
    SELECT daily_raid_streak, xp_total FROM portal_users WHERE id = ${userId}
  `);
  const u = rowsOf<{ daily_raid_streak: number | null; xp_total: number | null }>(userRes)[0];
  const dailyRaidStreak = Number(u?.daily_raid_streak ?? 0);
  const xpTotal = Number(u?.xp_total ?? 0);
  res.json({
    success: true,
    data: { events, total, byStat, questsShipped, dailyRaidStreak, xpTotal },
  });
});

// POST /api/xp/milestones — opt-in personal saga entry (e.g., a rank-up the
// user chose to keep). Private to the user — never surfaced to teammates.
router.post("/milestones", async (req, res) => {
  const userId = req.user!.userId;
  const kind = typeof req.body?.kind === "string" ? req.body.kind.slice(0, 32) : "";
  const title = typeof req.body?.title === "string" ? req.body.title.slice(0, 200) : "";
  const blurb = typeof req.body?.blurb === "string" ? req.body.blurb.slice(0, 500) : null;
  const meta = (req.body?.meta && typeof req.body.meta === "object") ? req.body.meta : null;
  if (!kind || !title) {
    return res.status(400).json({ success: false, error: "kind and title are required" });
  }
  const ins = await db.execute(sql`
    INSERT INTO xp_milestones (user_id, kind, title, blurb, meta)
    VALUES (${userId}, ${kind}, ${title}, ${blurb}, ${meta ? JSON.stringify(meta) : null}::jsonb)
    RETURNING id, created_at
  `);
  const row = rowsOf<{ id: number; created_at: string }>(ins)[0];
  res.json({ success: true, data: { id: row?.id, createdAt: row?.created_at } });
});

// GET /api/xp/milestones — list the user's saga timeline (newest first).
router.get("/milestones", async (req, res) => {
  const userId = req.user!.userId;
  const r = await db.execute(sql`
    SELECT id, kind, title, blurb, meta, created_at
    FROM xp_milestones WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 100
  `);
  const items = rowsOf<{
    id: number; kind: string; title: string; blurb: string | null;
    meta: Record<string, unknown> | null; created_at: string;
  }>(r);
  res.json({ success: true, data: { items } });
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
  // Never touch streak fields when today doesn't count (weekend or dup same-day).
  // This preserves Friday's lastDate so a missed Friday is still detected on
  // the following Monday and the rest token bookkeeping stays accurate.
  if (!update.alreadyCountedToday) {
    await db.execute(sql`
      UPDATE portal_users
      SET daily_raid_streak = ${update.newStreak},
          daily_raid_last   = ${today},
          rest_tokens       = ${update.remainingTokens},
          rest_token_month  = ${update.monthKey}
      WHERE id = ${userId}
    `);
  }

  let xpAwarded: { amount: number; reason: string; newTotal: number; stat: string | null } | null = null;
  if (!update.alreadyCountedToday) {
    const dayKeyInt = Math.round(Date.parse(today + "T00:00:00Z") / 86_400_000);
    // Encode user into source_id so the global UNIQUE(source_type, source_id)
    // dedupe key still gives one row PER USER per day. dayKeyInt ≈ 20000,
    // userId * 100000 keeps both sides comfortably inside int4.
    const dedupeId = userId * 100000 + dayKeyInt;
    const tx = await db.execute(sql`
      WITH inserted AS (
        INSERT INTO xp_events (user_id, amount, reason, source_type, source_id, stat, multiplier)
        VALUES (${userId}, ${RAID_STREAK_DAILY_XP}, 'Daily Raid streak', 'raid_streak_day', ${dedupeId}, 'focus', 1.0)
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
      streak: {
        count: update.newStreak,
        // Preserve original lastDate when today didn't count (weekend/dup).
        lastDate: update.alreadyCountedToday ? u.daily_raid_last : today,
      },
      restTokens: update.remainingTokens,
      spentTokens: update.spentTokens,
      brokeStreak: update.brokeStreak,
      alreadyCountedToday: update.alreadyCountedToday,
    },
    xpAwarded,
    xpAwards,
  });
});

// POST /api/xp/streak/raid/skip — energy-aware Plan Day exit. Marks today
// as a "rest day": consumes one rest token (if available + workday + not
// already counted) so the streak stays alive WITHOUT awarding XP. No-op
// on weekends, when the user already raided today, or when no tokens remain.
router.post("/streak/raid/skip", async (req, res) => {
  const userId = req.user!.userId;
  const userRes = await db.execute(sql`
    SELECT daily_raid_streak, daily_raid_last, rest_tokens, rest_token_month
    FROM portal_users WHERE id = ${userId}
  `);
  const u = rowsOf<UserXpRow>(userRes)[0];
  if (!u) return res.status(404).json({ success: false, error: "User not found" });

  const today = todayKey();
  // Skip on weekends — Mon..Fri only. (Saturday=6, Sunday=0.)
  const dow = new Date(today + "T00:00:00").getDay();
  if (dow === 0 || dow === 6) {
    return res.json({ success: true, data: { skipped: true, reason: "weekend" } });
  }
  if (u.daily_raid_last === today) {
    return res.json({ success: true, data: { skipped: true, reason: "already-counted" } });
  }
  // Refresh tokens if month rolled over.
  const monthKey = currentMonth();
  const tokens = u.rest_token_month === monthKey
    ? Number(u.rest_tokens ?? REST_TOKENS_PER_MONTH)
    : REST_TOKENS_PER_MONTH;
  if (tokens <= 0) {
    return res.json({ success: true, data: { skipped: true, reason: "no-tokens" } });
  }
  const remaining = tokens - 1;
  await db.execute(sql`
    UPDATE portal_users
    SET daily_raid_last  = ${today},
        rest_tokens      = ${remaining},
        rest_token_month = ${monthKey}
    WHERE id = ${userId}
  `);
  res.json({
    success: true,
    data: {
      skipped: false,
      restTokens: remaining,
      streak: { count: Number(u.daily_raid_streak ?? 0), lastDate: today },
    },
  });
});

export default router;
