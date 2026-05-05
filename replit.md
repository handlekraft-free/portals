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
- **Longship Factory (Kanban):** A special shared Kanban board visible to all employees. Acts as a collective unassigned task backlog — anyone can add quests (manually or via CSV bulk import), claim quests to assign them to themselves (optionally moving to a target board/column), and search/filter by priority or column. Seeded with 20 sample tasks. Accessible via the "Longship Factory" tab in the Kanban page. API: `GET /api/kanban/factory`, `POST /api/kanban/factory/cards`, `POST /api/kanban/factory/import` (CSV multer), `GET /api/kanban/factory/sample.csv`, `POST /api/kanban/cards/:id/claim`.
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
- **Six Norse ranks** (Thrall→Konungr) and **four stat tracks** with one canonical source each (`SUM(amount) GROUP BY stat` — no extra columns):
  - **Focus** = Daily Raid (Plan Day finished)
  - **Initiative** = Kanban quest completions (factory-claimed → 1.5× bonus)
  - **Stewardship** = Honest Pulse (energy log) + Reviewer handoffs (In-Review → next)
  - **Craft** = LMS lessons finished + 4★+ "Loved this" bonus
- **Bonuses**: factory-claimed completions earn 1.5× Initiative XP (`kanban_cards.claimed_from_factory`); 4★+ rated completions get a +25 Craft "Loved this" bonus and set `kanban_cards.loved_this` (gold heart marker visible to admins); reviewers earn 30 Stewardship XP when an In-Review card moves to a non-review column (separate `source_type='kanban_card_review'`).
- **Forgiving, workday-aware streaks**: Daily Raid and Honest Pulse only count Mon-Fri; weekends are skipped automatically (no token spent). Missed *workdays* consume up to 2 monthly Rest Day tokens (`portal_users.rest_tokens` + `rest_token_month`) before resetting. Pure logic in `advanceStreak()`. Endpoints: `POST /api/xp/streak/raid`, side-effect on `POST /api/balance/me`.
- **Per-user idempotency**: streak/lesson awards use `source_id = userId * N + dayKey-or-lessonId` so the global `UNIQUE(source_type, source_id)` dedupe still permits one row per user per event.
- **Toasts**: server returns `xpAwards: XpAward[]`; `apiRequest` dispatches `xp:awarded` event; `XpProvider` aggregates within 250ms into one toast (e.g. "+90 XP — 2 awards"). My Saga tab in `HeroCard` popover shows stat tracks + streaks + tokens.

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