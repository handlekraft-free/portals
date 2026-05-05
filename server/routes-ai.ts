import type { Router } from "express";
import { Router as createRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";
import { readFileSync } from "fs";
import path from "path";
import { db } from "./db";
import {
  aiChatMessages,
  kanbanBoards, kanbanColumns, kanbanCards,
  boardDocuments, boardForumTopics, boardForumPosts,
  users,
} from "@shared/schema";
import { eq, asc, desc, inArray } from "drizzle-orm";
import { requireAuth } from "./auth-middleware";

const router: Router = createRouter();
router.use(requireAuth as any);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

function getClient() {
  return new Anthropic({
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "placeholder",
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  });
}

// ── Context-aware system prompt builder ───────────────────────────────────────

const ORG_BASE = `handləkraft (pronounced "handle-kraft", meaning "the power to act" in Norwegian) is a 501(c)(3) nonprofit that provides free custom software and websites to community organizations while concurrently training product-focused problem solvers proficient in AI tools. The organization runs on a fellowship model where team members learn by building real products for real clients.`;

// Load the foundational briefing document once at module init.
// This is the standing context every AI advisor reads before every response.
let BRIEFING = "";
try {
  BRIEFING = readFileSync(path.join(process.cwd(), "server", "ai-briefing.md"), "utf8").trim();
  console.log(`[AI] Loaded foundational briefing (${BRIEFING.length.toLocaleString()} chars)`);
} catch (err) {
  console.warn("[AI] Could not load server/ai-briefing.md — falling back to short org base");
}

const FOUNDATION = BRIEFING
  ? `# Foundational Briefing\n\n${BRIEFING}`
  : `# About the Organization\n\n${ORG_BASE}`;

async function buildBoardSystemPrompt(): Promise<string> {
  // Fetch board documents
  const docs = await db
    .select({
      title: boardDocuments.title,
      description: boardDocuments.description,
      category: boardDocuments.category,
      linkUrl: boardDocuments.linkUrl,
      confidentiality: boardDocuments.confidentiality,
    })
    .from(boardDocuments)
    .orderBy(desc(boardDocuments.createdAt))
    .limit(150);

  // Fetch forum topics
  const topics = await db
    .select({
      id: boardForumTopics.id,
      title: boardForumTopics.title,
      content: boardForumTopics.content,
      authorId: boardForumTopics.authorId,
      createdAt: boardForumTopics.createdAt,
    })
    .from(boardForumTopics)
    .orderBy(desc(boardForumTopics.lastActivityAt))
    .limit(60);

  // Fetch replies for those topics
  const topicIds = topics.map(t => t.id);
  const posts = topicIds.length > 0
    ? await db
        .select({
          topicId: boardForumPosts.topicId,
          content: boardForumPosts.content,
          authorId: boardForumPosts.authorId,
        })
        .from(boardForumPosts)
        .where(inArray(boardForumPosts.topicId, topicIds))
        .orderBy(asc(boardForumPosts.createdAt))
        .limit(300)
    : [];

  // Board members
  const members = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role })
    .from(users)
    .where(eq(users.role, "board"))
    .orderBy(asc(users.firstName));

  const memberMap = new Map(members.map(m => [m.id, `${m.firstName} ${m.lastName}`]));

  // Build documents section
  const byCategory = new Map<string, typeof docs>();
  for (const doc of docs) {
    if (!byCategory.has(doc.category)) byCategory.set(doc.category, []);
    byCategory.get(doc.category)!.push(doc);
  }
  let docsSection = docs.length === 0
    ? "No documents on file yet."
    : [...byCategory.entries()].map(([cat, catDocs]) =>
        `**${cat}** (${catDocs.length})\n` +
        catDocs.map(d =>
          `  - ${d.title}${d.description ? `: ${d.description.slice(0, 120)}` : ""}${d.linkUrl ? ` → ${d.linkUrl}` : ""}`
        ).join("\n")
      ).join("\n\n");

  if (docsSection.length > 6000) docsSection = docsSection.slice(0, 6000) + "\n…[additional documents omitted for brevity]";

  // Build forum section
  const postsByTopic = new Map<number, typeof posts>();
  for (const p of posts) {
    if (!postsByTopic.has(p.topicId)) postsByTopic.set(p.topicId, []);
    postsByTopic.get(p.topicId)!.push(p);
  }

  let forumSection = topics.length === 0
    ? "No forum discussions yet."
    : topics.map(t => {
        const author = memberMap.get(t.authorId) || "Board Member";
        const topicPosts = postsByTopic.get(t.id) || [];
        let s = `**${t.title}** — started by ${author}\n${t.content.slice(0, 400)}`;
        if (topicPosts.length > 0) {
          s += "\n  Replies:\n" + topicPosts.map(p =>
            `    › ${memberMap.get(p.authorId) || "Board Member"}: ${p.content.slice(0, 180)}`
          ).join("\n");
        }
        return s;
      }).join("\n\n");

  if (forumSection.length > 12000) forumSection = forumSection.slice(0, 12000) + "\n…[additional discussions omitted]";

  const memberList = members.length > 0
    ? members.map(m => `- ${m.firstName} ${m.lastName}`).join("\n")
    : "No board members listed.";

  return `You are the AI advisor for handləkraft's board portal. You speak as a knowledgeable thinking partner who has read every document in the governance file and followed every forum discussion. You inform conversations; you do not vote, decide, or speak for the organization. Apply the foundational briefing below to interpret everything that follows.

${FOUNDATION}

---

# Live Context (Board Portal)

## Board Members (${members.length})
${memberList}

## Board Document Library (${docs.length} documents across ${byCategory.size} categories)
${docsSection}

## Board Forum Discussions (${topics.length} topics)
${forumSection}

## Your Advisory Role
- Draw directly on the documents and discussions above when answering questions — cite them by name
- Give governance advice appropriate for a 501(c)(3) nonprofit board
- Be candid and direct; board members need honest, informed counsel
- Flag governance risks, fiduciary duties, or strategic opportunities you notice in the context
- When you don't have information about something specific, say so clearly rather than speculating
- Help interpret bylaws, policies, and prior decisions based on what's in the document library
- Offer perspective on how discussions or decisions align with the organization's mission`;
}

