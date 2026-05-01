import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import {
  chatChannels, chatMessages, chatAttachments, chatReactions, users,
  directMessageConversations, directMessageEntries,
} from "@shared/schema";
import { eq, and, desc, asc, isNull, inArray, or, lt, ne } from "drizzle-orm";
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
  const empChannels = await db.select().from(chatChannels).where(eq(chatChannels.scope, "employee")).limit(1);
  if (empChannels.length === 0) {
    await db.insert(chatChannels).values([
      { name: "general", description: "Team-wide conversation", type: "general", scope: "employee", createdBy: 1 },
      { name: "announcements", description: "Important team announcements", type: "announcements", scope: "employee", createdBy: 1 },
      { name: "random", description: "Off-topic and fun", type: "general", scope: "employee", createdBy: 1 },
    ]);
  }
  const boardChannels = await db.select().from(chatChannels).where(eq(chatChannels.scope, "board")).limit(1);
  if (boardChannels.length === 0) {
    await db.insert(chatChannels).values([
      { name: "general-board", description: "Board-wide discussions", type: "general", scope: "board", createdBy: 1 },
      { name: "governance", description: "Governance, policy, and compliance", type: "general", scope: "board", createdBy: 1 },
      { name: "announcements-board", description: "Board announcements and updates", type: "announcements", scope: "board", createdBy: 1 },
    ]);
  }
}
ensureDefaultChannels().catch(() => {});

// ── Channels ──────────────────────────────────────────────────────────────────

function userScope(role: string): string {
  return role === "board" ? "board" : "employee";
}

router.get("/channels", async (req: any, res) => {
  const scope = userScope(req.user.role);
  const channels = await db.select().from(chatChannels).where(eq(chatChannels.scope, scope)).orderBy(asc(chatChannels.id));
  res.json({ success: true, data: channels });
});

router.post("/channels", async (req: any, res) => {
  const { name, description, type } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Name required" });
  const scope = userScope(req.user.role);
  const [ch] = await db.insert(chatChannels).values({ name, description, type: type || "general", scope, createdBy: req.user.userId }).returning();
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

// ─────────────────────────────────────────────────────────────────────────────
// ── Direct Messages ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// Helper: canonical pair (always low, high)
function dmPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

// GET /api/chat/dm/users — list portal users in same scope (board users see only board, employees see employees+admin)
router.get("/dm/users", async (req: any, res) => {
  const me = req.user.userId;
  const isBoardUser = req.user.role === "board";
  let query = db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
    .from(users)
    .where(ne(users.id, me))
    .orderBy(asc(users.firstName));
  const allUsers = await query;
  const filtered = allUsers.filter(u =>
    isBoardUser
      ? u.role === "board" || (u.role === "admin")
      : u.role === "employee" || u.role === "admin"
  );
  res.json({ success: true, data: filtered });
});

// GET /api/chat/dm/conversations — my DM conversations with unread count + last message
router.get("/dm/conversations", async (req: any, res) => {
  const me = req.user.userId;

  const convs = await db
    .select()
    .from(directMessageConversations)
    .where(or(
      eq(directMessageConversations.user1Id, me),
      eq(directMessageConversations.user2Id, me),
    ))
    .orderBy(desc(directMessageConversations.lastMessageAt));

  if (convs.length === 0) return res.json({ success: true, data: [] });

  const convIds = convs.map(c => c.id);
  const otherUserIds = convs.map(c => c.user1Id === me ? c.user2Id : c.user1Id);
  const uniqueOtherIds = Array.from(new Set(otherUserIds));

  const [otherUsers, lastMessages, unreadCounts] = await Promise.all([
    db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
      .from(users).where(inArray(users.id, uniqueOtherIds)),
    // Last message per conversation (simple: fetch all recent, pick last per conv)
    db.select().from(directMessageEntries)
      .where(inArray(directMessageEntries.conversationId, convIds))
      .orderBy(desc(directMessageEntries.createdAt))
      .limit(convIds.length * 5),
    // Unread: messages sent by other, not yet read
    db.select().from(directMessageEntries)
      .where(and(
        inArray(directMessageEntries.conversationId, convIds),
        ne(directMessageEntries.senderId, me),
        isNull(directMessageEntries.readAt),
      )),
  ]);

  const userMap = Object.fromEntries(otherUsers.map(u => [u.id, u]));
  const lastMsgMap: Record<number, any> = {};
  for (const m of lastMessages) {
    if (!lastMsgMap[m.conversationId]) lastMsgMap[m.conversationId] = m;
  }
  const unreadMap: Record<number, number> = {};
  for (const m of unreadCounts) {
    unreadMap[m.conversationId] = (unreadMap[m.conversationId] || 0) + 1;
  }

  const enriched = convs.map(c => ({
    ...c,
    otherUser: userMap[c.user1Id === me ? c.user2Id : c.user1Id] || null,
    lastMessage: lastMsgMap[c.id] || null,
    unreadCount: unreadMap[c.id] || 0,
  }));

  res.json({ success: true, data: enriched });
});

// POST /api/chat/dm/conversations — open or create DM with another user
router.post("/dm/conversations", async (req: any, res) => {
  const me = req.user.userId;
  const otherId = parseInt(req.body.userId);
  if (!otherId || otherId === me) return res.status(400).json({ success: false, error: "Invalid user" });

  const [u1, u2] = dmPair(me, otherId);
  const existing = await db
    .select()
    .from(directMessageConversations)
    .where(and(eq(directMessageConversations.user1Id, u1), eq(directMessageConversations.user2Id, u2)))
    .limit(1);

  if (existing.length > 0) return res.json({ success: true, data: existing[0] });

  const [conv] = await db.insert(directMessageConversations)
    .values({ user1Id: u1, user2Id: u2 })
    .returning();
  res.status(201).json({ success: true, data: conv });
});

// GET /api/chat/dm/conversations/:id/messages
router.get("/dm/conversations/:id/messages", async (req: any, res) => {
  const me = req.user.userId;
  const convId = parseInt(req.params.id);

  const [conv] = await db.select().from(directMessageConversations)
    .where(eq(directMessageConversations.id, convId)).limit(1);
  if (!conv) return res.status(404).json({ success: false, error: "Not found" });
  if (conv.user1Id !== me && conv.user2Id !== me) return res.status(403).json({ success: false, error: "Forbidden" });

  const messages = await db
    .select()
    .from(directMessageEntries)
    .where(eq(directMessageEntries.conversationId, convId))
    .orderBy(asc(directMessageEntries.createdAt))
    .limit(100);

  if (messages.length === 0) return res.json({ success: true, data: [] });

  const senderIds = Array.from(new Set(messages.map(m => m.senderId)));
  const senders = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
    .from(users).where(inArray(users.id, senderIds));
  const senderMap = Object.fromEntries(senders.map(s => [s.id, s]));

  res.json({ success: true, data: messages.map(m => ({ ...m, sender: senderMap[m.senderId] || null })) });
});

// POST /api/chat/dm/conversations/:id/messages — send a DM
router.post("/dm/conversations/:id/messages", async (req: any, res) => {
  const me = req.user.userId;
  const convId = parseInt(req.params.id);
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ success: false, error: "Content required" });

  const [conv] = await db.select().from(directMessageConversations)
    .where(eq(directMessageConversations.id, convId)).limit(1);
  if (!conv) return res.status(404).json({ success: false, error: "Not found" });
  if (conv.user1Id !== me && conv.user2Id !== me) return res.status(403).json({ success: false, error: "Forbidden" });

  const [msg] = await db.insert(directMessageEntries)
    .values({ conversationId: convId, senderId: me, content: content.trim() })
    .returning();

  await db.update(directMessageConversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(directMessageConversations.id, convId));

  const [sender] = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
    .from(users).where(eq(users.id, me));

  res.status(201).json({ success: true, data: { ...msg, sender } });
});

