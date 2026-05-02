import { Router } from "express";
import type { Request } from "express";
import { requireEmployee } from "./auth-middleware";
import { db } from "./db";
import { users, googleNotifications, googleAccounts } from "@shared/schema";
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

// ── Token helpers ─────────────────────────────────────────────────────────────

async function refreshAccountToken(accountId: number, refreshToken: string): Promise<string | null> {
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
      console.error(`[Google] Token refresh failed for account ${accountId}:`, data.error);
      return null;
    }
    const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
    await db.update(googleAccounts)
      .set({ accessToken: data.access_token, tokenExpiry: expiresAt })
      .where(eq(googleAccounts.id, accountId));
    return data.access_token;
  } catch (err) {
    console.error(`[Google] Token refresh error for account ${accountId}:`, err);
    return null;
  }
}

async function getValidAccountToken(acct: {
  id: number;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
}): Promise<string | null> {
  if (acct.accessToken && acct.tokenExpiry && acct.tokenExpiry.getTime() - Date.now() > 5 * 60 * 1000) {
    return acct.accessToken;
  }
  if (!acct.refreshToken) return null;
  return refreshAccountToken(acct.id, acct.refreshToken);
}

// ── Google API fetchers ───────────────────────────────────────────────────────

async function fetchCalendarForAccount(accessToken: string): Promise<any[]> {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const calRes = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
      new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: sevenDays.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "3",
      }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!calRes.ok) return [];
  const calData = await calRes.json() as any;
  return (calData.items ?? []).map((event: any) => {
    const startRaw = event.start?.dateTime || event.start?.date;
    const eventTime = startRaw ? new Date(startRaw) : null;
    return {
      id: event.id,
      title: event.summary || "Untitled Event",
      url: event.htmlLink || "https://calendar.google.com/calendar/r",
      eventTime: eventTime?.toISOString() ?? null,
    };
  });
}

async function fetchGmailForAccount(accessToken: string, accountEmail: string): Promise<any[]> {
  const gmailRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:inbox&maxResults=4",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!gmailRes.ok) return [];
  const gmailData = await gmailRes.json() as any;
  const messageIds: string[] = (gmailData.messages ?? []).map((m: any) => m.id);
  const gmail: any[] = [];
  // Use the account email in the URL so Gmail opens the correct account
  const gmailBase = `https://mail.google.com/mail/u/${encodeURIComponent(accountEmail)}`;
  await Promise.all(
    messageIds.map(async (id) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!msgRes.ok) return;
      const msg = await msgRes.json() as any;
      const headers = msg.payload?.headers ?? [];
      const subject = headers.find((h: any) => h.name === "Subject")?.value || "(no subject)";
      const from = headers.find((h: any) => h.name === "From")?.value || "";
      const fromName = from.replace(/<[^>]*>/g, "").trim() || from;
      gmail.push({ id, title: subject, subtitle: fromName, url: `${gmailBase}/#inbox/${id}` });
    })
  );
  gmail.sort((a, b) => messageIds.indexOf(a.id) - messageIds.indexOf(b.id));
  return gmail;
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

// GET /api/google/oauth/url?label=Work&hint=you@example.com
router.get("/oauth/url", requireEmployee, (req: any, res) => {
  const userId = req.user.userId;
  const label = (req.query.label as string)?.trim() || "Primary";
  const hint = (req.query.hint as string)?.trim() || "";
  const redirectUri = getRedirectUri(req);
  const state = jwt.sign({ userId, redirectUri, label }, JWT_SECRET, { expiresIn: "10m" });

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
    prompt: "consent select_account",
    response_type: "code",
    state,
  });

  // login_hint tells Google to pre-select / lock onto this specific account
  if (hint) params.set("login_hint", hint);

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

  let payload: { userId: number; redirectUri: string; label?: string };
  try {
    payload = jwt.verify(state, JWT_SECRET) as any;
  } catch {
    return res.redirect("/portal/employee/settings?google=error&msg=invalid_state");
  }

  const { userId, redirectUri, label = "Primary" } = payload;

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
    const email: string = userInfo.email ?? null;

    if (!email) {
      return res.redirect("/portal/employee/settings?google=error&msg=no_email");
    }

    // Upsert into googleAccounts by userId+email
    const existing = await db.select({ id: googleAccounts.id })
      .from(googleAccounts)
      .where(and(eq(googleAccounts.userId, userId), eq(googleAccounts.email, email)));

    if (existing.length > 0) {
      await db.update(googleAccounts)
        .set({
          accessToken: tokens.access_token,
          ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
          tokenExpiry: expiresAt,
          isActive: true,
        })
        .where(eq(googleAccounts.id, existing[0].id));
    } else {
      await db.insert(googleAccounts).values({
        userId,
        email,
        label,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiry: expiresAt,
        isActive: true,
      });
    }

    // Keep legacy portal_users columns in sync for the first account
    const allAccts = await db.select({ id: googleAccounts.id })
      .from(googleAccounts)
      .where(and(eq(googleAccounts.userId, userId), eq(googleAccounts.isActive, true)));
    if (allAccts.length <= 1) {
      await db.update(users)
        .set({
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token ?? null,
          googleTokenExpiry: expiresAt,
          googleEmail: email,
        })
        .where(eq(users.id, userId));
    }

    res.redirect("/portal/employee/settings?google=connected");
  } catch (err) {
    console.error("[Google OAuth] Callback error:", err);
    res.redirect("/portal/employee/settings?google=error&msg=server_error");
  }
});

