import type { Router } from "express";
import { Router as createRouter } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { kanbanBoards, kanbanColumns, kanbanCards, kanbanCardComments, kanbanCardAttachments, teams, teamMembers, users, type KanbanCard } from "@shared/schema";
import { eq, and, asc, desc, or, inArray, isNull, sql } from "drizzle-orm";
import { requireAuth } from "./auth-middleware";

const router: Router = createRouter();
router.use(requireAuth as any);

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

// Memory-storage multer for CSV imports (no disk write needed)
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Longship Factory helpers ──────────────────────────────────────────────────

async function getOrCreateFactory(userId: number) {
  let [factory] = await db.select().from(kanbanBoards)
    .where(and(eq(kanbanBoards.isLongshipFactory, true), eq(kanbanBoards.archived, false)));
  if (!factory) {
    const result = await db.insert(kanbanBoards).values({
      name: "Longship Factory",
      description: "Collective backlog of future-building tasks. Anyone can add — anyone can claim.",
      createdBy: userId,
      isLongshipFactory: true,
    }).returning();
    factory = result[0];
    await db.insert(kanbanColumns).values([
      { boardId: factory.id, title: "Available Quests ⚓", position: 0, color: "#0D7377" },
      { boardId: factory.id, title: "In Progress 🪓",     position: 1, color: "#D4A843" },
      { boardId: factory.id, title: "Valhalla ⚔️",        position: 2, color: "#16a34a" },
    ]);
  }
  return factory;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  fields.push(cur.trim());
  return fields;
}

// ── Longship Factory routes ───────────────────────────────────────────────────

// GET factory board with all cards (visible to all employees)
router.get("/factory", async (req, res) => {
  const userId = req.user!.userId;
  const factory = await getOrCreateFactory(userId);
  const columns = await db.select().from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, factory.id)).orderBy(asc(kanbanColumns.position));
  const cards = await db.select().from(kanbanCards)
    .where(and(eq(kanbanCards.boardId, factory.id), eq(kanbanCards.archived, false)))
    .orderBy(asc(kanbanCards.position));
  const userIds = Array.from(new Set(cards.flatMap(c => [c.assignedTo, c.createdBy].filter(Boolean) as number[])));
  let userLookup: Record<number, any> = {};
  if (userIds.length > 0) {
    const us = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users).where(inArray(users.id, userIds));
    for (const u of us) userLookup[u.id] = u;
  }
  res.json({
    success: true, data: {
      ...factory,
      columns: columns.map(col => ({
        ...col,
        cards: cards.filter(c => c.columnId === col.id).map(card => ({
          ...card, assignee: card.assignedTo ? userLookup[card.assignedTo] : null,
          creator: card.createdBy ? userLookup[card.createdBy] : null,
        })),
      })),
    },
  });
});

// Add a card to the factory (placed in first/Available column, no assignee)
router.post("/factory/cards", async (req, res) => {
  const userId = req.user!.userId;
  const { title, description, priority, labels, dueDate } = req.body;
  if (!title?.trim()) return res.status(400).json({ success: false, error: "Title required" });
  const factory = await getOrCreateFactory(userId);
  const [firstCol] = await db.select().from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, factory.id)).orderBy(asc(kanbanColumns.position)).limit(1);
  if (!firstCol) return res.status(500).json({ success: false, error: "Factory has no columns" });
  const existing = await db.select({ id: kanbanCards.id }).from(kanbanCards)
    .where(and(eq(kanbanCards.columnId, firstCol.id), eq(kanbanCards.archived, false)));
  const [card] = await db.insert(kanbanCards).values({
    columnId: firstCol.id, boardId: factory.id, title: title.trim(),
    description: description?.trim() || null,
    priority: priority || "medium", labels: labels || [],
    dueDate: dueDate ? new Date(dueDate) : null,
    position: existing.length, createdBy: userId,
  }).returning();
  res.status(201).json({ success: true, data: card });
});

