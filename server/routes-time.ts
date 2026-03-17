import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import { timeEntries, timeReports, projects, users } from "@shared/schema";
import { eq, and, desc, asc, gte, lte, or, inArray } from "drizzle-orm";
import { requireAuth, requireEmployee } from "./auth-middleware";

const router: Router = createRouter();
router.use(requireEmployee as any);

// ── Projects ────────────────────────────────────────────────────────────────

router.get("/projects", async (req, res) => {
  const all = await db.select().from(projects).where(eq(projects.active, true)).orderBy(asc(projects.name));
  res.json({ success: true, data: all });
});

router.post("/projects", async (req, res) => {
  const { name, clientId, color, hourlyRate, budgetHours } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Name required" });
  const [p] = await db.insert(projects).values({ name, clientId: clientId || null, color: color || "#0D7377", hourlyRate: hourlyRate || "0", budgetHours: budgetHours || "0" }).returning();
  res.status(201).json({ success: true, data: p });
});

router.patch("/projects/:id", async (req, res) => {
  const { name, clientId, color, hourlyRate, budgetHours, active } = req.body;
  const [p] = await db.update(projects).set({ name, clientId, color, hourlyRate, budgetHours, active }).where(eq(projects.id, parseInt(req.params.id))).returning();
  if (!p) return res.status(404).json({ success: false, error: "Project not found" });
  res.json({ success: true, data: p });
});

