import type { Router } from "express";
import { Router as createRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";
import { db } from "./db";
import { aiChatMessages } from "@shared/schema";
import { eq, asc, desc } from "drizzle-orm";
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

const SYSTEM_PROMPT = `You are a helpful AI assistant embedded in the handləkraft internal team portal. handləkraft is a 501(c)(3) nonprofit that offers free custom software and websites to community organizations while training product-focused problem solvers proficient in AI tools.

You help team members with:
- Drafting content, emails, proposals, and documentation
- Thinking through product and project problems
- Explaining technical concepts
- Brainstorming ideas
- Reviewing and improving text
- Analyzing images and documents shared by the user
- General knowledge questions

Keep responses concise and practical. Use a friendly, professional tone. If you're unsure about something specific to handləkraft's internal processes, say so honestly.`;

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const TEXT_MIMES = new Set([
  "text/plain", "text/csv", "text/markdown", "text/html", "text/css",
  "application/json", "application/xml", "text/xml",
  "application/javascript", "text/javascript",
]);

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
      // Text, CSV, JSON, code files, etc. — inject as readable text
      const raw = file.buffer.toString("utf-8");
      const truncated = raw.length > 60_000 ? raw.slice(0, 60_000) + "\n…[truncated]" : raw;
      blocks.push({
        type: "text",
        text: `📎 File: ${file.originalname}\n\`\`\`\n${truncated}\n\`\`\``,
      });
    }
  }

  if (message.trim()) {
    blocks.push({ type: "text", text: message.trim() });
  }

  return blocks;
}

// Encode attachment names into stored content so the frontend can display chips
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

// ── Send message — non-streaming (kept for compatibility) ─────────────────────

router.post("/chat", async (req: any, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ success: false, error: "Message required" });

  const userId = req.user.userId;
  const history = await db
    .select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.userId, userId))
    .orderBy(desc(aiChatMessages.createdAt))
    .limit(20);
  history.reverse();

  const [userMsg] = await db.insert(aiChatMessages).values({ userId, role: "user", content: message.trim() }).returning();

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
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
    const client = getClient();
    const contentBlocks = buildContentBlocks(message, files);

    // Build history messages — past messages are plain text (no files in history)
    const historyMessages = history.map(h => ({
      role: h.role as "user" | "assistant",
      content: h.content.replace(/^\[\[ATTACHMENTS:[^\]]*\]\]\n?/, ""),
    }));

    const stream = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
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

export default router;
