import type { Router } from "express";
import { Router as createRouter } from "express";
import type { SQL } from "drizzle-orm";
import { requireBoard, requireAdmin } from "./auth-middleware";
import { db } from "./db";
import {
  boardMeetings, boardMeetingRsvps, boardMeetingAttendees, boardAgendaItems,
  boardMeetingNotices, boardActionItems, boardMinutesActionItems,
  boardDocuments, boardWrittenConsents, boardNotificationPrefs, users,
  boardMinutes, boardMinutesMotions, boardMinutesVersions,
} from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import PDFDocument from "pdfkit";

const router: Router = createRouter();
router.use(requireBoard as any);

/** Execute raw SQL and return rows array (handles node-postgres QueryResult) */
async function raw<T = any>(query: SQL): Promise<T[]> {
  const result: any = await db.execute(query);
  if (Array.isArray(result)) return result as T[];
  if (result && Array.isArray(result.rows)) return result.rows as T[];
  return [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function auditLog(userId: number, action: string, resourceType: string, resourceId: number | null, detail?: string) {
  db.execute(sql`
    INSERT INTO board_audit_log (user_id, action, resource_type, resource_id, detail)
    VALUES (${userId}, ${action}, ${resourceType}, ${resourceId}, ${detail ?? null})
  `).catch(() => {});
}

async function getBoardMemberCount(): Promise<number> {
  const rows = await raw<{ cnt: string }>(sql`
    SELECT count(*) AS cnt FROM portal_users WHERE role IN ('board','admin') AND status = 'active'
  `);
  return parseInt(rows[0]?.cnt ?? "0");
}

// ── Board Members ─────────────────────────────────────────────────────────────

router.get("/members", async (_req, res) => {
  const members = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    role: users.role,
    boardPosition: users.boardPosition,
    termStart: users.termStart,
    termEnd: users.termEnd,
    bio: users.bio,
    committees: users.committees,
    status: users.status,
  }).from(users).where(sql`role IN ('board','admin') AND status = 'active'`).orderBy(asc(users.firstName));
  res.json({ success: true, data: members });
});

router.get("/directory", async (_req, res) => {
  const members = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    boardPosition: users.boardPosition,
    bio: users.bio,
    committees: users.committees,
  }).from(users).where(sql`role IN ('board','admin') AND status = 'active'`).orderBy(asc(users.firstName));
  res.json({ success: true, data: members });
});

// ── Committees ────────────────────────────────────────────────────────────────

router.get("/committees", async (_req, res) => {
  const rows = await raw(sql`SELECT * FROM board_committees ORDER BY name`);
  res.json({ success: true, data: rows });
});
router.post("/committees", requireAdmin as any, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Name required" });
  const rows = await raw(sql`
    INSERT INTO board_committees (name, description) VALUES (${name}, ${description ?? null}) RETURNING *
  `);
  res.status(201).json({ success: true, data: rows[0] });
});

// ── Meetings ──────────────────────────────────────────────────────────────────

router.get("/meetings", async (req, res) => {
  const rows = await db.select().from(boardMeetings).orderBy(desc(boardMeetings.scheduledAt));
  // Attach RSVP summary counts and current user's RSVP
  const userId = req.user!.userId;
  const enriched = await Promise.all(rows.map(async (m) => {
    const rsvps = await db.select().from(boardMeetingRsvps).where(eq(boardMeetingRsvps.meetingId, m.id));
    const myRsvp = rsvps.find(r => r.userId === userId);
    return {
      ...m,
      rsvpYes: rsvps.filter(r => r.response === "yes").length,
      rsvpNo: rsvps.filter(r => r.response === "no").length,
      rsvpTentative: rsvps.filter(r => r.response === "tentative").length,
      myRsvp: myRsvp?.response ?? null,
    };
  }));
  res.json({ success: true, data: enriched });
});

router.post("/meetings", requireAdmin as any, async (req, res) => {
  const { title, scheduledAt, endTime, location, platform, meetingType, quorumNumber, noticeSentAt, noticeMethod } = req.body;
  if (!title || !scheduledAt) return res.status(400).json({ success: false, error: "Title and date required" });
  const [meeting] = await db.insert(boardMeetings).values({
    title,
    scheduledAt: new Date(scheduledAt),
    endTime: endTime ? new Date(endTime) : undefined,
    location: location || null,
    platform: platform || null,
    meetingType: meetingType || "regular",
    quorumNumber: quorumNumber ? parseInt(quorumNumber) : 3,
    createdBy: req.user!.userId,
    noticeSentAt: noticeSentAt ? new Date(noticeSentAt) : undefined,
    noticeMethod: noticeMethod || undefined,
  }).returning();
  auditLog(req.user!.userId, "create", "meeting", meeting.id, `Created: ${title}`);
  res.status(201).json({ success: true, data: meeting });
});

router.get("/meetings/:id/rsvps", async (req, res) => {
  const id = parseInt(req.params.id);
  const rows = await raw(sql`
    SELECT r.*, u.first_name, u.last_name, u.board_position
    FROM board_meeting_rsvps r
    JOIN portal_users u ON u.id = r.user_id
    WHERE r.meeting_id = ${id}
    ORDER BY r.response, u.first_name
  `);
  res.json({ success: true, data: rows });
});

router.get("/meetings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [meeting] = await db.select().from(boardMeetings).where(eq(boardMeetings.id, id));
  if (!meeting) return res.status(404).json({ success: false, error: "Meeting not found" });

  const [agendaItems, attendees, noticesRaw] = await Promise.all([
    db.select().from(boardAgendaItems).where(eq(boardAgendaItems.meetingId, id)).orderBy(asc(boardAgendaItems.position)),
    db.select().from(boardMeetingAttendees).where(eq(boardMeetingAttendees.meetingId, id)),
    db.select().from(boardMeetingNotices).where(eq(boardMeetingNotices.meetingId, id)).orderBy(desc(boardMeetingNotices.sentAt)),
  ]);

  // RSVPs with names
  const rsvpRows = await raw(sql`
    SELECT r.*, u.first_name, u.last_name, u.board_position
    FROM board_meeting_rsvps r
    JOIN portal_users u ON u.id = r.user_id
    WHERE r.meeting_id = ${id}
    ORDER BY u.first_name
  `);

  // Attendees with names (for held meetings)
  const attendeesWithNames = await Promise.all(attendees.map(async (a) => {
    const [u] = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, a.userId));
    return { ...a, firstName: u?.firstName, lastName: u?.lastName };
  }));

  const totalBoardMembers = await getBoardMemberCount();
  const yesCount = rsvpRows.filter((r: any) => r.response === "yes").length;
  const tentativeCount = rsvpRows.filter((r: any) => r.response === "tentative").length;
  const quorum = meeting.quorumNumber ?? 3;
  const quorumStatus = yesCount >= quorum ? "met" : (yesCount + tentativeCount) >= quorum ? "possible" : "unlikely";

  res.json({
    success: true,
    data: {
      ...meeting,
      agendaItems,
      rsvps: rsvpRows,
      attendees: attendeesWithNames,
      notices: noticesRaw,
      totalBoardMembers,
      quorumStatus,
      rsvpYes: yesCount,
      rsvpTentative: tentativeCount,
      rsvpNo: rsvpRows.filter((r: any) => r.response === "no").length,
    },
  });
});

