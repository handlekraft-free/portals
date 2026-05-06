# handləkraft

A full-stack web application for a 501(c)(3) nonprofit that builds and sustains open-source AI tools for community organizations through paid implementation services, while training non-traditional product builders.

## Run & Operate

- **Run Dev Server:** `tsx server/index.ts`
- **Build Production:** `script/build.ts` (orchestrates Vite for client, esbuild for server)
- **Typecheck:** _Populate as you build_
- **Codegen:** _Populate as you build_
- **DB Push:** _Populate as you build_

**Required Environment Variables:**
- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET` (for authentication tokens)
- `SESSION_SECRET` (for legacy admin session)
- `FULL_CREW_THRESHOLD` (for gamification)

## Stack

- **Frontend:** React 18, TypeScript, Vite, Wouter, Tailwind CSS, shadcn/ui, Radix UI, Framer Motion, TanStack React Query
- **Backend:** Express 5, Node.js, TypeScript
- **ORM:** Drizzle ORM (for PostgreSQL)
- **Validation:** _Populate as you build_
- **Build Tool:** Vite (client), esbuild (server)
- **Database:** PostgreSQL
- **Authentication:** JWT (new portals), `express-session` (legacy `/admin`)

## Where things live

- **Client Source:** `client/src/`
- **Server Source:** `server/`
- **Shared Code:** `shared/`
- **Database Schema:** `shared/schema.ts`
- **Branding Configuration:** `shared/branding.ts`
- **UI Components:** `client/src/components/` (portal components in `client/src/components/portal/`)
- **File Uploads:** `./data/uploads/`
- **Public Site Pages:** (Intentionally not listed for open-source extraction prep, see Architecture Decisions)

## Architecture decisions

- **Modularized API Routes:** Backend API routes are organized by domain (e.g., `authentication`, `time tracking`, `kanban`).
- **Unified Login and Portal System:** A single `/login` page directs users to role-specific portals (Employee, Client, Student, Board Member).
- **Gamified Engagement:** Uses XP, stat tracks, and workday-aware streaks with Norse theming to encourage participation without leaderboards.
- **Open-Source Extraction Preparedness:** Codebase includes markers and practices to facilitate future stripping of marketing-specific content for an open-source fork.
- **Consistent Branding:** All internal UI elements and messaging consistently use "handləkraft" and a defined color palette, driven by a centralized branding configuration.

## Product

- **Public Website:** Scroll-based landing page with application forms for fellowships and client requests.
- **Admin Dashboard:** Manages application queues and user access.
- **Internal Portal System:**
    - **Employee Portal:** Dashboard, time tracking, Kanban boards (Longship Factory), expenses, client tickets, LMS.
    - **Client Portal:** Dashboard, file management, messaging, support tickets.
    - **Student Portal:** Dashboard, course access, file management, announcements.
    - **Board Portal:** Meeting management, documents, minutes, action items, communication, onboarding wizard.
- **Gamification Features:** XP progression, stat tracks (Focus, Initiative, Stewardship, Craft), streak system, anonymous Crew Bond mechanics, and daily Saga Recaps.
- **Accessibility Enhancements:** Reduced motion support for animations and sounds.

## User preferences

- **Preferred communication style:** Simple, everyday language.
- **Sound Preferences:** Users can control global sound mute and per-event sound opt-outs, persisted locally and server-side.
- **Saga Recap Preferences:** Users can enable/disable the daily Saga Recap and configure its display time.
- **Avatar Customization:** Users can customize their Norse-themed avatars, with elements unlocking based on XP rank.

## Gotchas

- **Legacy vs. New Auth:** Be aware of two authentication systems: session-based for `/admin` and JWTs for new portals.
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