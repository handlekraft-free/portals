import type { Router } from "express";
import { Router as createRouter } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { db } from "./db";
import { kanbanBoards, kanbanColumns, kanbanCards, kanbanCardComments, kanbanCardAttachments, teams, teamMembers, users } from "@shared/schema";
import { eq, and, asc, desc, or, inArray } from "drizzle-orm";
import { requireAuth } from "./auth-middleware";

const router: Router = createRouter();
router.use(requireAuth as any);

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const kanbanStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_DIR, "kanban-attachments")),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});
const uploadAttachment = multer({ storage: kanbanStorage, limits: { fileSize: 25 * 1024 * 1024 } });

// ── Portal Users (for assignee/reviewer picker) ───────────────────────────────

router.get("/users", async (_req, res) => {
  const all = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, role: users.role }).from(users).where(eq(users.status, "active")).orderBy(asc(users.firstName));
  res.json({ success: true, data: all });
});

// ── My Tasks ──────────────────────────────────────────────────────────────────

router.get("/my-tasks", async (req, res) => {
  const userId = req.user!.userId;

  // Cards assigned to me (any column)
  const assignedCards = await db.select().from(kanbanCards).where(
    and(eq(kanbanCards.assignedTo, userId), eq(kanbanCards.archived, false))
  );

  // Cards where I'm the reviewer AND the column title contains "In Review"
  const reviewerCards = await db.select().from(kanbanCards).where(
    and(eq(kanbanCards.reviewerId, userId), eq(kanbanCards.archived, false))
  );

  // For reviewer cards, filter to only "In Review" columns
  const allColumnIds = Array.from(new Set([
    ...assignedCards.map(c => c.columnId),
    ...reviewerCards.map(c => c.columnId),
  ]));

  const allBoardIds = Array.from(new Set([
    ...assignedCards.map(c => c.boardId),
    ...reviewerCards.map(c => c.boardId),
  ]));

  let columnMap: Record<number, any> = {};
  let boardMap: Record<number, any> = {};
  let userMap: Record<number, any> = {};

  if (allColumnIds.length > 0) {
    const cols = await db.select().from(kanbanColumns).where(inArray(kanbanColumns.id, allColumnIds));
    for (const c of cols) columnMap[c.id] = c;
  }
  if (allBoardIds.length > 0) {
    const bds = await db.select().from(kanbanBoards).where(inArray(kanbanBoards.id, allBoardIds));
    for (const b of bds) boardMap[b.id] = b;
  }

  // Collect all user IDs for assignee/reviewer lookup
  const allUserIds = Array.from(new Set([
    ...assignedCards.flatMap(c => [c.assignedTo, c.reviewerId, c.createdBy].filter(Boolean) as number[]),
    ...reviewerCards.flatMap(c => [c.assignedTo, c.reviewerId, c.createdBy].filter(Boolean) as number[]),
  ]));
  if (allUserIds.length > 0) {
    const us = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(inArray(users.id, allUserIds));
    for (const u of us) userMap[u.id] = u;
  }

  // Filter reviewer cards to "In Review" columns only
  const inReviewReviewerCards = reviewerCards.filter(c => {
    const col = columnMap[c.columnId];
    return col && col.title.toLowerCase().includes("in review");
  });

  // Merge and deduplicate
  const seen = new Set<number>();
  const allTasks: any[] = [];

  for (const card of assignedCards) {
    if (!seen.has(card.id)) {
      seen.add(card.id);
      allTasks.push({ ...card, role: "assignee", column: columnMap[card.columnId], board: boardMap[card.boardId], assignee: card.assignedTo ? userMap[card.assignedTo] : null, reviewer: card.reviewerId ? userMap[card.reviewerId] : null });
    }
  }

  for (const card of inReviewReviewerCards) {
    if (!seen.has(card.id)) {
      seen.add(card.id);
      allTasks.push({ ...card, role: "reviewer", column: columnMap[card.columnId], board: boardMap[card.boardId], assignee: card.assignedTo ? userMap[card.assignedTo] : null, reviewer: card.reviewerId ? userMap[card.reviewerId] : null });
    } else {
      // Already in list as assignee — add reviewer flag
      const existing = allTasks.find(t => t.id === card.id);
      if (existing) existing.role = "both";
    }
  }

  res.json({ success: true, data: allTasks });
});

