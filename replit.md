# Overview

**Code for Communities** (originally "CodeForward") is a single-page marketing website for an early-stage 501(c)(3) nonprofit that provides free bespoke software and web design to community organizations while training the next generation of developers. The site is a scroll-based landing page with sections for mission, services, training program, and donor engagement. It also hosts a downloadable PDF proposal.

Despite having a full-stack template structure (Express backend, PostgreSQL via Drizzle), this is fundamentally a **static marketing site** — the backend serves the frontend with no meaningful API routes, and the database schema is a placeholder dummy table.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework:** React 18 with TypeScript, built with Vite
- **Routing:** Wouter (lightweight client-side router) — only two routes: Home (`/`) and a 404 page
- **Styling:** Tailwind CSS with CSS variables for theming, using a civic-tech color palette (navy `#0B1D3A`, teal `#0EA5E9`, cream `#FAF7F2`)
- **UI Components:** shadcn/ui (new-york style) with Radix UI primitives — full component library installed
- **Animations:** Framer Motion for scroll animations and hero effects
- **Fonts:** DM Serif Display (headings) and Outfit (body) via Google Fonts, referenced through CSS custom properties (`--font-display`, `--font-body`)
- **State Management:** TanStack React Query is installed but barely used since there are no real API calls
- **Path Aliases:** `@/` maps to `client/src/`, `@shared/` maps to `shared/`

## Backend
- **Runtime:** Express 5 on Node.js with TypeScript (via tsx)
- **Purpose:** Serves the built frontend in production; runs Vite dev server in development
- **API Routes:** None — `server/routes.ts` is empty; the server just serves static files
- **Storage:** `MemStorage` class in `server/storage.ts` is an empty shell with no methods

## Database
- **ORM:** Drizzle ORM configured for PostgreSQL
- **Schema:** Located at `shared/schema.ts` — contains only a dummy table placeholder
- **Migrations:** Output to `./migrations` directory via `drizzle-kit`
- **Connection:** Uses `DATABASE_URL` environment variable; server has a fallback so it doesn't crash if unset
- **Note:** The database is not actually needed for the current static site functionality. It's part of the template and may be used for future features (contact forms, donation tracking, etc.)

## Build Process
- **Development:** `tsx server/index.ts` with Vite middleware for HMR
- **Production Build:** Custom `script/build.ts` that runs Vite build for client and esbuild for server, outputting to `dist/`
- **Server Bundle:** esbuild bundles server code into `dist/index.cjs`, externalizing most deps except an allowlist of common packages

## Key Design Decisions
1. **Full-stack template for a static site** — The project uses a full Express + React + PostgreSQL template even though it's currently just a landing page. This allows easy expansion to add features like contact forms, donation processing, or admin dashboards later.
2. **Component library overkill** — A complete shadcn/ui installation exists with 40+ components, most unused. This is intentional for rapid feature development.
3. **Single-page scroll design** — Navigation uses anchor links (`#mission`, `#what-we-do`, etc.) with smooth scrolling rather than separate routes.

# External Dependencies

- **PostgreSQL** — Required via `DATABASE_URL` environment variable (Drizzle ORM + node-postgres), though not actively used
- **Google Fonts** — DM Serif Display and Outfit loaded via CDN in `index.css`
- **External Textures** — Transparent Textures pattern used in hero background (`transparenttextures.com`)
- **Replit Plugins** — `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, and `@replit/vite-plugin-dev-banner` for development on Replit
- **PDF Asset** — The site references `/proposal.pdf` which should be placed in the public directory as a downloadable document