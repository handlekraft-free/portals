# Open Portals (open-source fork)

Open-source extraction of the handləkraft.ai portal system: Employee, Client, Student, and Board portals with optional Norse-themed gamification. All marketing/application surfaces have been stripped; this fork is meant to be rebranded by editing `shared/branding.ts`.

**License:** AGPL-3.0-or-later (see LICENSE + NOTICE). Contributors agree to AGPL terms via CONTRIBUTING.md.

## Run & Operate

- **Run Dev Server:** `tsx server/index.ts`
- **Build Production:** `script/build.ts` (orchestrates Vite for client, esbuild for server)
- **Typecheck:** _Populate as you build_
- **Codegen:** _Populate as you build_
- **DB Push:** _Populate as you build_

**Required Environment Variables:** see `.env.example`
- Required: `DATABASE_URL`, `JWT_SECRET`
- Optional: `PORT`, `UPLOAD_DIR`, `ENABLED_PORTALS`, `ANTHROPIC_API_KEY` / `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

## Stack

- **Frontend:** React 18, TypeScript, Vite, Wouter, Tailwind CSS, shadcn/ui, Radix UI, Framer Motion, TanStack React Query
- **Backend:** Express 5, Node.js, TypeScript
- **ORM:** Drizzle ORM (for PostgreSQL)
- **Validation:** _Populate as you build_
- **Build Tool:** Vite (client), esbuild (server)
- **Database:** PostgreSQL
- **Authentication:** JWT (portal users)

## Where things live

- **Client Source:** `client/src/`
- **Server Source:** `server/`
- **Shared Code:** `shared/`
- **Database Schema:** `shared/schema.ts`
- **Branding Configuration:** `shared/branding.ts`
- **UI Components:** `client/src/components/` (portal components in `client/src/components/portal/`)
- **File Uploads:** `./data/uploads/`
- **README / contribution docs:** `README.md`, `CONTRIBUTING.md`, `.env.example`
- **GitHub-facing config:** `.github/` (issue templates, PR template, CI workflow, Dependabot), `SECURITY.md`

## Architecture decisions

- **Modularized API Routes:** Backend API routes are organized by domain (e.g., `authentication`, `time tracking`, `kanban`).
- **Unified Login and Portal System:** A single `/login` page directs users to role-specific portals (Employee, Client, Student, Board Member).
- **Gamified Engagement:** Uses XP, stat tracks, and workday-aware streaks with Norse theming to encourage participation without leaderboards.
- **Branding:** All UI strings come from a single `BRAND` object in `shared/branding.ts` so a fork can rebrand by editing one file.
- **Portal selector:** `ENABLED_PORTALS` env var (parsed by `shared/portals.ts` → `server/portals.ts`) gates both client login choices and server route mounts; client fetches list via `GET /api/public/portals`. Admin is always enabled.
- **Versioning:** Single source of truth is `shared/version.ts` (`VERSION` + `UPSTREAM_REF`); mirrored in `package.json`. Exposed at `GET /api/public/version` and in the login footer. CI (`.github/workflows/ci.yml`) enforces sync. Bump both + add `CHANGELOG.md` entry on every release. See `UPSTREAM.md`.
- **AI advisor briefing:** `server/routes-ai.ts` loads `server/ai-briefing.local.md` (gitignored, org-specific) and falls back to `server/ai-briefing.example.md` (generic, in-repo). Operators copy the example to `.local.md` and edit.
- **OSS scaffolding:** `.github/` (issue templates, PR template, CI), `SECURITY.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `NOTICE` (AGPL copyright). Issue templates route security and commercial questions to `robert@handlekraft.ai` rather than public issues.
- **Localization (Option A):** No i18n infrastructure yet. All UI strings inline in JSX in `client/src/`. Forks translate by find/replace. Proper i18n is on the README roadmap.

## Product

- **Internal Portal System:**
    - **Workforce Portal:** Dashboard, time tracking, Kanban boards (Longship Factory), expenses, client tickets, LMS.
    - **Client CRM:** Dashboard, file management, messaging, support tickets.
    - **Student LMS:** Dashboard, course access, file management, announcements.
    - **Board Member Portal:** Meeting management, documents, minutes, action items, communication, onboarding wizard.
- **Gamification Features:** XP progression, stat tracks (Focus, Initiative, Stewardship, Craft), streak system, anonymous Crew Bond mechanics, and daily Saga Recaps.
- **Accessibility Enhancements:** Reduced motion support for animations and sounds.

## User preferences

- **Preferred communication style:** Simple, everyday language.
- **Commercial model:** Maintainers (handləkraft.ai) sell paid support, deployment, rebranding, integration, and SLAs around this OSS project. Contact email is `robert@handlekraft.ai`. This must remain visible in `SUPPORT.md`, `README.md`, and `CONTRIBUTING.md`; do not remove or downplay the paid-support channel during refactors.
- **Sound Preferences:** Users can control global sound mute and per-event sound opt-outs, persisted locally and server-side.
- **Saga Recap Preferences:** Users can enable/disable the daily Saga Recap and configure its display time.
- **Avatar Customization:** Users can customize their Norse-themed avatars, with elements unlocking based on XP rank.

## Gotchas

- **Gamification Idempotency:** XP awards and streak advancements use specific `source_id` generation to ensure idempotency across users and events.
- **Sound Sync:** Cross-tab sound preferences are synchronized via `hk:sound-changed` / `hk:sound-muted-changed` events.
- **Admin Saga Opt-out:** Admin/managers can opt out the entire team from the Saga of the Week.

## Pointers

- **Drizzle ORM Documentation:** [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **Tailwind CSS Documentation:** [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
- **shadcn/ui Documentation:** [https://ui.shadcn.com/docs](https://ui.shadcn.com/docs)
- **Framer Motion Documentation:** [https://www.framer.com/motion/](https://www.framer.com/motion/)
- **React Query Documentation:** [https://tanstack.com/query/latest](https://tanstack.com/query/latest)
- **Wouter Documentation:** [https://wouter.dev/](https://wouter.dev/)
- **Express.js Documentation:** [https://expressjs.com/](https://expressjs.com/)
- **Node.js Documentation:** [https://nodejs.org/docs/latest/api/](https://nodejs.org/docs/latest/api/)
- **PostgreSQL Documentation:** [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)