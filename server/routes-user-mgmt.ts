import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, ne, desc } from "drizzle-orm";
import { requireAdmin } from "./auth-middleware";
import bcrypt from "bcryptjs";

const router: Router = createRouter();
router.use(requireAdmin as any);

// GET /api/admin/portal-users
router.get("/", async (_req, res) => {
  const all = await db.select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, role: users.role, status: users.status, lastLogin: users.lastLogin, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt));
  const stats = { admin: 0, employee: 0, client: 0, student: 0 };
  for (const u of all) { if (u.role in stats) stats[u.role as keyof typeof stats]++; }
  res.json({ success: true, data: all, stats });
});

router.post("/", async (req, res) => {
  const { email, firstName, lastName, role, password } = req.body;
  if (!email || !firstName || !lastName || !role || !password) return res.status(400).json({ success: false, error: "All fields required" });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const [user] = await db.insert(users).values({ email: email.toLowerCase(), passwordHash, firstName, lastName, role, status: "active", mustChangePassword: true }).returning({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, role: users.role, status: users.status });
    res.status(201).json({ success: true, data: user });
  } catch (e: any) {
    if (e.code === "23505") return res.status(400).json({ success: false, error: "Email already exists" });
    throw e;
  }
});

router.patch("/:id", async (req, res) => {
  const { role, status } = req.body;
  const [user] = await db.update(users).set({ ...(role && { role }), ...(status && { status }) }).where(eq(users.id, parseInt(req.params.id))).returning({ id: users.id, email: users.email, role: users.role, status: users.status });
  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  res.json({ success: true, data: user });
});

router.post("/:id/reset-password", async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, error: "New password required" });
  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(users).set({ passwordHash, mustChangePassword: true }).where(eq(users.id, parseInt(req.params.id)));
  res.json({ success: true, data: { message: "Password reset" } });
});

router.post("/bulk", async (req, res) => {
  const { ids, action } = req.body;
  if (!ids || !action) return res.status(400).json({ success: false, error: "ids and action required" });
  const status = action === "activate" ? "active" : "inactive";
  for (const id of ids) {
    await db.update(users).set({ status }).where(eq(users.id, parseInt(id)));
  }
  res.json({ success: true, data: { updated: ids.length } });
});

router.get("/export/csv", async (_req, res) => {
  const all = await db.select().from(users).orderBy(desc(users.createdAt));
  const rows = [["ID", "Email", "First Name", "Last Name", "Role", "Status", "Last Login", "Created At"]];
  for (const u of all) {
    rows.push([String(u.id), u.email, u.firstName, u.lastName, u.role, u.status, u.lastLogin?.toISOString() || "", u.createdAt.toISOString()]);
  }
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=portal-users.csv");
  res.send(csv);
});

export default router;