router.patch("/meetings/:id", requireAdmin as any, async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, scheduledAt, endTime, location, platform, meetingType, quorumNumber, status } = req.body;
  const [updated] = await db.update(boardMeetings).set({
    ...(title && { title }),
    ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
    ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
    ...(location !== undefined && { location }),
    ...(platform !== undefined && { platform }),
    ...(meetingType && { meetingType }),
    ...(quorumNumber && { quorumNumber: parseInt(quorumNumber) }),
    ...(status && { status }),
  }).where(eq(boardMeetings.id, id)).returning();
  auditLog(req.user!.userId, "update", "meeting", id);
  res.json({ success: true, data: updated });
});

// ── RSVPs ─────────────────────────────────────────────────────────────────────

router.post("/meetings/:id/rsvp", async (req, res) => {
  const meetingId = parseInt(req.params.id);
  const userId = req.user!.userId;
  const { response } = req.body;
  if (!["yes", "no", "tentative"].includes(response)) {
    return res.status(400).json({ success: false, error: "Invalid RSVP response" });
  }
  // Upsert
  const existing = await db.select().from(boardMeetingRsvps).where(
    and(eq(boardMeetingRsvps.meetingId, meetingId), eq(boardMeetingRsvps.userId, userId))
  );
  let rsvp;
  if (existing.length > 0) {
    [rsvp] = await db.update(boardMeetingRsvps)
      .set({ response: response as any, respondedAt: new Date() })
      .where(and(eq(boardMeetingRsvps.meetingId, meetingId), eq(boardMeetingRsvps.userId, userId)))
      .returning();
  } else {
    [rsvp] = await db.insert(boardMeetingRsvps).values({
      meetingId, userId, response: response as any,
    }).returning();
  }
  res.json({ success: true, data: rsvp });
});

// ── Agenda Items ──────────────────────────────────────────────────────────────

router.post("/meetings/:id/agenda", requireAdmin as any, async (req, res) => {
  const meetingId = parseInt(req.params.id);
  const { title, description, duration, presenter } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Title required" });
  const existing = await db.select().from(boardAgendaItems).where(eq(boardAgendaItems.meetingId, meetingId));
  const [item] = await db.insert(boardAgendaItems).values({
    meetingId, title,
    description: description || null,
    duration: duration ? parseInt(duration) : null,
    presenter: presenter || null,
    position: existing.length,
  }).returning();
  res.status(201).json({ success: true, data: item });
});

router.patch("/agenda/:id", requireAdmin as any, async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, duration, presenter, position } = req.body;
  const [updated] = await db.update(boardAgendaItems).set({
    ...(title && { title }),
    ...(description !== undefined && { description }),
    ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
    ...(presenter !== undefined && { presenter }),
    ...(position !== undefined && { position }),
  }).where(eq(boardAgendaItems.id, id)).returning();
  res.json({ success: true, data: updated });
});

