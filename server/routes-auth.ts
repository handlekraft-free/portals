import type { Router } from "express";
import { Router as createRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "./db";
import {
  users,
  directMessageConversations, directMessageEntries,
  messages as clientMessages,
  kanbanCards, supportTickets, timeReports,
} from "@shared/schema";
import { eq, or, ne, isNull, and, lt, gte, lte, inArray } from "drizzle-orm";
import { signToken, requireAuth, signPendingToken, verifyPendingToken } from "./auth-middleware";
import type { JwtPayload } from "./auth-middleware";

const router: Router = createRouter();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password required" });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
  if (!user) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }

  if (user.status === "inactive") {
    return res.status(403).json({ success: false, error: "Account is deactivated. Please contact support." });
  }

  // Check lockout
  if (user.lockedUntil && new Date() < user.lockedUntil) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return res.status(429).json({ success: false, error: `Account locked. Try again in ${minutes} minute(s).` });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = (user.loginAttempts || 0) + 1;
    const updateData: any = { loginAttempts: attempts };
    if (attempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await db.update(users).set(updateData).where(eq(users.id, user.id));
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }

  // Reset lockout on success
  await db.update(users).set({ loginAttempts: 0, lockedUntil: null, lastLogin: new Date() }).where(eq(users.id, user.id));

  // Determine all roles for this user
  const userRoles: string[] = (user.roles && user.roles.length > 0) ? user.roles : [user.role];

  // If user has multiple roles, require role selection before issuing JWT
  if (userRoles.length > 1) {
    const pendingToken = signPendingToken({ userId: user.id, pending: true });
    return res.json({
      success: true,
      data: {
        requiresRoleSelection: true,
        roles: userRoles,
        pendingToken,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  }

  // Single role — issue JWT immediately
  const chosenRole = userRoles[0] as "admin" | "employee" | "client" | "student" | "board";
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: chosenRole,
    firstName: user.firstName,
    lastName: user.lastName,
    boardRestrictedAccess: user.boardRestrictedAccess ?? false,
  });

  res.cookie("hk_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: chosenRole,
      firstName: user.firstName,
      lastName: user.lastName,
      mustChangePassword: user.mustChangePassword,
      onboardingComplete: user.onboardingComplete ?? false,
      boardRestrictedAccess: user.boardRestrictedAccess ?? false,
    },
  });
});

// POST /api/auth/select-role  (used when user has multiple roles)
router.post("/select-role", async (req, res) => {
  const { pendingToken, role } = req.body;
  if (!pendingToken || !role) {
    return res.status(400).json({ success: false, error: "pendingToken and role are required" });
  }

  const pending = verifyPendingToken(pendingToken);
  if (!pending) {
    return res.status(401).json({ success: false, error: "Pending session expired. Please sign in again." });
  }

  const [user] = await db.select().from(users).where(eq(users.id, pending.userId));
  if (!user || user.status === "inactive") {
    return res.status(401).json({ success: false, error: "Invalid session" });
  }

  const userRoles: string[] = (user.roles && user.roles.length > 0) ? user.roles : [user.role];
  if (!userRoles.includes(role)) {
    return res.status(403).json({ success: false, error: "Role not assigned to this account" });
  }

  const chosenRole = role as "admin" | "employee" | "client" | "student" | "board";
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: chosenRole,
    firstName: user.firstName,
    lastName: user.lastName,
    boardRestrictedAccess: user.boardRestrictedAccess ?? false,
  });

  res.cookie("hk_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: chosenRole,
      firstName: user.firstName,
      lastName: user.lastName,
      mustChangePassword: user.mustChangePassword,
      onboardingComplete: user.onboardingComplete ?? false,
      boardRestrictedAccess: user.boardRestrictedAccess ?? false,
    },
  });
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: "Both current and new password are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: "New password must be at least 8 characters." });
  }

  const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId));
  if (!user) return res.status(404).json({ success: false, error: "User not found." });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, error: "Current password is incorrect." });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.update(users)
    .set({ passwordHash: newHash, mustChangePassword: false })
    .where(eq(users.id, user.id));

  return res.json({ success: true, data: null });
});

