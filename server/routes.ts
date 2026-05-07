import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import pg from "pg";
import { storage } from "./storage";
import {
  chargeCodes,
  boardDocuments, boardDocumentVersions,
} from "@shared/schema";
import { db } from "./db";
import { sql, eq, inArray, desc } from "drizzle-orm";
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
import xpRoutes from "./routes-xp";
import crewRoutes from "./routes-crew";
import googleRoutes, { startGooglePolling } from "./routes-google";
import { ENABLED_PORTALS, isPortalEnabled } from "./portals";
import { VERSION, UPSTREAM_REF } from "@shared/version";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
      ALTER TABLE kanban_boards ADD COLUMN IF NOT EXISTS is_longship_factory boolean DEFAULT false;
      ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS kanban_card_id integer;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS phone text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS linked_in text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS preferred_meeting_times text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS board_expertise jsonb;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS resume_url text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS resume_name text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS google_access_token text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS google_refresh_token text;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS google_token_expiry timestamp;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS google_email text;
      CREATE TABLE IF NOT EXISTS google_notifications (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        type text NOT NULL,
        title text NOT NULL,
        subtitle text,
        url text NOT NULL,
        external_id text NOT NULL,
        event_time timestamp,
        is_read boolean DEFAULT false NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS google_accounts (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        email text NOT NULL,
        label text NOT NULL DEFAULT 'Primary',
        access_token text,
        refresh_token text,
        token_expiry timestamp,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );
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
        timezone text NOT NULL DEFAULT 'America/Los_Angeles',
        updated_at timestamp DEFAULT now() NOT NULL
      );
      ALTER TABLE board_member_availability ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Los_Angeles';
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
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS xp_total integer NOT NULL DEFAULT 0;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS sound_enabled boolean NOT NULL DEFAULT false;
      CREATE TABLE IF NOT EXISTS xp_events (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        amount integer NOT NULL,
        reason text NOT NULL,
        source_type varchar(40) NOT NULL,
        source_id integer,
        created_at timestamp DEFAULT now() NOT NULL
      );
      ALTER TABLE xp_events DROP CONSTRAINT IF EXISTS xp_events_user_id_source_type_source_id_reason_key;
      DROP INDEX IF EXISTS xp_events_dedupe_idx;
      -- One XP award per source card globally. Per-user audit is still
      -- preserved via the user_id column; this index just guarantees that
      -- moving a card out of Done and back, OR reassigning + re-completing,
      -- never double-awards.
      CREATE UNIQUE INDEX IF NOT EXISTS xp_events_source_dedupe_idx ON xp_events (source_type, source_id);
      CREATE INDEX IF NOT EXISTS xp_events_user_idx ON xp_events (user_id, created_at DESC);
      -- Task #22: stat tracks + multipliers + streaks + factory-claim flag
      ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS stat varchar(20);
      ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS multiplier real NOT NULL DEFAULT 1.0;
      CREATE INDEX IF NOT EXISTS xp_events_user_stat_idx ON xp_events (user_id, stat);
      ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS claimed_from_factory boolean NOT NULL DEFAULT false;
      ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS loved_this boolean NOT NULL DEFAULT false;
      ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS bounty_multiplier real NOT NULL DEFAULT 1.0;
      ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS bounty_expires_at timestamp;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS daily_raid_streak integer NOT NULL DEFAULT 0;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS daily_raid_last varchar(10);
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS honest_pulse_streak integer NOT NULL DEFAULT 0;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS honest_pulse_last varchar(10);
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS rest_tokens integer NOT NULL DEFAULT 2;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS rest_token_month varchar(7);
      -- Task #24: co-op crew layer
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS crew_bond integer NOT NULL DEFAULT 0;
      CREATE TABLE IF NOT EXISTS crew_bond_notifications (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        partner_first_name text NOT NULL,
        card_title text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS crew_bond_notifications_user_idx ON crew_bond_notifications(user_id);
      CREATE TABLE IF NOT EXISTS app_settings (
        key text PRIMARY KEY,
        value text NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
      -- Task #25: polish (avatar customization + Saga Recap prefs)
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS avatar_config jsonb;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS saga_recap_enabled boolean NOT NULL DEFAULT true;
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS saga_recap_time varchar(5) NOT NULL DEFAULT '17:00';
      ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS sound_muted text[] NOT NULL DEFAULT ARRAY[]::text[];
      CREATE TABLE IF NOT EXISTS xp_milestones (
        id          serial PRIMARY KEY,
        user_id     integer NOT NULL,
        kind        varchar(32) NOT NULL,
        title       text NOT NULL,
        blurb       text,
        meta        jsonb,
        created_at  timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS xp_milestones_user_idx ON xp_milestones(user_id, created_at DESC);
      -- Add FK on xp_milestones.user_id → portal_users(id) once. Wrapped in a
      -- DO block so re-runs are no-ops; cascade keeps milestones private and
      -- automatically removed if a portal_user is ever deleted.
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'xp_milestones_user_id_fkey'
            AND table_name = 'xp_milestones'
        ) THEN
          ALTER TABLE xp_milestones
            ADD CONSTRAINT xp_milestones_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE CASCADE;
        END IF;
      END$$;
    `);
    await migrationPool.end();
    console.log("[migrate] ✓ Schema patches applied");
  } catch (e: any) {
    console.error("[migrate] Schema patch error:", e.message);
  }

  // No runtime auto-seeding. `scripts/seed.ts` is the single source of demo
  // data (admin, portal users, expense categories, charge codes, kanban,
  // courses, board meetings, etc.). Run `tsx scripts/seed.ts --reset` on a
  // fresh DB. See README "Demo data".


  // ── Public config (always available) ──────────────────────────────────────
  app.get("/api/public/portals", (_req: Request, res: Response) => {
    res.json({ success: true, data: { enabled: ENABLED_PORTALS } });
  });
  app.get("/api/public/version", (_req: Request, res: Response) => {
    res.json({ success: true, data: { version: VERSION, upstreamRef: UPSTREAM_REF } });
  });

  // ── New Portal API Routes ──────────────────────────────────────────────────
  // Always-on: auth, admin user management, shared services.
  app.use("/api/auth", authRoutes);
  app.use("/api/admin/portal-users", userMgmtRoutes);
  app.use("/api/balance", balanceRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/xp", xpRoutes);
  app.use("/api/crew", crewRoutes);
  app.use("/api/google", googleRoutes);

  // Portal-gated: only mount if the corresponding portal is enabled.
  if (isPortalEnabled("employee")) {
    app.use("/api/time", timeRoutes);
    app.use("/api/kanban", kanbanRoutes);
    app.use("/api/expenses", expenseRoutes);
    app.use("/api/lms", lmsRoutes);
  }
  if (isPortalEnabled("client")) {
    app.use("/api", clientPortalRoutes);
  }
  if (isPortalEnabled("student")) {
    app.use("/api/student", studentRoutes);
  }
  if (isPortalEnabled("board")) {
    app.use("/api/board", boardRoutes);
  }

  // Start Google background polling
  startGooglePolling();

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