router.delete("/agenda/:id", requireAdmin as any, async (req, res) => {
  await db.delete(boardAgendaItems).where(eq(boardAgendaItems.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── Attendance ────────────────────────────────────────────────────────────────

router.post("/meetings/:id/attendance", requireAdmin as any, async (req, res) => {
  const meetingId = parseInt(req.params.id);
  const { records } = req.body; // [{ userId, attendance, participationMethod, waivedNotice }]
  if (!Array.isArray(records)) return res.status(400).json({ success: false, error: "records array required" });

  // Delete existing attendance for this meeting
  await db.delete(boardMeetingAttendees).where(eq(boardMeetingAttendees.meetingId, meetingId));

  if (records.length > 0) {
    await db.insert(boardMeetingAttendees).values(records.map((r: any) => ({
      meetingId,
      userId: r.userId,
      attendance: r.attendance || "present",
      participationMethod: r.participationMethod || "in_person",
      waivedNotice: r.waivedNotice || false,
    })));
  }
  // Mark meeting as held
  await db.update(boardMeetings).set({ status: "held" }).where(eq(boardMeetings.id, meetingId));
  auditLog(req.user!.userId, "record_attendance", "meeting", meetingId);
  res.json({ success: true, data: null });
});

// ── Meeting Notices ───────────────────────────────────────────────────────────

router.post("/meetings/:id/notice", requireAdmin as any, async (req, res) => {
  const meetingId = parseInt(req.params.id);
  const { method, notes } = req.body;
  if (!method) return res.status(400).json({ success: false, error: "method required" });
  const memberCount = await getBoardMemberCount();
  const [notice] = await db.insert(boardMeetingNotices).values({
    meetingId,
    method,
    recipientCount: memberCount,
    sentBy: req.user!.userId,
    notes: notes || null,
  }).returning();
  // Also update the meeting's notice_sent_at
  await db.update(boardMeetings).set({ noticeSentAt: new Date(), noticeMethod: method }).where(eq(boardMeetings.id, meetingId));
  auditLog(req.user!.userId, "send_notice", "meeting", meetingId, `Method: ${method}`);
  res.status(201).json({ success: true, data: notice });
});

// ── Action Items ──────────────────────────────────────────────────────────────

router.get("/action-items", async (_req, res) => {
  const items = await raw(sql`
    SELECT a.*, u.first_name, u.last_name
    FROM board_action_items a
    LEFT JOIN portal_users u ON u.id = a.assigned_to
    WHERE a.status != 'complete'
    ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
  `);
  res.json({ success: true, data: items });
});

router.get("/my-action-items", async (req, res) => {
  const userId = req.user!.userId;
  const items = await db.select().from(boardActionItems).where(
    and(eq(boardActionItems.assignedTo, userId), sql`status != 'complete'`)
  ).orderBy(asc(boardActionItems.dueDate));
  res.json({ success: true, data: items });
});

router.patch("/action-items/:id", async (req, res) => {
  const itemId = parseInt(req.params.id);
  const userId = req.user!.userId;
  const isAdmin = req.user!.role === "admin";
  // Only admin or the assigned user may edit
  const [existing] = await db.select().from(boardActionItems).where(eq(boardActionItems.id, itemId));
  if (!existing) return res.status(404).json({ success: false, error: "Not found" });
  if (!isAdmin && existing.assignedTo !== userId) {
    return res.status(403).json({ success: false, error: "Not authorized to edit this action item" });
  }
  const { status, dueDate, title, description } = req.body;
  const [updated] = await db.update(boardActionItems).set({
    ...(status && { status }),
    ...(status === "complete" && { completedAt: new Date() }),
    ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    ...(isAdmin && title && { title }),
    ...(isAdmin && description !== undefined && { description }),
  }).where(eq(boardActionItems.id, itemId)).returning();
  res.json({ success: true, data: updated });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

router.get("/dashboard", async (req, res) => {
  const userId = req.user!.userId;
  const currentYear = new Date().getFullYear();

  const [meetings, myActions, recentDocs, openConsents] = await Promise.all([
    db.select().from(boardMeetings).where(
      and(eq(boardMeetings.status, "scheduled"), sql`scheduled_at > NOW()`)
    ).orderBy(asc(boardMeetings.scheduledAt)).limit(3),

    db.select().from(boardActionItems).where(
      and(eq(boardActionItems.assignedTo, userId), sql`status != 'complete'`)
    ).orderBy(asc(boardActionItems.dueDate)).limit(5),

    db.select().from(boardDocuments).orderBy(desc(boardDocuments.createdAt)).limit(4),

    db.select().from(boardWrittenConsents).where(eq(boardWrittenConsents.status, "pending")).orderBy(asc(boardWrittenConsents.createdAt)).limit(3),
  ]);

  // For each upcoming meeting, get current user's RSVP
  const meetingsWithRsvp = await Promise.all(meetings.map(async (m) => {
    const [myRsvp] = await db.select().from(boardMeetingRsvps).where(
      and(eq(boardMeetingRsvps.meetingId, m.id), eq(boardMeetingRsvps.userId, userId))
    );
    return { ...m, myRsvp: myRsvp?.response ?? null };
  }));

  // Check if COI disclosure filed for current fiscal year
  const coiRows = await raw(sql`
    SELECT id FROM board_coi_disclosures WHERE user_id = ${userId} AND fiscal_year = ${currentYear} LIMIT 1
  `);
  const coiFiled = coiRows.length > 0;

  // Documents requiring acknowledgment that user hasn't acked
  const unackedDocs = await raw(sql`
    SELECT d.id, d.title, d.category, d.created_at
    FROM board_documents d
    WHERE d.require_ack = true
    AND NOT EXISTS (
      SELECT 1 FROM board_document_acks a WHERE a.document_id = d.id AND a.user_id = ${userId}
    )
    ORDER BY d.created_at DESC
    LIMIT 5
  `);

  // Open written consents user hasn't responded to
  const unconsentedVotes = await raw(sql`
    SELECT c.id, c.title, c.created_at
    FROM board_written_consents c
    WHERE c.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM board_written_consent_responses r WHERE r.consent_id = c.id AND r.user_id = ${userId}
    )
    ORDER BY c.created_at ASC
    LIMIT 3
  `);

  res.json({
    success: true,
    data: {
      upcomingMeetings: meetingsWithRsvp,
      myActionItems: myActions,
      recentDocuments: recentDocs,
      openConsents,
      // Compliance "needs attention" alerts
      needsAttention: {
        coiFiled,
        coiYear: currentYear,
        unackedDocuments: unackedDocs,
        pendingConsents: unconsentedVotes,
      },
    },
  });
});

// ── Documents (stub — real impl in Task 4) ────────────────────────────────────

router.get("/documents", async (_req, res) => {
  const docs = await db.select().from(boardDocuments).orderBy(desc(boardDocuments.createdAt)).limit(20);
  res.json({ success: true, data: docs });
});

router.post("/documents", requireAdmin as any, async (req, res) => {
  const { title, description, category, confidentiality, requireAck } = req.body;
  if (!title || !category) return res.status(400).json({ success: false, error: "Title and category required" });
  const [doc] = await db.insert(boardDocuments).values({
    title, description: description || null, category,
    confidentiality: confidentiality || "board_only",
    requireAck: requireAck || false,
    uploadedBy: req.user!.userId,
  }).returning();
  res.status(201).json({ success: true, data: doc });
});

router.get("/documents/:id", async (req, res) => {
  const [doc] = await db.select().from(boardDocuments).where(eq(boardDocuments.id, parseInt(req.params.id)));
  if (!doc) return res.status(404).json({ success: false, error: "Not found" });
  res.json({ success: true, data: doc });
});

router.get("/documents/:id/download", async (_req, res) => res.json({ success: false, error: "Use Task 4 file routes" }));
router.post("/documents/:id/acknowledge", async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  await db.execute(sql`
    INSERT INTO board_document_acks (document_id, user_id) VALUES (${parseInt(id)}, ${userId})
    ON CONFLICT DO NOTHING
  `);
  res.status(201).json({ success: true, data: null });
});

// ── Audit Log ─────────────────────────────────────────────────────────────────

router.get("/audit-log", requireAdmin as any, async (_req, res) => {
  const rows = await raw(sql`
    SELECT a.*, u.first_name, u.last_name
    FROM board_audit_log a
    LEFT JOIN portal_users u ON u.id = a.user_id
    ORDER BY a.created_at DESC
    LIMIT 100
  `);
  res.json({ success: true, data: rows });
});

// ── Written Consents ──────────────────────────────────────────────────────────

router.get("/consents", async (_req, res) => {
  const rows = await db.select().from(boardWrittenConsents).orderBy(desc(boardWrittenConsents.createdAt));
  res.json({ success: true, data: rows });
});

router.post("/consents", requireAdmin as any, async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Title required" });
  const [consent] = await db.insert(boardWrittenConsents).values({
    title, description: description || null, createdBy: req.user!.userId,
  }).returning();
  res.status(201).json({ success: true, data: consent });
});

router.get("/consents/:id", async (req, res) => {
  const [consent] = await db.select().from(boardWrittenConsents).where(eq(boardWrittenConsents.id, parseInt(req.params.id)));
  if (!consent) return res.status(404).json({ success: false, error: "Not found" });
  res.json({ success: true, data: consent });
});

router.post("/consents/:id/respond", async (req, res) => {
  const consentId = parseInt(req.params.id);
  const userId = req.user!.userId;
  const { response, reason } = req.body;
  await db.execute(sql`
    INSERT INTO board_written_consent_responses (consent_id, user_id, response, reason)
    VALUES (${consentId}, ${userId}, ${response}, ${reason ?? null})
    ON CONFLICT (consent_id, user_id) DO UPDATE SET response = EXCLUDED.response, reason = EXCLUDED.reason, responded_at = NOW()
  `);
  res.status(201).json({ success: true, data: null });
});

// ── COI Disclosures ───────────────────────────────────────────────────────────

router.get("/coi", async (req, res) => {
  const rows = await raw(sql`
    SELECT c.*, u.first_name, u.last_name FROM board_coi_disclosures c
    LEFT JOIN portal_users u ON u.id = c.user_id ORDER BY c.fiscal_year DESC, c.submitted_at DESC
  `);
  res.json({ success: true, data: rows });
});

router.get("/coi/:year", async (req, res) => {
  const rows = await raw(sql`
    SELECT c.*, u.first_name, u.last_name FROM board_coi_disclosures c
    LEFT JOIN portal_users u ON u.id = c.user_id WHERE c.fiscal_year = ${parseInt(req.params.year)}
  `);
  res.json({ success: true, data: rows });
});

router.post("/coi", async (req, res) => {
  const { disclosures, certified, fiscalYear } = req.body;
  await db.execute(sql`
    INSERT INTO board_coi_disclosures (user_id, fiscal_year, disclosures, certified)
    VALUES (${req.user!.userId}, ${fiscalYear ?? new Date().getFullYear()}, ${disclosures ?? null}, ${certified ?? false})
  `);
  res.status(201).json({ success: true, data: null });
});

// ── Financials ────────────────────────────────────────────────────────────────

router.get("/financials", async (_req, res) => {
  const rows = await raw(sql`SELECT * FROM board_financials ORDER BY as_of_date DESC`);
  res.json({ success: true, data: rows });
});

router.post("/financials", requireAdmin as any, (_req, res) => res.status(201).json({ success: true, data: null }));

// ── Forums ────────────────────────────────────────────────────────────────────

router.get("/forums/topics", async (_req, res) => {
  const rows = await raw(sql`
    SELECT t.*, u.first_name, u.last_name,
      (SELECT count(*) FROM board_forum_posts p WHERE p.topic_id = t.id) AS post_count
    FROM board_forum_topics t LEFT JOIN portal_users u ON u.id = t.author_id
    ORDER BY t.pinned DESC, t.last_activity_at DESC
  `);
  res.json({ success: true, data: rows });
});

router.post("/forums/topics", async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ success: false, error: "Title and content required" });
  const rows = await raw(sql`
    INSERT INTO board_forum_topics (title, content, author_id) VALUES (${title}, ${content}, ${req.user!.userId}) RETURNING *
  `);
  res.status(201).json({ success: true, data: rows[0] });
});

router.get("/forums/topics/:id/posts", async (req, res) => {
  const rows = await raw(sql`
    SELECT p.*, u.first_name, u.last_name FROM board_forum_posts p
    LEFT JOIN portal_users u ON u.id = p.author_id WHERE p.topic_id = ${parseInt(req.params.id)}
    ORDER BY p.created_at ASC
  `);
  res.json({ success: true, data: rows });
});

router.post("/forums/topics/:id/posts", async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ success: false, error: "Content required" });
  const topicId = parseInt(req.params.id);
  await db.execute(sql`
    INSERT INTO board_forum_posts (topic_id, author_id, content) VALUES (${topicId}, ${req.user!.userId}, ${content})
  `);
  await db.execute(sql`UPDATE board_forum_topics SET last_activity_at = NOW() WHERE id = ${topicId}`);
  res.status(201).json({ success: true, data: null });
});