// ── Teams ─────────────────────────────────────────────────────────────────────

router.get("/teams", async (req, res) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  let allTeams;
  if (role === "admin") {
    allTeams = await db.select().from(teams).orderBy(asc(teams.name));
  } else {
    const myMemberships = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
    const teamIds = myMemberships.map(m => m.teamId);
    if (teamIds.length === 0) return res.json({ success: true, data: [] });
    allTeams = await db.select().from(teams).where(inArray(teams.id, teamIds)).orderBy(asc(teams.name));
  }
  res.json({ success: true, data: allTeams });
});

router.post("/teams", async (req, res) => {
  const userId = req.user!.userId;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Team name required" });
  const [team] = await db.insert(teams).values({ name, description, createdBy: userId }).returning();
  await db.insert(teamMembers).values({ teamId: team.id, userId, role: "lead" });
  res.status(201).json({ success: true, data: team });
});

router.get("/teams/:id/members", async (req, res) => {
  const members = await db.select({ id: teamMembers.id, userId: teamMembers.userId, role: teamMembers.role, joinedAt: teamMembers.joinedAt, firstName: users.firstName, lastName: users.lastName, email: users.email }).from(teamMembers).leftJoin(users, eq(teamMembers.userId, users.id)).where(eq(teamMembers.teamId, parseInt(req.params.id)));
  res.json({ success: true, data: members });
});

router.post("/teams/:id/members", async (req, res) => {
  const { userId, role } = req.body;
  const [m] = await db.insert(teamMembers).values({ teamId: parseInt(req.params.id), userId, role: role || "member" }).returning();
  res.status(201).json({ success: true, data: m });
});

router.delete("/teams/:id/members/:userId", async (req, res) => {
  await db.delete(teamMembers).where(and(eq(teamMembers.teamId, parseInt(req.params.id)), eq(teamMembers.userId, parseInt(req.params.userId))));
  res.json({ success: true, data: null });
});

// ── Boards ────────────────────────────────────────────────────────────────────

router.get("/boards", async (req, res) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  let boards;
  if (role === "admin") {
    boards = await db.select().from(kanbanBoards).where(eq(kanbanBoards.archived, false)).orderBy(desc(kanbanBoards.createdAt));
  } else {
    const myMemberships = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
    const teamIds = myMemberships.map(m => m.teamId);
    if (teamIds.length === 0) {
      boards = await db.select().from(kanbanBoards).where(and(eq(kanbanBoards.archived, false), eq(kanbanBoards.createdBy, userId)));
    } else {
      boards = await db.select().from(kanbanBoards).where(and(eq(kanbanBoards.archived, false), or(eq(kanbanBoards.createdBy, userId), ...teamIds.map(id => eq(kanbanBoards.teamId, id))))).orderBy(desc(kanbanBoards.createdAt));
    }
  }
  res.json({ success: true, data: boards });
});

router.post("/boards", async (req, res) => {
  const userId = req.user!.userId;
  const { name, description, teamId } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Board name required" });
  const [board] = await db.insert(kanbanBoards).values({ name, description, teamId: teamId || null, createdBy: userId }).returning();
  await db.insert(kanbanColumns).values([
    { boardId: board.id, title: "Backlog", position: 0, color: "#64748b" },
    { boardId: board.id, title: "In Progress 🪓", position: 1, color: "#0D7377" },
    { boardId: board.id, title: "In Review", position: 2, color: "#D4A843" },
    { boardId: board.id, title: "Valhalla ⚔️", position: 3, color: "#16a34a" },
  ]);
  res.status(201).json({ success: true, data: board });
});

