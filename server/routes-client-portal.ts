import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import { clientFiles, messages, supportTickets, ticketComments, users, kanbanBoards, kanbanColumns, kanbanCards } from "@shared/schema";
import { eq, and, or, desc, asc, ilike, sql } from "drizzle-orm";
import { requireAuth, requireEmployee, requireClient } from "./auth-middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

const router: Router = createRouter();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
fs.mkdirSync(path.join(UPLOAD_DIR, "client-files"), { recursive: true });

const clientStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_DIR, "client-files")),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});
const upload = multer({ storage: clientStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Client File Routes ────────────────────────────────────────────────────────

router.get("/client/files", requireClient as any, async (req, res) => {
  const clientId = req.user!.userId;
  const files = await db.select().from(clientFiles).where(eq(clientFiles.clientId, clientId)).orderBy(desc(clientFiles.createdAt));
  res.json({ success: true, data: files });
});

router.post("/client/files", requireClient as any, upload.single("file"), async (req, res) => {
  const clientId = req.user!.userId;
  if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });
  const [f] = await db.insert(clientFiles).values({
    clientId, uploadedBy: clientId, filename: req.file.filename, originalName: req.file.originalname,
    filepath: req.file.path, fileSize: req.file.size, mimeType: req.file.mimetype, direction: "from_client",
    notes: req.body.notes || null,
  }).returning();
  res.status(201).json({ success: true, data: f });
});

router.get("/files/:id/download", requireAuth as any, async (req, res) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  const [file] = await db.select().from(clientFiles).where(eq(clientFiles.id, parseInt(req.params.id)));
  if (!file) return res.status(404).json({ success: false, error: "File not found" });
  if (role === "client" && file.clientId !== userId) return res.status(403).json({ success: false, error: "Access denied" });
  if (!fs.existsSync(file.filepath)) return res.status(404).json({ success: false, error: "File not found on disk" });
  res.download(file.filepath, file.originalName);
});

// ── Client Messaging ──────────────────────────────────────────────────────────

router.get("/client/messages", requireClient as any, async (req, res) => {
  const clientId = req.user!.userId;
  const inbox = await db.select().from(messages).where(eq(messages.recipientId, clientId)).orderBy(desc(messages.createdAt));
  const sent = await db.select().from(messages).where(eq(messages.senderId, clientId)).orderBy(desc(messages.createdAt));
  res.json({ success: true, data: { inbox, sent } });
});

router.post("/client/messages", requireClient as any, async (req, res) => {
  const clientId = req.user!.userId;
  const { subject, body, recipientId } = req.body;
  if (!subject || !body) return res.status(400).json({ success: false, error: "Subject and body required" });
  // Send to first available employee if no specific recipient
  let toId = recipientId;
  if (!toId) {
    const [emp] = await db.select().from(users).where(eq(users.role, "employee"));
    toId = emp?.id || 1;
  }
  const [msg] = await db.insert(messages).values({ senderId: clientId, recipientId: toId, clientId, subject, body, read: false }).returning();
  res.status(201).json({ success: true, data: msg });
});

router.get("/client/messages/:id", requireClient as any, async (req, res) => {
  const clientId = req.user!.userId;
  const msgId = parseInt(req.params.id);
  const [msg] = await db.select().from(messages).where(and(eq(messages.id, msgId), or(eq(messages.senderId, clientId), eq(messages.recipientId, clientId))));
  if (!msg) return res.status(404).json({ success: false, error: "Message not found" });
  await db.update(messages).set({ read: true }).where(and(eq(messages.id, msgId), eq(messages.recipientId, clientId)));
  const replies = await db.select().from(messages).where(eq(messages.parentId, msgId)).orderBy(asc(messages.createdAt));
  res.json({ success: true, data: { ...msg, replies } });
});

router.post("/client/messages/:id/reply", requireClient as any, async (req, res) => {
  const clientId = req.user!.userId;
  const { body } = req.body;
  const [parent] = await db.select().from(messages).where(eq(messages.id, parseInt(req.params.id)));
  if (!parent) return res.status(404).json({ success: false, error: "Message not found" });
  const toId = parent.senderId === clientId ? parent.recipientId : parent.senderId;
  const [reply] = await db.insert(messages).values({ senderId: clientId, recipientId: toId, clientId, subject: `Re: ${parent.subject}`, body, read: false, parentId: parent.id }).returning();
  res.status(201).json({ success: true, data: reply });
});

// ── Client Tickets ────────────────────────────────────────────────────────────

router.get("/client/tickets", requireClient as any, async (req, res) => {
  const clientId = req.user!.userId;
  const tickets = await db.select().from(supportTickets).where(eq(supportTickets.clientId, clientId)).orderBy(desc(supportTickets.createdAt));
  res.json({ success: true, data: tickets });
});

