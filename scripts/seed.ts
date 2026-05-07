/**
 * Local-development seed script for Open Portals.
 *
 * Usage:
 *   tsx scripts/seed.ts            # idempotent insert of light demo data
 *   tsx scripts/seed.ts --reset    # TRUNCATE all data tables, then seed
 *
 * The reset path wipes user-generated data (portal users, kanban boards,
 * tickets, courses, board meetings, chat, etc.) but leaves the schema and
 * `app_settings` (config-like) intact. Drizzle migrations are not affected.
 *
 * The default (no flag) path is safe to re-run: each insert checks for an
 * existing row by a stable natural key first.
 *
 * NOT FOR PRODUCTION USE. The demo accounts have well-known passwords.
 */
import bcrypt from "bcryptjs";
import { sql, eq, and } from "drizzle-orm";
import { db } from "../server/db";
import { storage } from "../server/storage";
import { BRAND } from "../shared/branding";
import {
  adminUsers,
  users,
  projects,
  chargeCodes,
  expenseCategories,
  timeEntries,
  kanbanBoards,
  kanbanColumns,
  kanbanCards,
  supportTickets,
  messages,
  courses,
  courseModules,
  courseLessons,
  courseEnrollments,
  announcements,
  boardMeetings,
  boardAgendaItems,
  boardDocuments,
  boardActionItems,
  boardOnboardingItems,
  chatChannels,
  chatMessages,
} from "../shared/schema";

// Tables that hold user/runtime data. Wiped by `--reset`.
// `app_settings` is intentionally omitted (config-like, out of scope).
// `session` (express-session store) is also wiped to clear stale logins.
const DATA_TABLES: string[] = [
  // Auth
  "admin_users",
  "portal_users",
  "session",
  // Gamification (FK-cascades from portal_users handle most, but list explicit).
  // `xp_milestones` is intentionally NOT listed (out of scope per task #8); it
  // will still be cleared via ON DELETE CASCADE from portal_users, which is the
  // natural consequence of wiping users.
  "xp_events",
  "crew_bond_notifications",
  "team_balance_scores",
  // Time / projects / expenses
  "projects",
  "charge_codes",
  "time_entries",
  "time_reports",
  "expense_categories",
  "expense_items",
  "expense_reports",
  // Teams
  "teams",
  "team_members",
  // Kanban
  "kanban_boards",
  "kanban_columns",
  "kanban_cards",
  "kanban_card_comments",
  "kanban_card_attachments",
  // Client portal
  "client_files",
  "messages",
  "support_tickets",
  "ticket_comments",
  // LMS
  "courses",
  "course_modules",
  "course_lessons",
  "course_enrollments",
  "lesson_completions",
  "student_files",
  "announcements",
  // Board portal
  "board_committees",
  "board_meetings",
  "board_meeting_rsvps",
  "board_meeting_attendees",
  "board_agenda_items",
  "board_minutes",
  "board_minutes_motions",
  "board_minutes_action_items",
  "board_minutes_versions",
  "board_meeting_notices",
  "board_meeting_packet_docs",
  "board_action_items",
  "board_documents",
  "board_document_versions",
  "board_document_acks",
  "board_document_comments",
  "board_document_views",
  "board_audit_log",
  "board_written_consents",
  "board_written_consent_responses",
  "board_coi_disclosures",
  "board_forum_topics",
  "board_forum_posts",
  "board_forum_attachments",
  "board_financials",
  "board_onboarding_items",
  "board_onboarding_acks",
  "board_notification_prefs",
  "board_notifications",
  "board_member_availability",
  "board_calendar_reminders",
  // Onboarding (employee)
  "employee_onboarding_items",
  "employee_onboarding_acks",
  // Chat & DMs
  "chat_channels",
  "chat_messages",
  "chat_attachments",
  "chat_reactions",
  "ai_chat_messages",
  "direct_message_conversations",
  "direct_message_entries",
  // Scheduling polls
  "meeting_time_polls",
  "meeting_poll_slots",
  "meeting_poll_responses",
  // Google integration
  "google_accounts",
  "google_notifications",
  // Legacy tables not in current schema but present in DB
  "client_applications",
  "fellowship_applications",
];

async function reset() {
  console.log("[seed] Wiping data tables…");
  // Filter to tables that actually exist (legacy tables may be absent).
  const rows = await db.execute<{ table_name: string }>(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  const present = new Set(rows.rows.map((r) => r.table_name));
  const targets = DATA_TABLES.filter((t) => present.has(t));
  if (targets.length === 0) {
    console.log("[seed] No data tables found — fresh database, nothing to wipe.");
    return;
  }
  const list = targets.map((t) => `"${t}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`));
  console.log(`[seed] ✓ Wiped ${targets.length} tables`);
}