router.get("/boards/:id", async (req, res) => {
  const boardId = parseInt(req.params.id);
  const [board] = await db.select().from(kanbanBoards).where(eq(kanbanBoards.id, boardId));
  if (!board) return res.status(404).json({ success: false, error: "Board not found" });
  const columns = await db.select().from(kanbanColumns).where(eq(kanbanColumns.boardId, boardId)).orderBy(asc(kanbanColumns.position));
  const cards = await db.select().from(kanbanCards).where(and(eq(kanbanCards.boardId, boardId), eq(kanbanCards.archived, false))).orderBy(asc(kanbanCards.position));
  const cardIds = cards.map(c => c.id);
  let commentCounts: Record<number, number> = {};
  let attachmentCounts: Record<number, number> = {};
  let userLookup: Record<number, any> = {};

  if (cardIds.length > 0) {
    const allComments = await db.select({ cardId: kanbanCardComments.cardId }).from(kanbanCardComments).where(inArray(kanbanCardComments.cardId, cardIds));
    for (const c of allComments) commentCounts[c.cardId] = (commentCounts[c.cardId] || 0) + 1;
    const allAttachments = await db.select({ cardId: kanbanCardAttachments.cardId }).from(kanbanCardAttachments).where(inArray(kanbanCardAttachments.cardId, cardIds));
    for (const a of allAttachments) attachmentCounts[a.cardId] = (attachmentCounts[a.cardId] || 0) + 1;

    // Collect all user IDs (assignees + reviewers)
    const userIds = Array.from(new Set(cards.flatMap(c => [c.assignedTo, c.reviewerId].filter(Boolean) as number[])));
    if (userIds.length > 0) {
      const us = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(inArray(users.id, userIds));
      for (const u of us) userLookup[u.id] = u;
    }
  }

  res.json({
    success: true,
    data: {
      ...board,
      columns: columns.map(col => ({
        ...col,
        cards: cards.filter(c => c.columnId === col.id).map(card => ({
          ...card,
          commentCount: commentCounts[card.id] || 0,
          attachmentCount: attachmentCounts[card.id] || 0,
          assignee: card.assignedTo ? userLookup[card.assignedTo] : null,
          reviewer: card.reviewerId ? userLookup[card.reviewerId] : null,
        }))
      }))
    }
  });
});

router.patch("/boards/:id", async (req, res) => {
  const { name, description } = req.body;
  const [board] = await db.update(kanbanBoards).set({ ...(name && { name }), ...(description !== undefined && { description }) }).where(eq(kanbanBoards.id, parseInt(req.params.id))).returning();
  res.json({ success: true, data: board });
});