// ── Auto-create a Kanban card on the "Internal Team" board when a ticket is created ──
async function autoCreateTicketCard(ticket: { id: number; title: string; description: string; priority: string; clientId: number }): Promise<number | null> {
  try {
    // Find the "Internal Team" board (case-insensitive exact match first, then partial)
    let [board] = await db.select({ id: kanbanBoards.id })
      .from(kanbanBoards)
      .where(and(ilike(kanbanBoards.name, "internal team"), eq(kanbanBoards.archived, false)))
      .limit(1);
    if (!board) {
      [board] = await db.select({ id: kanbanBoards.id })
        .from(kanbanBoards)
        .where(and(ilike(kanbanBoards.name, "%internal%"), eq(kanbanBoards.archived, false)))
        .limit(1);
    }
    if (!board) return null;

    // Find the Backlog column (position 0, or title ILIKE 'backlog')
    let [col] = await db.select({ id: kanbanColumns.id })
      .from(kanbanColumns)
      .where(and(eq(kanbanColumns.boardId, board.id), ilike(kanbanColumns.title, "backlog")))
      .limit(1);
    if (!col) {
      [col] = await db.select({ id: kanbanColumns.id })
        .from(kanbanColumns)
        .where(eq(kanbanColumns.boardId, board.id))
        .orderBy(asc(kanbanColumns.position))
        .limit(1);
    }
    if (!col) return null;

    // Determine next position in that column
    const existing = await db.select({ position: kanbanCards.position })
      .from(kanbanCards)
      .where(and(eq(kanbanCards.columnId, col.id), eq(kanbanCards.archived, false)));
    const nextPosition = existing.length > 0 ? Math.max(...existing.map(c => c.position)) + 1 : 0;

    // Find the admin user to set as creator
    const [admin] = await db.select({ id: users.id }).from(users).where(sql`role = 'admin'`).limit(1);
    const createdBy = admin?.id ?? ticket.clientId;

    // Map ticket priority to card priority (ticket uses same enum values)
    const cardPriority = (["low", "medium", "high", "urgent"].includes(ticket.priority) ? ticket.priority : "high") as "low" | "medium" | "high" | "urgent";

    const [card] = await db.insert(kanbanCards).values({
      columnId: col.id,
      boardId: board.id,
      title: `🎫 ${ticket.title}`,
      description: `**Client Support Ticket #${ticket.id}**\n\n${ticket.description}`,
      priority: cardPriority,
      labels: ["client-ticket"],
      position: nextPosition,
      createdBy,
    }).returning({ id: kanbanCards.id });

    return card?.id ?? null;
  } catch (err: any) {
    console.error("[autoCreateTicketCard] Failed:", err.message);
    return null;
  }
}

router.post("/client/tickets", requireClient as any, async (req, res) => {
  const clientId = req.user!.userId;
  const { title, description, category, priority } = req.body;
  if (!title || !description) return res.status(400).json({ success: false, error: "Title and description required" });
  const [ticket] = await db.insert(supportTickets).values({ clientId, createdBy: clientId, title, description, category: category || "General", priority: priority || "medium", status: "open" }).returning();

  // Fire-and-forget: auto-create a Kanban card on the Internal Team board
  autoCreateTicketCard({ id: ticket.id, title: ticket.title, description: ticket.description, priority: ticket.priority ?? "medium", clientId }).then(async (cardId) => {
    if (cardId) {
      await db.update(supportTickets).set({ kanbanCardId: cardId }).where(eq(supportTickets.id, ticket.id));
    }
  });

  res.status(201).json({ success: true, data: ticket });
});

router.get("/client/tickets/:id", requireClient as any, async (req, res) => {
  const clientId = req.user!.userId;
  const [ticket] = await db.select().from(supportTickets).where(and(eq(supportTickets.id, parseInt(req.params.id)), eq(supportTickets.clientId, clientId)));
  if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });
  const comments = await db.select({ id: ticketComments.id, content: ticketComments.content, createdAt: ticketComments.createdAt, internal: ticketComments.internal, firstName: users.firstName, lastName: users.lastName }).from(ticketComments).leftJoin(users, eq(ticketComments.userId, users.id)).where(and(eq(ticketComments.ticketId, ticket.id), eq(ticketComments.internal, false))).orderBy(asc(ticketComments.createdAt));
  res.json({ success: true, data: { ...ticket, comments } });
});

router.post("/client/tickets/:id/comments", requireClient as any, async (req, res) => {
  const clientId = req.user!.userId;
  const { content } = req.body;
  const [ticket] = await db.select().from(supportTickets).where(and(eq(supportTickets.id, parseInt(req.params.id)), eq(supportTickets.clientId, clientId)));
  if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });
  const [comment] = await db.insert(ticketComments).values({ ticketId: ticket.id, userId: clientId, content, internal: false }).returning();
  await db.update(supportTickets).set({ updatedAt: new Date() }).where(eq(supportTickets.id, ticket.id));
  res.status(201).json({ success: true, data: comment });
});