// POST /api/chat/dm/conversations/:id/read — mark all received messages as read
router.post("/dm/conversations/:id/read", async (req: any, res) => {
  const me = req.user.userId;
  const convId = parseInt(req.params.id);

  await db.update(directMessageEntries)
    .set({ readAt: new Date() })
    .where(and(
      eq(directMessageEntries.conversationId, convId),
      ne(directMessageEntries.senderId, me),
      isNull(directMessageEntries.readAt),
    ));

  res.json({ success: true, data: null });
});

// PATCH /api/chat/dm/messages/:id — edit a DM
router.patch("/dm/messages/:id", async (req: any, res) => {
  const me = req.user.userId;
  const msgId = parseInt(req.params.id);
  const [msg] = await db.select().from(directMessageEntries).where(eq(directMessageEntries.id, msgId));
  if (!msg) return res.status(404).json({ success: false, error: "Not found" });
  if (msg.senderId !== me) return res.status(403).json({ success: false, error: "Forbidden" });
  const [updated] = await db.update(directMessageEntries)
    .set({ content: req.body.content, editedAt: new Date() })
    .where(eq(directMessageEntries.id, msgId))
    .returning();
  res.json({ success: true, data: updated });
});

// DELETE /api/chat/dm/messages/:id
router.delete("/dm/messages/:id", async (req: any, res) => {
  const me = req.user.userId;
  const msgId = parseInt(req.params.id);
  const [msg] = await db.select().from(directMessageEntries).where(eq(directMessageEntries.id, msgId));
  if (!msg) return res.status(404).json({ success: false, error: "Not found" });
  if (msg.senderId !== me && req.user.role !== "admin") return res.status(403).json({ success: false, error: "Forbidden" });
  await db.delete(directMessageEntries).where(eq(directMessageEntries.id, msgId));
  res.json({ success: true, data: null });
});

export default router;
