import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import pg from "pg";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { insertFellowshipApplicationSchema, insertClientApplicationSchema } from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    adminId: number;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = connectPg(session);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  // Seed default admin if none exists
  const existingAdmin = await storage.getAdminByUsername("admin");
  if (!existingAdmin) {
    await storage.createAdmin("admin", "handlekraft2026");
  }

  // --- Public application endpoints ---

  app.post("/api/fellowship-applications", async (req: Request, res: Response) => {
    try {
      const data = insertFellowshipApplicationSchema.parse(req.body);
      const application = await storage.createFellowshipApplication(data);
      res.status(201).json(application);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: e.errors });
      }
      throw e;
    }
  });

  app.post("/api/client-applications", async (req: Request, res: Response) => {
    try {
      const data = insertClientApplicationSchema.parse(req.body);
      const application = await storage.createClientApplication(data);
      res.status(201).json(application);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: e.errors });
      }
      throw e;
    }
  });

  // --- Admin auth endpoints ---

  app.post("/api/admin/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }
    const admin = await storage.getAdminByUsername(username);
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    req.session.adminId = admin.id;
    res.json({ id: admin.id, username: admin.username });
  });

  app.post("/api/admin/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/admin/me", async (req: Request, res: Response) => {
    if (!req.session.adminId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ id: req.session.adminId });
  });

  // --- Admin queue endpoints ---

  app.get("/api/admin/fellowship-applications", requireAdmin, async (_req: Request, res: Response) => {
    const apps = await storage.getFellowshipApplications();
    res.json(apps);
  });

  app.get("/api/admin/fellowship-applications/:id", requireAdmin, async (req: Request, res: Response) => {
    const app = await storage.getFellowshipApplication(parseInt(req.params.id));
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json(app);
  });

  app.patch("/api/admin/fellowship-applications/:id", requireAdmin, async (req: Request, res: Response) => {
    const { status, rating, priority, adminNotes } = req.body;
    const app = await storage.updateFellowshipApplication(parseInt(req.params.id), {
      ...(status !== undefined && { status }),
      ...(rating !== undefined && { rating: parseInt(rating) }),
      ...(priority !== undefined && { priority: parseInt(priority) }),
      ...(adminNotes !== undefined && { adminNotes }),
    });
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json(app);
  });

  app.get("/api/admin/client-applications", requireAdmin, async (_req: Request, res: Response) => {
    const apps = await storage.getClientApplications();
    res.json(apps);
  });

  app.get("/api/admin/client-applications/:id", requireAdmin, async (req: Request, res: Response) => {
    const app = await storage.getClientApplication(parseInt(req.params.id));
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json(app);
  });

  app.patch("/api/admin/client-applications/:id", requireAdmin, async (req: Request, res: Response) => {
    const { status, rating, priority, adminNotes } = req.body;
    const app = await storage.updateClientApplication(parseInt(req.params.id), {
      ...(status !== undefined && { status }),
      ...(rating !== undefined && { rating: parseInt(rating) }),
      ...(priority !== undefined && { priority: parseInt(priority) }),
      ...(adminNotes !== undefined && { adminNotes }),
    });
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json(app);
  });

  return httpServer;
}
