import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import pg from "pg";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { insertFellowshipApplicationSchema, insertClientApplicationSchema } from "@shared/schema";
import { users, expenseCategories } from "@shared/schema";
import { db } from "./db";
import { sql, count } from "drizzle-orm";
import { z } from "zod";

// New portal route modules
import authRoutes from "./routes-auth";
import timeRoutes from "./routes-time";
import kanbanRoutes from "./routes-kanban";
import expenseRoutes from "./routes-expenses";
import clientPortalRoutes from "./routes-client-portal";
import studentRoutes from "./routes-student";
import lmsRoutes from "./routes-lms";
import userMgmtRoutes from "./routes-user-mgmt";
import boardRoutes from "./routes-board";

declare module "express-session" {
  interface SessionData {
    adminId: number;
  }
}

function requireAdminSession(req: Request, res: Response, next: NextFunction) {
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

  // Ensure any schema additions added after initial deployment exist
  try {
    const migrationPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await migrationPool.query(`
      ALTER TABLE kanban_card_comments ADD COLUMN IF NOT EXISTS edited_at timestamp;
      CREATE TABLE IF NOT EXISTS kanban_card_attachments (
        id serial PRIMARY KEY,
        card_id integer NOT NULL,
        uploaded_by integer NOT NULL,
        file_name text NOT NULL,
        file_path text NOT NULL,
        file_size integer NOT NULL,
        mime_type text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS can_approve boolean DEFAULT false;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS approver_id integer;
      ALTER TABLE time_reports ADD COLUMN IF NOT EXISTS mode varchar;
      ALTER TABLE time_reports ADD COLUMN IF NOT EXISTS simple_day_hours text;
      ALTER TABLE time_reports ADD COLUMN IF NOT EXISTS notes text;
      ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS reviewer_id integer;
      ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS interest_rating integer;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS board_position text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS term_start date;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS term_end date;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS is_interested_director boolean DEFAULT false;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS committees text[];
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS bio text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS photo_url text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS emergency_contact text;
    `);
    // Add 'board' enum value (must run outside transaction)
    await migrationPool.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'board'`);
    await migrationPool.end();
    console.log("[migrate] ✓ Schema patches applied");
  } catch (e: any) {
    console.error("[migrate] Schema patch error:", e.message);
  }

  // Seed default legacy admin if none exists
  const existingAdmin = await storage.getAdminByUsername("admin");
  if (!existingAdmin) {
    await storage.createAdmin("admin", "handlekraft2026");
  }

  // Seed default portal users if table is empty
  try {
    const [{ value: userCount }] = await db.select({ value: count() }).from(users);
    if (Number(userCount) === 0) {
      console.log("[seed] Portal users table is empty — seeding default accounts…");
      const hash = async (pw: string) => bcrypt.hash(pw, 12);
      await db.insert(users).values([
        { email: "admin@handlekraft.ai", passwordHash: await hash("Admin1234!"), role: "admin", firstName: "Admin", lastName: "User", status: "active", canApprove: true },
        { email: "employee1@handlekraft.ai", passwordHash: await hash("Employee1!"), role: "employee", firstName: "Jordan", lastName: "Lee", status: "active" },
        { email: "employee2@handlekraft.ai", passwordHash: await hash("Employee1!"), role: "employee", firstName: "Sam", lastName: "Torres", status: "active" },
        { email: "client1@handlekraft.ai", passwordHash: await hash("Client123!"), role: "client", firstName: "River", lastName: "Park", status: "active" },
        { email: "student1@handlekraft.ai", passwordHash: await hash("Student1!"), role: "student", firstName: "Alex", lastName: "Rivera", status: "active" },
      ]);
      console.log("[seed] ✓ Portal users seeded");
    }
    // Seed board user if missing (added after initial seeding)
    const existing = await db.select({ id: users.id }).from(users).where(sql`email = 'board1@handlekraft.ai'`);
    if (existing.length === 0) {
      await db.insert(users).values({
        email: "board1@handlekraft.ai",
        passwordHash: await bcrypt.hash("Board1234!", 12),
        role: "board" as any,
        firstName: "Dana",
        lastName: "Eriksson",
        status: "active",
        boardPosition: "Secretary",
      });
      console.log("[seed] ✓ Board member user seeded");
    }
  } catch (e: any) {
    console.error("[seed] Could not seed portal users:", e.message);
  }

  // Seed default expense categories if empty
  try {
    const [{ value: catCount }] = await db.select({ value: count() }).from(expenseCategories);
    if (Number(catCount) === 0) {
      await db.insert(expenseCategories).values([
        { name: "Travel", qbAccountCode: "6200", qbAccountName: "Travel & Transportation", description: "Flights, hotels, mileage" },
        { name: "Meals", qbAccountCode: "6210", qbAccountName: "Meals & Entertainment", description: "Business meals and client entertainment" },
        { name: "Office Supplies", qbAccountCode: "6220", qbAccountName: "Office Supplies", description: "Paper, pens, printer ink, etc." },
        { name: "Software", qbAccountCode: "6230", qbAccountName: "Software & Subscriptions", description: "SaaS tools, licenses, subscriptions" },
        { name: "Professional Development", qbAccountCode: "6240", qbAccountName: "Professional Development", description: "Courses, books, conferences" },
        { name: "Marketing", qbAccountCode: "6250", qbAccountName: "Marketing & Advertising", description: "Ads, design, print materials" },
        { name: "Equipment", qbAccountCode: "6260", qbAccountName: "Equipment & Hardware", description: "Computers, peripherals, tools" },
        { name: "Utilities", qbAccountCode: "6270", qbAccountName: "Utilities", description: "Internet, phone, electricity" },
        { name: "Miscellaneous", qbAccountCode: "6999", qbAccountName: "Miscellaneous", description: "Other business expenses" },
      ]);
      console.log("[seed] ✓ Expense categories seeded");
    }
  } catch (e: any) {
    console.error("[seed] Could not seed expense categories:", e.message);
  }

  // ── New Portal API Routes ──────────────────────────────────────────────────
  app.use("/api/auth", authRoutes);
  app.use("/api/time", timeRoutes);
  app.use("/api/kanban", kanbanRoutes);
  app.use("/api/expenses", expenseRoutes);
  app.use("/api", clientPortalRoutes);
  app.use("/api/student", studentRoutes);
  app.use("/api/lms", lmsRoutes);
  app.use("/api/admin/portal-users", userMgmtRoutes);
  app.use("/api/board", boardRoutes);

  // ── Public application endpoints (existing) ───────────────────────────────

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

  // ── Legacy Admin auth endpoints (existing /admin page) ────────────────────

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

  app.get("/api/admin/fellowship-applications", requireAdminSession, async (_req: Request, res: Response) => {
    const apps = await storage.getFellowshipApplications();
    res.json(apps);
  });

  app.get("/api/admin/fellowship-applications/:id", requireAdminSession, async (req: Request, res: Response) => {
    const app = await storage.getFellowshipApplication(parseInt(req.params.id));
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json(app);
  });

  app.patch("/api/admin/fellowship-applications/:id", requireAdminSession, async (req: Request, res: Response) => {
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

  app.get("/api/admin/client-applications", requireAdminSession, async (_req: Request, res: Response) => {
    const apps = await storage.getClientApplications();
    res.json(apps);
  });

  app.get("/api/admin/client-applications/:id", requireAdminSession, async (req: Request, res: Response) => {
    const app = await storage.getClientApplication(parseInt(req.params.id));
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json(app);
  });

  app.patch("/api/admin/client-applications/:id", requireAdminSession, async (req: Request, res: Response) => {
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
