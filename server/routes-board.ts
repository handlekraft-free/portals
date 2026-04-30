import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import {
  users, boardMeetings, boardAgendaItems, boardMinutes, boardMinutesMotions,
  boardActionItems, boardDocuments, boardDocumentVersions, boardDocumentAcks,
  boardMeetingRsvps, boardMeetingAttendees, boardCommittees, boardWrittenConsents,
  boardWrittenConsentResponses, boardAuditLog, boardCoiDisclosures,
} from "@shared/schema";
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";
import { requireBoard, requireAdmin } from "./auth-middleware";
import fs from "fs";
import path from "path";
import multer from "multer";

const router: Router = createRouter();
router.use(requireBoard as any);

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
fs.mkdirSync(path.join(UPLOAD_DIR, "board-documents"), { recursive: true });

const boardStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_DIR, "board-documents")),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});
const uploadDoc = multer({ storage: boardStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Board Member Profile ──────────────────────────────────────────────────────

router.get("/me", async (req, res) => {
  const userId = req.user!.userId;
  const [u] = await db.select({
    id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName,
    role: users.role, boardPosition: users.boardPosition, termStart: users.termStart,
    termEnd: users.termEnd, isInterestedDirector: users.isInterestedDirector, status: users.status,
    bio: users.bio, committees: users.committees,
  }).from(users).where(eq(users.id, userId));
  if (!u) return res.status(404).json({ success: false, error: "User not found" });
  res.json({ success: true, data: u });
});

// ── Board Members List ────────────────────────────────────────────────────────

router.get("/members", async (_req, res) => {
  const members = await db.select({
    id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName,
    role: users.role, boardPosition: users.boardPosition, termStart: users.termStart,
    termEnd: users.termEnd, isInterestedDirector: users.isInterestedDirector, status: users.status,
    bio: users.bio, committees: users.committees,
  }).from(users).where(inArray(users.role, ["board", "admin"] as any)).orderBy(asc(users.firstName));
  res.json({ success: true, data: members });
});

// ── Committees ────────────────────────────────────────────────────────────────

router.get("/committees", async (_req, res) => {
  const rows = await db.select().from(boardCommittees).orderBy(asc(boardCommittees.name));
  res.json({ success: true, data: rows });
});

router.post("/committees", requireAdmin as any, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Name required" });
  const [row] = await db.insert(boardCommittees).values({ name, description }).returning();
  res.status(201).json({ success: true, data: row });
});

// ── Meetings ──────────────────────────────────────────────────────────────────

router.get("/meetings", async (_req, res) => {
  const rows = await db.select().from(boardMeetings).orderBy(desc(boardMeetings.scheduledAt));
  res.json({ success: true, data: rows });
});

router.post("/meetings", requireAdmin as any, async (req, res) => {
  const userId = req.user!.userId;
  const { title, scheduledAt, endTime, location, meetingType, platform, quorumNumber, committeeId } = req.body;
  if (!title || !scheduledAt) return res.status(400).json({ success: false, error: "Title and scheduledAt required" });
  const [row] = await db.insert(boardMeetings).values({
    title,
    scheduledAt: new Date(scheduledAt),
    endTime: endTime ? new Date(endTime) : null,
    location,
    meetingType: meetingType || "regular",
    platform,
    quorumNumber: quorumNumber || 3,
    committeeId: committeeId || null,
    createdBy: userId,
  }).returning();
  res.status(201).json({ success: true, data: row });
});

router.get("/meetings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [meeting] = await db.select().from(boardMeetings).where(eq(boardMeetings.id, id));
  if (!meeting) return res.status(404).json({ success: false, error: "Not found" });
  const agendaItems = await db.select().from(boardAgendaItems).where(eq(boardAgendaItems.meetingId, id)).orderBy(asc(boardAgendaItems.position));
  const rsvps = await db
    .select({
      id: boardMeetingRsvps.id, userId: boardMeetingRsvps.userId,
      response: boardMeetingRsvps.response, respondedAt: boardMeetingRsvps.respondedAt,
      firstName: users.firstName, lastName: users.lastName,
    })
    .from(boardMeetingRsvps)
    .leftJoin(users, eq(boardMeetingRsvps.userId, users.id))
    .where(eq(boardMeetingRsvps.meetingId, id));
  res.json({ success: true, data: { ...meeting, agendaItems, rsvps } });
});