async function buildEmployeeSystemPrompt(): Promise<string> {
  // All active boards
  const boards = await db
    .select()
    .from(kanbanBoards)
    .where(eq(kanbanBoards.archived, false))
    .orderBy(asc(kanbanBoards.name));

  // All columns
  const columns = await db.select().from(kanbanColumns);
  const colMap = new Map(columns.map(c => [c.id, c.title]));

  // All active cards
  const cards = await db
    .select({
      id: kanbanCards.id,
      boardId: kanbanCards.boardId,
      columnId: kanbanCards.columnId,
      title: kanbanCards.title,
      description: kanbanCards.description,
      priority: kanbanCards.priority,
      labels: kanbanCards.labels,
      dueDate: kanbanCards.dueDate,
      assignedTo: kanbanCards.assignedTo,
    })
    .from(kanbanCards)
    .where(eq(kanbanCards.archived, false))
    .orderBy(asc(kanbanCards.priority));

  // Resolve assignee names
  const assigneeIds = [...new Set(cards.filter(c => c.assignedTo).map(c => c.assignedTo!))];
  const assignees = assigneeIds.length > 0
    ? await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.id, assigneeIds))
    : [];
  const userMap = new Map(assignees.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

  const factoryBoard = boards.find(b => b.isLongshipFactory);
  const regularBoards = boards.filter(b => !b.isLongshipFactory);

  // Longship Factory section
  const factoryCards = factoryBoard ? cards.filter(c => c.boardId === factoryBoard.id) : [];
  let factorySection = factoryCards.length === 0
    ? "  (no tasks in queue)"
    : factoryCards.map(c => {
        let s = `  - [${c.priority?.toUpperCase()}] ${c.title}`;
        if (c.description) s += `: ${c.description.slice(0, 100)}`;
        if (c.labels?.length) s += ` [tags: ${c.labels.join(", ")}]`;
        return s;
      }).join("\n");

  if (factorySection.length > 5000) factorySection = factorySection.slice(0, 5000) + "\n  …[additional factory tasks omitted]";

  // Regular boards section
  let boardsSection = "";
  for (const board of regularBoards) {
    const boardCards = cards.filter(c => c.boardId === board.id);
    if (boardCards.length === 0) continue;

    boardsSection += `\n### ${board.name}${board.description ? ` — ${board.description}` : ""} (${boardCards.length} cards)\n`;

    const cardsByCol = new Map<number, typeof cards>();
    for (const card of boardCards) {
      if (!cardsByCol.has(card.columnId)) cardsByCol.set(card.columnId, []);
      cardsByCol.get(card.columnId)!.push(card);
    }

    for (const [colId, colCards] of cardsByCol.entries()) {
      const colTitle = colMap.get(colId) || "Unknown Column";
      boardsSection += `**${colTitle}** (${colCards.length})\n`;
      boardsSection += colCards.slice(0, 25).map(c => {
        let s = `  - [${c.priority?.toUpperCase()}] ${c.title}`;
        if (c.assignedTo && userMap.has(c.assignedTo)) s += ` → ${userMap.get(c.assignedTo)}`;
        if (c.description) s += `: ${c.description.slice(0, 90)}`;
        if (c.labels?.length) s += ` [${c.labels.join(", ")}]`;
        if (c.dueDate) s += ` due ${new Date(c.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        return s;
      }).join("\n");
      boardsSection += "\n";
    }
  }

  if (boardsSection.length > 14000) boardsSection = boardsSection.slice(0, 14000) + "\n…[additional boards/cards omitted]";

  const activeCardCount = cards.filter(c => !factoryBoard || c.boardId !== factoryBoard.id).length;

  return `You are the AI advisor for handləkraft's employee portal. You are a senior project advisor and operations strategist with live visibility into every active Kanban board and the shared Longship Factory queue. Apply the foundational briefing below — especially the operating posture (30-hour week, self-managed work, AI-first escalation, accessibility) — when giving advice. Reference actual task names, assignees, and patterns you observe.

${FOUNDATION}

---

# Live Context (Employee Portal)

## Longship Factory — Shared Unassigned Task Queue (${factoryCards.length} tasks)
These are available tasks that any team member can claim and work on:
${factorySection}

## Active Board Backlogs (${activeCardCount} cards across ${regularBoards.length} boards)
${boardsSection || "No active cards found across boards."}

## Your Advisory Role
- **Identify redundancies**: Flag tasks across boards or the factory that appear to solve the same problem
- **Surface synergies**: Point out tasks that could share work, be batched, or benefit from the same solution
- **Prioritization**: Help the team decide what to pick up next from the factory based on active board needs
- **Workload insight**: Notice when a person is over-allocated or when a board is blocked
- **Strategic alignment**: Connect individual tasks back to handləkraft's mission of serving community orgs while training fellows
- Always reference tasks by their actual names when giving advice
- Be direct and specific — vague advice isn't useful for a busy team`;
}

async function buildSystemPrompt(role: string): Promise<string> {
  try {
    if (role === "board") return await buildBoardSystemPrompt();
    if (role === "employee" || role === "admin") return await buildEmployeeSystemPrompt();
  } catch (err) {
    console.error("[AI] Failed to build contextual prompt:", err);
  }
  // Fallback generic prompt — still includes the foundational briefing
  return `You are the AI advisor embedded in the handləkraft internal team portal. Apply the foundational briefing below to everything you say.

${FOUNDATION}

---

You help team members with drafting content, emails, proposals, and documentation; thinking through product and project problems; explaining technical concepts; brainstorming ideas; reviewing and improving text; and analyzing images and documents. Match handləkraft's communication norms (direct, warm, plain language, no corporate jargon). Be honest about uncertainty.`;
}

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function buildContentBlocks(message: string, files: Express.Multer.File[]): any[] {
  const blocks: any[] = [];
  for (const file of files) {
    if (IMAGE_MIMES.has(file.mimetype)) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: file.mimetype as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: file.buffer.toString("base64"),
        },
      });
    } else {
      const raw = file.buffer.toString("utf-8");
      const truncated = raw.length > 60_000 ? raw.slice(0, 60_000) + "\n…[truncated]" : raw;
      blocks.push({ type: "text", text: `📎 File: ${file.originalname}\n\`\`\`\n${truncated}\n\`\`\`` });
    }
  }
  if (message.trim()) blocks.push({ type: "text", text: message.trim() });
  return blocks;
}