// ── Account Management ────────────────────────────────────────────────────────

// GET /api/google/accounts
router.get("/accounts", requireEmployee, async (req: any, res) => {
  const userId = req.user.userId;
  const accounts = await db
    .select({ id: googleAccounts.id, email: googleAccounts.email, label: googleAccounts.label, createdAt: googleAccounts.createdAt })
    .from(googleAccounts)
    .where(and(eq(googleAccounts.userId, userId), eq(googleAccounts.isActive, true)));
  res.json({ success: true, data: { accounts } });
});

// PATCH /api/google/accounts/:id — update label
router.patch("/accounts/:id", requireEmployee, async (req: any, res) => {
  const userId = req.user.userId;
  const id = parseInt(req.params.id, 10);
  const { label } = req.body;
  if (!label?.trim()) return res.status(400).json({ success: false, error: "Label is required" });
  await db.update(googleAccounts)
    .set({ label: label.trim() })
    .where(and(eq(googleAccounts.id, id), eq(googleAccounts.userId, userId)));
  res.json({ success: true });
});

// DELETE /api/google/accounts/:id — remove one account
router.delete("/accounts/:id", requireEmployee, async (req: any, res) => {
  const userId = req.user.userId;
  const id = parseInt(req.params.id, 10);
  const [acct] = await db.select({ email: googleAccounts.email })
    .from(googleAccounts)
    .where(and(eq(googleAccounts.id, id), eq(googleAccounts.userId, userId)));
  await db.delete(googleAccounts)
    .where(and(eq(googleAccounts.id, id), eq(googleAccounts.userId, userId)));
  // Clear legacy columns if this was the primary account
  const [userRow] = await db.select({ googleEmail: users.googleEmail }).from(users).where(eq(users.id, userId));
  if (userRow?.googleEmail && acct?.email === userRow.googleEmail) {
    // Check if another account exists to promote
    const remaining = await db.select().from(googleAccounts)
      .where(and(eq(googleAccounts.userId, userId), eq(googleAccounts.isActive, true)));
    if (remaining.length > 0) {
      const next = remaining[0];
      await db.update(users)
        .set({ googleAccessToken: next.accessToken, googleRefreshToken: next.refreshToken, googleTokenExpiry: next.tokenExpiry, googleEmail: next.email })
        .where(eq(users.id, userId));
    } else {
      await db.update(users)
        .set({ googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null, googleEmail: null })
        .where(eq(users.id, userId));
    }
  }
  res.json({ success: true });
});

// GET /api/google/status — backward compat
router.get("/status", requireEmployee, async (req: any, res) => {
  const userId = req.user.userId;
  const accounts = await db.select({ id: googleAccounts.id, email: googleAccounts.email, label: googleAccounts.label })
    .from(googleAccounts)
    .where(and(eq(googleAccounts.userId, userId), eq(googleAccounts.isActive, true)));
  res.json({ success: true, data: { connected: accounts.length > 0, email: accounts[0]?.email ?? null, accountCount: accounts.length } });
});