router.delete("/boards/:id", async (req, res) => {
  await db.update(kanbanBoards).set({ archived: true }).where(eq(kanbanBoards.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── Columns ───────────────────────────────────────────────────────────────────

router.post("/boards/:id/columns", async (req, res) => {
  const boardId = parseInt(req.params.id);
  const { title, color } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Column title required" });
  const existing = await db.select().from(kanbanColumns).where(eq(kanbanColumns.boardId, boardId));
  const [col] = await db.insert(kanbanColumns).values({ boardId, title, position: existing.length, color: color || "#64748b" }).returning();
  res.status(201).json({ success: true, data: col });
});

router.patch("/columns/:id", async (req, res) => {
  const { title, position, color, wipLimit } = req.body;
  const [col] = await db.update(kanbanColumns).set({ title, position, color, wipLimit }).where(eq(kanbanColumns.id, parseInt(req.params.id))).returning();
  res.json({ success: true, data: col });
});

router.delete("/columns/:id", async (req, res) => {
  await db.delete(kanbanColumns).where(eq(kanbanColumns.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── Cards ─────────────────────────────────────────────────────────────────────

router.post("/cards", async (req, res) => {
  const userId = req.user!.userId;
  const { columnId, boardId, title, description, assignedTo, reviewerId, interestRating, dueDate, priority, labels } = req.body;
  if (!columnId || !boardId || !title) return res.status(400).json({ success: false, error: "columnId, boardId, and title required" });
  const existing = await db.select().from(kanbanCards).where(and(eq(kanbanCards.columnId, parseInt(columnId)), eq(kanbanCards.archived, false)));
  const [card] = await db.insert(kanbanCards).values({
    columnId: parseInt(columnId), boardId: parseInt(boardId), title, description: description || null,
    assignedTo: assignedTo || null, reviewerId: reviewerId || null,
    interestRating: interestRating !== undefined && interestRating !== null ? parseInt(interestRating) : null,
    dueDate: dueDate ? new Date(dueDate) : null,
    priority: priority || "medium", labels: labels || [], position: existing.length, createdBy: userId,
  }).returning();
  res.status(201).json({ success: true, data: card });
});

router.get("/cards/:id", async (req, res) => {
  const cardId = parseInt(req.params.id as string);
  const [card] = await db.select().from(kanbanCards).where(eq(kanbanCards.id, cardId));
  if (!card) return res.status(404).json({ success: false, error: "Card not found" });
  const comments = await db.select({ id: kanbanCardComments.id, content: kanbanCardComments.content, createdAt: kanbanCardComments.createdAt, editedAt: kanbanCardComments.editedAt, userId: kanbanCardComments.userId, firstName: users.firstName, lastName: users.lastName }).from(kanbanCardComments).leftJoin(users, eq(kanbanCardComments.userId, users.id)).where(eq(kanbanCardComments.cardId, cardId)).orderBy(asc(kanbanCardComments.createdAt));
  const attachments = await db.select({ id: kanbanCardAttachments.id, fileName: kanbanCardAttachments.fileName, fileSize: kanbanCardAttachments.fileSize, mimeType: kanbanCardAttachments.mimeType, createdAt: kanbanCardAttachments.createdAt, uploadedBy: kanbanCardAttachments.uploadedBy, firstName: users.firstName, lastName: users.lastName }).from(kanbanCardAttachments).leftJoin(users, eq(kanbanCardAttachments.uploadedBy, users.id)).where(eq(kanbanCardAttachments.cardId, cardId)).orderBy(asc(kanbanCardAttachments.createdAt));
  let assignee = null;
  let reviewer = null;
  if (card.assignedTo) {
    const [u] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email }).from(users).where(eq(users.id, card.assignedTo));
    assignee = u;
  }
  if (card.reviewerId) {
    const [u] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email }).from(users).where(eq(users.id, card.reviewerId));
    reviewer = u;
  }
  let creator = null;
  if (card.createdBy) {
    const [u] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, card.createdBy));
    creator = u;
  }
  res.json({ success: true, data: { ...card, comments, attachments, assignee, reviewer, creator } });
});

router.patch("/cards/:id", async (req, res) => {
  const { columnId, boardId, title, description, assignedTo, reviewerId, interestRating, dueDate, priority, labels, position, archived } = req.body;
  const [card] = await db.update(kanbanCards).set({
    ...(columnId !== undefined && { columnId: parseInt(columnId) }),
    ...(boardId !== undefined && { boardId: parseInt(boardId) }),
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(assignedTo !== undefined && { assignedTo: assignedTo || null }),
    ...(reviewerId !== undefined && { reviewerId: reviewerId || null }),
    ...(interestRating !== undefined && { interestRating: interestRating !== null ? parseInt(interestRating) : null }),
    ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    ...(priority !== undefined && { priority }),
    ...(labels !== undefined && { labels }),
    ...(position !== undefined && { position }),
    ...(archived !== undefined && { archived }),
    updatedAt: new Date(),
  }).where(eq(kanbanCards.id, parseInt(req.params.id))).returning();
  if (!card) return res.status(404).json({ success: false, error: "Card not found" });
  res.json({ success: true, data: card });
});

router.delete("/cards/:id", async (req, res) => {
  await db.update(kanbanCards).set({ archived: true }).where(eq(kanbanCards.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── Comments ──────────────────────────────────────────────────────────────────

router.post("/cards/:id/comments", async (req, res) => {
  const userId = req.user!.userId;
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ success: false, error: "Content required" });
  const [comment] = await db.insert(kanbanCardComments).values({ cardId: parseInt(req.params.id), userId, content: content.trim() }).returning();
  const [user] = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, userId));
  res.status(201).json({ success: true, data: { ...comment, firstName: user?.firstName, lastName: user?.lastName } });
});

router.patch("/comments/:id", async (req, res) => {
  const userId = req.user!.userId;
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ success: false, error: "Content required" });
  const [existing] = await db.select().from(kanbanCardComments).where(eq(kanbanCardComments.id, parseInt(req.params.id)));
  if (!existing) return res.status(404).json({ success: false, error: "Comment not found" });
  if (existing.userId !== userId) return res.status(403).json({ success: false, error: "Not your comment" });
  const [comment] = await db.update(kanbanCardComments).set({ content: content.trim(), editedAt: new Date() }).where(eq(kanbanCardComments.id, parseInt(req.params.id))).returning();
  res.json({ success: true, data: comment });
});