// POST /api/auth/switch-portal — in-session portal switch for multi-role users
router.post("/switch-portal", requireAuth, async (req, res) => {
  const { role } = req.body;
  if (!role) return res.status(400).json({ success: false, error: "Role required" });

  const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId));
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const availableRoles: string[] = (user.roles && user.roles.length > 0) ? user.roles : [user.role];
  if (!availableRoles.includes(role)) {
    return res.status(403).json({ success: false, error: "Role not available for this user" });
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: role as JwtPayload["role"],
    firstName: user.firstName,
    lastName: user.lastName,
    boardRestrictedAccess: user.boardRestrictedAccess ?? false,
  });

  res.cookie("hk_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({ success: true, data: { role } });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("hk_token");
  res.json({ success: true, data: null });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId));
  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  // Use the role from the JWT (the role the user selected at login),
  // NOT user.role from the DB — for multi-role users these differ.
  const sessionRole = req.user!.role;
  const availableRoles: string[] = (user.roles && user.roles.length > 0) ? user.roles : [user.role];
  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: sessionRole,
      availableRoles,
      firstName: user.firstName,
      lastName: user.lastName,
      mustChangePassword: user.mustChangePassword,
      onboardingComplete: user.onboardingComplete ?? false,
      status: user.status,
      canApprove: user.canApprove,
      approverId: user.approverId,
      boardRestrictedAccess: user.boardRestrictedAccess ?? false,
      crewBond: user.crewBond ?? 0,
      avatarConfig: user.avatarConfig ?? null,
      sagaRecapEnabled: user.sagaRecapEnabled ?? true,
      sagaRecapTime: user.sagaRecapTime ?? "17:00",
      soundMuted: user.soundMuted ?? [],
    },
  });
});

// Avatar config shape — mirrors shared/schema.ts users.avatarConfig.
type AvatarConfigShape = {
  helm?: string | null;
  cloak?: string | null;
  beard?: string | null;
  emblem?: string | null;
};
function pickStrOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

// PATCH /api/auth/avatar — save cosmetic avatar layers (helm/cloak/beard/emblem).
// Server enforces rank thresholds: a layer set above the user's rank is silently
// stripped (no error), so the client never has to reconcile divergent state.
router.patch("/avatar", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const body = (req.body ?? {}) as Partial<AvatarConfigShape>;
  const config: AvatarConfigShape = {
    helm:   pickStrOrNull(body.helm),
    cloak:  pickStrOrNull(body.cloak),
    beard:  pickStrOrNull(body.beard),
    emblem: pickStrOrNull(body.emblem),
  };
  // Compute current rank for unlock gating
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) return res.status(404).json({ success: false, error: "User not found" });
  const xp = (u as { xpTotal?: number | null }).xpTotal ?? 0;
  // Mirror shared/xp.ts thresholds (Thrall=0, Karl=200, Jarl=600, Hersir=1500, Skald=3000, Konungr=6000)
  const unlock = {
    helm:   xp >= 200,
    cloak:  xp >= 1500,   // Hersir
    beard:  xp >= 600,    // Jarl
    emblem: xp >= 6000,   // Konungr
  };
  if (!unlock.helm)   config.helm   = null;
  if (!unlock.cloak)  config.cloak  = null;
  if (!unlock.beard)  config.beard  = null;
  if (!unlock.emblem) config.emblem = null;
  await db.update(users).set({ avatarConfig: config }).where(eq(users.id, userId));
  res.json({ success: true, data: { avatarConfig: config, unlock } });
});

// PATCH /api/auth/sound-prefs — per-event sound opt-out list. Body shape:
// { muted: string[] } — empty list means everything is on (subject to global mute).
router.patch("/sound-prefs", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const raw = Array.isArray(req.body?.muted) ? req.body.muted : [];
  const allowed = new Set(["drum", "horn", "parchment", "lute"]);
  const muted = (raw as unknown[]).filter((s): s is string => typeof s === "string" && allowed.has(s));
  await db.update(users).set({ soundMuted: muted }).where(eq(users.id, userId));
  res.json({ success: true, data: { muted } });
});

