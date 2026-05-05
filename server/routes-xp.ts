import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { requireAuth } from "./auth-middleware";
import { getRankProgress } from "@shared/xp";

const router = Router();
router.use(requireAuth);

interface UserXpRow { xp_total: number | string | null; sound_enabled: boolean | null }
interface XpEventRow {
  id: number; amount: number | string; reason: string;
  source_type: string; source_id: number | null; created_at: Date | string;
}

function rowsOf<T>(result: unknown): T[] {
  // node-postgres returns { rows: [...] }; drizzle proxies expose either shape.
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return Array.isArray(result) ? (result as T[]) : [];
}

// GET /api/xp/me — total XP, derived rank/level, recent events, sound pref
router.get("/me", async (req, res) => {
  const userId = req.user!.userId;
  const userRes = await db.execute(sql`
    SELECT xp_total, sound_enabled
    FROM portal_users WHERE id = ${userId}
  `);
  const u = rowsOf<UserXpRow>(userRes)[0] ?? { xp_total: 0, sound_enabled: false };
  const xp = Number(u.xp_total ?? 0);
  const soundEnabled = !!u.sound_enabled;

  const eventsRes = await db.execute(sql`
    SELECT id, amount, reason, source_type, source_id, created_at
    FROM xp_events WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 20
  `);
  const events = rowsOf<XpEventRow>(eventsRes).map(r => ({
    id: r.id,
    amount: Number(r.amount),
    reason: r.reason,
    sourceType: r.source_type,
    sourceId: r.source_id,
    createdAt: r.created_at,
  }));

  res.json({
    success: true,
    data: { ...getRankProgress(xp), soundEnabled, recentEvents: events },
  });
});

// POST /api/xp/sound — toggle/set sound preference
router.post("/sound", async (req, res) => {
  const userId = req.user!.userId;
  const enabled = !!req.body?.enabled;
  await db.execute(sql`UPDATE portal_users SET sound_enabled = ${enabled} WHERE id = ${userId}`);
  res.json({ success: true, data: { soundEnabled: enabled } });
});

export default router;
