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
  kanbanBoards, kanbanColumns, boardOnboardingItems, employeeOnboardingItems,
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
import balanceRoutes from "./routes-balance";
import chatRoutes from "./routes-chat";
import aiRoutes from "./routes-ai";

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
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS kanban_card_id integer;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS phone text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS linked_in text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS preferred_meeting_times text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;
      UPDATE portal_users SET onboarding_complete = true WHERE role IN ('admin','employee','client','student') AND onboarding_complete = false;
      CREATE TABLE IF NOT EXISTS board_document_comments (
        id serial PRIMARY KEY,
        document_id integer NOT NULL,
        parent_id integer,
        author_id integer NOT NULL,
        content text NOT NULL,
        resolved boolean DEFAULT false,
        created_at timestamp DEFAULT now() NOT NULL,
        edited_at timestamp
      );
      CREATE TABLE IF NOT EXISTS team_balance_scores (
        id serial PRIMARY KEY,
        user_id integer NOT NULL UNIQUE,
        score real NOT NULL DEFAULT 2.5,
        updated_at timestamp DEFAULT now() NOT NULL
      );
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
      CREATE TABLE IF NOT EXISTS board_calendar_reminders (
        id serial PRIMARY KEY, title text NOT NULL, note text,
        reminder_date timestamp NOT NULL, created_by integer NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
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
      ALTER TABLE board_onboarding_items ADD COLUMN IF NOT EXISTS link_url text;
      ALTER TABLE board_onboarding_items ADD COLUMN IF NOT EXISTS section text;
      ALTER TABLE board_onboarding_items ADD COLUMN IF NOT EXISTS estimated_time text;
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
      CREATE TABLE IF NOT EXISTS board_member_availability (
        id serial PRIMARY KEY, user_id integer NOT NULL UNIQUE,
        slots text NOT NULL DEFAULT '[]', notes text,
        updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meeting_time_polls (
        id serial PRIMARY KEY, title text NOT NULL, description text,
        created_by integer NOT NULL, status varchar(20) NOT NULL DEFAULT 'open',
        meeting_id integer, timezone text NOT NULL DEFAULT 'America/Los_Angeles',
        created_at timestamp DEFAULT now() NOT NULL
      );
      ALTER TABLE meeting_time_polls ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Los_Angeles';
      CREATE TABLE IF NOT EXISTS meeting_poll_slots (
        id serial PRIMARY KEY, poll_id integer NOT NULL,
        proposed_at timestamp NOT NULL, duration_minutes integer NOT NULL DEFAULT 90,
        confirmed boolean DEFAULT false
      );
      CREATE TABLE IF NOT EXISTS meeting_poll_responses (
        id serial PRIMARY KEY, poll_id integer NOT NULL,
        slot_id integer NOT NULL, user_id integer NOT NULL,
        availability varchar(20) NOT NULL DEFAULT 'no',
        UNIQUE(slot_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS chat_channels (
        id serial PRIMARY KEY, name text NOT NULL,
        description text, type varchar(20) NOT NULL DEFAULT 'general',
        created_by integer NOT NULL, created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id serial PRIMARY KEY, channel_id integer NOT NULL,
        user_id integer NOT NULL, content text NOT NULL,
        parent_id integer, is_announcement boolean DEFAULT false,
        edited_at timestamp, created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chat_attachments (
        id serial PRIMARY KEY, message_id integer NOT NULL,
        file_name text NOT NULL, file_path text NOT NULL,
        file_size integer NOT NULL, mime_type text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chat_reactions (
        id serial PRIMARY KEY, message_id integer NOT NULL,
        user_id integer NOT NULL, emoji varchar(10) NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id serial PRIMARY KEY, user_id integer NOT NULL,
        role varchar(10) NOT NULL, content text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS employee_onboarding_items (
        id serial PRIMARY KEY, title text NOT NULL, description text,
        link_url text, section text, estimated_time text,
        role_filter text DEFAULT 'all', position integer DEFAULT 0,
        required boolean DEFAULT true, created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS employee_onboarding_acks (
        id serial PRIMARY KEY, item_id integer NOT NULL,
        user_id integer NOT NULL, acked_at timestamp DEFAULT now() NOT NULL,
        UNIQUE(item_id, user_id)
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

  // Seed board onboarding items if none exist
  try {
    const [{ value: boCount }] = await db.select({ value: count() }).from(boardOnboardingItems);
    if (Number(boCount) === 0) {
      await db.insert(boardOnboardingItems).values([
        { title: "The Ten Basic Responsibilities of Nonprofit Boards", description: "The single most-referenced framework in U.S. nonprofit governance. Covers mission, executive support, financial oversight, programmatic monitoring, and the board's role in resource development. Foundational reading for any new board member.", linkUrl: "https://boardsource.org/fundamental-topics-of-nonprofit-board-service/roles-responsibilities/", section: "Part 1: Nonprofit Board Foundations", estimatedTime: "~10 min read", position: 1 },
        { title: "Board Responsibilities and Structures FAQ", description: "Addresses the legal duties — duty of care, duty of loyalty, duty of obedience — plus practical questions like board size, independence, and how decisions actually get made. Especially relevant for handləkraft because of our founder-funded structure and the public support test concerns we're navigating.", linkUrl: "https://boardsource.org/resources/board-responsibilities-structures-faqs/", section: "Part 1: Nonprofit Board Foundations", estimatedTime: "~15 min read", position: 2 },
        { title: "Bridgespan Nonprofit Board Resource Center", description: "Curated resource hub from Bridgespan + BoardSource. Useful for the orientation checklist, the document-tracking infographic, and the dissent/diversity guidance. Bookmark this — it's a reference, not a one-time read.", linkUrl: "https://www.bridgespan.org/insights/nonprofit-board-resource-center", section: "Part 1: Nonprofit Board Foundations", estimatedTime: "Browse 20-30 min", position: 3 },
        { title: "The Future of Management is Teal", description: "Frédéric Laloux's own short summary of his book's ideas. The three breakthroughs of teal organizations — self-management, wholeness, and evolutionary purpose — line up closely with what we're trying to be: a small team where everyone owns their domain, where people bring their whole selves, and where the organization adapts based on what it's learning. Worth knowing the vocabulary even if we don't adopt every practice.", linkUrl: "https://www.strategy-business.com/article/00344", section: "Part 2: How We Want to Work Together", estimatedTime: "~20 min read", position: 4 },
        { title: "Reinventing Organizations — Illustrated PDF", description: "The canonical text by Laloux + Wilber. The illustrated version is approachable and shows the case studies (Buurtzorg, Morning Star, FAVI) in concrete detail. Read at least the chapters on self-management and wholeness. You can read the full book later.", linkUrl: "https://reinventingorganizations.com/uploads/2/1/9/8/21988088/140305_laloux_reinventing_organizations.pdf", section: "Part 2: How We Want to Work Together", estimatedTime: "Skim ~30 min", position: 5 },
        { title: "The Center for Nonviolent Communication — What is NVC?", description: "NVC's four components — observation, feelings, needs, requests — give a board (and a small team) a shared vocabulary for difficult conversations. Especially valuable for boards that will navigate founder-family dynamics, compensation discussions involving related parties, and decisions where emotional stakes run high. Follow up with the 4-Part NVC Process at nvcacademy.com for the practical complement.", linkUrl: "https://www.cnvc.org/learn/what-is-nvc", section: "Part 2: How We Want to Work Together", estimatedTime: "~10 min read", position: 6 },
        { title: "Anthropic's Interactive Prompt Engineering Tutorial", description: "Nine-chapter interactive course teaching the fundamentals of prompting Claude. This is the single best on-ramp for a non-technical board member to genuinely understand what our fellows are learning to do. Don't worry about completing every exercise — just work through the first 3-4 chapters to get the conceptual model.", linkUrl: "https://github.com/anthropics/prompt-eng-interactive-tutorial", section: "Part 3: Applied AI for Beginners", estimatedTime: "Hands-on, ~2-3 hours", position: 7 },
        { title: "Anthropic's Prompting Best Practices Overview", description: "The canonical reference for how Claude is meant to be used well — clarity, examples, structured input, role-setting, chain-of-thought. Reading this gives a board member enough vocabulary to ask good questions about our curriculum, tooling decisions, and quality standards without needing to write code.", linkUrl: "https://docs.anthropic.com/en/build-with-claude/prompt-engineering/overview", section: "Part 3: Applied AI for Beginners", estimatedTime: "~20 min skim", position: 8 },
        { title: "New America — What Works in Workforce Development?", description: "A research synthesis of what actually moves outcomes in workforce development — sectoral partnerships, integrating learning with working, employer engagement, and the metrics that funders increasingly demand (completion rates, placement rates, earnings progression). Critical context as we plan to pursue WIOA and similar grants in years 2-3.", linkUrl: "https://www.newamerica.org/education-policy/briefs/what-works-in-workforce-development/", section: "Part 4: The World We're Operating In", estimatedTime: "~25 min read", position: 9 },
      ]);
      console.log("[seed] ✓ Board onboarding items seeded");
    }
  } catch (e: any) {
    console.error("[seed] Could not seed board onboarding items:", e.message);
  }

  // Seed employee onboarding items if none exist
  try {
    const [{ value: eoCount }] = await db.select({ value: count() }).from(employeeOnboardingItems);
    if (Number(eoCount) === 0) {
      await db.insert(employeeOnboardingItems).values([
        // Part 1: How We Work Together (all, week 1)
        { title: "The Center for Nonviolent Communication — What is NVC", description: "We're a small team where the founder and his son work together every day, and where a third employee joins that family dynamic. We talk to clients facing real stress in underfunded organizations. NVC's four components — observation, feelings, needs, requests — give us a shared vocabulary for hard conversations. Read this in week one. We'll use the language.", linkUrl: "https://www.cnvc.org/learn/what-is-nvc", section: "Part 1: How We Work Together", estimatedTime: "~10 min read", roleFilter: "all", position: 1 },
        { title: "Reinventing Organizations — Illustrated Summary", description: "You don't need to read the whole book, but you need to understand how we want to operate. Self-management means you own your domain. Wholeness means you bring your whole self to work, not a fake 'professional' mask. Evolutionary purpose means we adjust based on what we're learning, not what was decided in a planning document a year ago. Read at least the chapters on self-management and wholeness.", linkUrl: "https://reinventingorganizations.com/uploads/2/1/9/8/21988088/140305_laloux_reinventing_organizations.pdf", section: "Part 1: How We Work Together", estimatedTime: "Skim ~30 min", roleFilter: "all", position: 2 },
        { title: "Cal Newport — Deep Work (Chapter 1 Summary)", description: "We work 30 hours a week. That sounds like less work — but only if those 30 hours are good ones. Deep work explains why protected, focused time produces more in 4 hours than scattered effort produces in 10. Our short workweek is a feature, not a constraint, but only if we use it well.", linkUrl: "https://calnewport.com/deep-work-rules-for-focused-success-in-a-distracted-world/", section: "Part 1: How We Work Together", estimatedTime: "~15 min", roleFilter: "all", position: 3 },
        // Part 2: Working With AI as a Co-Worker (all, week 2)
        { title: "Anthropic's Interactive Prompt Engineering Tutorial", description: "Both roles use Claude every day. This nine-chapter interactive course is the single best on-ramp. Work through chapters 1–6 in week two; come back for the rest in your own time. Skip nothing in the first six chapters.", linkUrl: "https://github.com/anthropics/prompt-eng-interactive-tutorial", section: "Part 2: Working With AI as a Co-Worker", estimatedTime: "Hands-on, ~3 hours", roleFilter: "all", position: 4 },
        { title: "Anthropic's Prompting Best Practices", description: "The reference document. Read it once, then keep it bookmarked. Concepts like role assignment, structured input with XML tags, chain-of-thought prompting, and prefilling will become daily tools. Don't try to memorize — just know what's available.", linkUrl: "https://docs.anthropic.com/en/build-with-claude/prompt-engineering/overview", section: "Part 2: Working With AI as a Co-Worker", estimatedTime: "~25 min skim", roleFilter: "all", position: 5 },
        { title: "Ethan Mollick — On-the-Job Training (One Useful Thing)", description: "Mollick studies how people actually use AI productively in real jobs. His core insight — that AI is best treated as a coworker you delegate to and review, not as a search engine — matches our operating model exactly. His Substack (One Useful Thing) is worth subscribing to.", linkUrl: "https://www.oneusefulthing.org/p/on-the-job-training", section: "Part 2: Working With AI as a Co-Worker", estimatedTime: "~20 min", roleFilter: "all", position: 6 },
        // Part 3: Doing the Work Well (all, week 3)
        { title: "Julie Zhuo — The Looking Glass (Substack)", description: "Even though neither of you manages people, you'll be managing projects, clients, and your own time. Zhuo's writing on giving feedback, having hard conversations, and growing in a small organization is uncommonly clear and humane. Pick 2–3 posts that catch your eye.", linkUrl: "https://lg.substack.com", section: "Part 3: Doing the Work Well", estimatedTime: "Browse ~30 min", roleFilter: "all", position: 7 },
        { title: "Bret Victor — Inventing on Principle (Video)", description: "A foundational talk about doing work that matters. Our mission is to give the power to act to organizations that need it and people who deserve a chance. Victor's framing — that good work flows from a principle you genuinely care about — is the right north star for handləkraft. Especially valuable for non-traditional learners who may not have heard the field talk this way before.", linkUrl: "https://vimeo.com/36579366", section: "Part 3: Doing the Work Well", estimatedTime: "Watch ~50 min", roleFilter: "all", position: 8 },
        // Part 4A: Tools & Development Lead (weeks 4-6)
        { title: "Claude Code 101 (Anthropic Academy)", description: "Walks through everything from installation to advanced workflows. Designed for developers new to software engineering or experienced engineers exploring AI coding agents. This is the single most important course for your role. Take your time with it.", linkUrl: "https://anthropic.skilljar.com/claude-code-101", section: "Part 4A: Tools & Development Lead", estimatedTime: "Self-paced, ~4–6 hours", roleFilter: "tools_lead", position: 9 },
        { title: "The Pragmatic Programmer — Selected Chapters", description: "Read chapters on 'Care About Your Craft,' 'DRY (Don't Repeat Yourself),' 'Tracer Bullets,' 'Programming by Coincidence,' and 'Pragmatic Teams.' The book teaches the why behind professional practices — most AI-assisted developers have never read it, and it shows. You'll be ahead of the curve. Borrow from a library or buy used.", linkUrl: null, section: "Part 4A: Tools & Development Lead", estimatedTime: "~3–4 hours (priority chapters)", roleFilter: "tools_lead", position: 10 },
        { title: "Replit Documentation — Getting Started + Deployments", description: "We build and deploy on Replit. Read the Deployments section carefully and skim everything else. You'll come back to it as you build.", linkUrl: "https://docs.replit.com", section: "Part 4A: Tools & Development Lead", estimatedTime: "~1–2 hours skim", roleFilter: "tools_lead", position: 11 },
        { title: "Git for Humans (Alice Bartlett)", description: "Plain-English Git fundamentals. Even with AI helping, you need to understand branches, commits, pull requests, and how to recover when things go wrong. This deck is the kindest introduction to the topic.", linkUrl: "https://speakerdeck.com/alicebartlett/git-for-humans", section: "Part 4A: Tools & Development Lead", estimatedTime: "~30 min", roleFilter: "tools_lead", position: 12 },
        { title: "The Twelve-Factor App", description: "Twelve-factor methodology is the industry standard for building maintainable web applications. Read it once now, refer back when you build something real. It will save you weeks of pain over time.", linkUrl: "https://12factor.net", section: "Part 4A: Tools & Development Lead", estimatedTime: "~1 hour", roleFilter: "tools_lead", position: 13 },
        // Part 4B: Marketing & Social Media Lead (weeks 4-6)
        { title: "Made to Stick — Summary or Selected Chapters (Heath & Heath)", description: "The SUCCESs framework (Simple, Unexpected, Concrete, Credible, Emotional, Stories) is the most useful tool I know for nonprofit marketing. Why do some messages travel while others die? This book answers it. Read at least the introduction and the chapters on Simple and Stories.", linkUrl: "https://heathbrothers.com/books/made-to-stick/", section: "Part 4B: Marketing & Social Media Lead", estimatedTime: "~2–3 hours", roleFilter: "marketing_lead", position: 14 },
        { title: "Donor Relations & Storytelling — Candid Resources", description: "Free resources from Candid (formerly Foundation Center / GuideStar). Search for 'storytelling' and 'donor communication.' Nonprofit marketing has its own grammar — this is where you learn it.", linkUrl: "https://learning.candid.org/resources/", section: "Part 4B: Marketing & Social Media Lead", estimatedTime: "Browse 1–2 hours", roleFilter: "marketing_lead", position: 15 },
        { title: "Ann Handley — Everybody Writes (Selected Chapters)", description: "The standard reference for clear, useful business writing. Especially valuable because much of your work will be writing — social posts, email campaigns, donor communications, grant narratives. Read the sections on writing rules and content type how-tos.", linkUrl: "https://annhandley.com/everybodywrites/", section: "Part 4B: Marketing & Social Media Lead", estimatedTime: "~2 hours (priority chapters)", roleFilter: "marketing_lead", position: 16 },
        { title: "Mailchimp Email Marketing Field Guide", description: "We'll use Mailchimp's free tier in year one. This is their official guide — practical, not promotional. Covers list building, segmentation, deliverability, and what actually moves open rates.", linkUrl: "https://mailchimp.com/resources/email-marketing-field-guide/", section: "Part 4B: Marketing & Social Media Lead", estimatedTime: "~1 hour", roleFilter: "marketing_lead", position: 17 },
        { title: "Beth Kanter — Networked Nonprofit (Selected Posts)", description: "Beth Kanter has written about nonprofit social media for 20 years. Her work is grounded in actual practice and real outcomes, not vanity metrics. Pick recent posts on AI for nonprofits, content strategy, or community building.", linkUrl: "https://bethkanter.org", section: "Part 4B: Marketing & Social Media Lead", estimatedTime: "Browse 1–2 hours", roleFilter: "marketing_lead", position: 18 },
        // Part 5: handləkraft-Specific (all, ongoing)
        { title: "The handləkraft Proposal", description: "Read it carefully. Re-read in 90 days. The proposal is our shared map. If we drift from it, we should know we're drifting.", linkUrl: "https://handlekraft.ai/proposal.pdf", section: "Part 5: handləkraft-Specific", estimatedTime: "Read carefully", roleFilter: "all", position: 19 },
        { title: "The Tier 1 Training Plan", description: "The fellowship curriculum is the heart of our program. Both roles support fellows; both roles will eventually help shape future cohorts. Know what we're teaching and why.", linkUrl: "https://handlekraft.ai/docs/handlekraft-tier1-training-plan.docx", section: "Part 5: handləkraft-Specific", estimatedTime: "Read carefully", roleFilter: "all", position: 20 },
        { title: "The Tier 2 Training Plan (Early Draft)", description: "Read for awareness. This is where the program is going, not where it is. Your input on the final design will be welcomed once we've run a Tier 1 cohort.", linkUrl: "https://handlekraft.ai/docs/handlekraft-tier2-training-plan.docx", section: "Part 5: handləkraft-Specific", estimatedTime: "Read for awareness", roleFilter: "all", position: 21 },
      ]);
      console.log("[seed] ✓ Employee onboarding items seeded");
    }
  } catch (e: any) {
    console.error("[seed] Could not seed employee onboarding items:", e.message);
  }

  // Seed "Internal Team" kanban board if it doesn't exist
  try {
    const existing = await db.select({ id: kanbanBoards.id }).from(kanbanBoards)
      .where(sql`lower(name) = 'internal team'`).limit(1);
    if (existing.length === 0) {
      const adminRows = await db.select({ id: users.id }).from(users).where(sql`role = 'admin'`).limit(1);
      if (adminRows.length > 0) {
        const adminId = adminRows[0].id;
        const [board] = await db.insert(kanbanBoards).values({
          name: "Internal Team",
          description: "Handlekraft internal task board — auto-populated from client support tickets",
          createdBy: adminId,
        }).returning();
        await db.insert(kanbanColumns).values([
          { boardId: board.id, title: "Backlog", position: 0, color: "#6366f1" },
          { boardId: board.id, title: "Pillaging 🪓", position: 1, color: "#0D7377" },
          { boardId: board.id, title: "In Review", position: 2, color: "#D4A843" },
          { boardId: board.id, title: "Valhalla ⚔️", position: 3, color: "#22c55e" },
        ]);
        console.log("[seed] ✓ Internal Team kanban board seeded");
      }
    }
  } catch (e: any) {
    console.error("[seed] Could not seed Internal Team board:", e.message);
  }

  // Seed sample board meetings if none exist (development only)
  if (process.env.NODE_ENV !== "production") try {
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
  app.use("/api/balance", balanceRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/ai", aiRoutes);

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
    const token = String(req.params.token);
    const [doc] = await db.select().from(boardDocuments)
      .where(eq(boardDocuments.shareToken, token));
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
    const token = String(req.params.token);
    const [doc] = await db.select().from(boardDocuments)
      .where(eq(boardDocuments.shareToken, token));
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