// CSV bulk import into factory
router.post("/factory/import", csvUpload.single("csv"), async (req, res) => {
  const userId = req.user!.userId;
  if (!req.file) return res.status(400).json({ success: false, error: "No CSV file uploaded" });
  const text = req.file.buffer.toString("utf-8");
  const allRows = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (allRows.length < 2) return res.status(400).json({ success: false, error: "CSV needs a header row and at least one data row" });
  const headers = parseCsvLine(allRows[0]).map(h => h.toLowerCase().replace(/\s+/g, "_"));
  const idx = (name: string) => headers.indexOf(name);
  if (idx("title") === -1) return res.status(400).json({ success: false, error: "CSV must have a 'title' column" });

  const factory = await getOrCreateFactory(userId);
  const [firstCol] = await db.select().from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, factory.id)).orderBy(asc(kanbanColumns.position)).limit(1);
  const existing = await db.select({ id: kanbanCards.id }).from(kanbanCards)
    .where(and(eq(kanbanCards.columnId, firstCol.id), eq(kanbanCards.archived, false)));
  let position = existing.length;

  const VALID_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);
  let inserted = 0;
  const skipped: string[] = [];

  for (const rawLine of allRows.slice(1)) {
    const row = parseCsvLine(rawLine);
    const title = idx("title") >= 0 ? row[idx("title")] : "";
    if (!title?.trim()) { skipped.push(`Missing title: ${rawLine.slice(0, 60)}`); continue; }
    const desc = idx("description") >= 0 ? (row[idx("description")] || null) : null;
    const rawPri = (idx("priority") >= 0 ? row[idx("priority")] : "").toLowerCase();
    const priority = VALID_PRIORITIES.has(rawPri) ? rawPri : "medium";
    const rawLabels = idx("labels") >= 0 ? row[idx("labels")] : "";
    const labels = rawLabels ? rawLabels.split(/[;,]/).map(l => l.trim()).filter(Boolean) : [];
    const rawDue = idx("due_date") >= 0 ? row[idx("due_date")] : "";
    const dueDate = rawDue ? new Date(rawDue) : null;
    await db.insert(kanbanCards).values({
      columnId: firstCol.id, boardId: factory.id, title: title.trim(),
      description: desc?.trim() || null, priority: priority as any,
      labels, dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate : null,
      position: position++, createdBy: userId,
    });
    inserted++;
  }
  res.json({ success: true, data: { inserted, skipped: skipped.length, skippedRows: skipped } });
});

// AI quest generation into the factory
const MAX_GENERATE_COUNT = 50;
const MAX_PROMPT_CHARS = 4000;
const FACTORY_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
type FactoryPriority = typeof FACTORY_PRIORITIES[number];
const FACTORY_PRIORITY_SET: ReadonlySet<string> = new Set(FACTORY_PRIORITIES);

interface GeneratedQuest {
  title?: unknown;
  description?: unknown;
  priority?: unknown;
  labels?: unknown;
}

