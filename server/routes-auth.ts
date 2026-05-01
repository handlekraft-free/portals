import type { Router } from "express";
import { Router as createRouter } from "express";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "./auth-middleware";

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

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    boardRestrictedAccess: (user as any).boardRestrictedAccess ?? false,
  });

  res.cookie("hk_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      mustChangePassword: user.mustChangePassword,
      boardRestrictedAccess: (user as any).boardRestrictedAccess ?? false,
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

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("hk_token");
  res.json({ success: true, data: null });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId));
  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      mustChangePassword: user.mustChangePassword,
      status: user.status,
      canApprove: user.canApprove,
      approverId: user.approverId,
      boardRestrictedAccess: (user as any).boardRestrictedAccess ?? false,
    },
  });
});

export default router;