router.patch("/meetings/:id", requireAdmin as any, async (req, res) => {
  const { title, scheduledAt, endTime, location, status, meetingType, platform } = req.body;
  const [row] = await db.update(boardMeetings).set({
    ...(title && { title }),
    ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
    ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
    ...(location !== undefined && { location }),
    ...(status && { status }),
    ...(meetingType && { meetingType }),
    ...(platform !== undefined && { platform }),
  }).where(eq(boardMeetings.id, parseInt(req.params.id))).returning();
  if (!row) return res.status(404).json({ success: false, error: "Not found" });
  res.json({ success: true, data: row });
});

// ── Agenda Items ──────────────────────────────────────────────────────────────

router.post("/meetings/:id/agenda", requireAdmin as any, async (req, res) => {
  const meetingId = parseInt(req.params.id);
  const { title, description, duration, presenter } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Title required" });
  const existing = await db.select({ id: boardAgendaItems.id }).from(boardAgendaItems).where(eq(boardAgendaItems.meetingId, meetingId));
  const [row] = await db.insert(boardAgendaItems).values({
    meetingId, title, description, duration: duration || null, presenter, position: existing.length,
  }).returning();
  res.status(201).json({ success: true, data: row });
});

router.patch("/agenda/:id", requireAdmin as any, async (req, res) => {
  const { title, description, duration, presenter, position } = req.body;
  const [row] = await db.update(boardAgendaItems).set({
    ...(title && { title }),
    ...(description !== undefined && { description }),
    ...(duration !== undefined && { duration }),
    ...(presenter !== undefined && { presenter }),
    ...(position !== undefined && { position }),
  }).where(eq(boardAgendaItems.id, parseInt(req.params.id))).returning();
  res.json({ success: true, data: row });
});

