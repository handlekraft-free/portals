import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import pg from "pg";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { insertFellowshipApplicationSchema, insertClientApplicationSchema } from "@shared/schema";
import {
  users, expenseCategories, chargeCodes,
  boardMeetings, boardAgendaItems, boardMeetingAttendees, boardMeetingNotices, boardActionItems,
  boardDocuments, boardDocumentVersions,
} from "@shared/schema";
import { db } from "./db";
import { sql, count, eq, inArray, desc } from "drizzle-orm";
import fs from "fs";
import path from "path";
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
      CREATE TABLE IF NOT EXISTS charge_codes (
        id serial PRIMARY KEY,
        name text NOT NULL,
        description text,
        color varchar(20) NOT NULL DEFAULT '#64748b',
        active boolean NOT NULL DEFAULT true,
        position integer NOT NULL DEFAULT 0,
        created_at timestamp DEFAULT now() NOT NULL
      );
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
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS term_start timestamp;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS term_end timestamp;
      ALTER TABLE portal_users ALTER COLUMN term_start TYPE timestamp USING term_start::timestamp;
      ALTER TABLE portal_users ALTER COLUMN term_end TYPE timestamp USING term_end::timestamp;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS is_interested_director boolean DEFAULT false;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS committees text[];
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS bio text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS photo_url text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS emergency_contact text;
    `);
    // Add 'board' enum value (must run outside transaction)
    await migrationPool.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'board'`);
    // Create board enum types (idempotent via DO blocks)
    await migrationPool.query(`
      DO $$ BEGIN CREATE TYPE board_meeting_type AS ENUM ('regular','special','committee','annual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE board_meeting_status AS ENUM ('scheduled','held','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE board_meeting_rsvp AS ENUM ('yes','no','tentative'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE board_meeting_attendance AS ENUM ('present','absent','excused'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE board_participation_method AS ENUM ('in_person','remote'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE board_minutes_status AS ENUM ('draft','pending_approval','approved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE board_document_confidentiality AS ENUM ('public','board_only','restricted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE board_written_consent_status AS ENUM ('pending','valid','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE board_written_consent_response AS ENUM ('consent','decline'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    // Create board tables (schema-aligned, idempotent)
    await migrationPool.query(`
      CREATE TABLE IF NOT EXISTS board_committees (
        id serial PRIMARY KEY, name text NOT NULL, description text,
        created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS board_meetings (
        id serial PRIMARY KEY, title text NOT NULL,
        meeting_type board_meeting_type DEFAULT 'regular', status board_meeting_status DEFAULT 'scheduled',
        scheduled_at timestamp NOT NULL, end_time timestamp, location text, platform text,
        quorum_number integer DEFAULT 3, committee_id integer, notice_sent_at timestamp,
        notice_method varchar(50), created_by integer NOT NULL, created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS board_meeting_rsvps (
        id serial PRIMARY KEY, meeting_id integer NOT NULL, user_id integer NOT NULL,
        response board_meeting_rsvp NOT NULL, responded_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS board_meeting_attendees (
        id serial PRIMARY KEY, meeting_id integer NOT NULL, user_id integer NOT NULL,
        attendance board_meeting_attendance DEFAULT 'present',
        participation_method board_participation_method DEFAULT 'in_person',
        waived_notice boolean DEFAULT false
      );
      CREATE TABLE IF NOT EXISTS board_agenda_items (
        id serial PRIMARY KEY, meeting_id integer NOT NULL, title text NOT NULL,
        description text, position integer DEFAULT 0, duration integer, presenter text
      );
      CREATE TABLE IF NOT EXISTS board_minutes (
        id serial PRIMARY KEY, meeting_id integer NOT NULL UNIQUE, status board_minutes_status DEFAULT 'draft',
        content text, quorum_present boolean DEFAULT false, quorum_count integer,
        adjournment_time timestamp, submitted_at timestamp, approved_by integer, approved_at timestamp,
        created_by integer NOT NULL, created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS board_minutes_motions (
        id serial PRIMARY KEY, minutes_id integer NOT NULL, motion_text text NOT NULL,
        mover_id integer, seconder_id integer, votes_for integer DEFAULT 0,
        votes_against integer DEFAULT 0, votes_abstain integer DEFAULT 0,
        recused_directors text, passed boolean DEFAULT false, position integer DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS board_action_items (
        id serial PRIMARY KEY, title text NOT NULL, description text,
        assigned_to integer, due_date timestamp, status varchar(20) DEFAULT 'open',
        source_minutes_id integer, created_by integer NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL, completed_at timestamp
      );
      CREATE TABLE IF NOT EXISTS board_documents (
        id serial PRIMARY KEY, title text NOT NULL, description text,
        category varchar(100) NOT NULL, confidentiality board_document_confidentiality DEFAULT 'board_only',
        require_ack boolean DEFAULT false, retention_policy text,
        uploaded_by integer NOT NULL, created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS board_document_versions (
        id serial PRIMARY KEY, document_id integer NOT NULL, version_number integer DEFAULT 1,
        filename text NOT NULL, filepath text NOT NULL, file_size integer, mime_type text,
        uploaded_by integer NOT NULL, uploaded_at timestamp DEFAULT now() NOT NULL, notes text
      );
      CREATE TABLE IF NOT EXISTS board_document_acks (
        id serial PRIMARY KEY, document_id integer NOT NULL, user_id integer NOT NULL,
        acked_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS board_audit_log (
        id serial PRIMARY KEY, user_id integer NOT NULL, action varchar(50) NOT NULL,
        resource_type varchar(50), resource_id integer, detail text,
        created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS board_written_consents (
        id serial PRIMARY KEY, title text NOT NULL, description text,
        resolution_filepath text, status board_written_consent_status DEFAULT 'pending',
        excluded_directors text, created_by integer NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL, resolved_at timestamp
      );
      CREATE TABLE IF NOT EXISTS board_written_consent_responses (
        id serial PRIMARY KEY, consent_id integer NOT NULL, user_id integer NOT NULL,
        response board_written_consent_response NOT NULL, reason text,
        responded_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS board_coi_disclosures (
        id serial PRIMARY KEY, user_id integer NOT NULL, fiscal_year integer NOT NULL,
        disclosures text, certified boolean DEFAULT false, submitted_at timestamp DEFAULT now() NOT NULL,
        meeting_id integer, agenda_item_id integer, interest_description text
      );
      CREATE TABLE IF NOT EXISTS board_forum_topics (
        id serial PRIMARY KEY, title text NOT NULL, content text NOT NULL,
        author_id integer NOT NULL, committee_id integer, pinned boolean DEFAULT false,
        created_at timestamp DEFAULT now() NOT NULL, last_activity_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS board_forum_posts (
        id serial PRIMARY KEY, topic_id integer NOT NULL, author_id integer NOT NULL,
        content text NOT NULL, created_at timestamp DEFAULT now() NOT NULL, edited_at timestamp
      );
      CREATE TABLE IF NOT EXISTS board_financials (
        id serial PRIMARY KEY, title text NOT NULL, period varchar(20) NOT NULL,
        as_of_date timestamp NOT NULL, filename text NOT NULL, filepath text NOT NULL,
        file_size integer, mime_type text, uploaded_by integer NOT NULL,
        uploaded_at timestamp DEFAULT now() NOT NULL, parent_id integer, notes text
      );
      CREATE TABLE IF NOT EXISTS board_onboarding_items (
        id serial PRIMARY KEY, title text NOT NULL, description text,
        document_id integer, position integer DEFAULT 0, required boolean DEFAULT true,
        created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS board_onboarding_acks (
        id serial PRIMARY KEY, item_id integer NOT NULL, user_id integer NOT NULL,
        acked_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS board_notification_prefs (
        id serial PRIMARY KEY, user_id integer NOT NULL UNIQUE,
        meeting_notices_email boolean DEFAULT true, meeting_notices_in_app boolean DEFAULT true,
        document_uploads_email boolean DEFAULT false, document_uploads_in_app boolean DEFAULT true,
        action_items_email boolean DEFAULT true, action_items_in_app boolean DEFAULT true,
        forum_activity_email boolean DEFAULT false, forum_activity_in_app boolean DEFAULT true,
        coi_prompts_email boolean DEFAULT true, coi_prompts_in_app boolean DEFAULT true
      );
      CREATE TABLE IF NOT EXISTS board_meeting_notices (
        id serial PRIMARY KEY, meeting_id integer NOT NULL, sent_at timestamp DEFAULT now() NOT NULL,
        method varchar(50) NOT NULL, recipient_count integer DEFAULT 0,
        sent_by integer NOT NULL, notes text
      );
      CREATE TABLE IF NOT EXISTS board_document_views (
        id serial PRIMARY KEY, document_id integer NOT NULL, user_id integer NOT NULL,
        viewed_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS board_minutes_action_items (
        id serial PRIMARY KEY, minutes_id integer NOT NULL, title text NOT NULL,
        description text, assigned_to integer, due_date timestamp,
        status varchar(20) DEFAULT 'open', created_by integer NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL, completed_at timestamp
      );
    `);
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
        role: "board",
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

  // Seed default charge codes if empty
  try {
    const [{ value: ccCount }] = await db.select({ value: count() }).from(chargeCodes);
    if (Number(ccCount) === 0) {
      await db.insert(chargeCodes).values([
        { name: "Working and Available", description: "General work hours — on task, in meetings, or available for team needs", color: "#0D7377", position: 0 },
        { name: "Personal Development Time", description: "Self-directed learning, training, courses, or skill-building", color: "#6366f1", position: 1 },
        { name: "Paid Time Off (Vacation)", description: "Approved vacation days or scheduled personal time off", color: "#D4A843", position: 2 },
        { name: "Wellness or Sick Time", description: "Sick leave, mental health days, or approved wellness time", color: "#ef4444", position: 3 },
      ]);
      console.log("[seed] ✓ Charge codes seeded");
    }
  } catch (e: any) {
    console.error("[seed] Could not seed charge codes:", e.message);
  }

  // Seed sample board meetings if none exist
  try {
    const [{ value: meetingCount }] = await db.select({ value: count() }).from(boardMeetings);
    if (Number(meetingCount) === 0) {
      const adminRows = await db.select({ id: users.id }).from(users).where(sql`role = 'admin'`).limit(1);
      const boardRows = await db.select({ id: users.id }).from(users).where(sql`role IN ('admin','board')`);
      if (adminRows.length > 0) {
        const adminId = adminRows[0].id;
        const now = new Date();
        const nextRegular = new Date(now); nextRegular.setDate(nextRegular.getDate() + 22); nextRegular.setHours(18, 0, 0, 0);
        const annual = new Date(now); annual.setDate(annual.getDate() + 45); annual.setHours(14, 0, 0, 0);
        const special = new Date(now); special.setDate(special.getDate() + 7); special.setHours(17, 0, 0, 0);
        const pastMeeting = new Date(now); pastMeeting.setDate(pastMeeting.getDate() - 42); pastMeeting.setHours(18, 0, 0, 0);

        const [m1] = await db.insert(boardMeetings).values({
          title: "Regular Board Meeting \u2014 Q2 2026", meetingType: "regular", status: "scheduled",
          scheduledAt: nextRegular, location: "Video Conference (Zoom)",
          quorumNumber: 3, createdBy: adminId, noticeSentAt: new Date(), noticeMethod: "email",
        }).returning({ id: boardMeetings.id });

        const [m2] = await db.insert(boardMeetings).values({
          title: "Annual Board Meeting 2026", meetingType: "annual", status: "scheduled",
          scheduledAt: annual, location: "handlekraft HQ \u2014 Conference Room A",
          quorumNumber: 3, createdBy: adminId,
        }).returning({ id: boardMeetings.id });

        const [m3] = await db.insert(boardMeetings).values({
          title: "Special Meeting \u2014 Budget Review", meetingType: "special", status: "scheduled",
          scheduledAt: special, location: "Video Conference", platform: "https://meet.google.com/abc-defg-hij",
          quorumNumber: 3, createdBy: adminId, noticeSentAt: new Date(), noticeMethod: "email",
        }).returning({ id: boardMeetings.id });

        const [m4] = await db.insert(boardMeetings).values({
          title: "Regular Board Meeting \u2014 Q1 2026", meetingType: "regular", status: "held",
          scheduledAt: pastMeeting, location: "Video Conference (Zoom)",
          quorumNumber: 3, createdBy: adminId, noticeSentAt: pastMeeting, noticeMethod: "email",
        }).returning({ id: boardMeetings.id });

        if (m1?.id) {
          await db.insert(boardAgendaItems).values([
            { meetingId: m1.id, title: "Call to Order & Roll Call", position: 0, duration: 5 },
            { meetingId: m1.id, title: "Approval of Previous Minutes", position: 1, duration: 10 },
            { meetingId: m1.id, title: "Executive Director Report", position: 2, duration: 20 },
            { meetingId: m1.id, title: "Financial Report \u2014 Q1 2026", position: 3, duration: 15 },
            { meetingId: m1.id, title: "Fellowship Program Update", position: 4, duration: 20 },
            { meetingId: m1.id, title: "New Business", position: 5, duration: 15 },
            { meetingId: m1.id, title: "Adjournment", position: 6, duration: 5 },
          ]);
        }
        if (m4?.id) {
          await db.insert(boardAgendaItems).values([
            { meetingId: m4.id, title: "Call to Order", position: 0, duration: 5 },
            { meetingId: m4.id, title: "Approval of Q4 2025 Minutes", position: 1, duration: 10 },
            { meetingId: m4.id, title: "2026 Budget Approval", position: 2, duration: 30 },
            { meetingId: m4.id, title: "Officer Elections", position: 3, duration: 20 },
            { meetingId: m4.id, title: "Adjournment", position: 4, duration: 5 },
          ]);
          for (const u of boardRows) {
            await db.insert(boardMeetingAttendees).values({ meetingId: m4.id, userId: u.id, attendance: "present", participationMethod: "remote" });
          }
          await db.insert(boardMeetingNotices).values({ meetingId: m4.id, method: "email", recipientCount: boardRows.length, sentBy: adminId, notes: "Sent via handlekraft.ai portal" });
        }
        const now2 = new Date();
        const futureDate1 = new Date(now2); futureDate1.setDate(futureDate1.getDate() + 14);
        const futureDate2 = new Date(now2); futureDate2.setDate(futureDate2.getDate() + 30);
        const pastDue = new Date(now2); pastDue.setDate(pastDue.getDate() - 5);
        const firstBoardId = boardRows[0]?.id ?? adminId;
        const lastBoardId = boardRows[boardRows.length - 1]?.id ?? adminId;
        await db.insert(boardActionItems).values([
          { title: "Review and approve updated bylaws draft", description: "See attached document in Board Documents section.", assignedTo: firstBoardId, dueDate: futureDate1, status: "open", createdBy: adminId },
          { title: "Submit COI disclosure for FY2026", description: "All board members must submit conflict of interest disclosure by end of Q2.", assignedTo: lastBoardId, dueDate: futureDate2, status: "open", createdBy: adminId },
          { title: "Recruit two new board candidates", description: "Identify and nominate candidates for the open board seats before Annual Meeting.", assignedTo: firstBoardId, dueDate: pastDue, status: "open", createdBy: adminId },
        ]);
        console.log("[seed] \u2713 Board meetings and action items seeded");
      }
    }
  } catch (e: any) {
    console.error("[seed] Could not seed board meetings:", e.message);
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

  // ── Admin Charge Code CRUD ────────────────────────────────────────────────
  const { requireAdmin: reqAdmin } = await import("./auth-middleware");
  const { eq: eqCC, asc: ascCC } = await import("drizzle-orm");

  app.get("/api/admin/charge-codes", reqAdmin as any, async (_req, res) => {
    const all = await db.select().from(chargeCodes).orderBy(ascCC(chargeCodes.position));
    res.json({ success: true, data: all });
  });

  app.post("/api/admin/charge-codes", reqAdmin as any, async (req, res) => {
    const { name, description, color, position } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Name required" });
    const existing = await db.select().from(chargeCodes).orderBy(ascCC(chargeCodes.position));
    const [cc] = await db.insert(chargeCodes).values({
      name, description: description || null,
      color: color || "#64748b",
      position: position ?? existing.length,
    }).returning();
    res.status(201).json({ success: true, data: cc });
  });

  app.patch("/api/admin/charge-codes/:id", reqAdmin as any, async (req, res) => {
    const { name, description, color, active, position } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description || null;
    if (color !== undefined) updates.color = color;
    if (active !== undefined) updates.active = active;
    if (position !== undefined) updates.position = position;
    const [cc] = await db.update(chargeCodes).set(updates).where(eqCC(chargeCodes.id, parseInt(req.params.id))).returning();
    if (!cc) return res.status(404).json({ success: false, error: "Charge code not found" });
    res.json({ success: true, data: cc });
  });

  app.delete("/api/admin/charge-codes/:id", reqAdmin as any, async (req, res) => {
    await db.update(chargeCodes).set({ active: false }).where(eqCC(chargeCodes.id, parseInt(req.params.id)));
    res.json({ success: true, data: null });
  });

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
    const app = await storage.getFellowshipApplication(parseInt(req.params.id as string));
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json(app);
  });

  app.patch("/api/admin/fellowship-applications/:id", requireAdminSession, async (req: Request, res: Response) => {
    const { status, rating, priority, adminNotes } = req.body;
    const app = await storage.updateFellowshipApplication(parseInt(req.params.id as string), {
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
    const app = await storage.getClientApplication(parseInt(req.params.id as string));
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json(app);
  });

  app.patch("/api/admin/client-applications/:id", requireAdminSession, async (req: Request, res: Response) => {
    const { status, rating, priority, adminNotes } = req.body;
    const app = await storage.updateClientApplication(parseInt(req.params.id as string), {
      ...(status !== undefined && { status }),
      ...(rating !== undefined && { rating: parseInt(rating) }),
      ...(priority !== undefined && { priority: parseInt(priority) }),
      ...(adminNotes !== undefined && { adminNotes }),
    });
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json(app);
  });

  // ── Public board document share links (no auth required) ─────────────────
  app.get("/api/public/board/document/:token", async (req: Request, res: Response) => {
    const [doc] = await db.select().from(boardDocuments)
      .where(eq(boardDocuments.shareToken, req.params.token));
    if (!doc || !doc.shareEnabled) return res.status(404).json({ success: false, error: "Link not found or has been revoked" });

    const [ver] = await db.select().from(boardDocumentVersions)
      .where(eq(boardDocumentVersions.documentId, doc.id))
      .orderBy(desc(boardDocumentVersions.versionNumber))
      .limit(1);

    res.json({
      success: true,
      data: {
        id: doc.id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        currentVersion: ver?.versionNumber ?? null,
        fileName: ver?.filename ?? null,
        mimeType: ver?.mimeType ?? null,
        fileSize: ver?.fileSize ?? null,
        hasFile: !!ver,
      },
    });
  });

  app.get("/api/public/board/document/:token/download", async (req: Request, res: Response) => {
    const [doc] = await db.select().from(boardDocuments)
      .where(eq(boardDocuments.shareToken, req.params.token));
    if (!doc || !doc.shareEnabled) return res.status(404).json({ success: false, error: "Link not found or has been revoked" });

    const [ver] = await db.select().from(boardDocumentVersions)
      .where(eq(boardDocumentVersions.documentId, doc.id))
      .orderBy(desc(boardDocumentVersions.versionNumber))
      .limit(1);

    if (!ver) return res.status(404).json({ success: false, error: "No file attached to this document" });
    if (!fs.existsSync(ver.filepath)) return res.status(404).json({ success: false, error: "File not found" });

    const safeTitle = doc.title.replace(/[^a-zA-Z0-9._-]/g, "_");
    res.download(ver.filepath, `${safeTitle}_v${ver.versionNumber}${path.extname(ver.filename)}`);
  });

  return httpServer;
}
