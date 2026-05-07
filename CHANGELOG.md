# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each release also records the **upstream sync ref** — the commit or tag in the
internal handləkraft source that the release was synced from. See
[`UPSTREAM.md`](./UPSTREAM.md) for the sync workflow.

## [Unreleased]

_Track in-progress changes here._

## [0.1.0] — 2026-05-07

**Upstream ref:** `initial-extraction`

Initial open-source release, extracted from the internal handləkraft.ai
portal system.

### Added
- Employee, Client, Student, and Board portals with shared auth
- `ENABLED_PORTALS` env var + `/api/public/portals` endpoint to choose
  which portals are exposed in a deployment (defense-in-depth: hidden
  from login UI, route modules unmounted, role activation rejected,
  stale tokens invalidated)
- Centralized `BRAND` config in `shared/branding.ts` for one-file rebrand
- `VERSION` + `UPSTREAM_REF` constants in `shared/version.ts`
- Norse-themed gamification (XP, stat tracks, streaks, Crew Bond)
- README, CONTRIBUTING.md, .env.example, MIT LICENSE

### Removed
- All marketing pages, application/fellowship forms, donation flows
- `MARKETING_ONLY` schema block and related storage methods
- Legacy session-based admin auth (`express-session`,
  `connect-pg-simple`, `requireAdminSession`)
- Organization-specific copy from `BRAND` (replaced with placeholders)

### Known issues
- 18 pre-existing TypeScript errors in `server/routes-ai.ts` and
  `server/replit_integrations/*` — tracked for future cleanup
- All UI strings are English-only; no i18n infrastructure yet
- `client/index.html` still contains hardcoded brand metadata
- `server/ai-briefing.md` contains org-specific content (will be
  templatized in a future release)

[Unreleased]: ../../compare/v0.1.0...HEAD
[0.1.0]: ../../releases/tag/v0.1.0