function encodeStoredContent(message: string, files: Express.Multer.File[]): string {
  if (files.length === 0) return message.trim();
  const names = files.map(f => f.originalname).join(",");
  return `[[ATTACHMENTS:${names}]]\n${message}`.trim();
}

// ── Get conversation history ──────────────────────────────────────────────────

router.get("/history", async (req: any, res) => {
  const msgs = await db
    .select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.userId, req.user.userId))
    .orderBy(asc(aiChatMessages.createdAt))
    .limit(100);
  res.json({ success: true, data: msgs });
});

// ── Clear conversation ────────────────────────────────────────────────────────

router.delete("/history", async (req: any, res) => {
  await db.delete(aiChatMessages).where(eq(aiChatMessages.userId, req.user.userId));
  res.json({ success: true, data: null });
});

// ── Send message — non-streaming ──────────────────────────────────────────────

router.post("/chat", async (req: any, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ success: false, error: "Message required" });

  const userId = req.user.userId;
  const role = req.user.role;

  const history = await db
    .select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.userId, userId))
    .orderBy(desc(aiChatMessages.createdAt))
    .limit(20);
  history.reverse();

  const [userMsg] = await db.insert(aiChatMessages).values({ userId, role: "user", content: message.trim() }).returning();

  try {
    const systemPrompt = await buildSystemPrompt(role);
    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: message.trim() },
      ],
    });
    const assistantContent = response.content[0].type === "text" ? response.content[0].text : "";
    const [assistantMsg] = await db.insert(aiChatMessages).values({ userId, role: "assistant", content: assistantContent }).returning();
    res.json({ success: true, data: { userMessage: userMsg, assistantMessage: assistantMsg } });
  } catch (err: any) {
    await db.delete(aiChatMessages).where(eq(aiChatMessages.id, userMsg.id));
    console.error("[AI Chat] Error:", err.message);
    res.status(500).json({ success: false, error: "AI service temporarily unavailable. Please try again." });
  }
});