async function upsertUser(row: {
  email: string;
  password: string;
  role: "admin" | "employee" | "manager" | "client" | "student" | "board";
  firstName: string;
  lastName: string;
  canApprove?: boolean;
  boardPosition?: string;
}) {
  const email = row.email.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(row.password, 12);
  const [u] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: row.role,
      firstName: row.firstName,
      lastName: row.lastName,
      status: "active",
      canApprove: row.canApprove ?? false,
      boardPosition: row.boardPosition,
    })
    .returning();
  return u;
}

async function seed() {
  console.log("[seed] Seeding light demo data…");

  // ── Legacy admin (username/password login) ────────────────────────────────
  const legacyAdmin = await storage.getAdminByUsername("admin");
  if (!legacyAdmin) {
    await storage.createAdmin("admin", `${BRAND.nameAscii}2026`);
  }

  // ── Portal users ───────────────────────────────────────────────────────────
  const admin = await upsertUser({
    email: `admin@${BRAND.domain}`,
    password: "Admin1234!",
    role: "admin",
    firstName: "Admin",
    lastName: "User",
    canApprove: true,
  });
  const employee = await upsertUser({
    email: `employee@${BRAND.domain}`,
    password: "Employee1!",
    role: "employee",
    firstName: "Sample",
    lastName: "Employee",
  });
  const manager = await upsertUser({
    email: `manager@${BRAND.domain}`,
    password: "Manager1!",
    role: "manager",
    firstName: "Sample",
    lastName: "Manager",
    canApprove: true,
  });
  const client = await upsertUser({
    email: `client@${BRAND.domain}`,
    password: "Client123!",
    role: "client",
    firstName: "Sample",
    lastName: "Client",
  });
  const student = await upsertUser({
    email: `student@${BRAND.domain}`,
    password: "Student1!",
    role: "student",
    firstName: "Sample",
    lastName: "Student",
  });
  const board = await upsertUser({
    email: `board@${BRAND.domain}`,
    password: "Board1234!",
    role: "board",
    firstName: "Sample",
    lastName: "Board Member",
    boardPosition: "Member",
  });

  // ── Expense categories (idempotent) ───────────────────────────────────────
  for (const cat of [
    { name: "Travel", description: "Flights, hotels, mileage" },
    { name: "Meals", description: "Business meals" },
    { name: "Office Supplies", description: "Paper, pens, printer ink" },
  ]) {
    const [exists] = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.name, cat.name));
    if (!exists) await db.insert(expenseCategories).values(cat);
  }

  // ── Charge codes (idempotent) ─────────────────────────────────────────────
  const ccDefs = [
    { name: "Working and Available", description: "General work hours", color: "#0D7377", position: 0 },
    { name: "Paid Time Off", description: "Approved vacation or personal time off", color: "#D4A843", position: 1 },
    { name: "Sick Time", description: "Sick leave or wellness time", color: "#ef4444", position: 2 },
  ];
  for (const cc of ccDefs) {
    const [exists] = await db.select().from(chargeCodes).where(eq(chargeCodes.name, cc.name));
    if (!exists) await db.insert(chargeCodes).values(cc);
  }
  const [workingCc] = await db
    .select()
    .from(chargeCodes)
    .where(eq(chargeCodes.name, "Working and Available"));

  // ── Project ───────────────────────────────────────────────────────────────
  let [project] = await db.select().from(projects).where(eq(projects.name, "Sample Project"));
  if (!project) {
    [project] = await db
      .insert(projects)
      .values({
        name: "Sample Project",
        color: "#0D7377",
        hourlyRate: "0",
        budgetHours: "0",
        active: true,
      })
      .returning();
  }

  // ── Time entries (1-2) ────────────────────────────────────────────────────
  const [anyTimeEntry] = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.userId, employee.id))
    .limit(1);
  if (!anyTimeEntry) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(9, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(11, 0, 0, 0);
    await db.insert(timeEntries).values([
      {
        userId: employee.id,
        projectId: project.id,
        taskDescription: "Kickoff meeting and planning",
        startTime: yesterday,
        endTime: yesterdayEnd,
        durationMinutes: 120,
        billable: false,
        status: "draft",
      },
    ]);
  }

  // ── Kanban board with standard columns + sample cards ─────────────────────
  let [kBoard] = await db
    .select()
    .from(kanbanBoards)
    .where(eq(kanbanBoards.name, "Team Board"));
  if (!kBoard) {
    [kBoard] = await db
      .insert(kanbanBoards)
      .values({
        name: "Team Board",
        description: "Sample team board — drag cards across columns to track work.",
        createdBy: admin.id,
      })
      .returning();
  }
  const existingCols = await db
    .select()
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, kBoard.id));
  let cols = existingCols;
  if (existingCols.length === 0) {
    cols = await db
      .insert(kanbanColumns)
      .values([
        { boardId: kBoard.id, title: "To Do", position: 0, color: "#6366f1" },
        { boardId: kBoard.id, title: "In Progress", position: 1, color: "#0D7377" },
        { boardId: kBoard.id, title: "Done", position: 2, color: "#22c55e" },
      ])
      .returning();
  }
  const todoCol = cols.find((c) => c.title === "To Do") ?? cols[0];
  const inProgCol = cols.find((c) => c.title === "In Progress") ?? cols[1] ?? cols[0];
  const doneCol = cols.find((c) => c.title === "Done") ?? cols[cols.length - 1];
  const sampleCards = [
    { columnId: todoCol.id, title: "Draft homepage copy", description: "Write the first pass of homepage marketing copy.", priority: "medium" as const, position: 0 },
    { columnId: inProgCol.id, title: "Review Q3 metrics", description: "Pull the dashboard and write a one-paragraph summary.", priority: "high" as const, position: 0 },
    { columnId: doneCol.id, title: "Set up project repo", description: "Initialize the new project repository and CI.", priority: "low" as const, position: 0 },
  ];
  for (const card of sampleCards) {
    const [exists] = await db
      .select()
      .from(kanbanCards)
      .where(and(eq(kanbanCards.boardId, kBoard.id), eq(kanbanCards.title, card.title)))
      .limit(1);
    if (!exists) {
      await db.insert(kanbanCards).values({
        ...card,
        boardId: kBoard.id,
        createdBy: admin.id,
      });
    }
  }

  // ── Client portal: 1 ticket + 1 message ───────────────────────────────────
  const [anyTicket] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.clientId, client.id))
    .limit(1);
  if (!anyTicket) {
    await db.insert(supportTickets).values({
      clientId: client.id,
      createdBy: client.id,
      assignedTo: employee.id,
      title: "Welcome — sample support ticket",
      description: "This is an example ticket so you can see how support requests look in the portal.",
      status: "open",
      priority: "medium",
      category: "general",
    });
  }
  const [anyMsg] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.recipientId, client.id), eq(messages.senderId, admin.id)))
    .limit(1);
  if (!anyMsg) {
    await db.insert(messages).values({
      senderId: admin.id,
      recipientId: client.id,
      clientId: client.id,
      subject: "Welcome to your client portal",
      body: "Hi there — this is your client portal. Use it to share files, send messages, and track support tickets with our team.",
    });
  }

  // ── Student LMS: 1 course / 1 module / 2 lessons + enrollment + announcement
  let [course] = await db.select().from(courses).where(eq(courses.title, "Getting Started"));
  if (!course) {
    [course] = await db
      .insert(courses)
      .values({
        title: "Getting Started",
        description: "A short sample course to demonstrate the student LMS.",
        instructorId: admin.id,
        status: "published",
      })
      .returning();
  }
  let [module] = await db
    .select()
    .from(courseModules)
    .where(and(eq(courseModules.courseId, course.id), eq(courseModules.title, "Module 1: Orientation")));
  if (!module) {
    [module] = await db
      .insert(courseModules)
      .values({
        courseId: course.id,
        title: "Module 1: Orientation",
        description: "Introduction and tour of the portal.",
        position: 0,
      })
      .returning();
  }
  for (const lesson of [
    { title: "Welcome", content: "Welcome to the course! This first lesson introduces the platform.", position: 0 },
    { title: "Your first task", content: "In this lesson you'll explore the portal and complete a small exercise.", position: 1 },
  ]) {
    const [exists] = await db
      .select()
      .from(courseLessons)
      .where(and(eq(courseLessons.moduleId, module.id), eq(courseLessons.title, lesson.title)));
    if (!exists) {
      await db.insert(courseLessons).values({
        moduleId: module.id,
        title: lesson.title,
        content: lesson.content,
        contentType: "text",
        position: lesson.position,
      });
    }
  }
  const [enrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(and(eq(courseEnrollments.courseId, course.id), eq(courseEnrollments.studentId, student.id)));
  if (!enrollment) {
    await db.insert(courseEnrollments).values({ courseId: course.id, studentId: student.id });
  }
  const [anyAnnouncement] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.courseId, course.id))
    .limit(1);
  if (!anyAnnouncement) {
    await db.insert(announcements).values({
      courseId: course.id,
      authorId: admin.id,
      title: "Welcome to the course",
      content: "Glad to have you here. Start with Module 1 and let us know if you have any questions.",
    });
  }

  // ── Board portal: 1 meeting, 1 document, 1 action item, 2-3 onboarding items
  const [anyMeeting] = await db.select().from(boardMeetings).limit(1);
  if (!anyMeeting) {
    const upcoming = new Date();
    upcoming.setDate(upcoming.getDate() + 14);
    upcoming.setHours(18, 0, 0, 0);
    const [m] = await db
      .insert(boardMeetings)
      .values({
        title: "Upcoming Board Meeting",
        meetingType: "regular",
        status: "scheduled",
        scheduledAt: upcoming,
        location: "Video conference",
        quorumNumber: 3,
        createdBy: admin.id,
      })
      .returning();
    await db.insert(boardAgendaItems).values([
      { meetingId: m.id, title: "Call to order", position: 0, duration: 5 },
      { meetingId: m.id, title: "Approval of previous minutes", position: 1, duration: 10 },
      { meetingId: m.id, title: "New business", position: 2, duration: 30 },
      { meetingId: m.id, title: "Adjournment", position: 3, duration: 5 },
    ]);
  }
  const [anyDoc] = await db.select().from(boardDocuments).limit(1);
  if (!anyDoc) {
    await db.insert(boardDocuments).values({
      title: "Sample bylaws (placeholder)",
      description: "Replace this with your organization's bylaws.",
      category: "Governance",
      confidentiality: "board_only",
      uploadedBy: admin.id,
    });
  }
  const [anyAction] = await db.select().from(boardActionItems).limit(1);
  if (!anyAction) {
    const due = new Date();
    due.setDate(due.getDate() + 21);
    await db.insert(boardActionItems).values({
      title: "Review draft bylaws",
      description: "Read the placeholder bylaws document and share feedback before the next meeting.",
      assignedTo: board.id,
      dueDate: due,
      status: "open",
      createdBy: admin.id,
    });
  }
  const onboardingDefs = [
    { title: "Read your organization's mission statement", description: "Get familiar with the org's mission, vision, and current strategic priorities.", section: "Welcome", estimatedTime: "~10 min", position: 1 },
    { title: "Tour the board portal", description: "Visit each tab — Meetings, Documents, Action Items — to see what's available.", section: "Welcome", estimatedTime: "~10 min", position: 2 },
    { title: "Update your profile and notification preferences", description: "Add your contact info and choose how you'd like to be notified.", section: "Welcome", estimatedTime: "~5 min", position: 3 },
  ];
  for (const item of onboardingDefs) {
    const [exists] = await db
      .select()
      .from(boardOnboardingItems)
      .where(eq(boardOnboardingItems.title, item.title));
    if (!exists) await db.insert(boardOnboardingItems).values(item);
  }

  // ── Chat: 2 channels with 1 welcome message each ──────────────────────────
  const channelDefs = [
    { name: "general", description: "Team-wide chat", type: "general" as const },
    { name: "announcements", description: "Important updates", type: "announcements" as const },
  ];
  for (const ch of channelDefs) {
    let [existing] = await db
      .select()
      .from(chatChannels)
      .where(and(eq(chatChannels.name, ch.name), eq(chatChannels.scope, "employee")));
    if (!existing) {
      [existing] = await db
        .insert(chatChannels)
        .values({
          name: ch.name,
          description: ch.description,
          type: ch.type,
          scope: "employee",
          createdBy: admin.id,
        })
        .returning();
    }
    const [hasMsg] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.channelId, existing.id))
      .limit(1);
    if (!hasMsg) {
      const content =
        ch.name === "general"
          ? "Welcome to the team chat. Say hello!"
          : "This channel is for important announcements.";
      await db.insert(chatMessages).values({
        channelId: existing.id,
        userId: admin.id,
        content,
        isAnnouncement: ch.name === "announcements",
      });
    }
  }

  // void unused-helper-warning suppressors
  void workingCc;

  console.log("[seed] ✓ Demo data seeded\n");
  console.log("Demo accounts (local development only):");
  console.log("  Legacy admin login (username/password):");
  console.log(`    username: admin   password: ${BRAND.nameAscii}2026`);
  console.log("  Portal logins (email/password):");
  console.log(`    admin@${BRAND.domain}     Admin1234!`);
  console.log(`    employee@${BRAND.domain}  Employee1!`);
  console.log(`    manager@${BRAND.domain}   Manager1!`);
  console.log(`    client@${BRAND.domain}    Client123!`);
  console.log(`    student@${BRAND.domain}   Student1!`);
  console.log(`    board@${BRAND.domain}     Board1234!`);
  console.log("\nChange these passwords before exposing the deployment.");
}

async function main() {
  const wantReset = process.argv.includes("--reset");
  if (wantReset) await reset();
  await seed();
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] FAILED:", err);
  process.exit(1);
});