router.delete("/projects/:id", async (req, res) => {
  await db.update(projects).set({ active: false }).where(eq(projects.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── Approvers ────────────────────────────────────────────────────────────────

router.get("/approvers", async (req, res) => {
  const approvers = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    role: users.role,
  }).from(users).where(
    and(
      eq(users.status, "active"),
      or(eq(users.canApprove, true), eq(users.role, "admin"))
    )
  ).orderBy(asc(users.firstName));
  res.json({ success: true, data: approvers });
});

// ── Time Entries ─────────────────────────────────────────────────────────────

router.get("/entries", async (req, res) => {
  const userId = req.user!.userId;
  const entries = await db.select().from(timeEntries).where(eq(timeEntries.userId, userId)).orderBy(desc(timeEntries.createdAt));
  res.json({ success: true, data: entries });
});

router.post("/entries", async (req, res) => {
  const userId = req.user!.userId;
  const { projectId, taskDescription, startTime, endTime, durationMinutes, billable, hourlyRate, notes } = req.body;
  if (!taskDescription) return res.status(400).json({ success: false, error: "Task description required" });
  const [entry] = await db.insert(timeEntries).values({
    userId,
    projectId: projectId || null,
    taskDescription,
    startTime: startTime ? new Date(startTime) : null,
    endTime: endTime ? new Date(endTime) : null,
    durationMinutes: durationMinutes || null,
    billable: billable || false,
    hourlyRate: hourlyRate || null,
    notes: notes || null,
    status: "draft",
  }).returning();
  res.status(201).json({ success: true, data: entry });
});

router.patch("/entries/:id", async (req, res) => {
  const userId = req.user!.userId;
  const entryId = parseInt(req.params.id);
  const [existing] = await db.select().from(timeEntries).where(and(eq(timeEntries.id, entryId), eq(timeEntries.userId, userId)));
  if (!existing) return res.status(404).json({ success: false, error: "Entry not found" });
  if (existing.status !== "draft") return res.status(400).json({ success: false, error: "Only draft entries can be edited" });
  const { projectId, taskDescription, startTime, endTime, durationMinutes, billable, hourlyRate, notes } = req.body;
  const [entry] = await db.update(timeEntries).set({
    projectId: projectId !== undefined ? projectId : existing.projectId,
    taskDescription: taskDescription || existing.taskDescription,
    startTime: startTime ? new Date(startTime) : existing.startTime,
    endTime: endTime ? new Date(endTime) : existing.endTime,
    durationMinutes: durationMinutes !== undefined ? durationMinutes : existing.durationMinutes,
    billable: billable !== undefined ? billable : existing.billable,
    hourlyRate: hourlyRate !== undefined ? hourlyRate : existing.hourlyRate,
    notes: notes !== undefined ? notes : existing.notes,
  }).where(eq(timeEntries.id, entryId)).returning();
  res.json({ success: true, data: entry });
});

router.delete("/entries/:id", async (req, res) => {
  const userId = req.user!.userId;
  const entryId = parseInt(req.params.id);
  const [existing] = await db.select().from(timeEntries).where(and(eq(timeEntries.id, entryId), eq(timeEntries.userId, userId)));
  if (!existing) return res.status(404).json({ success: false, error: "Entry not found" });
  if (existing.status !== "draft") return res.status(400).json({ success: false, error: "Only draft entries can be deleted" });
  await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
  res.json({ success: true, data: null });
});

// Timer start/stop
router.post("/timer/start", async (req, res) => {
  const userId = req.user!.userId;
  const { projectId, taskDescription } = req.body;
  await db.update(timeEntries).set({ isRunning: false, endTime: new Date() }).where(and(eq(timeEntries.userId, userId), eq(timeEntries.isRunning, true)));
  const [entry] = await db.insert(timeEntries).values({
    userId,
    projectId: projectId || null,
    taskDescription: taskDescription || "Running timer",
    startTime: new Date(),
    isRunning: true,
    status: "draft",
  }).returning();
  res.status(201).json({ success: true, data: entry });
});

router.post("/timer/stop", async (req, res) => {
  const userId = req.user!.userId;
  const [running] = await db.select().from(timeEntries).where(and(eq(timeEntries.userId, userId), eq(timeEntries.isRunning, true)));
  if (!running) return res.status(404).json({ success: false, error: "No running timer" });
  const now = new Date();
  const durationMs = now.getTime() - (running.startTime?.getTime() || now.getTime());
  const durationMinutes = Math.round(durationMs / 60000);
  const [entry] = await db.update(timeEntries).set({ isRunning: false, endTime: now, durationMinutes }).where(eq(timeEntries.id, running.id)).returning();
  res.json({ success: true, data: entry });
});

router.get("/timer/running", async (req, res) => {
  const userId = req.user!.userId;
  const [running] = await db.select().from(timeEntries).where(and(eq(timeEntries.userId, userId), eq(timeEntries.isRunning, true)));
  res.json({ success: true, data: running || null });
});

// Weekly summary
router.get("/weekly", async (req, res) => {
  const userId = req.user!.userId;
  const weekStart = req.query.start ? new Date(req.query.start as string) : new Date();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const entries = await db.select().from(timeEntries).where(
    and(eq(timeEntries.userId, userId), gte(timeEntries.startTime, weekStart), lte(timeEntries.startTime, weekEnd))
  );
  res.json({ success: true, data: entries });
});

// Export CSV
router.get("/export/csv", async (req, res) => {
  const userId = req.user!.userId;
  const entries = await db.select().from(timeEntries).where(eq(timeEntries.userId, userId)).orderBy(asc(timeEntries.startTime));
  const rows = [["Date", "Project", "Task", "Duration (min)", "Billable", "Hourly Rate", "Status", "Notes"]];
  for (const e of entries) {
    rows.push([
      e.startTime?.toISOString().split("T")[0] || "",
      String(e.projectId || ""),
      e.taskDescription,
      String(e.durationMinutes || ""),
      e.billable ? "Yes" : "No",
      String(e.hourlyRate || ""),
      e.status || "",
      e.notes || "",
    ]);
  }
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=time-entries.csv");
  res.send(csv);
});

// ── Time Reports (Timesheets) ─────────────────────────────────────────────────

// List reports: employees see own, managers/admins see reports where they are the approver or admin sees all
router.get("/reports", async (req, res) => {
  const userId = req.user!.userId;
  const role = req.user!.role;

  // Fetch the current user to check canApprove
  const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
  const isManager = role === "admin" || currentUser?.canApprove;

  if (isManager && req.query.all === "1") {
    // Return all pending/submitted reports for managers to approve
    const reports = await db.select({
      id: timeReports.id,
      employeeId: timeReports.employeeId,
      periodStart: timeReports.periodStart,
      periodEnd: timeReports.periodEnd,
      totalHours: timeReports.totalHours,
      status: timeReports.status,
      mode: timeReports.mode,
      simpleDayHours: timeReports.simpleDayHours,
      notes: timeReports.notes,
      submittedAt: timeReports.submittedAt,
      approvedBy: timeReports.approvedBy,
      approvedAt: timeReports.approvedAt,
      rejectReason: timeReports.rejectReason,
      employeeFirstName: users.firstName,
      employeeLastName: users.lastName,
      employeeEmail: users.email,
    })
      .from(timeReports)
      .innerJoin(users, eq(timeReports.employeeId, users.id))
      .where(
        role === "admin"
          ? eq(timeReports.status, "submitted")
          : and(eq(timeReports.status, "submitted"), eq(users.approverId, userId))
      )
      .orderBy(desc(timeReports.submittedAt));
    return res.json({ success: true, data: reports });
  }

  // Employee: own reports
  const myReports = await db.select().from(timeReports)
    .where(eq(timeReports.employeeId, userId))
    .orderBy(desc(timeReports.periodStart));
  res.json({ success: true, data: myReports });
});

router.post("/reports", async (req, res) => {
  const userId = req.user!.userId;
  const { periodStart, periodEnd, totalHours, mode, simpleDayHours, notes } = req.body;
  if (!periodStart || !periodEnd) return res.status(400).json({ success: false, error: "Period start and end required" });

  const [report] = await db.insert(timeReports).values({
    employeeId: userId,
    periodStart: new Date(periodStart),
    periodEnd: new Date(periodEnd),
    totalHours: totalHours || "0",
    totalBillable: "0",
    status: "draft",
    mode: mode || "simple",
    simpleDayHours: simpleDayHours ? JSON.stringify(simpleDayHours) : null,
    notes: notes || null,
  }).returning();
  res.status(201).json({ success: true, data: report });
});

router.patch("/reports/:id", async (req, res) => {
  const userId = req.user!.userId;
  const reportId = parseInt(req.params.id);
  const [existing] = await db.select().from(timeReports).where(and(eq(timeReports.id, reportId), eq(timeReports.employeeId, userId)));
  if (!existing) return res.status(404).json({ success: false, error: "Report not found" });
  if (existing.status !== "draft") return res.status(400).json({ success: false, error: "Only draft reports can be edited" });

  const { totalHours, simpleDayHours, notes } = req.body;
  const [report] = await db.update(timeReports).set({
    totalHours: totalHours !== undefined ? totalHours : existing.totalHours,
    simpleDayHours: simpleDayHours !== undefined ? JSON.stringify(simpleDayHours) : existing.simpleDayHours,
    notes: notes !== undefined ? notes : existing.notes,
  }).where(eq(timeReports.id, reportId)).returning();
  res.json({ success: true, data: report });
});

router.patch("/reports/:id/submit", async (req, res) => {
  const userId = req.user!.userId;
  const reportId = parseInt(req.params.id);
  const { totalHours, simpleDayHours, notes } = req.body;
  const [report] = await db.update(timeReports).set({
    status: "submitted",
    submittedAt: new Date(),
    totalHours: totalHours !== undefined ? totalHours : undefined,
    simpleDayHours: simpleDayHours !== undefined ? JSON.stringify(simpleDayHours) : undefined,
    notes: notes !== undefined ? notes : undefined,
  }).where(and(eq(timeReports.id, reportId), eq(timeReports.employeeId, userId))).returning();
  if (!report) return res.status(404).json({ success: false, error: "Report not found" });
  res.json({ success: true, data: report });
});

router.patch("/reports/:id/approve", async (req, res) => {
  const approverId = req.user!.userId;
  const role = req.user!.role;
  const [currentUser] = await db.select().from(users).where(eq(users.id, approverId));
  if (role !== "admin" && !currentUser?.canApprove) {
    return res.status(403).json({ success: false, error: "Not authorized to approve timesheets" });
  }
  const [report] = await db.update(timeReports).set({ status: "approved", approvedBy: approverId, approvedAt: new Date() }).where(eq(timeReports.id, parseInt(req.params.id))).returning();
  if (!report) return res.status(404).json({ success: false, error: "Report not found" });
  res.json({ success: true, data: report });
});

router.patch("/reports/:id/reject", async (req, res) => {
  const approverId = req.user!.userId;
  const role = req.user!.role;
  const [currentUser] = await db.select().from(users).where(eq(users.id, approverId));
  if (role !== "admin" && !currentUser?.canApprove) {
    return res.status(403).json({ success: false, error: "Not authorized to reject timesheets" });
  }
  const { reason } = req.body;
  const [report] = await db.update(timeReports).set({ status: "rejected", rejectReason: reason || "Rejected" }).where(eq(timeReports.id, parseInt(req.params.id))).returning();
  if (!report) return res.status(404).json({ success: false, error: "Report not found" });
  res.json({ success: true, data: report });
});

// ── Monthly Report ────────────────────────────────────────────────────────────

router.get("/monthly-report", async (req, res) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  const { month, employeeId } = req.query; // month = "2026-03"

  if (!month || !/^\d{4}-\d{2}$/.test(month as string)) {
    return res.status(400).json({ success: false, error: "month param required in YYYY-MM format" });
  }

  const [year, mon] = (month as string).split("-").map(Number);
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 0, 23, 59, 59, 999);

  // Check if current user is manager/admin
  const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
  const isManager = role === "admin" || currentUser?.canApprove;

  // Determine which employees to include
  let employeeFilter: number[] | null = null;
  if (!isManager) {
    employeeFilter = [userId]; // regular employees only see themselves
  } else if (employeeId && employeeId !== "all") {
    employeeFilter = [parseInt(employeeId as string)];
  }
  // else: all employees (admin/manager with employeeId="all")

  // Fetch all timesheets in the month range
  const allReports = await db
    .select({
      id: timeReports.id,
      employeeId: timeReports.employeeId,
      periodStart: timeReports.periodStart,
      periodEnd: timeReports.periodEnd,
      totalHours: timeReports.totalHours,
      status: timeReports.status,
      mode: timeReports.mode,
      simpleDayHours: timeReports.simpleDayHours,
      notes: timeReports.notes,
      submittedAt: timeReports.submittedAt,
      approvedAt: timeReports.approvedAt,
      employeeFirstName: users.firstName,
      employeeLastName: users.lastName,
      employeeEmail: users.email,
    })
    .from(timeReports)
    .innerJoin(users, eq(timeReports.employeeId, users.id))
    .where(
      and(
        gte(timeReports.periodStart, monthStart),
        lte(timeReports.periodStart, monthEnd),
        ...(employeeFilter ? [inArray(timeReports.employeeId, employeeFilter)] : [])
      )
    )
    .orderBy(asc(users.firstName), asc(timeReports.periodStart));

  // Group by employee
  const byEmployee = new Map<number, any>();
  for (const r of allReports) {
    if (!byEmployee.has(r.employeeId)) {
      byEmployee.set(r.employeeId, {
        id: r.employeeId,
        firstName: r.employeeFirstName,
        lastName: r.employeeLastName,
        email: r.employeeEmail,
        timesheets: [],
        monthTotalHours: 0,
        approvedHours: 0,
        pendingHours: 0,
        rejectedHours: 0,
      });
    }
    const emp = byEmployee.get(r.employeeId)!;
    const hrs = parseFloat(r.totalHours || "0");
    emp.timesheets.push(r);
    emp.monthTotalHours += hrs;
    if (r.status === "approved") emp.approvedHours += hrs;
    else if (r.status === "submitted") emp.pendingHours += hrs;
    else if (r.status === "rejected") emp.rejectedHours += hrs;
  }

  // CSV export?
  if (req.query.format === "csv") {
    const rows = [["Employee", "Email", "Week Start", "Week End", "Total Hours", "Status", "Mode", "Notes"]];
    for (const r of allReports) {
      rows.push([
        `${r.employeeFirstName} ${r.employeeLastName}`,
        r.employeeEmail,
        r.periodStart.toISOString().split("T")[0],
        r.periodEnd.toISOString().split("T")[0],
        r.totalHours || "0",
        r.status || "",
        r.mode || "",
        r.notes || "",
      ]);
    }
    const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=timesheet-report-${month}.csv`);
    return res.send(csv);
  }

  res.json({
    success: true,
    data: {
      month: month as string,
      employees: Array.from(byEmployee.values()),
    },
  });
});

export default router;