function toStringSafe(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

router.post("/factory/generate", async (req, res) => {
  const userId = req.user!.userId;
  const rawPrompt = toStringSafe(req.body?.prompt);
  const rawCount = Number(req.body?.count);
  const prompt = rawPrompt.trim();
  if (!prompt) return res.status(400).json({ success: false, error: "Prompt is required" });
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(400).json({ success: false, error: `Prompt is too long (max ${MAX_PROMPT_CHARS} characters)` });
  }
  if (!Number.isFinite(rawCount) || rawCount < 1) {
    return res.status(400).json({ success: false, error: "Count must be at least 1" });
  }
  const count = Math.min(Math.floor(rawCount), MAX_GENERATE_COUNT);

  const factory = await getOrCreateFactory(userId);
  const [firstCol] = await db.select().from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, factory.id)).orderBy(asc(kanbanColumns.position)).limit(1);
  if (!firstCol) return res.status(500).json({ success: false, error: "Factory has no columns" });

  const systemPrompt = `You generate concrete, well-scoped quest cards for a nonprofit's shared backlog ("Longship Factory"). Each quest is a single, actionable piece of work a small product team could pick up. Respond with ONLY a JSON object of the form {"quests":[{"title":"...","description":"...","priority":"low|medium|high|urgent","labels":["..."]}]} — no prose, no markdown, no code fences. Titles must be short (under 80 chars) and action-oriented. Descriptions are 1-3 sentences explaining the desired outcome. Priority must be one of low, medium, high, urgent. Labels are 0-4 lowercase short tags.`;

  const userPrompt = `Generate exactly ${count} quest cards based on this concern/desire/outcome from a manager:\n\n"""${prompt}"""\n\nReturn only the JSON object described above with a "quests" array of length ${count}.`;

  let raw = "";
  try {
    const client = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "placeholder",
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Factory Generate] AI error:", message);
    return res.status(502).json({ success: false, error: "AI service temporarily unavailable. Please try again." });
  }

  // Defensive JSON extraction
  let parsed: unknown = null;
  try { parsed = JSON.parse(raw); } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) { try { parsed = JSON.parse(match[0]); } catch { /* ignore */ } }
  }
  let questsArr: GeneratedQuest[] = [];
  if (parsed && typeof parsed === "object") {
    const maybeQuests = (parsed as { quests?: unknown }).quests;
    if (Array.isArray(maybeQuests)) questsArr = maybeQuests as GeneratedQuest[];
    else if (Array.isArray(parsed)) questsArr = parsed as GeneratedQuest[];
  }
  if (questsArr.length === 0) {
    return res.status(502).json({ success: false, error: "AI returned no usable quests. Try rephrasing your prompt." });
  }

  const existing = await db.select({ id: kanbanCards.id }).from(kanbanCards)
    .where(and(eq(kanbanCards.columnId, firstCol.id), eq(kanbanCards.archived, false)));
  let position = existing.length;

  const insertedCards: KanbanCard[] = [];
  for (const q of questsArr.slice(0, count)) {
    const title = toStringSafe(q?.title).trim().slice(0, 200);
    if (!title) continue;
    const descRaw = toStringSafe(q?.description).trim();
    const description = descRaw ? descRaw.slice(0, 2000) : null;
    const rawPri = toStringSafe(q?.priority).toLowerCase();
    const priority: FactoryPriority = FACTORY_PRIORITY_SET.has(rawPri)
      ? (rawPri as FactoryPriority)
      : "medium";
    const labels = Array.isArray(q?.labels)
      ? (q.labels as unknown[])
          .map(l => toStringSafe(l).trim())
          .filter(l => l.length > 0)
          .slice(0, 6)
      : [];
    const [card] = await db.insert(kanbanCards).values({
      columnId: firstCol.id, boardId: factory.id, title,
      description, priority, labels,
      position: position++, createdBy: userId,
    }).returning();
    insertedCards.push(card);
  }

  res.json({ success: true, data: { inserted: insertedCards.length, requested: count, cards: insertedCards } });
});

// Download sample CSV
router.get("/factory/sample.csv", (_req, res) => {
  const csv = [
    "title,description,priority,labels,due_date",
    '"Build AI-powered intake form","Automate client intake using AI to extract key info","high","ai,automation",2026-07-01',
    '"Create impact dashboard","Public dashboard showing real-time community metrics","high","dashboard,analytics",',
    '"Volunteer management system","Track volunteer hours and match skills to projects","medium","volunteers,crm",2026-08-01',
    '"Write grant templates","Reusable templates for common grant types","low","grants,content",',
    '"Automated email sequences","Onboarding sequences for new clients and students","medium","email,automation",2026-06-15',
    '"Mobile portal audit","Audit and fix mobile usability across all client pages","high","mobile,ui",',
    '"Data backup and recovery plan","Implement automated backups with tested recovery","urgent","infrastructure,security",2026-06-01',
    '"Mentorship matching algorithm","AI-match students with mentors by skills and goals","medium","ai,fellows",',
  ].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="longship-factory-sample.csv"');
  res.send(csv);
});

