# Open Portals

An open-source, full-stack TypeScript portal system for community organizations: an Employee portal (time tracking, Kanban, expenses, tickets, LMS), a Client portal (files, messaging, tickets), a Student portal (courses, files, announcements), and a Board portal (meetings, documents, minutes, action items). Includes optional gamification (XP, stat tracks, streaks, anonymous "crew bond" mechanics, daily recaps).

This repository is the open-source extraction of the internal handləkraft.ai portals. All marketing pages, application forms, and organization-specific copy have been removed; rebrand it for your org by editing `shared/branding.ts`.

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# edit .env and fill in DATABASE_URL + JWT_SECRET

# 3. Push the schema to your database
npm run db:push

# 4. Run
npm run dev
```

Open http://localhost:5000 and you'll be redirected to `/login`.

A default admin row is seeded the first time the server boots (username `admin`, password `<BRAND.nameAscii>2026` — change it in production).

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