router.delete("/comments/:id", async (req, res) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  const [existing] = await db.select().from(kanbanCardComments).where(eq(kanbanCardComments.id, parseInt(req.params.id)));
  if (!existing) return res.status(404).json({ success: false, error: "Comment not found" });
  if (existing.userId !== userId && role !== "admin") return res.status(403).json({ success: false, error: "Not your comment" });
  await db.delete(kanbanCardComments).where(eq(kanbanCardComments.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── Attachments ───────────────────────────────────────────────────────────────

router.post("/cards/:id/attachments", uploadAttachment.single("file"), async (req, res) => {
  const userId = req.user!.userId;
  const cardId = parseInt(req.params.id as string);
  if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });
  const [att] = await db.insert(kanbanCardAttachments).values({
    cardId, uploadedBy: userId, fileName: req.file.originalname,
    filePath: req.file.path, fileSize: req.file.size, mimeType: req.file.mimetype,
  }).returning();
  const [user] = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, userId));
  res.status(201).json({ success: true, data: { ...att, firstName: user?.firstName, lastName: user?.lastName } });
});

router.get("/attachments/:id/download", async (req, res) => {
  const [att] = await db.select().from(kanbanCardAttachments).where(eq(kanbanCardAttachments.id, parseInt(req.params.id)));
  if (!att) return res.status(404).json({ success: false, error: "Not found" });
  if (!fs.existsSync(att.filePath)) return res.status(404).json({ success: false, error: "File missing on disk" });
  res.setHeader("Content-Disposition", `attachment; filename="${att.fileName}"`);
  res.setHeader("Content-Type", att.mimeType);
  res.sendFile(path.resolve(att.filePath));
});

router.get("/attachments/:id/preview", async (req, res) => {
  const [att] = await db.select().from(kanbanCardAttachments).where(eq(kanbanCardAttachments.id, parseInt(req.params.id)));
  if (!att) return res.status(404).json({ success: false, error: "Not found" });
  if (!fs.existsSync(att.filePath)) return res.status(404).json({ success: false, error: "File missing on disk" });
  res.setHeader("Content-Type", att.mimeType);
  res.sendFile(path.resolve(att.filePath));
});

router.delete("/attachments/:id", async (req, res) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  const [att] = await db.select().from(kanbanCardAttachments).where(eq(kanbanCardAttachments.id, parseInt(req.params.id)));
  if (!att) return res.status(404).json({ success: false, error: "Not found" });
  if (att.uploadedBy !== userId && role !== "admin") return res.status(403).json({ success: false, error: "Not your attachment" });
  if (fs.existsSync(att.filePath)) fs.unlinkSync(att.filePath);
  await db.delete(kanbanCardAttachments).where(eq(kanbanCardAttachments.id, att.id));
  res.json({ success: true, data: null });
});

export default router;