// ── Streaming endpoint (supports file uploads via multipart/form-data) ────────

router.post("/chat/stream", upload.array("files", 5), async (req: any, res) => {
  const message: string = req.body.message || "";
  const files: Express.Multer.File[] = (req.files as Express.Multer.File[]) || [];

  if (!message.trim() && files.length === 0) {
    return res.status(400).json({ success: false, error: "Message or file required" });
  }

  const userId = req.user.userId;
  const role = req.user.role;

  const history = await db
    .select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.userId, userId))
    .orderBy(desc(aiChatMessages.createdAt))
    .limit(20);
  history.reverse();

  const storedContent = encodeStoredContent(message, files);
  const [userMsg] = await db.insert(aiChatMessages).values({ userId, role: "user", content: storedContent }).returning();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullContent = "";

  try {
    const [systemPrompt, contentBlocks] = await Promise.all([
      buildSystemPrompt(role),
      Promise.resolve(buildContentBlocks(message, files)),
    ]);

    const historyMessages = history.map(h => ({
      role: h.role as "user" | "assistant",
      content: h.content.replace(/^\[\[ATTACHMENTS:[^\]]*\]\]\n?/, ""),
    }));

    const client = getClient();
    const stream = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      stream: true,
      messages: [
        ...historyMessages,
        { role: "user", content: contentBlocks },
      ],
    });

    res.write(`data: ${JSON.stringify({ type: "user_message", data: userMsg })}\n\n`);

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        fullContent += chunk.delta.text;
        res.write(`data: ${JSON.stringify({ type: "delta", text: chunk.delta.text })}\n\n`);
      }
    }

    const [assistantMsg] = await db.insert(aiChatMessages).values({ userId, role: "assistant", content: fullContent }).returning();
    res.write(`data: ${JSON.stringify({ type: "done", data: assistantMsg })}\n\n`);
    res.end();
  } catch (err: any) {
    await db.delete(aiChatMessages).where(eq(aiChatMessages.id, userMsg.id));
    console.error("[AI Stream] Error:", err.message);
    res.write(`data: ${JSON.stringify({ type: "error", error: "AI service temporarily unavailable." })}\n\n`);
    res.end();
  }
});

// ── One-shot task advice (stateless) ─────────────────────────────────────────

const TASK_ADVICE_SYSTEM = `You are a friendly, encouraging mentor helping an early-career team member understand a task they have been assigned. Imagine you are a patient coach explaining things to a bright 14-15 year old — clear sentences, everyday words, no jargon. If you must use a technical term, explain it in one sentence right away.

Your response should always have three short parts:
1. "What this task is about" — 2-3 sentences explaining the goal in plain English
2. "How to get started" — 3 to 5 bullet points of concrete first steps
3. "Watch out for" — 1-3 short tips on common mistakes or things to double-check

Keep the whole response under 260 words. Be warm and encouraging — remind them that everyone starts somewhere. You are giving advice only. You are not making any decisions for them and you are not taking any action on the task.`;

