# Overview

**handləkraft** (Norwegian: handle=to act, kraft=power — "the power to act") is a full-stack web application for an early-stage 501(c)(3) nonprofit that provides free custom software and websites to community organizations while training product-focused problem solvers who leverage AI tools. The site includes a scroll-based landing page, public application forms (fellowship and client "Request Free Help"), an admin dashboard for managing application queues, and a full internal portal system with Employee, Client, and Student portals. Domain: handlekraft.ai.

Brand name is always rendered "handləkraft" with Unicode schwa ə in all visible UI presentations. URLs and alt text use plain "handlekraft".

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework:** React 18 with TypeScript, built with Vite
- **Routing:** Wouter — routes: Home (`/`), Apply Fellowship (`/apply/fellowship`), Apply Client (`/apply/client`), Admin (`/admin`), Login (`/login`), Employee Portal (`/portal/employee/*`), Client Portal (`/portal/client/*`), Student Portal (`/portal/student/*`), Admin Portal (`/portal/admin/*`), 404
- **Styling:** Tailwind CSS with CSS variables for theming, using a teal/gold/slate color palette (charcoal slate `#1A1F2B`, deep teal `#0D7377`, warm gold `#D4A843`, off-white `#F5F3EF`)
- **UI Components:** shadcn/ui (new-york style) with Radix UI primitives — full component library installed
- **Animations:** Framer Motion for scroll animations and hero effects
- **Fonts:** DM Serif Display (headings) and Outfit (body) via Google Fonts, referenced through CSS custom properties (`--font-display`, `--font-body`)
- **State Management:** TanStack React Query for API data fetching and mutations
- **Path Aliases:** `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **Logo:** Generated HK monogram logo at `client/src/assets/images/logo.png`, imported as a module in nav and footer components

## Backend
- **Runtime:** Express 5 on Node.js with TypeScript (via tsx)
- **Auth (Legacy /admin):** Session-based using express-session + connect-pg-simple for the original /admin queue panel
- **Auth (New Portals):** JWT stored in httpOnly cookie `hk_token` via `jsonwebtoken` + `bcryptjs`; middleware in `server/auth-middleware.ts`
- **Portal API Routes:** Modular route files for each domain:
  - `routes-auth.ts` — POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
  - `routes-time.ts` — Time tracking CRUD, timer start/stop, weekly summaries
  - `routes-kanban.ts` — Kanban boards/columns/cards/comments/teams
  - `routes-expenses.ts` — Expense reports/items, QB IIF export, approval workflow
  - `routes-client-portal.ts` — Client files, messages, support tickets (client + employee views)
  - `routes-student.ts` — Student courses, files, announcements, progress tracking
  - `routes-lms.ts` — LMS course management, module/lesson builder, student enrollment
  - `routes-user-mgmt.ts` — Admin portal user CRUD, bulk actions, CSV export
- **Storage:** `DatabaseStorage` class in `server/storage.ts` with Drizzle ORM for public form CRUD
- **Portal Users Seeded:** admin@handlekraft.ai/Admin1234!, employee1@handlekraft.ai/Employee1!, employee2@handlekraft.ai/Employee1!, client1@handlekraft.ai/Client123!, student1@handlekraft.ai/Student1!
- **Legacy Admin:** username "admin", password "handlekraft2026" for /admin session panel

## Portal System
- **Login page:** `/login` — role selector (Team Member / Client / Student), then email+password form
- **Employee Portal:** `/portal/employee/*` — Dashboard, Time Tracking, Kanban Boards, Expenses, Client Tickets, LMS Course Management; sidebar layout; admin role sees extra "Portal Users" nav item
- **Client Portal:** `/portal/client/*` — Dashboard, Files, Messages, Support Tickets; top nav layout; isolated to own data
- **Student Portal:** `/portal/student/*` — Dashboard, My Courses, Files, Announcements; top nav with purple gradient; isolated to enrolled courses
- **Admin Portal Users:** `/portal/admin/users` — Full user management table (visible only to admin role)
- **Portal Components:** `client/src/components/portal/` — EmployeeLayout, ClientLayout, StudentLayout, PortalGuard
- **Auth State:** `client/src/context/AuthContext.tsx` — React context provider wrapping entire app
- **Auth Helpers:** `client/src/lib/auth.ts` — getCurrentUser, login, logout, getPortalPath, apiRequest
- **File Uploads:** Stored in `./data/uploads/` (client-files, student-files, lms-files subdirs); served via authenticated download endpoints

## Database
- **ORM:** Drizzle ORM configured for PostgreSQL
- **Schema:** Located at `shared/schema.ts` — 3 original tables + 27 new portal tables (portal_users, projects, time_entries, kanban_boards/columns/cards, expense_reports/items/categories, client_files, messages, support_tickets, courses, course_modules/lessons, course_enrollments, announcements, etc.)
- **Session Store:** `connect-pg-simple` auto-creates session table in PostgreSQL
- **Connection:** Uses `DATABASE_URL` environment variable

## Build Process
- **Development:** `tsx server/index.ts` with Vite middleware for HMR
- **Production Build:** Custom `script/build.ts` that runs Vite build for client and esbuild for server, outputting to `dist/`
- **Server Bundle:** esbuild bundles server code into `dist/index.cjs`, externalizing most deps except an allowlist of common packages

## Key Design Decisions
1. **Full-stack application** — Express + React + PostgreSQL for landing page, public forms, and admin dashboard.
2. **Component library** — A complete shadcn/ui installation for rapid feature development.
3. **Single-page scroll design** — Homepage uses anchor links with smooth scrolling; separate routes for forms and admin.
4. **Branding:** "Handlekraft Digital" — Norwegian etymology (handle + kraft = the power to act). Warm, kind, techy but approachable. Father-son founding team. Primary color is deep teal (#0D7377), accent is warm gold (#D4A843), dark base is charcoal slate (#1A1F2B), light surface is off-white (#F5F3EF). Emails use @handlekraft.ai domain.
5. **Product-focused training** — Fellows own products end-to-end while AI agents handle deep technical implementation.

# External Dependencies

- **PostgreSQL** — Required via `DATABASE_URL` environment variable (Drizzle ORM + node-postgres)
- **Google Fonts** — DM Serif Display and Outfit loaded via CDN in `index.css`
- **External Textures** — Transparent Textures pattern used in hero background (`transparenttextures.com`)
- **Replit Plugins** — `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, and `@replit/vite-plugin-dev-banner` for development on Replit
- **PDF Asset** — Generated via `scripts/generate-proposal.mjs` using pdfkit, saved to `client/public/proposal.pdf`
- **pdfkit** — Node.js PDF generation library used for proposal document

# Recent Changes
- Rebranded from "The Buddy Promise" to "Handlekraft Digital" with Norwegian etymology messaging
- All copy reframed around "agency" and "the power to act" instead of "buddy" language
- Updated all email addresses from @thebuddypromise.org to @handlekraft.ai
- Generated new HK monogram logo
- Updated CTAs: "Get a Buddy" → "Request Free Help"
- Regenerated PDF proposal with Handlekraft branding and messaging
- Updated admin password from "buddypromise2026" to "handlekraft2026"
- Added database schema for fellowship_applications, client_applications, admin_users
- Built public fellowship application form at /apply/fellowship
- Built public client application form ("Request Free Help") at /apply/client
- Built admin dashboard at /admin with login, two queue tabs (fellowship and client), rating/priority/status management
- Added CTA buttons on homepage linking to both application forms
- Added Wordmark component with Unicode schwa (ə) rendering "handləkraft" with optional "THE POWER TO ACT" tagline
- Shifted color palette from navy/warm teal to charcoal slate (#1A1F2B) / deep teal (#0D7377) / warm gold (#D4A843) / off-white (#F5F3EF)
- Regenerated HK monogram logo with updated teal/gold palette
- Updated all CSS variables, component colors, and utility classes to new palette
- Gold used for hero accents, tagline, stats, nav CTA, step numbers; teal used for primary buttons, checkmarks, card accents
- Built full internal portal system with three portals (Employee, Client, Student) + Admin user management
- Added JWT-based auth system for portals (httpOnly cookie hk_token, separate from legacy /admin session auth)
- Created 27 new database tables for portal system: portal_users, projects, time entries, kanban boards/columns/cards, expense reports, client files, messages, support tickets, courses, modules, lessons, enrollments, announcements, etc.
- Added Login button to public nav (outline style, links to /login)
- Created /login page with animated role selector (Team Member / Client / Student)
- Employee portal: Dashboard with live timer, Time Tracking page with entry management, Kanban boards with drag-and-drop (@hello-pangea/dnd), Expense reports with QB IIF export, Client tickets queue, LMS course management
- Client portal: Dashboard with stats, File sharing (upload/download), Messages inbox/compose, Support ticket creation and thread view
- Student portal: Dashboard with enrolled courses, Course viewer with lesson progress, File management, Announcements feed
- Admin portal: Full user management table (/portal/admin/users) with create/edit/deactivate/bulk actions
- Seeded 5 portal users + sample data (boards, time entries, expense reports, tickets, courses, announcements)
