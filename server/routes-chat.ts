import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import { chatChannels, chatMessages, chatAttachments, chatReactions, users } from "@shared/schema";
import { eq, and, desc, asc, isNull, inArray } from "drizzle-orm";
import { requireAuth } from "./auth-middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

const router: Router = createRouter();
router.use(requireAuth as any);

const CHAT_UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.join(process.env.UPLOAD_DIR, "chat-attachments")
  : "./data/uploads/chat-attachments";
fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });

const chatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CHAT_UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});
const upload = multer({ storage: chatStorage, limits: { fileSize: 25 * 1024 * 1024 } });

// ── Seed default channels ─────────────────────────────────────────────────────

async function ensureDefaultChannels() {
  const existing = await db.select().from(chatChannels).limit(1);
  if (existing.length === 0) {
    await db.insert(chatChannels).values([
      { name: "general", description: "Team-wide conversation", type: "general", createdBy: 1 },
      { name: "announcements", description: "Important team announcements", type: "announcements", createdBy: 1 },
      { name: "random", description: "Off-topic and fun", type: "general", createdBy: 1 },
    ]);
  }
}
ensureDefaultChannels().catch(() => {});

// ── Channels ──────────────────────────────────────────────────────────────────

router.get("/channels", async (_req, res) => {
  const channels = await db.select().from(chatChannels).orderBy(asc(chatChannels.id));
  res.json({ success: true, data: channels });
});

router.post("/channels", async (req: any, res) => {
  const { name, description, type } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Name required" });
  const [ch] = await db.insert(chatChannels).values({ name, description, type: type || "general", createdBy: req.user.userId }).returning();
  res.status(201).json({ success: true, data: ch });
});

router.delete("/channels/:id", async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, error: "Admin only" });
  await db.delete(chatMessages).where(eq(chatMessages.channelId, parseInt(req.params.id)));
  await db.delete(chatChannels).where(eq(chatChannels.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── Messages ──────────────────────────────────────────────────────────────────

router.get("/channels/:id/messages", async (req: any, res) => {
  const channelId = parseInt(req.params.id);
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  // Top-level messages only (parentId IS NULL)
  const messages = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.channelId, channelId), isNull(chatMessages.parentId)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  if (messages.length === 0) return res.json({ success: true, data: [] });

  const msgIds = messages.map(m => m.id);
  const authorIds = Array.from(new Set(messages.map(m => m.userId)));

  const [authors, attachments, reactions, threadCounts] = await Promise.all([
    db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
      .from(users).where(inArray(users.id, authorIds)),
    db.select().from(chatAttachments).where(inArray(chatAttachments.messageId, msgIds)),
    db.select().from(chatReactions).where(inArray(chatReactions.messageId, msgIds)),
    db.select().from(chatMessages).where(and(inArray(chatMessages.parentId, msgIds))),
  ]);

  const authorMap = Object.fromEntries(authors.map(a => [a.id, a]));
  const attachMap: Record<number, any[]> = {};
  const reactionMap: Record<number, any[]> = {};
  const threadCountMap: Record<number, number> = {};

  for (const a of attachments) {
    if (!attachMap[a.messageId]) attachMap[a.messageId] = [];
    attachMap[a.messageId].push(a);
  }
  for (const r of reactions) {
    if (!reactionMap[r.messageId]) reactionMap[r.messageId] = [];
    reactionMap[r.messageId].push(r);
  }
  for (const t of threadCounts) {
    if (t.parentId) threadCountMap[t.parentId] = (threadCountMap[t.parentId] || 0) + 1;
  }

  const enriched = messages.map(m => ({
    ...m,
    author: authorMap[m.userId] || null,
    attachments: attachMap[m.id] || [],
    reactions: reactionMap[m.id] || [],
    replyCount: threadCountMap[m.id] || 0,
  }));

  res.json({ success: true, data: enriched.reverse() });
});

router.get("/messages/:id/thread", async (req: any, res) => {
  const parentId = parseInt(req.params.id);
  const replies = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.parentId, parentId))
    .orderBy(asc(chatMessages.createdAt));

  if (replies.length === 0) return res.json({ success: true, data: [] });

  const authorIds = Array.from(new Set(replies.map(r => r.userId)));
  const authors = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
    .from(users).where(inArray(users.id, authorIds));
  const authorMap = Object.fromEntries(authors.map(a => [a.id, a]));

  const msgIds = replies.map(r => r.id);
  const [attachments, reactions] = await Promise.all([
    db.select().from(chatAttachments).where(inArray(chatAttachments.messageId, msgIds)),
    db.select().from(chatReactions).where(inArray(chatReactions.messageId, msgIds)),
  ]);
  const attachMap: Record<number, any[]> = {};
  const reactionMap: Record<number, any[]> = {};
  for (const a of attachments) { if (!attachMap[a.messageId]) attachMap[a.messageId] = []; attachMap[a.messageId].push(a); }
  for (const r of reactions) { if (!reactionMap[r.messageId]) reactionMap[r.messageId] = []; reactionMap[r.messageId].push(r); }

  res.json({ success: true, data: replies.map(r => ({ ...r, author: authorMap[r.userId] || null, attachments: attachMap[r.id] || [], reactions: reactionMap[r.id] || [] })) });
});