router.post("/task-advice", async (req: any, res) => {
  const { title, description, priority, dueDate, labels, assigneeName, question } = req.body;
  if (!title?.trim()) return res.status(400).json({ success: false, error: "Card title required" });

  const lines = [
    `Task: ${title}`,
    description?.trim() ? `Description: ${description.trim()}` : null,
    `Priority: ${priority || "medium"}`,
    dueDate ? `Due date: ${new Date(dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : null,
    labels?.length ? `Labels: ${(labels as string[]).join(", ")}` : null,
    assigneeName?.trim() ? `Assigned to: ${assigneeName}` : null,
  ].filter(Boolean).join("\n");

  const userMessage = question?.trim()
    ? `Here is my task:\n\n${lines}\n\nMy specific question: ${question.trim()}`
    : `Here is my task:\n\n${lines}\n\nPlease give me friendly beginner advice on how to approach this.`;

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: TASK_ADVICE_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });
    const advice = response.content[0].type === "text" ? response.content[0].text : "";
    res.json({ success: true, data: { advice } });
  } catch (err: any) {
    console.error("[Task Advice] Error:", err.message);
    res.status(500).json({ success: false, error: "AI service temporarily unavailable. Please try again." });
  }
});

// ── Forum topic AI commentary ─────────────────────────────────────────────────

router.post("/forum-comment", async (req: any, res) => {
  const { topicId, autoPost } = req.body;
  if (!topicId) return res.status(400).json({ success: false, error: "topicId required" });

  // Only board members and admins may use this on board forums
  if (req.user.role !== "board" && req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Board access required" });
  }

  try {
    // Fetch topic + author
    const [topicRow] = await db
      .select({
        id: boardForumTopics.id,
        title: boardForumTopics.title,
        content: boardForumTopics.content,
        authorId: boardForumTopics.authorId,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(boardForumTopics)
      .leftJoin(users, eq(users.id, boardForumTopics.authorId))
      .where(eq(boardForumTopics.id, Number(topicId)))
      .limit(1);

    if (!topicRow) return res.status(404).json({ success: false, error: "Topic not found" });

    // Fetch posts in chronological order with author names
    const replies = await db
      .select({
        content: boardForumPosts.content,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: boardForumPosts.createdAt,
      })
      .from(boardForumPosts)
      .leftJoin(users, eq(users.id, boardForumPosts.authorId))
      .where(eq(boardForumPosts.topicId, Number(topicId)))
      .orderBy(asc(boardForumPosts.createdAt))
      .limit(80);

    const repliesText = replies.length === 0
      ? "(no replies yet)"
      : replies.map((r, i) =>
          `Reply ${i + 1} — ${r.firstName ?? "Unknown"} ${r.lastName ?? ""}:\n${r.content}`
        ).join("\n\n");

    const systemPrompt = `You are the AI advisor for handləkraft's board portal, asked to weigh in on an ongoing forum discussion. Apply the foundational briefing below as your governing context.

${FOUNDATION}

---

## How to respond on a forum thread

You are commenting publicly inside a board discussion. Your reply will be posted as a forum message visible to all board members. Follow these rules:

- Address the substance of the topic directly and briefly. Aim for 150–300 words.
- Distinguish (a) what handləkraft has documented, (b) typical nonprofit practice, and (c) your own analysis. Use phrases like "handləkraft's documented position is…", "typical practice suggests…", and "my analysis would suggest…".
- Surface relevant prior discussions, governance documents, or policies from the briefing when they apply — name them.
- If the discussion touches a disqualified-person matter, family-employment dynamic, regulatory question, or anything that warrants professional input, say so explicitly and recommend the appropriate channel (counsel, CPA, ED, Board Chair, etc.).
- Be candid but warm. Match handləkraft's communication norms: direct, plain language, no corporate jargon.
- Do NOT vote, decide, or speak for the organization. You inform; you do not act.
- Do NOT comment on individual board members or staff by name in evaluative ways.
- If you don't have grounded information on the question, say so plainly rather than speculating.
- Do not start with "Hi everyone" or sign off with your name — your reply will appear with an "AI Advisor" label automatically. Just write the substantive comment.`;

    const userMessage = `# Forum topic: ${topicRow.title}

**Started by:** ${topicRow.firstName ?? "Unknown"} ${topicRow.lastName ?? ""}

**Original post:**
${topicRow.content}

**Replies so far (${replies.length}):**
${repliesText}

---

Please post a substantive comment on this discussion as the AI advisor. Apply the briefing context above.`;

    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const comment = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    if (!comment) return res.status(500).json({ success: false, error: "AI returned empty response" });

    if (autoPost) {
      const content = `[AI Advisor]\n\n${comment}`;
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`
        INSERT INTO board_forum_posts (topic_id, author_id, content)
        VALUES (${Number(topicId)}, ${req.user.userId}, ${content})
      `);
      await db.execute(sql`UPDATE board_forum_topics SET last_activity_at = NOW() WHERE id = ${Number(topicId)}`);
    }

    res.json({ success: true, data: { comment, posted: !!autoPost } });
  } catch (err: any) {
    console.error("[Forum AI] Error:", err.message);
    res.status(500).json({ success: false, error: "AI service temporarily unavailable. Please try again." });
  }
});

export default router;
