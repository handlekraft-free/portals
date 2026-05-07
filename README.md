# Open Portals

An open-source, full-stack TypeScript portal system for community organizations: an Employee portal (time tracking, Kanban, expenses, tickets, LMS), a Client portal (files, messaging, tickets), a Student portal (courses, files, announcements), and a Board portal (meetings, documents, minutes, action items). Includes optional gamification (XP, stat tracks, streaks, anonymous "crew bond" mechanics, daily recaps).

This repository is the open-source extraction of the internal handləkraft.ai portals. All marketing pages, application forms, and organization-specific copy have been removed; rebrand it for your org by editing `shared/branding.ts`.

## Prerequisites

- **Node.js 20.x** and npm
- **PostgreSQL 14+** running and reachable

> Running on Replit? The `.replit` file already declares Node 20 and provisions Postgres for you — just import the repo and click **Run**.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Create a database (skip if you already have one)
createdb openportals
# …or, in psql:  CREATE DATABASE openportals;

# 3. Configure environment
cp .env.example .env
# Edit .env: fill in DATABASE_URL (required) and JWT_SECRET (required).
# Optional: ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID/SECRET (only if you want
# AI features or Google integration).

# 4. Push the schema to your database
npm run db:push

# 5. Run the dev server
npm run dev
```

Open http://localhost:5000 and you'll be redirected to `/login`.

### First login

On first boot the server seeds a default admin user **and** a sample board user:

| Username        | Default password                       |
| --------------- | -------------------------------------- |
| `admin`         | `<BRAND.nameAscii>2026` (e.g. `yourorg2026`) |

**Change the admin password immediately in any non-local environment.** You can do this from the Admin → Users page once logged in.

### Choosing which portals to enable

This fork ships four portals: **Employee**, **Client**, **Student**, and **Board**. You can enable any subset by setting the `ENABLED_PORTALS` env var:

```bash
# Board-only deployment
ENABLED_PORTALS=board

# Services org without a student program
ENABLED_PORTALS=employee,client

# All four (this is also the default if the var is unset)
ENABLED_PORTALS=employee,client,student,board
```

Disabled portals are hidden from the login screen and their API routes are not mounted at all (requests return 404). The login endpoint also refuses to issue tokens for disabled roles, so it's safe defense-in-depth. The `admin` role is always enabled — it's how you manage users.

The frontend reads the enabled list from `GET /api/public/portals`, so toggling `ENABLED_PORTALS` only requires a server restart, not a rebuild.

### File uploads

Uploads land in `./data/uploads/` by default (configurable via `UPLOAD_DIR`). The directory is created automatically on first boot.

## Scripts

| Command           | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the dev server (Express + Vite)         |
| `npm run build`   | Production build (Vite client + esbuild srv) |
| `npm start`       | Run the built server                          |
| `npm run check`   | TypeScript type-check                         |
| `npm run db:push` | Apply `shared/schema.ts` to the database     |

## Stack

- **Frontend:** React 18, TypeScript, Vite, Wouter, Tailwind CSS, shadcn/ui, Radix UI, Framer Motion, TanStack React Query
- **Backend:** Express 5, Node.js, TypeScript
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** JWT (portal users)

## Repo layout

```
client/src/        React app (pages, components, context, hooks)
server/            Express API (routes split per domain)
shared/            Code shared by client + server
  schema.ts          Drizzle schema (source of truth for DB)
  branding.ts        Org name / domain / contact (edit to rebrand)
  xp.ts              Gamification rules
script/build.ts    Build orchestration
data/uploads/      Local file uploads (dev)
```

## Rebranding

Edit `shared/branding.ts` and replace the placeholder `BRAND` constants. Every UI surface that shows the org name reads from this file.

## Versioning & upstream sync

This project is versioned with [Semantic Versioning](https://semver.org/) starting at **0.1.0**. The version is the single source of truth in [`shared/version.ts`](./shared/version.ts) (mirrored in `package.json`) and is displayed in the login footer.

It's also exposed at runtime:

```bash
curl https://your-deployment/api/public/version
# → {"success":true,"data":{"version":"0.1.0","upstreamRef":"initial-extraction"}}
```

This fork is downstream of an internal codebase. Each release records an `UPSTREAM_REF` so changes can be ported in either direction with full traceability. See [`UPSTREAM.md`](./UPSTREAM.md) for the sync workflow and [`CHANGELOG.md`](./CHANGELOG.md) for release history.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).