// DELETE /api/google/disconnect — remove all accounts
router.delete("/disconnect", requireEmployee, async (req: any, res) => {
  const userId = req.user.userId;
  await db.delete(googleAccounts).where(eq(googleAccounts.userId, userId));
  await db.update(users)
    .set({ googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null, googleEmail: null })
    .where(eq(users.id, userId));
  await db.delete(googleNotifications).where(eq(googleNotifications.userId, userId));
  res.json({ success: true });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

// GET /api/google/dashboard — live fetch from all connected accounts
router.get("/dashboard", requireEmployee, async (req: any, res) => {
  const userId = req.user.userId;
  const accounts = await db.select().from(googleAccounts)
    .where(and(eq(googleAccounts.userId, userId), eq(googleAccounts.isActive, true)));

  if (accounts.length === 0) {
    return res.json({ success: true, data: { accounts: [] } });
  }

  const results = await Promise.all(accounts.map(async (acct) => {
    const token = await getValidAccountToken(acct);
    if (!token) return { id: acct.id, email: acct.email, label: acct.label, calendar: [], gmail: [] };
    const [calendar, gmail] = await Promise.all([
      fetchCalendarForAccount(token),
      fetchGmailForAccount(token, acct.email),
    ]);
    return { id: acct.id, email: acct.email, label: acct.label, calendar, gmail };
  }));

  res.json({ success: true, data: { accounts: results } });
});

// ── Notifications ─────────────────────────────────────────────────────────────

router.get("/notifications", requireEmployee, async (req: any, res) => {
  const userId = req.user.userId;
  const notifications = await db
    .select()
    .from(googleNotifications)
    .where(eq(googleNotifications.userId, userId))
    .orderBy(googleNotifications.createdAt)
    .limit(50);
  res.json({ success: true, data: { notifications } });
});

router.get("/unread-count", requireEmployee, async (req: any, res) => {
  const userId = req.user.userId;
  const rows = await db
    .select({ id: googleNotifications.id })
    .from(googleNotifications)
    .where(and(eq(googleNotifications.userId, userId), eq(googleNotifications.isRead, false)));
  res.json({ success: true, data: { count: rows.length } });
});

router.post("/notifications/read-all", requireEmployee, async (req: any, res) => {
  const userId = req.user.userId;
  await db.update(googleNotifications).set({ isRead: true }).where(eq(googleNotifications.userId, userId));
  res.json({ success: true });
});

router.patch("/notifications/:id/read", requireEmployee, async (req: any, res) => {
  const userId = req.user.userId;
  const id = parseInt(req.params.id, 10);
  await db.update(googleNotifications)
    .set({ isRead: true })
    .where(and(eq(googleNotifications.id, id), eq(googleNotifications.userId, userId)));
  res.json({ success: true });
});

router.delete("/notifications/:id", requireEmployee, async (req: any, res) => {
  const userId = req.user.userId;
  const id = parseInt(req.params.id, 10);
  await db.delete(googleNotifications)
    .where(and(eq(googleNotifications.id, id), eq(googleNotifications.userId, userId)));
  res.json({ success: true });
});

// ── Background Polling ────────────────────────────────────────────────────────

async function pollGmailForAccount(userId: number, accountId: number, accessToken: string, accountEmail: string) {
  try {
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread+in:inbox&maxResults=10",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) return;
    const listData = await listRes.json() as any;
    if (!listData.messages?.length) return;

    const gmailBase = `https://mail.google.com/mail/u/${encodeURIComponent(accountEmail)}`;

    for (const msg of listData.messages.slice(0, 10)) {
      const existing = await db.select({ id: googleNotifications.id })
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
        url: `${gmailBase}/#inbox/${msg.id}`,
        externalId: `${accountId}:${msg.id}`,
        isRead: false,
      });
    }
  } catch (err) {
    console.error(`[Google] Gmail poll error for account ${accountId}:`, err);
  }
}

async function pollCalendarForAccount(userId: number, accountId: number, accessToken: string) {
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
      const externalId = `${accountId}:${event.id}_${startRaw}`;

      const existing = await db.select({ id: googleNotifications.id })
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
    console.error(`[Google] Calendar poll error for account ${accountId}:`, err);
  }
}

export async function startGooglePolling() {
  const poll = async () => {
    try {
      // Migrate any legacy tokens from portal_users → googleAccounts
      const usersWithLegacyTokens = await db.select({
        id: users.id,
        googleEmail: users.googleEmail,
        googleAccessToken: users.googleAccessToken,
        googleRefreshToken: users.googleRefreshToken,
        googleTokenExpiry: users.googleTokenExpiry,
      }).from(users).where(isNotNull(users.googleRefreshToken));

      for (const u of usersWithLegacyTokens) {
        if (!u.googleEmail) continue;
        const existing = await db.select({ id: googleAccounts.id })
          .from(googleAccounts)
          .where(and(eq(googleAccounts.userId, u.id), eq(googleAccounts.email, u.googleEmail)));
        if (existing.length === 0) {
          await db.insert(googleAccounts).values({
            userId: u.id,
            email: u.googleEmail,
            label: "Primary",
            accessToken: u.googleAccessToken,
            refreshToken: u.googleRefreshToken,
            tokenExpiry: u.googleTokenExpiry,
            isActive: true,
          });
          console.log(`[Google] Migrated legacy account for user ${u.id}: ${u.googleEmail}`);
        }
      }

      // Poll all active accounts
      const allAccounts = await db.select().from(googleAccounts)
        .where(and(eq(googleAccounts.isActive, true), isNotNull(googleAccounts.refreshToken)));

      for (const acct of allAccounts) {
        const token = await getValidAccountToken(acct);
        if (!token) continue;
        await pollGmailForAccount(acct.userId, acct.id, token, acct.email);
        await pollCalendarForAccount(acct.userId, acct.id, token);
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
