import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import { sql, eq, and } from "drizzle-orm";
import { xpEvents, kanbanCards, kanbanColumns, appSettings, users, teamBalanceScores, crewBondNotifications } from "@shared/schema";
import { requireAuth } from "./auth-middleware";

const router: Router = createRouter();
router.use(requireAuth as any);

const FULL_CREW_THRESHOLD = 12;

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function startOfIsoWeek(d: Date): Date {
  const date = new Date(d);
  const dayNum = date.getDay() || 7; // Sun=0 → 7
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (dayNum - 1));
  return date;
}

async function getOptOut(): Promise<boolean> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "saga_optout"));
  return row?.value === "true";
}

async function getWeeklyAggregates() {
  const weekStart = startOfIsoWeek(new Date());
  const weekKey = isoWeekKey(new Date());

  // Quests shipped this week — distinct kanban_card_complete events
  const completedRows = await db.execute(sql`
    SELECT COUNT(DISTINCT source_id)::int AS n FROM xp_events
    WHERE source_type = 'kanban_card_complete' AND created_at >= ${weekStart}
  `);
  const reviewRows = await db.execute(sql`
    SELECT COUNT(DISTINCT source_id)::int AS n FROM xp_events
    WHERE source_type = 'kanban_card_review' AND created_at >= ${weekStart}
  `);
  const bondRows = await db.execute(sql`
    SELECT COUNT(*)::int AS n FROM xp_events
    WHERE source_type = 'crew_bond_review_a' AND created_at >= ${weekStart}
  `);
  function pluck(r: unknown): number {
    const rows = (r && typeof r === "object" && "rows" in r) ? (r as { rows: { n: number }[] }).rows : (r as { n: number }[]);
    return Array.isArray(rows) && rows[0] ? Number(rows[0].n) : 0;
  }
  const questsShipped = pluck(completedRows);
  const reviewsCompleted = pluck(reviewRows);
  const crewBondsThisWeek = pluck(bondRows);

  // Average energy = mean of currently-submitted team balance scores
  // (the energy "vibe" of the crew right now). Anonymous aggregate only.
  const energyRows = await db.execute(sql`
    SELECT AVG(score)::float AS avg, COUNT(*)::int AS n
    FROM team_balance_scores WHERE score IS NOT NULL
  `);
  const energyOut = (energyRows && typeof energyRows === "object" && "rows" in (energyRows as object)
    ? ((energyRows as unknown) as { rows: { avg: number | null; n: number }[] }).rows
    : ((energyRows as unknown) as { avg: number | null; n: number }[]))[0] ?? { avg: null, n: 0 };
  const averageEnergy = energyOut.avg != null ? Math.round(Number(energyOut.avg) * 10) / 10 : null;

  return {
    weekKey,
    weekStart: weekStart.toISOString(),
    questsShipped,
    reviewsCompleted,
    crewBondsThisWeek,
    averageEnergy,
    energySubmittedCount: Number(energyOut.n) || 0,
    threshold: FULL_CREW_THRESHOLD,
    fullCrew: questsShipped >= FULL_CREW_THRESHOLD,
  };
}

router.get("/weekly", async (_req, res) => {
  try {
    const agg = await getWeeklyAggregates();
    res.json({ success: true, data: agg });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Saga of the Week — visible from Friday 12:00 *user-local* through Sunday 23:59
// Client passes ?tz=<IANA timezone> (defaults to America/Los_Angeles).
router.get("/saga", async (req, res) => {
  try {
    const optOut = await getOptOut();
    const tz = (typeof req.query.tz === "string" && req.query.tz) || "America/Los_Angeles";
    let day = 0;
    let hour = 0;
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, weekday: "short", hour: "numeric", hour12: false,
      });
      const parts = fmt.formatToParts(new Date());
      const wk = parts.find(p => p.type === "weekday")?.value ?? "Sun";
      const hr = parts.find(p => p.type === "hour")?.value ?? "0";
      const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      day = map[wk] ?? 0;
      hour = parseInt(hr, 10) || 0;
    } catch {
      const now = new Date();
      day = now.getDay();
      hour = now.getHours();
    }
    const isFridayPmOrWeekend = (day === 5 && hour >= 12) || day === 6 || day === 0;
    const agg = await getWeeklyAggregates();

    if (optOut || !isFridayPmOrWeekend || agg.questsShipped === 0) {
      return res.json({ success: true, data: { weekKey: agg.weekKey, narrative: null, optOut, available: false } });
    }

    // Deterministic template — no individual names, only crew aggregates.
    const flourishes = [
      "The longship sails on the strength of many oars.",
      "Another league of coast charted, side by side.",
      "Quiet steady work, the kind sagas remember.",
      "The horns are quiet — the crew speaks through deeds.",
    ];
    const idx = (agg.weekKey.charCodeAt(agg.weekKey.length - 1) ?? 0) % flourishes.length;
    const lines: string[] = [];
    lines.push(`This week, the crew shipped ${agg.questsShipped} quest${agg.questsShipped === 1 ? "" : "s"}.`);
    if (agg.reviewsCompleted > 0) {
      lines.push(`${agg.reviewsCompleted} review handoff${agg.reviewsCompleted === 1 ? "" : "s"} kept the work honest.`);
    }
    if (agg.crewBondsThisWeek > 0) {
      lines.push(`${agg.crewBondsThisWeek} crew bond${agg.crewBondsThisWeek === 1 ? "" : "s"} formed when teammates reviewed each other's work.`);
    }
    if (agg.fullCrew) lines.push("The longship sailed with a full crew.");
    lines.push(flourishes[idx]);

    res.json({
      success: true,
      data: {
        weekKey: agg.weekKey,
        narrative: lines.join(" "),
        optOut,
        available: true,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Admin/manager — toggle team-wide opt-out for the Saga card
router.patch("/saga/optout", async (req, res) => {
  try {
    const role = req.user!.role;
    const userId = req.user!.userId;
    const [me] = await db.select({ canApprove: users.canApprove }).from(users).where(eq(users.id, userId));
    if (role !== "admin" && !me?.canApprove) {
      return res.status(403).json({ success: false, error: "Manager privileges required" });
    }
    const optOut = !!req.body?.optOut;
    await db.execute(sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('saga_optout', ${optOut ? "true" : "false"}, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `);
    res.json({ success: true, data: { optOut } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/crew/bonds/pending — fetch + clear queued Crew Bond notifications
// for the current user (delivered to assignees who didn't initiate the move).
router.get("/bonds/pending", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const rows = await db.execute(sql`
      DELETE FROM crew_bond_notifications WHERE user_id = ${userId}
      RETURNING partner_first_name AS "partnerFirstName", card_title AS "cardTitle"
    `);
    const list = (rows && typeof rows === "object" && "rows" in (rows as object)
      ? ((rows as unknown) as { rows: { partnerFirstName: string; cardTitle: string }[] }).rows
      : ((rows as unknown) as { partnerFirstName: string; cardTitle: string }[])) ?? [];
    res.json({ success: true, data: list.map(r => ({ ...r, kind: "review" as const })) });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
