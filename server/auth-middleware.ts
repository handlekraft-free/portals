import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "handlekraft-dev-secret-change-in-production";

export interface JwtPayload {
  userId: number;
  email: string;
  role: "admin" | "employee" | "client" | "student" | "board";
  firstName: string;
  lastName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
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

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.hk_token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, error: "Authentication required" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ success: false, error: "Invalid or expired token" });
  req.user = payload;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, error: "Insufficient permissions" });
      }
      next();
    });
  };
}

export const requireEmployee = requireRole("admin", "employee");
export const requireClient = requireRole("client");
export const requireStudent = requireRole("student");
export const requireAdmin = requireRole("admin");
export const requireBoard = requireRole("admin", "board");
export const requireAnyPortalUser = requireRole("admin", "employee", "client", "student", "board");