// ── Employee-side: Client Files, Messages, Tickets ──────────────────────────

router.get("/employee/clients", requireEmployee as any, async (req, res) => {
  const clients = await db.select().from(users).where(eq(users.role, "client"));
  res.json({ success: true, data: clients });
});

router.get("/employee/clients/:id/files", requireEmployee as any, async (req, res) => {
  const files = await db.select().from(clientFiles).where(eq(clientFiles.clientId, parseInt(req.params.id))).orderBy(desc(clientFiles.createdAt));
  res.json({ success: true, data: files });
});

router.post("/employee/clients/:id/files", requireEmployee as any, upload.single("file"), async (req, res) => {
  const clientId = parseInt(req.params.id as string);
  const empId = req.user!.userId;
  if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });
  const [f] = await db.insert(clientFiles).values({
    clientId, uploadedBy: empId, filename: req.file.filename, originalName: req.file.originalname,
    filepath: req.file.path, fileSize: req.file.size, mimeType: req.file.mimetype, direction: "to_client",
    notes: req.body.notes || null,
  }).returning();
  res.status(201).json({ success: true, data: f });
});

router.get("/employee/messages", requireEmployee as any, async (req, res) => {
  const empId = req.user!.userId;
  const msgs = await db.select().from(messages).where(or(eq(messages.recipientId, empId), eq(messages.senderId, empId))).orderBy(desc(messages.createdAt));
  res.json({ success: true, data: msgs });
});

router.post("/employee/messages/:id/reply", requireEmployee as any, async (req, res) => {
  const empId = req.user!.userId;
  const { body } = req.body;
  const [parent] = await db.select().from(messages).where(eq(messages.id, parseInt(req.params.id)));
  if (!parent) return res.status(404).json({ success: false, error: "Message not found" });
  const [reply] = await db.insert(messages).values({ senderId: empId, recipientId: parent.senderId, clientId: parent.clientId, subject: `Re: ${parent.subject}`, body, read: false, parentId: parent.id }).returning();
  res.status(201).json({ success: true, data: reply });
});

router.get("/employee/tickets", requireEmployee as any, async (req, res) => {
  const tickets = await db
    .select({
      id: supportTickets.id,
      title: supportTickets.title,
      description: supportTickets.description,
      status: supportTickets.status,
      priority: supportTickets.priority,
      category: supportTickets.category,
      clientId: supportTickets.clientId,
      clientFirstName: users.firstName,
      clientLastName: users.lastName,
      assignedTo: supportTickets.assignedTo,
      kanbanCardId: supportTickets.kanbanCardId,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
    })
    .from(supportTickets)
    .leftJoin(users, eq(supportTickets.clientId, users.id))
    .orderBy(desc(supportTickets.createdAt));
  res.json({ success: true, data: tickets });
});

router.patch("/employee/tickets/:id", requireEmployee as any, async (req, res) => {
  const { status, priority, assignedTo } = req.body;
  const now = new Date();
  const [ticket] = await db.update(supportTickets).set({
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assignedTo !== undefined && { assignedTo }),
    updatedAt: now,
    ...(status === "resolved" && { resolvedAt: now }),
  }).where(eq(supportTickets.id, parseInt(req.params.id))).returning();
  res.json({ success: true, data: ticket });
});

router.post("/employee/tickets/:id/comments", requireEmployee as any, async (req, res) => {
  const empId = req.user!.userId;
  const { content, internal } = req.body;
  const [comment] = await db.insert(ticketComments).values({ ticketId: parseInt(req.params.id), userId: empId, content, internal: internal || false }).returning();
  await db.update(supportTickets).set({ updatedAt: new Date() }).where(eq(supportTickets.id, parseInt(req.params.id)));
  res.status(201).json({ success: true, data: comment });
});

router.get("/employee/tickets/:id", requireEmployee as any, async (req, res) => {
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, parseInt(req.params.id)));
  if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });
  const [client] = ticket.clientId
    ? await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, ticket.clientId))
    : [null];
  const comments = await db.select({ id: ticketComments.id, content: ticketComments.content, createdAt: ticketComments.createdAt, internal: ticketComments.internal, userId: ticketComments.userId, firstName: users.firstName, lastName: users.lastName }).from(ticketComments).leftJoin(users, eq(ticketComments.userId, users.id)).where(eq(ticketComments.ticketId, ticket.id)).orderBy(asc(ticketComments.createdAt));
  res.json({ success: true, data: { ...ticket, clientFirstName: client?.firstName ?? null, clientLastName: client?.lastName ?? null, comments } });
});

export default router;