router.post("/channels/:id/messages", upload.array("files", 5), async (req: any, res) => {
  const channelId = parseInt(req.params.id);
  const { content, parentId, isAnnouncement } = req.body;
  if (!content?.trim() && (!req.files || req.files.length === 0)) {
    return res.status(400).json({ success: false, error: "Message or file required" });
  }
  const [msg] = await db.insert(chatMessages).values({
    channelId,
    userId: req.user.userId,
    content: content?.trim() || "",
    parentId: parentId ? parseInt(parentId) : null,
    isAnnouncement: isAnnouncement === "true" || isAnnouncement === true,
  }).returning();

  if (req.files?.length) {
    await db.insert(chatAttachments).values((req.files as Express.Multer.File[]).map((f: Express.Multer.File) => ({
      messageId: msg.id,
      fileName: f.originalname,
      filePath: f.path,
      fileSize: f.size,
      mimeType: f.mimetype,
    })));
  }

  const [author] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
    .from(users).where(eq(users.id, req.user.userId));

  res.status(201).json({ success: true, data: { ...msg, author, attachments: [], reactions: [], replyCount: 0 } });
});

router.patch("/messages/:id", async (req: any, res) => {
  const msgId = parseInt(req.params.id);
  const [msg] = await db.select().from(chatMessages).where(eq(chatMessages.id, msgId));
  if (!msg) return res.status(404).json({ success: false, error: "Not found" });
  if (msg.userId !== req.user.userId && req.user.role !== "admin") return res.status(403).json({ success: false, error: "Forbidden" });
  const [updated] = await db.update(chatMessages).set({ content: req.body.content, editedAt: new Date() }).where(eq(chatMessages.id, msgId)).returning();
  res.json({ success: true, data: updated });
});

router.delete("/messages/:id", async (req: any, res) => {
  const msgId = parseInt(req.params.id);
  const [msg] = await db.select().from(chatMessages).where(eq(chatMessages.id, msgId));
  if (!msg) return res.status(404).json({ success: false, error: "Not found" });
  if (msg.userId !== req.user.userId && req.user.role !== "admin") return res.status(403).json({ success: false, error: "Forbidden" });
  await db.delete(chatAttachments).where(eq(chatAttachments.messageId, msgId));
  await db.delete(chatReactions).where(eq(chatReactions.messageId, msgId));
  await db.delete(chatMessages).where(eq(chatMessages.id, msgId));
  res.json({ success: true, data: null });
});

// ── Reactions ─────────────────────────────────────────────────────────────────

router.post("/messages/:id/reactions", async (req: any, res) => {
  const msgId = parseInt(req.params.id);
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ success: false, error: "Emoji required" });
  const existing = await db.select().from(chatReactions).where(and(eq(chatReactions.messageId, msgId), eq(chatReactions.userId, req.user.userId), eq(chatReactions.emoji, emoji)));
  if (existing.length > 0) {
    await db.delete(chatReactions).where(eq(chatReactions.id, existing[0].id));
    return res.json({ success: true, data: { action: "removed" } });
  }
  await db.insert(chatReactions).values({ messageId: msgId, userId: req.user.userId, emoji });
  res.json({ success: true, data: { action: "added" } });
});

// ── File download ─────────────────────────────────────────────────────────────

router.get("/attachments/:id/download", async (req: any, res) => {
  const [att] = await db.select().from(chatAttachments).where(eq(chatAttachments.id, parseInt(req.params.id)));
  if (!att) return res.status(404).json({ success: false, error: "Not found" });
  res.download(att.filePath, att.fileName);
});

router.get("/attachments/:id/preview", async (req: any, res) => {
  const [att] = await db.select().from(chatAttachments).where(eq(chatAttachments.id, parseInt(req.params.id)));
  if (!att) return res.status(404).json({ success: false, error: "Not found" });
  res.setHeader("Content-Type", att.mimeType);
  res.sendFile(path.resolve(att.filePath));
});

export default router;