// ── Onboarding ────────────────────────────────────────────────────────────────

router.get("/onboarding", async (req, res) => {
  const userId = req.user!.userId;
  const items = await raw(sql`
    SELECT i.*, (SELECT count(*) FROM board_onboarding_acks a WHERE a.item_id = i.id AND a.user_id = ${userId}) > 0 AS acked
    FROM board_onboarding_items i ORDER BY i.position
  `);
  res.json({ success: true, data: items });
});

router.post("/onboarding/:id/ack", async (req, res) => {
  await db.execute(sql`
    INSERT INTO board_onboarding_acks (item_id, user_id) VALUES (${parseInt(req.params.id)}, ${req.user!.userId})
    ON CONFLICT DO NOTHING
  `);
  res.status(201).json({ success: true, data: null });
});

router.post("/onboarding/items", requireAdmin as any, async (req, res) => {
  const { title, description, position } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Title required" });
  await db.execute(sql`
    INSERT INTO board_onboarding_items (title, description, position) VALUES (${title}, ${description ?? null}, ${position ?? 0})
  `);
  res.status(201).json({ success: true, data: null });
});

// ── Notification Prefs ────────────────────────────────────────────────────────

router.get("/notification-prefs", async (req, res) => {
  const rows = await raw(sql`SELECT * FROM board_notification_prefs WHERE user_id = ${req.user!.userId}`);
  res.json({ success: true, data: rows[0] ?? null });
});

router.patch("/notification-prefs", async (req, res) => {
  const userId = req.user!.userId;
  const {
    meetingNoticesEmail, meetingNoticesInApp,
    documentUploadsEmail, documentUploadsInApp,
    actionItemsEmail, actionItemsInApp,
    forumActivityEmail, forumActivityInApp,
    coiPromptsEmail, coiPromptsInApp,
  } = req.body;
  const vals: any = { userId };
  if (meetingNoticesEmail !== undefined) vals.meetingNoticesEmail = !!meetingNoticesEmail;
  if (meetingNoticesInApp !== undefined) vals.meetingNoticesInApp = !!meetingNoticesInApp;
  if (documentUploadsEmail !== undefined) vals.documentUploadsEmail = !!documentUploadsEmail;
  if (documentUploadsInApp !== undefined) vals.documentUploadsInApp = !!documentUploadsInApp;
  if (actionItemsEmail !== undefined) vals.actionItemsEmail = !!actionItemsEmail;
  if (actionItemsInApp !== undefined) vals.actionItemsInApp = !!actionItemsInApp;
  if (forumActivityEmail !== undefined) vals.forumActivityEmail = !!forumActivityEmail;
  if (forumActivityInApp !== undefined) vals.forumActivityInApp = !!forumActivityInApp;
  if (coiPromptsEmail !== undefined) vals.coiPromptsEmail = !!coiPromptsEmail;
  if (coiPromptsInApp !== undefined) vals.coiPromptsInApp = !!coiPromptsInApp;
  await db.insert(boardNotificationPrefs).values(vals)
    .onConflictDoUpdate({ target: boardNotificationPrefs.userId, set: vals });
  res.json({ success: true, data: null });
});

// ── Roster (admin) ────────────────────────────────────────────────────────────

router.get("/roster", requireAdmin as any, async (_req, res) => {
  const members = await db.select().from(users).where(sql`role IN ('board','admin')`).orderBy(asc(users.firstName));
  res.json({ success: true, data: members });
});

