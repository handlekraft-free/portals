import type { Router } from "express";
import { Router as createRouter } from "express";
import type { SQL } from "drizzle-orm";
import { requireBoard, requireAdmin } from "./auth-middleware";
import { db } from "./db";
import {
  boardMeetings, boardMeetingRsvps, boardMeetingAttendees, boardAgendaItems,
  boardMeetingNotices, boardActionItems, boardMinutesActionItems,
  boardDocuments, boardWrittenConsents, users,
} from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";

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
  const { title, scheduledAt, endTime, location, platform, meetingType, quorumNumber } = req.body;
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
  }).returning();
  auditLog(req.user!.userId, "create", "meeting", meeting.id, `Created: ${title}`);
  res.status(201).json({ success: true, data: meeting });
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

router.post("/minutes/:id/action-items", requireAdmin as any, async (req, res) => {
  const minutesId = parseInt(req.params.id);
  const { title, description, assignedTo, dueDate } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Title required" });
  const [item] = await db.insert(boardActionItems).values({
    title,
    description: description || null,
    assignedTo: assignedTo ? parseInt(assignedTo) : null,
    dueDate: dueDate ? new Date(dueDate) : null,
    sourceMinutesId: minutesId,
    createdBy: req.user!.userId,
  }).returning();
  res.status(201).json({ success: true, data: item });
});

router.patch("/action-items/:id", async (req, res) => {
  const { status, dueDate, title, description } = req.body;
  const [updated] = await db.update(boardActionItems).set({
    ...(status && { status }),
    ...(status === "complete" && { completedAt: new Date() }),
    ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    ...(title && { title }),
    ...(description !== undefined && { description }),
  }).where(eq(boardActionItems.id, parseInt(req.params.id))).returning();
  res.json({ success: true, data: updated });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

router.get("/dashboard", async (req, res) => {
  const userId = req.user!.userId;
  const now = new Date();

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

  res.json({
    success: true,
    data: {
      upcomingMeetings: meetingsWithRsvp,
      myActionItems: myActions,
      recentDocuments: recentDocs,
      openConsents,
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
  const cols = Object.entries(req.body).map(([k, v]) => `${k.replace(/([A-Z])/g, '_$1').toLowerCase()} = ${v}`).join(', ');
  await db.execute(sql`
    INSERT INTO board_notification_prefs (user_id) VALUES (${userId})
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
  `);
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

// ── Minutes stubs (real impl in Task 3) ──────────────────────────────────────

router.post("/meetings/:id/minutes", requireAdmin as any, (_req, res) => res.status(201).json({ success: true, data: null }));
router.get("/meetings/:id/minutes", (_req, res) => res.json({ success: true, data: null }));
router.get("/minutes/:id", (_req, res) => res.json({ success: true, data: null }));
router.patch("/minutes/:id", requireAdmin as any, (_req, res) => res.json({ success: true, data: null }));
router.post("/minutes/:id/motions", requireAdmin as any, (_req, res) => res.status(201).json({ success: true, data: null }));

export default router;
