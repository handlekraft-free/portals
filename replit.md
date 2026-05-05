# Overview

**handləkraft** is a full-stack web application for a 501(c)(3) nonprofit that offers free custom software and websites to community organizations. Concurrently, it trains product-focused problem solvers proficient in AI tools. The platform features a scroll-based landing page, public application forms for fellowships and client requests, an admin dashboard for managing application queues, and a comprehensive internal portal system encompassing Employee, Client, Student, and Board Member portals. The brand name "handləkraft" (Norwegian for "the power to act") is consistently rendered with the Unicode schwa in all UI elements.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework:** React 18 with TypeScript, built using Vite.
- **Routing:** Wouter for client-side navigation.
- **Styling:** Tailwind CSS, utilizing CSS variables for a teal, gold, and slate color scheme.
- **UI Components:** shadcn/ui (new-york style) built on Radix UI primitives.
- **Animations:** Framer Motion for interactive UI elements and scroll effects.
- **Fonts:** DM Serif Display (headings) and Outfit (body) via Google Fonts.
- **State Management:** TanStack React Query for data fetching and mutations.
- **Path Aliases:** `@/` for `client/src/` and `@shared/` for `shared/`.

## Backend
- **Runtime:** Express 5 on Node.js with TypeScript.
- **Authentication:**
    - Legacy `/admin` uses session-based auth (`express-session`).
    - New portals use JWTs stored in httpOnly cookies (`jsonwebtoken`, `bcryptjs`).
- **API Routes:** Modularized by domain, including authentication, time tracking, Kanban, expenses, client portal, student portal, LMS, user management, and board portal functionalities.
- **Storage:** `DatabaseStorage` class leveraging Drizzle ORM for public form data.