router.patch("/roster/:id", requireAdmin as any, async (req, res) => {
  const { boardPosition, termStart, termEnd, committees, bio } = req.body;
  await db.update(users).set({
    ...(boardPosition !== undefined && { boardPosition }),
    ...(termStart !== undefined && { termStart: termStart ? new Date(termStart) : null }),
    ...(termEnd !== undefined && { termEnd: termEnd ? new Date(termEnd) : null }),
    ...(committees !== undefined && { committees }),
    ...(bio !== undefined && { bio }),
  }).where(eq(users.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── Settings ──────────────────────────────────────────────────────────────────

router.get("/settings", async (_req, res) => {
  res.json({ success: true, data: { quorumDefault: 3 } });
});

router.patch("/settings", requireAdmin as any, async (_req, res) => {
  res.json({ success: true, data: null });
});

// ── Minutes ───────────────────────────────────────────────────────────────────

async function getMinutesFull(minutesId: number) {
  const [mins] = await db.select().from(boardMinutes).where(eq(boardMinutes.id, minutesId));
  if (!mins) return null;
  const motions = await db.select().from(boardMinutesMotions)
    .where(eq(boardMinutesMotions.minutesId, minutesId)).orderBy(asc(boardMinutesMotions.position));
  const actionItems = await raw(sql`
    SELECT ai.*, u.first_name, u.last_name
    FROM board_minutes_action_items ai
    LEFT JOIN portal_users u ON u.id = ai.assigned_to
    WHERE ai.minutes_id = ${minutesId}
    ORDER BY ai.created_at
  `);
  return { ...mins, motions, actionItems };
}

async function saveVersionSnapshot(minutesId: number, userId: number, mins: any) {
  const versionRows = await raw<{ max: string }>(sql`
    SELECT COALESCE(MAX(version_number), 0) AS max FROM board_minutes_versions WHERE minutes_id = ${minutesId}
  `);
  const nextVersion = parseInt(versionRows[0]?.max ?? "0") + 1;
  await db.insert(boardMinutesVersions).values({
    minutesId,
    versionNumber: nextVersion,
    contentSnapshot: mins.content ?? null,
    motionsSnapshot: JSON.stringify(mins.motions ?? []),
    savedBy: userId,
  });
}

router.get("/minutes", async (_req, res) => {
  const rows = await raw(sql`
    SELECT m.*, mt.title AS meeting_title, mt.scheduled_at,
      (SELECT count(*) FROM board_minutes_motions mo WHERE mo.minutes_id = m.id) AS motion_count
    FROM board_minutes m
    JOIN board_meetings mt ON mt.id = m.meeting_id
    ORDER BY mt.scheduled_at DESC
  `);
  res.json({ success: true, data: rows });
});

router.get("/meetings/:id/minutes", async (req, res) => {
  const meetingId = parseInt(req.params.id);
  const rows = await db.select().from(boardMinutes).where(eq(boardMinutes.meetingId, meetingId));
  if (rows.length === 0) return res.json({ success: true, data: null });
  const full = await getMinutesFull(rows[0].id);
  res.json({ success: true, data: full });
});

router.post("/meetings/:id/minutes", requireAdmin as any, async (req, res) => {
  const meetingId = parseInt(req.params.id);
  const existing = await db.select().from(boardMinutes).where(eq(boardMinutes.meetingId, meetingId));
  if (existing.length > 0) {
    const full = await getMinutesFull(existing[0].id);
    return res.json({ success: true, data: full });
  }
  const [mins] = await db.insert(boardMinutes).values({
    meetingId,
    createdBy: req.user!.userId,
    status: "draft",
  }).returning();
  auditLog(req.user!.userId, "create", "minutes", mins.id, `Created minutes for meeting ${meetingId}`);
  res.status(201).json({ success: true, data: { ...mins, motions: [], actionItems: [] } });
});

router.get("/minutes/:id", async (req, res) => {
  const full = await getMinutesFull(parseInt(req.params.id));
  if (!full) return res.status(404).json({ success: false, error: "Not found" });
  res.json({ success: true, data: full });
});

router.patch("/minutes/:id", requireAdmin as any, async (req, res) => {
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(boardMinutes).where(eq(boardMinutes.id, id));
  if (!existing) return res.status(404).json({ success: false, error: "Not found" });
  if (existing.status === "approved") return res.status(403).json({ success: false, error: "Approved minutes cannot be edited" });

  const { content, quorumPresent, quorumCount, adjournmentTime } = req.body;
  const updateData: any = { updatedAt: new Date() };
  if (content !== undefined) updateData.content = content;
  if (quorumPresent !== undefined) updateData.quorumPresent = !!quorumPresent;
  if (quorumCount !== undefined) updateData.quorumCount = quorumCount ? parseInt(quorumCount) : null;
  if (adjournmentTime !== undefined) updateData.adjournmentTime = adjournmentTime ? new Date(adjournmentTime) : null;

  const [updated] = await db.update(boardMinutes).set(updateData).where(eq(boardMinutes.id, id)).returning();
  const full = await getMinutesFull(id);
  await saveVersionSnapshot(id, req.user!.userId, full);
  res.json({ success: true, data: full });
});

router.post("/minutes/:id/submit", requireAdmin as any, async (req, res) => {
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(boardMinutes).where(eq(boardMinutes.id, id));
  if (!existing) return res.status(404).json({ success: false, error: "Not found" });
  if (existing.status !== "draft") return res.status(400).json({ success: false, error: "Only draft minutes can be submitted" });
  const [updated] = await db.update(boardMinutes).set({ status: "pending_approval", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(boardMinutes.id, id)).returning();
  auditLog(req.user!.userId, "submit", "minutes", id);
  res.json({ success: true, data: updated });
});

router.post("/minutes/:id/approve", requireAdmin as any, async (req, res) => {
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(boardMinutes).where(eq(boardMinutes.id, id));
  if (!existing) return res.status(404).json({ success: false, error: "Not found" });
  if (existing.status === "draft") return res.status(400).json({ success: false, error: "Minutes must be submitted before approving" });
  const [updated] = await db.update(boardMinutes).set({
    status: "approved", approvedBy: req.user!.userId, approvedAt: new Date(), updatedAt: new Date(),
  }).where(eq(boardMinutes.id, id)).returning();
  auditLog(req.user!.userId, "approve", "minutes", id);
  const full = await getMinutesFull(id);
  await saveVersionSnapshot(id, req.user!.userId, full);
  res.json({ success: true, data: updated });
});

router.get("/minutes/:id/history", async (req, res) => {
  const id = parseInt(req.params.id);
  const rows = await raw(sql`
    SELECT v.*, u.first_name, u.last_name FROM board_minutes_versions v
    LEFT JOIN portal_users u ON u.id = v.saved_by
    WHERE v.minutes_id = ${id}
    ORDER BY v.version_number DESC
  `);
  res.json({ success: true, data: rows });
});

router.post("/minutes/:id/motions", requireAdmin as any, async (req, res) => {
  const minutesId = parseInt(req.params.id);
  const [existing] = await db.select().from(boardMinutes).where(eq(boardMinutes.id, minutesId));
  if (!existing) return res.status(404).json({ success: false, error: "Not found" });
  if (existing.status === "approved") return res.status(403).json({ success: false, error: "Approved minutes are locked" });
  const { motionText, moverId, seconderId, votesFor, votesAgainst, votesAbstain, passed, recusedDirectors, position } = req.body;
  if (!motionText?.trim()) return res.status(400).json({ success: false, error: "Motion text required" });
  const [motion] = await db.insert(boardMinutesMotions).values({
    minutesId,
    motionText,
    moverId: moverId ? parseInt(moverId) : null,
    seconderId: seconderId ? parseInt(seconderId) : null,
    votesFor: votesFor ? parseInt(votesFor) : 0,
    votesAgainst: votesAgainst ? parseInt(votesAgainst) : 0,
    votesAbstain: votesAbstain ? parseInt(votesAbstain) : 0,
    passed: !!passed,
    recusedDirectors: recusedDirectors || null,
    position: position ?? 0,
  }).returning();
  const full = await getMinutesFull(minutesId);
  saveVersionSnapshot(minutesId, req.user!.userId, full).catch(() => {});
  res.status(201).json({ success: true, data: motion });
});

router.patch("/minutes/:id/motions/:motionId", requireAdmin as any, async (req, res) => {
  const minutesId = parseInt(req.params.id);
  const motionId = parseInt(req.params.motionId);
  const [existing] = await db.select().from(boardMinutes).where(eq(boardMinutes.id, minutesId));
  if (!existing) return res.status(404).json({ success: false, error: "Not found" });
  if (existing.status === "approved") return res.status(403).json({ success: false, error: "Approved minutes are locked" });
  const { motionText, moverId, seconderId, votesFor, votesAgainst, votesAbstain, passed, recusedDirectors } = req.body;
  const [updated] = await db.update(boardMinutesMotions).set({
    ...(motionText !== undefined && { motionText }),
    ...(moverId !== undefined && { moverId: moverId ? parseInt(moverId) : null }),
    ...(seconderId !== undefined && { seconderId: seconderId ? parseInt(seconderId) : null }),
    ...(votesFor !== undefined && { votesFor: parseInt(votesFor) }),
    ...(votesAgainst !== undefined && { votesAgainst: parseInt(votesAgainst) }),
    ...(votesAbstain !== undefined && { votesAbstain: parseInt(votesAbstain) }),
    ...(passed !== undefined && { passed: !!passed }),
    ...(recusedDirectors !== undefined && { recusedDirectors }),
  }).where(and(eq(boardMinutesMotions.id, motionId), eq(boardMinutesMotions.minutesId, minutesId))).returning();
  const full = await getMinutesFull(minutesId);
  saveVersionSnapshot(minutesId, req.user!.userId, full).catch(() => {});
  res.json({ success: true, data: updated });
});

router.delete("/minutes/:id/motions/:motionId", requireAdmin as any, async (req, res) => {
  const minutesId = parseInt(req.params.id);
  const motionId = parseInt(req.params.motionId);
  const [existing] = await db.select().from(boardMinutes).where(eq(boardMinutes.id, minutesId));
  if (existing?.status === "approved") return res.status(403).json({ success: false, error: "Approved minutes are locked" });
  await db.delete(boardMinutesMotions).where(and(eq(boardMinutesMotions.id, motionId), eq(boardMinutesMotions.minutesId, minutesId)));
  const full = await getMinutesFull(minutesId);
  saveVersionSnapshot(minutesId, req.user!.userId, full).catch(() => {});
  res.json({ success: true, data: null });
});

router.post("/minutes/:id/action-items", requireAdmin as any, async (req, res) => {
  const minutesId = parseInt(req.params.id);
  const [existing] = await db.select().from(boardMinutes).where(eq(boardMinutes.id, minutesId));
  if (!existing) return res.status(404).json({ success: false, error: "Not found" });
  if (existing.status === "approved") return res.status(403).json({ success: false, error: "Approved minutes are locked" });
  const { title, description, assignedTo, dueDate } = req.body;
  if (!title?.trim()) return res.status(400).json({ success: false, error: "Title required" });
  const [item] = await db.insert(boardMinutesActionItems).values({
    minutesId,
    title,
    description: description || null,
    assignedTo: assignedTo ? parseInt(assignedTo) : null,
    dueDate: dueDate ? new Date(dueDate) : null,
    createdBy: req.user!.userId,
  }).returning();
  await db.insert(boardActionItems).values({
    title,
    description: description || null,
    assignedTo: assignedTo ? parseInt(assignedTo) : null,
    dueDate: dueDate ? new Date(dueDate) : null,
    sourceMinutesId: minutesId,
    createdBy: req.user!.userId,
  });
  const full = await getMinutesFull(minutesId);
  saveVersionSnapshot(minutesId, req.user!.userId, full).catch(() => {});
  res.status(201).json({ success: true, data: item });
});

router.patch("/minutes/:id/action-items/:itemId", requireAdmin as any, async (req, res) => {
  const minutesId = parseInt(req.params.id);
  const itemId = parseInt(req.params.itemId);
  const [existing] = await db.select().from(boardMinutes).where(eq(boardMinutes.id, minutesId));
  if (existing?.status === "approved") return res.status(403).json({ success: false, error: "Approved minutes are locked" });
  const { title, description, assignedTo, dueDate, status } = req.body;
  const [updated] = await db.update(boardMinutesActionItems).set({
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(assignedTo !== undefined && { assignedTo: assignedTo ? parseInt(assignedTo) : null }),
    ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    ...(status !== undefined && { status }),
    ...(status === "done" && { completedAt: new Date() }),
  }).where(and(eq(boardMinutesActionItems.id, itemId), eq(boardMinutesActionItems.minutesId, minutesId))).returning();
  const full = await getMinutesFull(minutesId);
  saveVersionSnapshot(minutesId, req.user!.userId, full).catch(() => {});
  res.json({ success: true, data: updated });
});

router.delete("/minutes/:id/action-items/:itemId", requireAdmin as any, async (req, res) => {
  const minutesId = parseInt(req.params.id);
  const itemId = parseInt(req.params.itemId);
  const [existing] = await db.select().from(boardMinutes).where(eq(boardMinutes.id, minutesId));
  if (existing?.status === "approved") return res.status(403).json({ success: false, error: "Approved minutes are locked" });
  await db.delete(boardMinutesActionItems).where(and(eq(boardMinutesActionItems.id, itemId), eq(boardMinutesActionItems.minutesId, minutesId)));
  const full = await getMinutesFull(minutesId);
  saveVersionSnapshot(minutesId, req.user!.userId, full).catch(() => {});
  res.json({ success: true, data: null });
});

// ── Meeting Packet PDF ────────────────────────────────────────────────────────

router.post("/meetings/:id/packet", async (req, res) => {
  const meetingId = parseInt(req.params.id);
  const [meeting] = await db.select().from(boardMeetings).where(eq(boardMeetings.id, meetingId));
  if (!meeting) return res.status(404).json({ success: false, error: "Meeting not found" });

  const agendaItems = await db.select().from(boardAgendaItems)
    .where(eq(boardAgendaItems.meetingId, meetingId)).orderBy(asc(boardAgendaItems.position));
  const attendees = await raw(sql`
    SELECT a.*, u.first_name, u.last_name, u.board_position
    FROM board_meeting_attendees a JOIN portal_users u ON u.id = a.user_id
    WHERE a.meeting_id = ${meetingId} ORDER BY u.first_name
  `);
  const minutesRows = await db.select().from(boardMinutes).where(eq(boardMinutes.meetingId, meetingId));
  let minutesFull: any = null;
  if (minutesRows.length > 0) {
    minutesFull = await getMinutesFull(minutesRows[0].id);
  }
  // Recent board documents (metadata only — files are confidential and not embedded)
  const packetDocs = await db.select().from(boardDocuments).orderBy(desc(boardDocuments.createdAt)).limit(20);

  const navy = "#1A1F2B";
  const teal = "#0D7377";
  const gold = "#D4A843";
  const darkGray = "#333333";
  const lightGray = "#888888";

  const doc = new PDFDocument({ size: "letter", margins: { top: 72, bottom: 72, left: 72, right: 72 } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="board-packet-${meetingId}.pdf"`);
  doc.pipe(res);

  const L = 72, R = 540, W = 468;
  const meetingDate = new Date(meeting.scheduledAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Cover
  doc.rect(0, 0, 612, 792).fill(navy);
  doc.rect(0, 0, 612, 6).fill(gold);
  doc.fontSize(10).fillColor(gold).font("Helvetica").text("BOARD MEETING PACKET", L, 100, { align: "center", characterSpacing: 3 });
  doc.fontSize(28).fillColor("#ffffff").font("Helvetica-Bold").text(meeting.title, L, 140, { align: "center" });
  doc.fontSize(14).fillColor(gold).font("Helvetica").text(meetingDate, L, 185, { align: "center" });
  if (meeting.location || meeting.platform) {
    doc.fontSize(12).fillColor("#FFFFFF").opacity(0.7).text(meeting.location || meeting.platform || "", L, 210, { align: "center" });
    doc.opacity(1);
  }
  doc.fontSize(11).fillColor("#FFFFFF").opacity(0.5).text("handlekraft — Board of Directors", L, 720, { align: "center" });
  doc.opacity(1);

  // Page helper
  let currentY = 0;
  function checkY(needed = 80) {
    if (doc.y + needed > 700) { doc.addPage(); }
  }
  function sectionHeader(title: string) {
    checkY(50);
    doc.moveDown(0.5);
    const y = doc.y;
    doc.rect(L, y, W, 24).fill(teal);
    doc.fontSize(11).fillColor("#FFFFFF").font("Helvetica-Bold").text(title.toUpperCase(), L + 8, y + 6);
    doc.y = y + 32;
  }
  function field(label: string, value: string) {
    checkY(20);
    const y = doc.y;
    doc.fontSize(10).fillColor(lightGray).font("Helvetica-Bold").text(label + ":", L, y, { width: 120, continued: false });
    doc.fontSize(10).fillColor(darkGray).font("Helvetica").text(value || "—", L + 125, y, { width: W - 125 });
    doc.y = Math.max(doc.y, y + 14);
  }

  // Meeting Details
  doc.addPage();
  doc.rect(0, 0, 612, 6).fill(gold);
  doc.moveDown(0.5);
  sectionHeader("Meeting Information");
  field("Meeting Type", meeting.meetingType || "Regular");
  field("Date & Time", meetingDate + (meeting.scheduledAt ? ` at ${new Date(meeting.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""));
  if (meeting.endTime) field("End Time", new Date(meeting.endTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
  if (meeting.location) field("Location", meeting.location);
  if (meeting.platform) field("Platform", meeting.platform);
  field("Quorum Required", String(meeting.quorumNumber ?? 3));

  // Agenda
  if (agendaItems.length > 0) {
    sectionHeader("Agenda");
    agendaItems.forEach((item, i) => {
      checkY(30);
      const y = doc.y;
      doc.fontSize(11).fillColor(teal).font("Helvetica-Bold").text(`${i + 1}.`, L, y, { width: 20 });
      doc.fontSize(11).fillColor(darkGray).font("Helvetica-Bold").text(item.title, L + 24, y, { width: W - 24 });
      if (item.description) {
        doc.fontSize(10).fillColor(lightGray).font("Helvetica").text(item.description, L + 24, doc.y, { width: W - 24 });
      }
      const meta: string[] = [];
      if (item.presenter) meta.push(`Presenter: ${item.presenter}`);
      if (item.duration) meta.push(`${item.duration} min`);
      if (meta.length) {
        doc.fontSize(9).fillColor(lightGray).font("Helvetica").text(meta.join("  |  "), L + 24, doc.y, { width: W - 24 });
      }
      doc.moveDown(0.4);
    });
  }

  // Attendance
  if (attendees.length > 0) {
    sectionHeader("Attendance");
    const present = attendees.filter((a: any) => a.attendance === "present");
    const absent = attendees.filter((a: any) => a.attendance === "absent");
    const excused = attendees.filter((a: any) => a.attendance === "excused");
    if (present.length) {
      checkY(20);
      doc.fontSize(10).fillColor(teal).font("Helvetica-Bold").text("Present:", L, doc.y);
      doc.fontSize(10).fillColor(darkGray).font("Helvetica").text(present.map((a: any) => `${a.first_name} ${a.last_name}`).join(", "), L + 60, doc.y - 14, { width: W - 60 });
    }
    if (absent.length) {
      checkY(20);
      doc.fontSize(10).fillColor(teal).font("Helvetica-Bold").text("Absent:", L, doc.y);
      doc.fontSize(10).fillColor(darkGray).font("Helvetica").text(absent.map((a: any) => `${a.first_name} ${a.last_name}`).join(", "), L + 60, doc.y - 14, { width: W - 60 });
    }
    if (excused.length) {
      checkY(20);
      doc.fontSize(10).fillColor(teal).font("Helvetica-Bold").text("Excused:", L, doc.y);
      doc.fontSize(10).fillColor(darkGray).font("Helvetica").text(excused.map((a: any) => `${a.first_name} ${a.last_name}`).join(", "), L + 60, doc.y - 14, { width: W - 60 });
    }
    if (minutesFull?.quorumPresent !== undefined) {
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor(minutesFull.quorumPresent ? "#16a34a" : "#dc2626").font("Helvetica-Bold")
        .text(minutesFull.quorumPresent ? `Quorum present (${minutesFull.quorumCount ?? present.length} members)` : "Quorum NOT present", L, doc.y);
    }
  }

  // Minutes narrative
  if (minutesFull?.content) {
    sectionHeader("Meeting Minutes");
    const structured = (() => { try { return JSON.parse(minutesFull.content); } catch { return null; } })();
    if (structured && typeof structured === "object") {
      if (structured.callToOrder) { checkY(30); doc.fontSize(10).fillColor(lightGray).font("Helvetica-Bold").text("Call to Order:", L, doc.y); doc.fontSize(10).fillColor(darkGray).font("Helvetica").text(structured.callToOrder, L, doc.y + 12, { width: W }); doc.moveDown(0.5); }
      if (structured.openingRemarks) { checkY(30); doc.fontSize(10).fillColor(lightGray).font("Helvetica-Bold").text("Opening Remarks:", L, doc.y); doc.fontSize(10).fillColor(darkGray).font("Helvetica").text(structured.openingRemarks, L, doc.y + 12, { width: W }); doc.moveDown(0.5); }
      if (structured.reports?.length) {
        structured.reports.forEach((r: any) => {
          checkY(40);
          doc.fontSize(10).fillColor(teal).font("Helvetica-Bold").text(r.title + (r.presenter ? ` — ${r.presenter}` : ""), L, doc.y);
          doc.fontSize(10).fillColor(darkGray).font("Helvetica").text(r.content || "", L, doc.y + 12, { width: W });
          doc.moveDown(0.4);
        });
      }
      if (structured.generalNotes) { checkY(30); doc.fontSize(10).fillColor(lightGray).font("Helvetica-Bold").text("General Business:", L, doc.y); doc.fontSize(10).fillColor(darkGray).font("Helvetica").text(structured.generalNotes, L, doc.y + 12, { width: W }); doc.moveDown(0.5); }
    } else {
      doc.fontSize(10).fillColor(darkGray).font("Helvetica").text(minutesFull.content, L, doc.y, { width: W });
    }
    const statusLabel = minutesFull.status === "approved" ? "APPROVED" : minutesFull.status === "pending_approval" ? "PENDING APPROVAL" : "DRAFT";
    const statusColor = minutesFull.status === "approved" ? "#16a34a" : minutesFull.status === "pending_approval" ? "#d97706" : "#6366f1";
    checkY(20);
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor(statusColor).font("Helvetica-Bold").text(`Status: ${statusLabel}`, L, doc.y);
  }

  // Motions
  if (minutesFull?.motions?.length) {
    sectionHeader("Motions");
    minutesFull.motions.forEach((m: any, i: number) => {
      checkY(50);
      const y = doc.y;
      doc.rect(L, y, W, 20).fill(m.passed ? "#dcfce7" : "#fee2e2");
      doc.fontSize(10).fillColor(m.passed ? "#15803d" : "#b91c1c").font("Helvetica-Bold")
        .text(`Motion ${i + 1}: ${m.passed ? "PASSED" : "FAILED"}`, L + 6, y + 5);
      doc.y = y + 24;
      doc.fontSize(10).fillColor(darkGray).font("Helvetica").text(m.motionText, L, doc.y, { width: W });
      const voteLine: string[] = [];
      if (m.votesFor || m.votesAgainst || m.votesAbstain) voteLine.push(`Vote: ${m.votesFor}–${m.votesAgainst}–${m.votesAbstain} (For–Against–Abstain)`);
      if (m.recusedDirectors) voteLine.push(`Recused: ${m.recusedDirectors}`);
      if (voteLine.length) { doc.fontSize(9).fillColor(lightGray).font("Helvetica").text(voteLine.join("  |  "), L, doc.y + 2, { width: W }); }
      doc.moveDown(0.5);
    });
  }

  // Action Items
  if (minutesFull?.actionItems?.length) {
    sectionHeader("Action Items");
    minutesFull.actionItems.forEach((a: any, i: number) => {
      checkY(30);
      const y = doc.y;
      doc.fontSize(10).fillColor(teal).font("Helvetica-Bold").text(`${i + 1}.`, L, y, { width: 18 });
      doc.fontSize(10).fillColor(darkGray).font("Helvetica-Bold").text(a.title, L + 22, y, { width: W - 22 });
      if (a.description) { doc.fontSize(9).fillColor(lightGray).font("Helvetica").text(a.description, L + 22, doc.y, { width: W - 22 }); }
      const meta: string[] = [];
      if (a.first_name) meta.push(`Assigned: ${a.first_name} ${a.last_name}`);
      if (a.due_date) meta.push(`Due: ${new Date(a.due_date).toLocaleDateString()}`);
      if (meta.length) { doc.fontSize(9).fillColor(lightGray).font("Helvetica").text(meta.join("  |  "), L + 22, doc.y, { width: W - 22 }); }
      doc.moveDown(0.4);
    });
  }

  // Board Documents (metadata index — files are confidential, not embedded in PDF)
  if (packetDocs.length > 0) {
    sectionHeader("Board Documents Index");
    doc.fontSize(9).fillColor(lightGray).font("Helvetica").text(
      "The following documents are available through the Board portal. Files are not embedded here for confidentiality.",
      L, doc.y, { width: W }
    );
    doc.moveDown(0.4);
    packetDocs.forEach((d: any, i: number) => {
      checkY(24);
      const y = doc.y;
      doc.fontSize(10).fillColor(teal).font("Helvetica-Bold").text(`${i + 1}.`, L, y, { width: 18 });
      doc.fontSize(10).fillColor(darkGray).font("Helvetica-Bold").text(d.title, L + 22, y, { width: W - 160 });
      doc.fontSize(9).fillColor(lightGray).font("Helvetica").text(
        [d.category, d.confidentiality === "board_only" ? "Board Only" : d.confidentiality === "public" ? "Public" : "Confidential",
          d.created_at ? new Date(d.createdAt).toLocaleDateString() : ""].filter(Boolean).join("  |  "),
        L + 22, doc.y, { width: W - 22 }
      );
      if (d.description) {
        doc.fontSize(9).fillColor(lightGray).font("Helvetica").text(d.description, L + 22, doc.y, { width: W - 22 });
      }
      doc.moveDown(0.3);
    });
  }

  // Adjournment
  if (minutesFull?.adjournmentTime) {
    checkY(30);
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor(lightGray).font("Helvetica-Bold").text("Meeting adjourned at:", L, doc.y);
    doc.fontSize(10).fillColor(darkGray).font("Helvetica").text(new Date(minutesFull.adjournmentTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }), L + 140, doc.y - 14);
  }

  // Footer on all pages
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor(lightGray).font("Helvetica")
      .text(`handləkraft Board of Directors  •  Confidential  •  Page ${i + 1} of ${range.count}`, L, 745, { width: W, align: "center" });
  }

  doc.end();
});

export default router;
