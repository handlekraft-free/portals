import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import { expenseReports, expenseItems, expenseCategories, users } from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { requireEmployee } from "./auth-middleware";

const router: Router = createRouter();
router.use(requireEmployee as any);

// ── Categories ───────────────────────────────────────────────────────────────

router.get("/categories", async (_req, res) => {
  const cats = await db.select().from(expenseCategories).where(eq(expenseCategories.active, true)).orderBy(asc(expenseCategories.name));
  res.json({ success: true, data: cats });
});

// ── Reports ──────────────────────────────────────────────────────────────────

router.get("/reports", async (req, res) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  const wantAll = req.query.all === "1";
  const canSeeAll = role === "admin" || role === "manager";

  let reports;
  if (canSeeAll && wantAll) {
    // Approver inbox: all submitted (and beyond) reports with employee names
    reports = await db
      .select({
        id: expenseReports.id,
        userId: expenseReports.userId,
        title: expenseReports.title,
        status: expenseReports.status,
        totalAmount: expenseReports.totalAmount,
        periodStart: expenseReports.periodStart,
        periodEnd: expenseReports.periodEnd,
        notes: expenseReports.notes,
        submittedAt: expenseReports.submittedAt,
        approvedAt: expenseReports.approvedAt,
        rejectReason: expenseReports.rejectReason,
        createdAt: expenseReports.createdAt,
        employeeFirstName: users.firstName,
        employeeLastName: users.lastName,
        employeeEmail: users.email,
      })
      .from(expenseReports)
      .innerJoin(users, eq(expenseReports.userId, users.id))
      .orderBy(desc(expenseReports.createdAt));
  } else if (role === "admin") {
    reports = await db.select().from(expenseReports).orderBy(desc(expenseReports.createdAt));
  } else {
    reports = await db.select().from(expenseReports).where(eq(expenseReports.userId, userId)).orderBy(desc(expenseReports.createdAt));
  }
  res.json({ success: true, data: reports });
});

router.post("/reports", async (req, res) => {
  const userId = req.user!.userId;
  const { title, periodStart, periodEnd, notes } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Title required" });
  const [report] = await db.insert(expenseReports).values({
    userId, title, periodStart: periodStart ? new Date(periodStart) : null,
    periodEnd: periodEnd ? new Date(periodEnd) : null, notes: notes || null,
  }).returning();
  res.status(201).json({ success: true, data: report });
});

router.get("/reports/:id", async (req, res) => {
  const reportId = parseInt(req.params.id);
  const [report] = await db.select().from(expenseReports).where(eq(expenseReports.id, reportId));
  if (!report) return res.status(404).json({ success: false, error: "Report not found" });
  const items = await db.select({ item: expenseItems, category: expenseCategories }).from(expenseItems).leftJoin(expenseCategories, eq(expenseItems.categoryId, expenseCategories.id)).where(eq(expenseItems.reportId, reportId)).orderBy(asc(expenseItems.createdAt));
  res.json({ success: true, data: { ...report, items: items.map(i => ({ ...i.item, category: i.category })) } });
});

router.patch("/reports/:id", async (req, res) => {
  const { title, periodStart, periodEnd, notes } = req.body;
  const [report] = await db.update(expenseReports).set({ title, periodStart: periodStart ? new Date(periodStart) : undefined, periodEnd: periodEnd ? new Date(periodEnd) : undefined, notes }).where(eq(expenseReports.id, parseInt(req.params.id))).returning();
  res.json({ success: true, data: report });
});

router.patch("/reports/:id/submit", async (req, res) => {
  const userId = req.user!.userId;
  const [report] = await db.update(expenseReports).set({ status: "submitted", submittedAt: new Date() }).where(and(eq(expenseReports.id, parseInt(req.params.id)), eq(expenseReports.userId, userId))).returning();
  if (!report) return res.status(404).json({ success: false, error: "Report not found" });
  console.log(`[Notification] Expense report ${report.id} submitted by user ${userId}`);
  res.json({ success: true, data: report });
});

router.patch("/reports/:id/approve", async (req, res) => {
  const approverId = req.user!.userId;
  const role = req.user!.role;
  if (role !== "admin" && role !== "manager") {
    return res.status(403).json({ success: false, error: "Not authorized to approve expense reports" });
  }
  const [report] = await db.update(expenseReports).set({ status: "approved", approvedBy: approverId, approvedAt: new Date() }).where(eq(expenseReports.id, parseInt(req.params.id))).returning();
  if (!report) return res.status(404).json({ success: false, error: "Report not found" });
  console.log(`[Notification] Expense report ${report.id} approved by ${approverId}`);
  res.json({ success: true, data: report });
});

router.patch("/reports/:id/reject", async (req, res) => {
  const role = req.user!.role;
  if (role !== "admin" && role !== "manager") {
    return res.status(403).json({ success: false, error: "Not authorized to reject expense reports" });
  }
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, error: "Rejection reason required" });
  const [report] = await db.update(expenseReports).set({ status: "rejected", rejectReason: reason }).where(eq(expenseReports.id, parseInt(req.params.id))).returning();
  if (!report) return res.status(404).json({ success: false, error: "Report not found" });
  console.log(`[Notification] Expense report ${report.id} rejected: ${reason}`);
  res.json({ success: true, data: report });
});