## Portal System
- **Login:** A unified `/login` page with role selection (Team Member, Client, Student, Board Member).
- **Employee Portal:** Features dashboard, time tracking, Kanban boards, expenses, client tickets, and LMS course management. Includes an "Admin Users" section for administrators.
- **Longship Factory (Kanban):** A shared quest board visible to all employees — collective unassigned task backlog. Anyone can add quests (manually, CSV bulk import, or AI generate), claim quests (optionally moving to a target board/column), and search/filter. Re-skinned as a parchment quest board: each card shows a wax-seal priority, an XP reward stamp (base × Initiative × bounty), interest-fit stars (1-5, computed server-side from the viewer's prior interest ratings on cards with overlapping labels), an optional gold Bounty ribbon, and a hover/Eye Popover with the full XP math + tag-overlap explanation. Claiming triggers a brief sword-stamp animation (~500ms via framer-motion, suppressed under `prefers-reduced-motion`). Admins see a Crown button on each card to set/clear a per-quest **Bounty** (multiplier 1-5×, optional expiry); active bounty multipliers stack on top of the Initiative bonus when the quest is completed. Seeded with 20 sample tasks. API: `GET /api/kanban/factory` (returns `interestFit`, `interestFitTags`, `bountyActive` per card), `POST /api/kanban/factory/cards`, `POST /api/kanban/factory/import` (CSV multer), `GET /api/kanban/factory/sample.csv`, `POST /api/kanban/cards/:id/claim`, `PATCH /api/kanban/factory/cards/:id/bounty` (admin-only).
- **Client Portal:** Provides a dashboard, file management, messaging, and support ticket functionalities.
- **Student Portal:** Offers a dashboard, course access, file management, and announcements.
- **Board Portal:** Manages meetings, documents, minutes, action items, written consents, board member directories, and communication (board-scoped team chat + AI assistant).
- **Board Onboarding Wizard:** A 5-step first-time login wizard shown as a full-screen overlay for board members with `onboardingComplete === false`. Steps: Welcome → Password Change → Profile Setup (with photo + resume upload) → Availability Grid → Portal Tour. Completion marks `onboarding_complete = true` in DB. Board members can relaunch from My Profile page. Non-board users (admin, employee, etc.) automatically have `onboarding_complete = true` set via migration.
- **Board Profile Photo Upload:** Board members can hover their avatar on the profile page (or wizard) to upload a profile photo. Stored in `data/uploads/board-profiles/`, served via authenticated `GET /api/board/profile-photos/:filename`.
- **Board Resume/CV Upload:** A dedicated Resume card on the profile page lets board members upload a PDF or Word document (max 10 MB). Stored in `data/uploads/board-resumes/`, served via `GET /api/board/resumes/:filename`. Filename and URL persisted in `portal_users.resume_url` / `portal_users.resume_name`.
- **Admin Portal Users:** Dedicated section for comprehensive user management, visible only to admin roles.
- **Portal Components:** Centralized in `client/src/components/portal/` with dedicated layouts and authentication guards.
- **File Uploads:** Stored locally in `./data/uploads/` with authenticated access.

## Database
- **ORM:** Drizzle ORM configured for PostgreSQL.
- **Schema:** Defined in `shared/schema.ts`, including tables for applications, users, projects, time entries, Kanban, expenses, files, messages, support tickets, courses, and board-specific data.
- **Session Store:** `connect-pg-simple` manages PostgreSQL sessions.

## Build Process
- **Development:** `tsx server/index.ts` integrated with Vite middleware for Hot Module Replacement.
- **Production:** Custom `script/build.ts` orchestrates Vite for the client and esbuild for the server, outputting to `dist/`.

## Gamification (XP, Stats, Streaks)
- **Single XP pool** in `portal_users.xp_total`; full audit in `xp_events` with idempotent `UNIQUE(source_type, source_id)`. Logic in `shared/xp.ts`.
- **Six Norse ranks** (Thrall→Konungr) and **four stat tracks** — each has exactly one canonical source (`SUM(amount) GROUP BY stat`, no extra columns). Other awards still credit `xp_total` but use `stat=NULL` so they never inflate a track:
  - **Focus** = Daily Raid (Plan Day finished)
  - **Initiative** = Factory-claimed quest completions ONLY (1.5× multiplier)
  - **Stewardship** = Reviewer handoffs (In-Review → next column) ONLY
  - **Craft** = LMS lessons finished ONLY
- **Untracked-but-awarded XP** (added to `xp_total`, `stat=NULL`): non-factory quest completions, "Loved this" bonus (+25 on 4★+ ratings — also sets `kanban_cards.loved_this` gold-heart marker visible to admins), Honest Pulse daily +5.
- **Forgiving, workday-aware streaks**: Daily Raid and Honest Pulse only count Mon-Fri; weekends are skipped automatically (no token spent). Missed *workdays* consume up to 2 monthly Rest Day tokens (`portal_users.rest_tokens` + `rest_token_month`) before resetting. Pure logic in `advanceStreak()`. Endpoints: `POST /api/xp/streak/raid`, side-effect on `POST /api/balance/me`.
- **Per-user idempotency**: streak/lesson awards use `source_id = userId * N + dayKey-or-lessonId` so the global `UNIQUE(source_type, source_id)` dedupe still permits one row per user per event.
- **Toasts**: server returns `xpAwards: XpAward[]`; `apiRequest` dispatches `xp:awarded` event; `XpProvider` aggregates within 250ms into one toast (e.g. "+90 XP — 2 awards"). My Saga tab in `HeroCard` popover shows stat tracks + streaks + tokens + Crew Bond.

## Co-op Crew Layer (anonymous, never a leaderboard)
- **No individual leaderboards.** All crew progress is shared/anonymous; the Saga of the Week never names individuals.
- **Crew Bond**: `portal_users.crew_bond` integer counter (NOT XP, NOT a stat track). When a reviewer transitions a card from In Review → Done AND assignee≠reviewer, both bumped by +1 atomically (single CTE: INSERT into xp_events with sourceTypes `crew_bond_review_a`/`_b` feeds the UPDATE only if the dedupe insert lands). The actor receives the toast inline via `crewBonds: CrewBond[]` in the response (`crew:bond` CustomEvent). The recipient (assignee) gets a row queued in `crew_bond_notifications`; `CrewBondToaster` polls `GET /api/crew/bonds/pending` (which returns + clears) every 30s + on focus.
- **Crew Longship dashboard component** (`CrewLongship.tsx`): SVG hull + 12 anonymous rower silhouettes that fill proportional to that week's quests-shipped (server FULL_CREW_THRESHOLD=12). Reduced-motion safe. Full-crew banner shown when threshold hit (dismissible per ISO week via localStorage key `crewBannerDismissed:${weekKey}`).
- **Saga of the Week** (`CrewSagaCard.tsx`): visible only Friday 12:00 local through Sunday. Deterministic template from weekly aggregates (questsShipped, reviewsCompleted, crewBondsThisWeek, fullCrew); flourish line picked deterministically from weekKey. Dismissible per week (localStorage). Admins/managers can hide for the whole team via PATCH `/api/crew/saga/optout` → `app_settings(key='saga_optout')`.
- **APIs**: `GET /api/crew/weekly` → `{ weekKey, questsShipped, reviewsCompleted, crewBondsThisWeek, averageEnergy, energySubmittedCount, threshold, fullCrew }`. `GET /api/crew/saga?tz=<IANA>` → `{ weekKey, narrative, optOut, available }`. `PATCH /api/crew/saga/optout` (admin/canApprove only). `GET /api/crew/bonds/pending` returns + clears queued recipient bond notifications.
- **Settings surface**: admin/manager Saga opt-out toggle lives in `/portal/employee/settings` as a Card (`SagaOptOutCard`), with inline copy explaining the card never names individuals. The card-level opt-out icon stays as a quick action.

## Polish Layer (Task #25)
- **Centralized audio service** (`client/src/lib/sounds.ts`): tiny WebAudio synth — drum/horn/parchment/lute. No asset files. Global mute (default OFF) in localStorage `hk_sound`; per-event opt-outs in `hk_sound_muted` (also persisted server-side via `PATCH /api/auth/sound-prefs`, column `portal_users.sound_muted text[]`). `prefers-reduced-motion` silences all sounds. Cross-tab sync via `hk:sound-changed` / `hk:sound-muted-changed`. Per-event toggle UI lives in HeroCard popover under the global toggle. Wired: drum on quest completion, horn on rank-up, lute on `crew:bond`, parchment on Longship Factory mount.
- **Norse cosmetic avatars**: `portal_users.avatar_config` jsonb (`{helm,cloak,beard,emblem}`). SVG `AvatarRenderer` used in HeroCard AND the EmployeeLayout top-bar (consistent across portal). `AvatarCustomizer` modal in HeroCard popover. Server `PATCH /api/auth/avatar` (typed `AvatarConfigShape`, no `any` cast) enforces rank-threshold unlocks: helm @ Karl (200 XP), beard @ Jarl (600), cloak @ Hersir (1500), emblem @ Konungr (6000). Locked layers stripped silently server-side.
- **Saga Recap (end-of-day)**: `SagaRecapModal` mounted in `EmployeeLayout`. Reads prefs from `/api/auth/me` (`sagaRecapEnabled`, `sagaRecapTime` default 17:00); fires once after the configured time, guarded by `hk_saga_recap_shown_<userId>_<date>`. `GET /api/xp/today` returns `{ events, total, byStat, questsShipped, dailyRaidStreak, xpTotal }`. Modal shows quick-stats strip (quests shipped / raid streak / XP-to-next-rank with progress bar), stat-track gains, recent deeds, and an opt-in **"Save to my saga"** row → `POST /api/xp/milestones`. In-session pref refresh via `hk:saga-recap-prefs-changed`. Settings: `SagaRecapCard` in `/portal/employee/settings`, `PATCH /api/auth/saga-recap-prefs`.
- **Personal saga timeline**: `xp_milestones (id, user_id, kind, title, blurb, meta jsonb, created_at)` — private to each user, never surfaced to teammates. Endpoints: `POST /api/xp/milestones`, `GET /api/xp/milestones`. Written to from rank-up overlay ("Save to my saga" CTA) and Saga Recap modal.
- **Rank-up overlay**: auto-dismiss timer removed (rank-ups stay until acknowledged); adds **"Save to my saga"** primary CTA + dismiss link.
- **Energy-aware Plan Day**: `PlanDayWizard` fetches `/api/balance/me` on open. When score ≤ 2: target = 1 quest, tasks sorted by lighter cognitive load (cards tagged `easy`/`quick`/`small`/`low-effort`/`tiny` first → low/medium priority → fewer total labels), gentler welcome copy. Closing without committing calls `POST /api/xp/streak/raid/skip` (workday-aware, idempotent, null-energy-guarded) so the Daily Raid streak survives a low-energy day.

## Key Design Decisions
- **Full-stack application** built with Express, React, and PostgreSQL.
- **Comprehensive component library** using shadcn/ui for rapid development.
- **Single-page scroll design** for the homepage with distinct routes for forms and admin.
- **Consistent branding** "handləkraft" with a teal, gold, and slate color palette.
- **Product-focused training** model leveraging AI tools for implementation.

# External Dependencies

- **PostgreSQL:** Primary database, connected via Drizzle ORM and `node-postgres`.
- **Google Fonts:** Used for typography (DM Serif Display, Outfit).
- **Transparent Textures:** Provides background patterns.
- **pdfkit:** Node.js library for PDF generation.