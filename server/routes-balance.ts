import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import { teamBalanceScores, users } from "@shared/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { requireAuth, requireEmployee } from "./auth-middleware";

const router: Router = createRouter();
router.use(requireAuth as any);

// GET /api/balance/me — my current score
router.get("/me", async (req, res) => {
  const userId = req.user!.userId;
  const [row] = await db.select().from(teamBalanceScores).where(eq(teamBalanceScores.userId, userId));
  res.json({ success: true, data: row ?? null });
});

// POST /api/balance/me — upsert my score (1–5, step 0.5)
router.post("/me", async (req, res) => {
  const userId = req.user!.userId;
  const raw = parseFloat(req.body.score);
  if (isNaN(raw) || raw < 1 || raw > 5) {
    return res.status(400).json({ success: false, error: "Score must be between 1 and 5" });
  }
  const score = Math.round(raw * 2) / 2; // snap to nearest 0.5
  const [row] = await db.insert(teamBalanceScores)
    .values({ userId, score, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: teamBalanceScores.userId,
      set: { score, updatedAt: new Date() },
    })
    .returning();
  res.json({ success: true, data: row });
});

// GET /api/balance/team — all active employees + admins with their score, plus composite
router.get("/team", requireEmployee as any, async (req, res) => {
  const members = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
    .from(users)
    .where(sql`status = 'active' AND role IN ('employee', 'admin')`);

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
