import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import { timeReports, expenseReports } from "@shared/schema";
import { eq } from "drizzle-orm";
import { requireManager } from "./auth-middleware";

const router: Router = createRouter();
router.use(requireManager as any);

// Sidebar badge counts and dashboard summary for the manager portal.
router.get("/approval-counts", async (_req, res) => {
  const pendingTimesheets = await db
    .select({ id: timeReports.id })
    .from(timeReports)
    .where(eq(timeReports.status, "submitted"));
  const pendingExpenses = await db
    .select({ id: expenseReports.id })
    .from(expenseReports)
    .where(eq(expenseReports.status, "submitted"));

  res.json({
    success: true,
    data: {
      pendingTimesheets: pendingTimesheets.length,
      pendingExpenses: pendingExpenses.length,
    },
  });
});

export default router;
