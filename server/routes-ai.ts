import type { Router } from "express";
import { Router as createRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { aiChatMessages } from "@shared/schema";
import { eq, asc, desc } from "drizzle-orm";
import { requireAuth } from "./auth-middleware";

const router: Router = createRouter();
router.use(requireAuth as any);

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
- General knowledge questions

Keep responses concise and practical. Use a friendly, professional tone. If you're unsure about something specific to handləkraft's internal processes, say so honestly.`;

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

// ── Send message (non-streaming) ─────────────────────────────────────────────

router.post("/chat", async (req: any, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ success: false, error: "Message required" });

  const userId = req.user.userId;

  // Load recent history (last 20 messages for context)
  const history = await db
    .select()
    .from(aiChatMessages)
    .where(eq(aiChatMessages.userId, userId))
    .orderBy(desc(aiChatMessages.createdAt))
    .limit(20);
  history.reverse();

  // Save user message
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
    // Remove the user message if the AI call fails so conversation stays clean
    await db.delete(aiChatMessages).where(eq(aiChatMessages.id, userMsg.id));
    console.error("[AI Chat] Error:", err.message);
    res.status(500).json({ success: false, error: "AI service temporarily unavailable. Please try again." });
  }
});

// ── Streaming endpoint ────────────────────────────────────────────────────────

router.post("/chat/stream", async (req: any, res) => {
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

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullContent = "";

  try {
    const client = getClient();
    const stream = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      stream: true,
      messages: [
        ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: message.trim() },
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