// PATCH /api/auth/saga-recap-prefs — saga recap toggle + scheduled time
router.patch("/saga-recap-prefs", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const enabled = typeof req.body?.enabled === "boolean" ? req.body.enabled : undefined;
  const time = typeof req.body?.time === "string" ? req.body.time : undefined;
  const patch: Record<string, unknown> = {};
  if (enabled !== undefined) patch.sagaRecapEnabled = enabled;
  if (time !== undefined && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)) patch.sagaRecapTime = time;
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ success: false, error: "Nothing to update" });
  }
  await db.update(users).set(patch).where(eq(users.id, userId));
  res.json({ success: true, data: patch });
});

// GET /api/auth/nav-counts — single lightweight call for all sidebar badge counts
router.get("/nav-counts", requireAuth as any, async (req: any, res) => {
  const userId = req.user.userId;
  const role   = req.user.role as string;
  const now    = new Date();

  try {
    // ── DM unread ──────────────────────────────────────────────────────────
    const myConvs = await db
      .select({ id: directMessageConversations.id })
      .from(directMessageConversations)
      .where(or(
        eq(directMessageConversations.user1Id, userId),
        eq(directMessageConversations.user2Id, userId),
      ));

    let dmUnread = 0;
    if (myConvs.length > 0) {
      const convIds = myConvs.map(c => c.id);
      const unreadRows = await db
        .select({ id: directMessageEntries.id })
        .from(directMessageEntries)
        .where(and(
          inArray(directMessageEntries.conversationId, convIds),
          ne(directMessageEntries.senderId, userId),
          isNull(directMessageEntries.readAt),
        ));
      dmUnread = unreadRows.length;
    }

    // ── Client messages unread (employee/admin only) ───────────────────────
    let clientMsgUnread = 0;
    if (role === "admin" || role === "employee") {
      const rows = await db
        .select({ id: clientMessages.id })
        .from(clientMessages)
        .where(and(
          eq(clientMessages.recipientId, userId),
          eq(clientMessages.read, false),
        ));
      clientMsgUnread = rows.length;
    }

    // ── Overdue kanban tasks (employee/admin only) ─────────────────────────
    let overdueTaskCount = 0;
    if (role === "admin" || role === "employee") {
      const rows = await db
        .select({ id: kanbanCards.id })
        .from(kanbanCards)
        .where(and(
          eq(kanbanCards.assignedTo, userId),
          eq(kanbanCards.archived, false),
          lt(kanbanCards.dueDate, now),
        ));
      overdueTaskCount = rows.length;
    }

    // ── Open support tickets (employee/admin only) ─────────────────────────
    let openTicketCount = 0;
    if (role === "admin" || role === "employee") {
      const rows = await db
        .select({ id: supportTickets.id })
        .from(supportTickets)
        .where(inArray(supportTickets.status, ["open", "in_progress"]));
      openTicketCount = rows.length;
    }

    // ── Timesheet due last month (employee/admin only) ─────────────────────
    let timesheetDue = false;
    if (role === "admin" || role === "employee") {
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const lastMonthNum  = now.getMonth() === 0 ? 12 : now.getMonth();
      const monthStart    = new Date(lastMonthYear, lastMonthNum - 1, 1);
      const monthEnd      = new Date(lastMonthYear, lastMonthNum, 0, 23, 59, 59, 999);
      const submitted = await db
        .select({ id: timeReports.id })
        .from(timeReports)
        .where(and(
          eq(timeReports.employeeId, userId),
          gte(timeReports.periodStart, monthStart),
          lte(timeReports.periodStart, monthEnd),
          inArray(timeReports.status, ["submitted", "approved"]),
        ))
        .limit(1);
      timesheetDue = submitted.length === 0;
    }

    res.json({
      success: true,
      data: { dmUnread, clientMsgUnread, overdueTaskCount, openTicketCount, timesheetDue },
    });
  } catch (err) {
    console.error("[nav-counts]", err);
    res.json({ success: true, data: { dmUnread: 0, clientMsgUnread: 0, overdueTaskCount: 0, openTicketCount: 0, timesheetDue: false } });
  }
});

export default router;
