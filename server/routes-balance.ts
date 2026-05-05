import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import { teamBalanceScores, users } from "@shared/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { requireAuth, requireEmployee } from "./auth-middleware";
import { advanceStreak, todayKey, PULSE_STREAK_DAILY_XP } from "@shared/xp";

const router: Router = createRouter();
router.use(requireAuth as any);

interface UserStreakRow {
  honest_pulse_streak: number | null;
  honest_pulse_last: string | null;
  rest_tokens: number | null;
  rest_token_month: string | null;
}
interface XpAwardRow { awarded: number | string | null; total: number | string | null }
function rowsOf<T>(result: unknown): T[] {
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return Array.isArray(result) ? (result as T[]) : [];
}

// GET /api/balance/me — my current score
router.get("/me", async (req, res) => {
  const userId = req.user!.userId;
  const [row] = await db.select().from(teamBalanceScores).where(eq(teamBalanceScores.userId, userId));
  res.json({ success: true, data: row ?? null });
});

// POST /api/balance/me — upsert my score (1–5, step 0.5).
// Also advances the Honest Pulse streak (pause-don't-reset, with 2 monthly rest tokens).
router.post("/me", async (req, res) => {
  const userId = req.user!.userId;
  const raw = parseFloat(req.body.score);
  if (isNaN(raw) || raw < 1 || raw > 5) {
    return res.status(400).json({ success: false, error: "Score must be between 1 and 5" });
  }
  const score = Math.round(raw * 2) / 2;
  const [row] = await db.insert(teamBalanceScores)
    .values({ userId, score, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: teamBalanceScores.userId,
      set: { score, updatedAt: new Date() },
    })
    .returning();

  // ── Honest Pulse streak ────────────────────────────────────────────────
  let xpAwarded: { amount: number; reason: string; newTotal: number; stat: string | null } | null = null;
  let streak: { count: number; lastDate: string | null; restTokens: number; spentTokens: number } | null = null;
  try {
    const userRes = await db.execute(sql`
      SELECT honest_pulse_streak, honest_pulse_last, rest_tokens, rest_token_month
      FROM portal_users WHERE id = ${userId}
    `);
    const u = rowsOf<UserStreakRow>(userRes)[0];
    if (u) {
      const today = todayKey();
      const update = advanceStreak({
        lastDate: u.honest_pulse_last,
        currentStreak: Number(u.honest_pulse_streak ?? 0),
        remainingTokens: Number(u.rest_tokens ?? 2),
        tokenMonth: u.rest_token_month,
        today,
      });
      await db.execute(sql`
        UPDATE portal_users
        SET honest_pulse_streak = ${update.newStreak},
            honest_pulse_last   = ${today},
            rest_tokens         = ${update.remainingTokens},
            rest_token_month    = ${update.monthKey}
        WHERE id = ${userId}
      `);
      streak = {
        count: update.newStreak,
        lastDate: today,
        restTokens: update.remainingTokens,
        spentTokens: update.spentTokens,
      };

      // Award a small Focus XP only the first time today (idempotent via
      // source_id encoding userId so the global UNIQUE(source_type,source_id)
      // dedupe still allows one row per user per day).
      if (!update.alreadyCountedToday) {
        const dayKeyInt = Math.round(Date.parse(today + "T00:00:00Z") / 86_400_000);
        const dedupeId = userId * 100000 + dayKeyInt;
        const tx = await db.execute(sql`
          WITH inserted AS (
            INSERT INTO xp_events (user_id, amount, reason, source_type, source_id, stat, multiplier)
            VALUES (${userId}, ${PULSE_STREAK_DAILY_XP}, 'Honest Pulse streak', 'pulse_streak_day', ${dedupeId}, 'stewardship', 1.0)
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
            reason: `Honest Pulse · day ${update.newStreak}`,
            newTotal: Number(r.total ?? 0),
            stat: "stewardship",
          };
        }
      }
    }
  } catch (e) {
    console.error("[balance] streak update failed:", e instanceof Error ? e.message : String(e));
  }

  const xpAwards = xpAwarded ? [xpAwarded] : [];
  res.json({ success: true, data: row, streak, xpAwarded, xpAwards });
});

// GET /api/balance/team — all active employees with their score, plus composite
router.get("/team", requireEmployee as any, async (req, res) => {
  const members = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
    .from(users)
    .where(sql`${users.status} = 'active' AND (${users.role} IN ('admin', 'employee') OR 'admin' = ANY(${users.roles}) OR 'employee' = ANY(${users.roles}))`)

  const memberIds = members.map((m) => m.id);
  const scores =
    memberIds.length > 0
      ? await db.select().from(teamBalanceScores).where(inArray(teamBalanceScores.userId, memberIds))
      : [];

  const scoreMap = new Map(scores.map((s) => [s.userId, s]));

  const team = members.map((m) => ({
    ...m,
    score: scoreMap.get(m.id)?.score ?? null,
    updatedAt: scoreMap.get(m.id)?.updatedAt ?? null,
  }));

  const submitted = scores.filter((s) => s.score != null);
  const composite =
    submitted.length > 0
      ? Math.round((submitted.reduce((sum, s) => sum + s.score, 0) / submitted.length) * 10) / 10
      : null;

  res.json({
    success: true,
    data: { team, composite, submittedCount: submitted.length, totalCount: members.length },
  });
});

export default router;