// ── Items ────────────────────────────────────────────────────────────────────

router.post("/items", async (req, res) => {
  const userId = req.user!.userId;
  const { reportId, date, vendor, description, categoryId, amount, currency, billable, clientId, projectId } = req.body;
  if (!reportId || !date || !vendor || !description || !amount) return res.status(400).json({ success: false, error: "reportId, date, vendor, description, amount required" });
  // Get QB code from category
  let qbCode = null;
  if (categoryId) {
    const [cat] = await db.select().from(expenseCategories).where(eq(expenseCategories.id, parseInt(categoryId)));
    qbCode = cat?.qbAccountCode || null;
  }
  const [item] = await db.insert(expenseItems).values({
    reportId: parseInt(reportId), userId, date: new Date(date), vendor, description, categoryId: categoryId ? parseInt(categoryId) : null,
    amount, currency: currency || "USD", billable: billable || false, clientId: clientId || null, projectId: projectId || null, qbAccountCode: qbCode,
  }).returning();
  // Update report total
  await db.execute(sql`UPDATE expense_reports SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM expense_items WHERE report_id = ${parseInt(reportId)}) WHERE id = ${parseInt(reportId)}`);
  res.status(201).json({ success: true, data: item });
});

router.patch("/items/:id", async (req, res) => {
  const { date, vendor, description, categoryId, amount, currency, billable } = req.body;
  let qbCode = undefined;
  if (categoryId) {
    const [cat] = await db.select().from(expenseCategories).where(eq(expenseCategories.id, parseInt(categoryId)));
    qbCode = cat?.qbAccountCode || null;
  }
  const [item] = await db.update(expenseItems).set({
    ...(date && { date: new Date(date) }), ...(vendor && { vendor }), ...(description && { description }),
    ...(categoryId && { categoryId: parseInt(categoryId), qbAccountCode: qbCode }),
    ...(amount && { amount }), ...(currency && { currency }), ...(billable !== undefined && { billable }),
  }).where(eq(expenseItems.id, parseInt(req.params.id))).returning();
  res.json({ success: true, data: item });
});

router.delete("/items/:id", async (req, res) => {
  const [item] = await db.delete(expenseItems).where(eq(expenseItems.id, parseInt(req.params.id))).returning();
  if (item) {
    await db.execute(sql`UPDATE expense_reports SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM expense_items WHERE report_id = ${item.reportId}) WHERE id = ${item.reportId}`);
  }
  res.json({ success: true, data: null });
});

// ── QuickBooks Export ─────────────────────────────────────────────────────────

router.get("/reports/:id/export/csv", async (req, res) => {
  const reportId = parseInt(req.params.id);
  const items = await db.select({ item: expenseItems, category: expenseCategories }).from(expenseItems).leftJoin(expenseCategories, eq(expenseItems.categoryId, expenseCategories.id)).where(eq(expenseItems.reportId, reportId));
  const rows = [["Date", "Vendor", "Description", "Category", "QB Account Code", "QB Account Name", "Amount", "Currency", "Billable", "Client", "Project"]];
  for (const { item, category } of items) {
    rows.push([
      item.date?.toISOString().split("T")[0] || "",
      item.vendor, item.description,
      category?.name || "",
      category?.qbAccountCode || "",
      category?.qbAccountName || "",
      item.amount?.toString() || "", item.currency || "USD",
      item.billable ? "Yes" : "No",
      item.clientId?.toString() || "", item.projectId?.toString() || "",
    ]);
  }
  await db.update(expenseReports).set({ status: "exported", qbExportDate: new Date() }).where(eq(expenseReports.id, reportId));
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=expense-report-${reportId}.csv`);
  res.send(csv);
});

router.get("/reports/:id/export/iif", async (req, res) => {
  const reportId = parseInt(req.params.id);
  const [report] = await db.select().from(expenseReports).where(eq(expenseReports.id, reportId));
  const items = await db.select({ item: expenseItems, category: expenseCategories }).from(expenseItems).leftJoin(expenseCategories, eq(expenseItems.categoryId, expenseCategories.id)).where(eq(expenseItems.reportId, reportId));
  let iif = "!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\n";
  iif += "!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\n";
  iif += "!ENDTRNS\n";
  for (const { item, category } of items) {
    const dateStr = item.date?.toLocaleDateString("en-US") || "";
    iif += `TRNS\tCHECK\t${dateStr}\tAccounts Payable\t${item.vendor}\t-${item.amount}\t${item.description}\n`;
    iif += `SPL\tCHECK\t${dateStr}\t${category?.qbAccountCode || "69000"} ${category?.qbAccountName || "Other Expense"}\t${item.vendor}\t${item.amount}\t${item.description}\n`;
    iif += "ENDTRNS\n";
  }
  await db.update(expenseReports).set({ status: "exported", qbExportDate: new Date() }).where(eq(expenseReports.id, reportId));
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename=expense-report-${reportId}.iif`);
  res.send(iif);
});

export default router;
