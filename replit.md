# Overview

**Handlekraft Digital** (Norwegian: handle=to act, kraft=power — "the power to act") is a full-stack web application for an early-stage 501(c)(3) nonprofit that provides free custom software and websites to community organizations while training product-focused problem solvers who leverage AI tools. The site includes a scroll-based landing page, public application forms (fellowship and client "Request Free Help"), and an admin dashboard for managing application queues. Domain: handlekraft.ai.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework:** React 18 with TypeScript, built with Vite
- **Routing:** Wouter — routes: Home (`/`), Apply Fellowship (`/apply/fellowship`), Apply Client (`/apply/client`), Admin (`/admin`), 404
- **Styling:** Tailwind CSS with CSS variables for theming, using a warm civic-tech color palette (navy `#0B1D3A`, warm teal `#14B8A6`, cream `#FAF7F2`)
- **UI Components:** shadcn/ui (new-york style) with Radix UI primitives — full component library installed
- **Animations:** Framer Motion for scroll animations and hero effects
- **Fonts:** DM Serif Display (headings) and Outfit (body) via Google Fonts, referenced through CSS custom properties (`--font-display`, `--font-body`)
- **State Management:** TanStack React Query for API data fetching and mutations
- **Path Aliases:** `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **Logo:** Generated HK monogram logo at `client/src/assets/images/logo.png`, imported as a module in nav and footer components

## Backend
- **Runtime:** Express 5 on Node.js with TypeScript (via tsx)
- **Auth:** Session-based admin authentication using express-session + connect-pg-simple, bcryptjs for password hashing
- **API Routes:** Public form submissions (POST), admin login/logout, admin CRUD for both application queues (GET/PATCH with auth middleware)
- **Storage:** `DatabaseStorage` class in `server/storage.ts` with Drizzle ORM for all CRUD operations
- **Default Admin:** Seeded on startup (username: "admin", password: "handlekraft2026") — should be changed for production

## Database
- **ORM:** Drizzle ORM configured for PostgreSQL
- **Schema:** Located at `shared/schema.ts` — three tables: `fellowship_applications`, `client_applications`, `admin_users`
- **Session Store:** `connect-pg-simple` auto-creates session table in PostgreSQL
- **Migrations:** Output to `./migrations` directory via `drizzle-kit`
- **Connection:** Uses `DATABASE_URL` environment variable; server has a fallback so it doesn't crash if unset

## Build Process
- **Development:** `tsx server/index.ts` with Vite middleware for HMR
- **Production Build:** Custom `script/build.ts` that runs Vite build for client and esbuild for server, outputting to `dist/`
- **Server Bundle:** esbuild bundles server code into `dist/index.cjs`, externalizing most deps except an allowlist of common packages

## Key Design Decisions
1. **Full-stack application** — Express + React + PostgreSQL for landing page, public forms, and admin dashboard.
2. **Component library** — A complete shadcn/ui installation for rapid feature development.
3. **Single-page scroll design** — Homepage uses anchor links with smooth scrolling; separate routes for forms and admin.
4. **Branding:** "Handlekraft Digital" — Norwegian etymology (handle + kraft = the power to act). Warm, kind, techy but approachable. Father-son founding team. Accent color is warm teal (#14B8A6). Emails use @handlekraft.ai domain.
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
