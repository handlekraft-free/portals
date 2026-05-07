import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isRoleEnabled } from "./portals";

const JWT_SECRET = process.env.JWT_SECRET || "open-portals-dev-secret-CHANGE-IN-PRODUCTION";

export interface JwtPayload {
  userId: number;
  email: string;
  role: "admin" | "employee" | "client" | "student" | "board";
  firstName: string;
  lastName: string;
  boardRestrictedAccess?: boolean;
}

export interface PendingAuthPayload {
  userId: number;
  pending: true;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      _userRoles?: string[];
    }
  }
}

// Returns the union of the JWT's active role and the user record's `roles` array.
// Cached on the request so we add at most one DB hit per request, regardless of
// how many guard helpers fire. Falls back to the JWT role alone on any error so
// guards never block legitimate traffic on a transient lookup failure.
async function getEffectiveRoles(req: Request): Promise<string[]> {
  if (req._userRoles) return req._userRoles;
  const jwtRole = req.user?.role;
  const base = jwtRole ? [jwtRole] : [];
  if (!req.user?.userId) {
    req._userRoles = base;
    return base;
  }
  try {
    const [row] = await db
      .select({ role: users.role, roles: users.roles })
      .from(users)
      .where(eq(users.id, req.user.userId));
    const all = new Set<string>(base);
    if (row?.role) all.add(row.role);
    if (row?.roles) for (const r of row.roles) if (r) all.add(r);
    const out = Array.from(all);
    req._userRoles = out;
    return out;
  } catch {
    req._userRoles = base;
    return base;
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function signPendingToken(payload: PendingAuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "5m" });
}

export function verifyPendingToken(token: string): PendingAuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded.pending) return null;
    return decoded as PendingAuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.hk_token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, error: "Authentication required" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ success: false, error: "Invalid or expired token" });
  // Reject stale tokens whose role was disabled after issuance.
  // (Admin always passes; other roles must be in ENABLED_PORTALS.)
  if (!isRoleEnabled(payload.role)) {
    res.clearCookie("hk_token");
    return res.status(403).json({ success: false, error: "That portal is not enabled on this deployment." });
  }
  req.user = payload;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, async () => {
      if (!req.user) {
        return res.status(403).json({ success: false, error: "Insufficient permissions" });
      }
      // Fast path: the active JWT role matches.
      if (roles.includes(req.user.role)) return next();
      // Multi-role fallback: a viewer whose primary role differs but whose
      // user record's `roles` array includes one of the allowed roles is
      // still permitted. This makes board-eligible employees, etc., reach
      // their other portals' APIs without needing to switch sessions first.
      const effective = await getEffectiveRoles(req);
      if (effective.some(r => roles.includes(r))) return next();
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    });
  };
}

export const requireEmployee = requireRole("admin", "employee");
export const requireClient = requireRole("client");
export const requireStudent = requireRole("student");
export const requireAdmin = requireRole("admin");
export const requireBoard = requireRole("admin", "board");
export const requireAnyPortalUser = requireRole("admin", "employee", "client", "student", "board");
