# Open Portals

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](./CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-20.x-brightgreen.svg)](#prerequisites)
[![Status: beta](https://img.shields.io/badge/status-beta-yellow.svg)](#project-status)

An open-source, full-stack TypeScript portal system for community organizations:

- **Employee portal** — time tracking, Kanban, expenses, tickets, LMS
- **Client portal** — files, messaging, tickets
- **Student portal** — courses, files, announcements
- **Board portal** — meetings, documents, minutes, action items, onboarding
- **Optional gamification** — XP, stat tracks, streaks, anonymous "crew bond" mechanics, daily recaps (Norse-themed; can be disabled)

This repository is the open-source extraction of the internal handləkraft.ai portals. All marketing pages, application forms, and organization-specific copy have been removed; rebrand it for your org by editing `shared/branding.ts`.

## Project status

**Beta — v0.1.0.** The portals work end-to-end and are derived from a production codebase, but the OSS API surface and branding hooks may change before v1.0. Pin to a specific release if you depend on stability.

## What this is and isn't

**Open Portals is:**

- A self-hostable internal toolkit for organizations that need multiple
  audience-specific portals (staff, clients, students, board) sharing one
  auth and one admin
- Opinionated about Postgres + JWT + React + Tailwind — no abstractions to
  swap them out
- Designed to be rebranded by editing one file (`shared/branding.ts`)

**Open Portals is not:**

- A CRM, ATS, or fundraising/donor management system
- A public marketing-website CMS (intentionally stripped from this fork)
- A SaaS — you self-host or pay the maintainers to manage it for you
- Multilingual yet (see [Localization](#localization) — English-only today,
  PRs welcome)

## Screenshots

_Coming soon — placeholder. Help wanted: see [issue tracker](../../issues) for the screenshot capture issue._

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

On first boot the server seeds a default admin user:

| Username | Default password                              |
| -------- | --------------------------------------------- |
| `admin`  | `<BRAND.nameAscii>2026` (e.g. `yourorg2026`)  |

**Change the admin password immediately in any non-local environment.** You can do this from the Admin → Users page once logged in.

### Choosing which portals to enable

This fork ships four portals: **Employee**, **Client**, **Student**, and **Board**. Enable any subset via the `ENABLED_PORTALS` env var:

```bash
ENABLED_PORTALS=board                       # board-only deployment
ENABLED_PORTALS=employee,client             # services org without students
ENABLED_PORTALS=employee,client,student,board   # all four (default)
```

Disabled portals are hidden from the login screen, their API routes are not mounted (404), and the login endpoint refuses to issue tokens for disabled roles. The `admin` role is always enabled.

The frontend reads the list from `GET /api/public/portals`, so toggling only requires a server restart, not a rebuild.

### Demo data

The server **does not** auto-seed demo content on startup. A first start against a fresh database produces an empty schema and no login accounts. To get a working demo (and to log in for the first time), run the seed script. **Local only — do not run against production.**

```bash
# Wipe all user/runtime data, then seed a small generic demo set
tsx scripts/seed.ts --reset

# Or, idempotently insert any missing demo rows without wiping
tsx scripts/seed.ts
```

The script preserves the schema and `app_settings`, then seeds:

- 1 admin + 1 user per portal (employee, client, student, board) on the `BRAND.domain` email domain
- 1 sample project, 3 charge codes, 3 expense categories, 1 sample time entry
- 1 kanban board ("Team Board") with **To Do / In Progress / Done** columns and 3 sample cards
- 1 client support ticket and 1 client message
- 1 short course ("Getting Started") with 1 module, 2 lessons, the demo student enrolled, and 1 announcement
- 1 upcoming board meeting (with agenda), 1 placeholder document, 1 action item, 3 generic onboarding items
- 2 chat channels (`general`, `announcements`) each with a welcome message

Demo passwords are printed at the end of the run. Change them (or re-seed with edited values) before exposing the deployment.

### File uploads

Uploads land in `./data/uploads/` by default (configurable via `UPLOAD_DIR`). The directory is created automatically.

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
  ai-briefing.example.md   Generic AI advisor system prompt template
shared/            Code shared by client + server
  schema.ts          Drizzle schema (source of truth for DB)
  branding.ts        Org name / domain / contact (edit to rebrand)
  version.ts         Semver + upstream sync ref
  xp.ts              Gamification rules
script/build.ts    Build orchestration
data/uploads/      Local file uploads (dev)
.github/           Issue/PR templates + CI workflow
```

## Rebranding

Edit `shared/branding.ts` and replace the placeholder `BRAND` constants. Every UI surface that shows the org name reads from this file.

### Replacing the logo

The login screen and headers use `client/src/assets/images/logo.png` (square logo) and `wordmark.png` (horizontal text logo). Replace those two files with your own (same filenames, same approximate aspect ratios) and you're done.

For the favicon: drop a `favicon.png` into `client/public/`.

### Customizing the AI advisor (optional)

If you use the AI features, copy `server/ai-briefing.example.md` to `server/ai-briefing.local.md` and edit it with your organization's context, mission, and communication norms. The `.local.md` file is gitignored so your customizations stay out of the OSS repo.

## Versioning & upstream sync

Semantic Versioning starting at **0.1.0**. Single source of truth: [`shared/version.ts`](./shared/version.ts) (mirrored in `package.json`; CI enforces they match). Displayed in the login footer and exposed at `GET /api/public/version`:

```bash
curl https://your-deployment/api/public/version
# → {"success":true,"data":{"version":"0.1.0","upstreamRef":"initial-extraction"}}
```

This fork is downstream of an internal codebase. Each release records an `UPSTREAM_REF` so changes can be ported in either direction with full traceability. See [`UPSTREAM.md`](./UPSTREAM.md) for the sync workflow and [`CHANGELOG.md`](./CHANGELOG.md) for release history.

## Localization

**Currently English-only.** All UI strings are inline in JSX in `client/src/**/*.tsx`. Server error messages are also English-only.

To run the portals in another language **today**, fork the repo and find/replace the strings — they're discoverable with `rg '"[A-Z][a-z]'` in `client/src/`. This is "Option A" localization: minimal infrastructure, divergent forks.

Proper i18n (string extraction to JSON catalogs, `react-i18next`, `Accept-Language` server negotiation, language switcher) is on the [roadmap](#roadmap) — contributions welcome.

## Roadmap / backlog

Items deferred from the v0.1 OSS release, ordered roughly by priority:

- [ ] **Add screenshots to README** (login, employee dashboard, board portal)
- [ ] **Proper i18n infrastructure** — `react-i18next` + locale catalogs (Option B from the OSS audit)
- [ ] **Theme-pack abstraction** — separate Norse-themed strings ("Saga", "Longship Factory", "Crew Bond") from generic terms so forks can swap themes without code changes
- [ ] **Color-token migration** — replace hardcoded hex colors in components with Tailwind theme tokens
- [ ] **Avatar asset replacement** — eight `viking-*.png` files are Norse-themed; provide a generic alternate set
- [ ] **GitHub Discussions enablement** + populate first FAQ entries
- [ ] **Hosted demo** — public sandbox with seed data so prospective users can try before installing
- [ ] **Plugin / extension API** for adding custom portal modules without forking
- [ ] **Email notifications** — currently no SMTP integration
- [ ] **SSO / SAML** — for enterprise deployments
- [ ] **RTL support** in Tailwind config

If any of these matter to your deployment, the maintainers offer paid feature work — see [SUPPORT.md](./SUPPORT.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). New contributors welcome — issues tagged `good first issue` are a good entry point.

By contributing, you agree your contributions will be licensed under the AGPL-3.0-or-later (see [License](#license)).

## Support

- **Community support** (free, best-effort): [open a GitHub issue](../../issues/new/choose) or start a [discussion](../../discussions).
- **Commercial support, deployment, rebranding, custom features, and SLAs** are offered by the maintainers (handləkraft.ai). Contact **robert@handlekraft.ai**.
- **Security vulnerabilities**: see [SECURITY.md](./SECURITY.md) — please email **robert@handlekraft.ai** rather than opening a public issue.

See [SUPPORT.md](./SUPPORT.md) for full details on what each channel covers.

## Acknowledgments

- Originally extracted from the internal **handləkraft.ai** portal system. Maintained by the same team that built it.
- Built on the shoulders of: [shadcn/ui](https://ui.shadcn.com/), [Drizzle ORM](https://orm.drizzle.team/), [TanStack Query](https://tanstack.com/query/latest), [Radix UI](https://www.radix-ui.com/), [Lucide](https://lucide.dev/), and the [Contributor Covenant](https://www.contributor-covenant.org/).

## License

**GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)** — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).

The AGPL means: you can use, modify, and redistribute this software, but if you run a modified version as a network service, you must publish your modifications under the same license. If you need a different license for a commercial deployment, contact **robert@handlekraft.ai**.
