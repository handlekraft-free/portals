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

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).