// Claim a card — assign to self, optionally move to a different board/column.
// Marks claimed_from_factory=true if the card currently lives on a Longship
// Factory board, so completion can later award the 1.5× Initiative bonus.
router.post("/cards/:id/claim", async (req, res) => {
  const userId = req.user!.userId;
  const cardId = parseInt(req.params.id);
  const { targetBoardId, targetColumnId } = req.body;
  const [card] = await db.select().from(kanbanCards).where(eq(kanbanCards.id, cardId));
  if (!card) return res.status(404).json({ success: false, error: "Card not found" });
  const [sourceBoard] = await db.select().from(kanbanBoards).where(eq(kanbanBoards.id, card.boardId));
  const fromFactory = !!sourceBoard?.isLongshipFactory;
  const updateData: any = { assignedTo: userId, updatedAt: new Date() };
  // Once flagged, stay flagged (never clear back to false on subsequent claims).
  if (fromFactory) updateData.claimedFromFactory = true;
  if (targetBoardId && targetColumnId) {
    const colId = parseInt(targetColumnId);
    const existing = await db.select({ id: kanbanCards.id }).from(kanbanCards)
      .where(and(eq(kanbanCards.columnId, colId), eq(kanbanCards.archived, false)));
    updateData.boardId = parseInt(targetBoardId);
    updateData.columnId = colId;
    updateData.position = existing.length;
  }
  const [updated] = await db.update(kanbanCards).set(updateData).where(eq(kanbanCards.id, cardId)).returning();
  res.json({ success: true, data: updated });
});
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
    // Boards the user created or belongs to via team membership
    const myMemberships = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
    const teamIds = myMemberships.map(m => m.teamId);

    // Boards the user is assigned to as card assignee or reviewer
    const assignedCards = await db
      .select({ boardId: kanbanCards.boardId })
      .from(kanbanCards)
      .where(and(eq(kanbanCards.archived, false), or(eq(kanbanCards.assignedTo, userId), eq(kanbanCards.reviewerId, userId))));
    const assignedBoardIds = Array.from(new Set(assignedCards.map(c => c.boardId).filter(Boolean))) as number[];

    const conditions = [
      eq(kanbanBoards.createdBy, userId),
      ...teamIds.map(id => eq(kanbanBoards.teamId, id)),
      ...assignedBoardIds.map(id => eq(kanbanBoards.id, id)),
      eq(kanbanBoards.isLongshipFactory, true), // always visible to all employees
    ];

    boards = await db
      .select()
      .from(kanbanBoards)
      .where(and(eq(kanbanBoards.archived, false), or(...conditions)))
      .orderBy(desc(kanbanBoards.createdAt));
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
  const userId = req.user!.userId;
  const role = req.user!.role;
  const cardId = parseInt(req.params.id);
  const { columnId, boardId, title, description, assignedTo, reviewerId, interestRating, dueDate, priority, labels, position, archived, reviewApproved } = req.body;

  const [currentCard] = await db.select().from(kanbanCards).where(eq(kanbanCards.id, cardId));
  if (!currentCard) return res.status(404).json({ success: false, error: "Card not found" });

  // Block moving to a completion column unless peer review is approved
  const { isCompletionColumn: _isDone } = await import("@shared/xp");
  if (columnId !== undefined && parseInt(columnId) !== currentCard.columnId) {
    const [targetCol] = await db.select().from(kanbanColumns).where(eq(kanbanColumns.id, parseInt(columnId)));
    if (targetCol && _isDone(targetCol.title)) {
      const willBeApproved = reviewApproved !== undefined ? reviewApproved : currentCard.reviewApproved;
      if (!willBeApproved) {
        return res.status(422).json({
          success: false,
          error: "This task requires a 3rd party peer review before it can be moved to Done. Please have your assigned reviewer approve it first.",
          requiresReview: true,
        });
      }
    }
  }

  // Only the assigned reviewer (or an admin) can change the reviewApproved field
  let reviewUpdate: Record<string, any> = {};
  if (reviewApproved !== undefined) {
    if (currentCard.reviewerId !== userId && role !== "admin") {
      return res.status(403).json({ success: false, error: "Only the assigned reviewer can approve or revoke this review" });
    }
    reviewUpdate = {
      reviewApproved,
      reviewedBy: reviewApproved ? userId : null,
      reviewedAt: reviewApproved ? new Date() : null,
    };
  }

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
    ...reviewUpdate,
    updatedAt: new Date(),
  }).where(eq(kanbanCards.id, cardId)).returning();
  if (!card) return res.status(404).json({ success: false, error: "Card not found" });

  // ── XP awards on column transitions (all idempotent) ──────────────────────
  interface XpAwardRow { awarded: number | string | null; total: number | string | null }
  function rowsOf<T>(result: unknown): T[] {
    if (result && typeof result === "object" && "rows" in result) {
      return (result as { rows: T[] }).rows;
    }
    return Array.isArray(result) ? (result as T[]) : [];
  }

  type Stat = "focus" | "initiative" | "stewardship" | "craft";
  type Award = { amount: number; reason: string; newTotal: number; stat: Stat | null };
  const xpAwards: Award[] = [];

  async function tryAward(opts: {
    userId: number; amount: number; reason: string;
    sourceType: string; sourceId: number; stat: Stat | null; multiplier: number;
  }): Promise<Award | null> {
    const { userId: uid, amount, reason, sourceType, sourceId, stat, multiplier } = opts;
    const txResult = await db.execute(sql`
      WITH inserted AS (
        INSERT INTO xp_events (user_id, amount, reason, source_type, source_id, stat, multiplier)
        VALUES (${uid}, ${amount}, ${reason}, ${sourceType}, ${sourceId}, ${stat}, ${multiplier})
        ON CONFLICT (source_type, source_id) DO NOTHING
        RETURNING amount
      ),
      bumped AS (
        UPDATE portal_users SET xp_total = xp_total + (SELECT amount FROM inserted)
        WHERE id = ${uid} AND EXISTS (SELECT 1 FROM inserted)
        RETURNING xp_total
      )
      SELECT (SELECT amount FROM inserted) AS awarded, (SELECT xp_total FROM bumped) AS total
    `);
    const row = rowsOf<XpAwardRow>(txResult)[0];
    if (!row || row.awarded == null) return null;
    return { amount: Number(row.awarded), reason, newTotal: Number(row.total ?? 0), stat };
  }

  try {
    const colChanged = columnId !== undefined && parseInt(columnId) !== currentCard.columnId;
    if (colChanged) {
      const { xpForPriority, isInReviewColumn, INITIATIVE_MULTIPLIER, LOVED_THIS_THRESHOLD, LOVED_THIS_BONUS, REVIEWER_XP } = await import("@shared/xp");
      const [newCol] = await db.select().from(kanbanColumns).where(eq(kanbanColumns.id, card.columnId));
      const [oldCol] = await db.select().from(kanbanColumns).where(eq(kanbanColumns.id, currentCard.columnId));

      // ── Completion: award assignee Initiative XP, plus Loved-this Craft bonus ──
      // All quest completions reward Initiative (the "doing" stat). Factory-claimed
      // quests get the 1.5× multiplier on top. Focus is reserved for Plan Day,
      // Stewardship for Honest Pulse + Reviewer handoffs, and Craft for LMS +
      // Loved-this — see shared/xp.ts STAT_META.
      if (newCol && _isDone(newCol.title) && card.assignedTo) {
        const baseAmount = xpForPriority(card.priority);
        const isFactoryClaim = !!card.claimedFromFactory;
        const finalAmount = isFactoryClaim ? Math.round(baseAmount * INITIATIVE_MULTIPLIER) : baseAmount;
        const reason = isFactoryClaim
          ? `Initiative bonus: ${card.title}`.slice(0, 200)
          : `Quest complete: ${card.title}`.slice(0, 200);
        const a = await tryAward({
          userId: card.assignedTo, amount: finalAmount, reason,
          sourceType: "kanban_card_complete", sourceId: card.id,
          stat: "initiative",
          multiplier: isFactoryClaim ? INITIATIVE_MULTIPLIER : 1.0,
        });
        if (a && req.user!.userId === card.assignedTo) xpAwards.push(a);

        // Loved this — set flag (manager-visible) and award Craft bonus
        const interest = card.interestRating ?? -1;
        if (interest >= LOVED_THIS_THRESHOLD) {
          if (!card.lovedThis) {
            await db.update(kanbanCards).set({ lovedThis: true }).where(eq(kanbanCards.id, card.id));
            card.lovedThis = true;
          }
          const lovedReason = `Loved this: ${card.title}`.slice(0, 200);
          const lv = await tryAward({
            userId: card.assignedTo, amount: LOVED_THIS_BONUS, reason: lovedReason,
            sourceType: "kanban_card_loved", sourceId: card.id,
            stat: "craft", multiplier: 1.0,
          });
          if (lv && req.user!.userId === card.assignedTo) xpAwards.push(lv);
        }
      }

      // ── Reviewer XP: card moved OUT of "In Review" with a reviewer set ──
      if (oldCol && newCol && isInReviewColumn(oldCol.title) && !isInReviewColumn(newCol.title) && card.reviewerId) {
        const reviewReason = `Review handoff: ${card.title}`.slice(0, 200);
        const rv = await tryAward({
          userId: card.reviewerId, amount: REVIEWER_XP, reason: reviewReason,
          sourceType: "kanban_card_review", sourceId: card.id,
          stat: "stewardship", multiplier: 1.0,
        });
        if (rv && req.user!.userId === card.reviewerId) xpAwards.push(rv);
      }
    }
  } catch (e) {
    console.error("[xp] award failed:", e instanceof Error ? e.message : String(e));
  }

  // Backward-compat: legacy clients still read `xpAwarded` (singular).
  const xpAwarded = xpAwards.length > 0 ? xpAwards[0] : null;
  res.json({ success: true, data: card, xpAwarded, xpAwards });
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
