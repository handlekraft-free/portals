import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import { kanbanBoards, kanbanColumns, kanbanCards, kanbanCardComments, teams, teamMembers, users } from "@shared/schema";
import { eq, and, asc, desc, or } from "drizzle-orm";
import { requireAuth } from "./auth-middleware";

const router: Router = createRouter();
router.use(requireAuth as any);

// ── Teams ────────────────────────────────────────────────────────────────────

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
    allTeams = await db.select().from(teams).where(or(...teamIds.map(id => eq(teams.id, id)))).orderBy(asc(teams.name));
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

// ── Boards ───────────────────────────────────────────────────────────────────

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
  // Create default columns
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
  res.json({ success: true, data: { ...board, columns: columns.map(col => ({ ...col, cards: cards.filter(c => c.columnId === col.id) })) } });
});

router.delete("/boards/:id", async (req, res) => {
  await db.update(kanbanBoards).set({ archived: true }).where(eq(kanbanBoards.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── Columns ──────────────────────────────────────────────────────────────────

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

// ── Cards ────────────────────────────────────────────────────────────────────

router.post("/cards", async (req, res) => {
  const userId = req.user!.userId;
  const { columnId, boardId, title, description, assignedTo, dueDate, priority, labels } = req.body;
  if (!columnId || !boardId || !title) return res.status(400).json({ success: false, error: "columnId, boardId, and title required" });
  const existing = await db.select().from(kanbanCards).where(and(eq(kanbanCards.columnId, parseInt(columnId)), eq(kanbanCards.archived, false)));
  const [card] = await db.insert(kanbanCards).values({
    columnId: parseInt(columnId), boardId: parseInt(boardId), title, description: description || null,
    assignedTo: assignedTo || null, dueDate: dueDate ? new Date(dueDate) : null,
    priority: priority || "medium", labels: labels || [], position: existing.length, createdBy: userId,
  }).returning();
  res.status(201).json({ success: true, data: card });
});

router.get("/cards/:id", async (req, res) => {
  const [card] = await db.select().from(kanbanCards).where(eq(kanbanCards.id, parseInt(req.params.id)));
  if (!card) return res.status(404).json({ success: false, error: "Card not found" });
  const comments = await db.select({ id: kanbanCardComments.id, content: kanbanCardComments.content, createdAt: kanbanCardComments.createdAt, userId: kanbanCardComments.userId, firstName: users.firstName, lastName: users.lastName }).from(kanbanCardComments).leftJoin(users, eq(kanbanCardComments.userId, users.id)).where(eq(kanbanCardComments.cardId, card.id)).orderBy(asc(kanbanCardComments.createdAt));
  res.json({ success: true, data: { ...card, comments } });
});

router.patch("/cards/:id", async (req, res) => {
  const { columnId, title, description, assignedTo, dueDate, priority, labels, position, archived } = req.body;
  const [card] = await db.update(kanbanCards).set({
    ...(columnId !== undefined && { columnId: parseInt(columnId) }),
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(assignedTo !== undefined && { assignedTo }),
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

router.post("/cards/:id/comments", async (req, res) => {
  const userId = req.user!.userId;
  const { content } = req.body;
  if (!content) return res.status(400).json({ success: false, error: "Content required" });
  const [comment] = await db.insert(kanbanCardComments).values({ cardId: parseInt(req.params.id), userId, content }).returning();
  res.status(201).json({ success: true, data: comment });
});

export default router;
