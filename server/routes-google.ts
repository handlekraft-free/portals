import { Router } from "express";
import type { Request } from "express";
import { requireEmployee } from "./auth-middleware";
import { db } from "./db";
import { users, googleNotifications } from "@shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import jwt from "jsonwebtoken";

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const JWT_SECRET = process.env.JWT_SECRET || "handlekraft-dev-secret-change-in-production";

function getRedirectUri(_req: Request): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  return "http://localhost:5000/api/google/oauth/callback";
}

// GET /api/google/oauth/url
router.get("/oauth/url", requireEmployee, (req: any, res) => {
  const userId = req.user.id;
  const redirectUri = getRedirectUri(req);
  const state = jwt.sign({ userId, redirectUri }, JWT_SECRET, { expiresIn: "10m" });

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: [
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/calendar.readonly",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    response_type: "code",
    state,
  });

  res.json({ success: true, data: { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` } });
});

// GET /api/google/oauth/callback — browser redirect from Google
router.get("/oauth/callback", async (req, res) => {
  const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

  if (error) {
    return res.redirect(`/portal/employee/settings?google=error&msg=${encodeURIComponent(error)}`);
  }
  if (!code || !state) {
    return res.redirect("/portal/employee/settings?google=error&msg=missing_params");
  }

  let payload: { userId: number; redirectUri: string };
  try {
    payload = jwt.verify(state, JWT_SECRET) as any;
  } catch {
    return res.redirect("/portal/employee/settings?google=error&msg=invalid_state");
  }

  const { userId, redirectUri } = payload;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json() as any;
    if (!tokenRes.ok || tokens.error) {
      console.error("[Google OAuth] Token exchange failed:", tokens);
      return res.redirect("/portal/employee/settings?google=error&msg=token_exchange_failed");
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json() as any;

    await db.update(users)
      .set({
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token ?? null,
        googleTokenExpiry: expiresAt,
        googleEmail: userInfo.email ?? null,
      })
      .where(eq(users.id, userId));

    res.redirect("/portal/employee/settings?google=connected");
  } catch (err) {
    console.error("[Google OAuth] Callback error:", err);
    res.redirect("/portal/employee/settings?google=error&msg=server_error");
  }
});

// GET /api/google/status
router.get("/status", requireEmployee, async (req: any, res) => {
  const userId = req.user.id;
  const [row] = await db
    .select({ googleEmail: users.googleEmail, googleAccessToken: users.googleAccessToken })
    .from(users)
    .where(eq(users.id, userId));
  res.json({ success: true, data: { connected: !!row?.googleAccessToken, email: row?.googleEmail ?? null } });
});

// DELETE /api/google/disconnect
router.delete("/disconnect", requireEmployee, async (req: any, res) => {
  const userId = req.user.id;
  await db.update(users)
    .set({ googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null, googleEmail: null })
    .where(eq(users.id, userId));
  await db.delete(googleNotifications).where(eq(googleNotifications.userId, userId));
  res.json({ success: true });
});

// GET /api/google/notifications
router.get("/notifications", requireEmployee, async (req: any, res) => {
  const userId = req.user.id;
  const notifications = await db
    .select()
    .from(googleNotifications)
    .where(eq(googleNotifications.userId, userId))
    .orderBy(googleNotifications.createdAt)
    .limit(50);
  res.json({ success: true, data: { notifications } });
});

// GET /api/google/unread-count
router.get("/unread-count", requireEmployee, async (req: any, res) => {
  const userId = req.user.id;
  const rows = await db
    .select({ id: googleNotifications.id })
    .from(googleNotifications)
    .where(and(eq(googleNotifications.userId, userId), eq(googleNotifications.isRead, false)));
  res.json({ success: true, data: { count: rows.length } });
});

// POST /api/google/notifications/read-all
router.post("/notifications/read-all", requireEmployee, async (req: any, res) => {
  const userId = req.user.id;
  await db.update(googleNotifications)
    .set({ isRead: true })
    .where(eq(googleNotifications.userId, userId));
  res.json({ success: true });
});

// PATCH /api/google/notifications/:id/read
router.patch("/notifications/:id/read", requireEmployee, async (req: any, res) => {
  const userId = req.user.id;
  const id = parseInt(req.params.id, 10);
  await db.update(googleNotifications)
    .set({ isRead: true })
    .where(and(eq(googleNotifications.id, id), eq(googleNotifications.userId, userId)));
  res.json({ success: true });
});

// DELETE /api/google/notifications/:id
router.delete("/notifications/:id", requireEmployee, async (req: any, res) => {
  const userId = req.user.id;
  const id = parseInt(req.params.id, 10);
  await db.delete(googleNotifications)
    .where(and(eq(googleNotifications.id, id), eq(googleNotifications.userId, userId)));
  res.json({ success: true });
});

// ── Background Polling ───────────────────────────────────────────────────────

async function refreshAccessToken(userId: number, refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json() as any;
    if (!res.ok || data.error) {
      console.error(`[Google] Token refresh failed for user ${userId}:`, data.error);
      return null;
    }
    const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
    await db.update(users)
      .set({ googleAccessToken: data.access_token, googleTokenExpiry: expiresAt })
      .where(eq(users.id, userId));
    return data.access_token;
  } catch (err) {
    console.error(`[Google] Token refresh error for user ${userId}:`, err);
    return null;
  }
}

async function pollGmailForUser(userId: number, accessToken: string) {
  try {
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread+in:inbox&maxResults=10",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) return;
    const listData = await listRes.json() as any;
    if (!listData.messages?.length) return;

    for (const msg of listData.messages.slice(0, 10)) {
      const existing = await db
        .select({ id: googleNotifications.id })
        .from(googleNotifications)
        .where(and(
          eq(googleNotifications.userId, userId),
          eq(googleNotifications.externalId, msg.id),
          eq(googleNotifications.type, "gmail")
        ));
      if (existing.length > 0) continue;

      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!msgRes.ok) continue;
      const msgData = await msgRes.json() as any;

      const headers = msgData.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === "Subject")?.value || "(no subject)";
      const from = headers.find((h: any) => h.name === "From")?.value || "";
      const fromName = from.replace(/<[^>]*>/g, "").trim() || from;
      const snippet = (msgData.snippet || "").slice(0, 100);
      const subtitle = fromName + (snippet ? ` — ${snippet}` : "");

      await db.insert(googleNotifications).values({
        userId,
        type: "gmail",
        title: subject,
        subtitle,
        url: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
        externalId: msg.id,
        isRead: false,
      });
    }
  } catch (err) {
    console.error(`[Google] Gmail poll error for user ${userId}:`, err);
  }
}

async function pollCalendarForUser(userId: number, accessToken: string) {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
        new URLSearchParams({
          timeMin: now.toISOString(),
          timeMax: tomorrow.toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "10",
        }),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return;
    const data = await res.json() as any;
    if (!data.items?.length) return;

    for (const event of data.items) {
      const startRaw = event.start?.dateTime || event.start?.date;
      const externalId = `${event.id}_${startRaw}`;

      const existing = await db
        .select({ id: googleNotifications.id })
        .from(googleNotifications)
        .where(and(
          eq(googleNotifications.userId, userId),
          eq(googleNotifications.externalId, externalId),
          eq(googleNotifications.type, "calendar")
        ));
      if (existing.length > 0) continue;

      const eventTime = startRaw ? new Date(startRaw) : null;
      const timeStr = eventTime
        ? eventTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        : "All day";
      const subtitle = timeStr + (event.location ? ` · ${event.location}` : "");

      await db.insert(googleNotifications).values({
        userId,
        type: "calendar",
        title: event.summary || "Untitled Event",
        subtitle,
        url: "https://calendar.google.com/calendar/r",
        externalId,
        eventTime: eventTime ?? undefined,
        isRead: false,
      });
    }
  } catch (err) {
    console.error(`[Google] Calendar poll error for user ${userId}:`, err);
  }
}

export async function startGooglePolling() {
  const poll = async () => {
    try {
      const filtered = await db
        .select({
          id: users.id,
          googleAccessToken: users.googleAccessToken,
          googleRefreshToken: users.googleRefreshToken,
          googleTokenExpiry: users.googleTokenExpiry,
        })
        .from(users)
        .where(isNotNull(users.googleRefreshToken));

      for (const row of filtered) {
        let accessToken: string | null = row.googleAccessToken;
        const expiry = row.googleTokenExpiry ? new Date(row.googleTokenExpiry) : null;

        if (!accessToken || !expiry || expiry.getTime() - Date.now() < 5 * 60 * 1000) {
          if (!row.googleRefreshToken) continue;
          accessToken = await refreshAccessToken(row.id, row.googleRefreshToken);
          if (!accessToken) continue;
        }

        await pollGmailForUser(row.id, accessToken);
        await pollCalendarForUser(row.id, accessToken);
      }
    } catch (err) {
      console.error("[Google] Poll cycle error:", err);
    }
  };

  setTimeout(poll, 8000);
  setInterval(poll, 60_000);
  console.log("[Google] Background polling started (60s interval)");
}

export default router;