router.delete("/agenda/:id", requireAdmin as any, async (req, res) => {
  await db.delete(boardAgendaItems).where(eq(boardAgendaItems.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── RSVPs ─────────────────────────────────────────────────────────────────────

router.post("/meetings/:id/rsvp", async (req, res) => {
  const userId = req.user!.userId;
  const meetingId = parseInt(req.params.id);
  const { response } = req.body;
  if (!response) return res.status(400).json({ success: false, error: "Response required" });
  const existing = await db.select().from(boardMeetingRsvps)
    .where(and(eq(boardMeetingRsvps.meetingId, meetingId), eq(boardMeetingRsvps.userId, userId)));
  let row;
  if (existing.length > 0) {
    [row] = await db.update(boardMeetingRsvps).set({ response, respondedAt: new Date() })
      .where(eq(boardMeetingRsvps.id, existing[0].id)).returning();
  } else {
    [row] = await db.insert(boardMeetingRsvps).values({ meetingId, userId, response, respondedAt: new Date() }).returning();
  }
  res.json({ success: true, data: row });
});

// ── Minutes ───────────────────────────────────────────────────────────────────

router.get("/meetings/:id/minutes", async (req, res) => {
  const meetingId = parseInt(req.params.id);
  const [minutes] = await db.select().from(boardMinutes).where(eq(boardMinutes.meetingId, meetingId));
  if (!minutes) return res.json({ success: true, data: null });
  const motions = await db.select().from(boardMinutesMotions)
    .where(eq(boardMinutesMotions.minutesId, minutes.id)).orderBy(asc(boardMinutesMotions.position));
  const actionItems = await db.select().from(boardActionItems)
    .where(eq(boardActionItems.sourceMinutesId, minutes.id)).orderBy(asc(boardActionItems.dueDate));
  res.json({ success: true, data: { ...minutes, motions, actionItems } });
});

router.post("/meetings/:id/minutes", requireAdmin as any, async (req, res) => {
  const userId = req.user!.userId;
  const meetingId = parseInt(req.params.id);
  const { content, quorumPresent, quorumCount } = req.body;
  const existing = await db.select().from(boardMinutes).where(eq(boardMinutes.meetingId, meetingId));
  let row;
  if (existing.length > 0) {
    [row] = await db.update(boardMinutes).set({
      content, quorumPresent: quorumPresent || false, quorumCount: quorumCount || null,
      updatedAt: new Date(),
    }).where(eq(boardMinutes.id, existing[0].id)).returning();
  } else {
    [row] = await db.insert(boardMinutes).values({
      meetingId, content, quorumPresent: quorumPresent || false, quorumCount: quorumCount || null, createdBy: userId,
    }).returning();
  }
  res.json({ success: true, data: row });
});

router.post("/minutes/:id/motions", requireAdmin as any, async (req, res) => {
  const { motionText, passed, votesFor, votesAgainst, votesAbstain } = req.body;
  if (!motionText) return res.status(400).json({ success: false, error: "Motion text required" });
  const existing = await db.select({ position: boardMinutesMotions.position })
    .from(boardMinutesMotions).where(eq(boardMinutesMotions.minutesId, parseInt(req.params.id)));
  const [row] = await db.insert(boardMinutesMotions).values({
    minutesId: parseInt(req.params.id),
    motionText,
    passed: passed || false,
    votesFor: votesFor || 0,
    votesAgainst: votesAgainst || 0,
    votesAbstain: votesAbstain || 0,
    position: existing.length,
  }).returning();
  res.status(201).json({ success: true, data: row });
});

router.post("/minutes/:id/action-items", requireAdmin as any, async (req, res) => {
  const userId = req.user!.userId;
  const { title, description, assignedTo, dueDate } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Title required" });
  const [row] = await db.insert(boardActionItems).values({
    title,
    description,
    assignedTo: assignedTo || null,
    dueDate: dueDate ? new Date(dueDate) : null,
    sourceMinutesId: parseInt(req.params.id),
    createdBy: userId,
  }).returning();
  res.status(201).json({ success: true, data: row });
});

router.patch("/action-items/:id", requireAdmin as any, async (req, res) => {
  const { status } = req.body;
  const update: Record<string, any> = {};
  if (status === "complete") update.completedAt = new Date();
  if (status) update.status = status;
  const [row] = await db.update(boardActionItems).set(update)
    .where(eq(boardActionItems.id, parseInt(req.params.id as string))).returning();
  res.json({ success: true, data: row });
});

// ── Documents ─────────────────────────────────────────────────────────────────

router.get("/documents", async (_req, res) => {
  const docs = await db.select().from(boardDocuments).orderBy(desc(boardDocuments.createdAt));
  res.json({ success: true, data: docs });
});

router.post("/documents", requireAdmin as any, uploadDoc.single("file"), async (req, res) => {
  const userId = req.user!.userId;
  const { title, description, category, confidentiality, requireAck } = req.body;
  if (!title || !category) return res.status(400).json({ success: false, error: "Title and category required" });
  const [doc] = await db.insert(boardDocuments).values({
    title, description, category,
    confidentiality: confidentiality || "board_only",
    requireAck: requireAck === "true" || requireAck === true || false,
    uploadedBy: userId,
  }).returning();
  if (req.file) {
    await db.insert(boardDocumentVersions).values({
      documentId: doc.id, versionNumber: 1,
      filepath: req.file.path, filename: req.file.originalname,
      fileSize: req.file.size, mimeType: req.file.mimetype,
      uploadedBy: userId,
    });
  }
  await db.insert(boardAuditLog).values({ userId, action: "upload", resourceType: "document", resourceId: doc.id });
  res.status(201).json({ success: true, data: doc });
});

router.get("/documents/:id", async (req, res) => {
  const [doc] = await db.select().from(boardDocuments).where(eq(boardDocuments.id, parseInt(req.params.id)));
  if (!doc) return res.status(404).json({ success: false, error: "Not found" });
  const versions = await db.select().from(boardDocumentVersions)
    .where(eq(boardDocumentVersions.documentId, doc.id)).orderBy(desc(boardDocumentVersions.versionNumber));
  const acks = await db
    .select({ id: boardDocumentAcks.id, userId: boardDocumentAcks.userId, ackedAt: boardDocumentAcks.ackedAt, firstName: users.firstName, lastName: users.lastName })
    .from(boardDocumentAcks).leftJoin(users, eq(boardDocumentAcks.userId, users.id))
    .where(eq(boardDocumentAcks.documentId, doc.id));
  res.json({ success: true, data: { ...doc, versions, acks } });
});

router.get("/documents/:id/download", async (req, res) => {
  const userId = req.user!.userId;
  const docId = parseInt(req.params.id);
  const [version] = await db.select().from(boardDocumentVersions)
    .where(eq(boardDocumentVersions.documentId, docId)).orderBy(desc(boardDocumentVersions.versionNumber));
  if (!version) return res.status(404).json({ success: false, error: "No file" });
  if (!fs.existsSync(version.filepath)) return res.status(404).json({ success: false, error: "File missing on disk" });
  await db.insert(boardAuditLog).values({ userId, action: "download", resourceType: "document", resourceId: docId });
  res.setHeader("Content-Disposition", `attachment; filename="${version.filename}"`);
  if (version.mimeType) res.setHeader("Content-Type", version.mimeType);
  res.sendFile(path.resolve(version.filepath));
});

router.post("/documents/:id/acknowledge", async (req, res) => {
  const userId = req.user!.userId;
  const docId = parseInt(req.params.id);
  const exists = await db.select().from(boardDocumentAcks)
    .where(and(eq(boardDocumentAcks.documentId, docId), eq(boardDocumentAcks.userId, userId)));
  if (exists.length === 0) {
    await db.insert(boardDocumentAcks).values({ documentId: docId, userId, ackedAt: new Date() });
    await db.insert(boardAuditLog).values({ userId, action: "acknowledge", resourceType: "document", resourceId: docId });
  }
  res.json({ success: true, data: { acknowledged: true } });
});

// ── Written Consents ──────────────────────────────────────────────────────────

router.get("/consents", async (_req, res) => {
  const rows = await db.select().from(boardWrittenConsents).orderBy(desc(boardWrittenConsents.createdAt));
  res.json({ success: true, data: rows });
});

router.post("/consents", requireAdmin as any, async (req, res) => {
  const userId = req.user!.userId;
  const { title, description, excludedDirectors } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Title required" });
  const [row] = await db.insert(boardWrittenConsents).values({
    title, description, excludedDirectors, createdBy: userId,
  }).returning();
  res.status(201).json({ success: true, data: row });
});

router.post("/consents/:id/respond", async (req, res) => {
  const userId = req.user!.userId;
  const consentId = parseInt(req.params.id);
  const { response, reason } = req.body;
  if (!response) return res.status(400).json({ success: false, error: "Response required" });
  const existing = await db.select().from(boardWrittenConsentResponses)
    .where(and(eq(boardWrittenConsentResponses.consentId, consentId), eq(boardWrittenConsentResponses.userId, userId)));
  let row;
  if (existing.length > 0) {
    [row] = await db.update(boardWrittenConsentResponses)
      .set({ response, reason, respondedAt: new Date() })
      .where(eq(boardWrittenConsentResponses.id, existing[0].id)).returning();
  } else {
    [row] = await db.insert(boardWrittenConsentResponses)
      .values({ consentId, userId, response, reason, respondedAt: new Date() }).returning();
  }
  res.json({ success: true, data: row });
});

// ── Action Items (all open, assigned to me) ───────────────────────────────────

router.get("/my-action-items", async (req, res) => {
  const userId = req.user!.userId;
  const items = await db.select().from(boardActionItems)
    .where(and(eq(boardActionItems.assignedTo, userId), eq(boardActionItems.status, "open")))
    .orderBy(asc(boardActionItems.dueDate));
  res.json({ success: true, data: items });
});

// ── All Action Items (admin) ──────────────────────────────────────────────────

router.get("/action-items", async (_req, res) => {
  const items = await db.select({
    id: boardActionItems.id, title: boardActionItems.title, description: boardActionItems.description,
    assignedTo: boardActionItems.assignedTo, dueDate: boardActionItems.dueDate,
    status: boardActionItems.status, createdAt: boardActionItems.createdAt, completedAt: boardActionItems.completedAt,
    firstName: users.firstName, lastName: users.lastName,
  }).from(boardActionItems)
    .leftJoin(users, eq(boardActionItems.assignedTo, users.id))
    .orderBy(asc(boardActionItems.dueDate));
  res.json({ success: true, data: items });
});

// ── COI Disclosures ───────────────────────────────────────────────────────────

router.get("/coi", async (req, res) => {
  const userId = req.user!.userId;
  const rows = await db.select().from(boardCoiDisclosures).where(eq(boardCoiDisclosures.userId, userId));
  res.json({ success: true, data: rows });
});

router.post("/coi", async (req, res) => {
  const userId = req.user!.userId;
  const { fiscalYear, disclosures, certified, interestDescription } = req.body;
  if (!fiscalYear) return res.status(400).json({ success: false, error: "Fiscal year required" });
  const [row] = await db.insert(boardCoiDisclosures).values({
    userId, fiscalYear, disclosures, certified: certified || false, interestDescription,
  }).returning();
  res.status(201).json({ success: true, data: row });
});

export default router;
