# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each release also records the **upstream sync ref** — the commit or tag in the
internal handləkraft source that the release was synced from. See
[`UPSTREAM.md`](./UPSTREAM.md) for the sync workflow.

## [Unreleased]

### Added
- `NOTICE` file with copyright and AGPL summary
- `SECURITY.md` with vulnerability disclosure policy and hardening guidance
- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1)
- `.github/ISSUE_TEMPLATE/` (bug, feature, config) routing security and
  commercial-support questions to the right channels
- `.github/PULL_REQUEST_TEMPLATE.md` with portal/test/checklist sections
- `.github/workflows/ci.yml` running typecheck and verifying that
  `package.json` and `shared/version.ts` versions stay in sync
- `server/ai-briefing.example.md` — generic AI advisor briefing template
  that operators copy to `server/ai-briefing.local.md` and customize
- README sections: project status, what-it-is/isn't, screenshots
  placeholder, localization (Option A documented), roadmap/backlog,
  acknowledgments
- README badges (license, version, node, status)
- Logo replacement instructions in README

### Changed
- `client/src/components/wordmark.tsx` now reads tagline from
  `BRAND.tagline` (was hardcoded "The Power to Act")
- **License: MIT → AGPL-3.0-or-later** (LICENSE file was already AGPL;
  README + package.json + CONTRIBUTING now match)
- Renamed `client/src/assets/images/handlekraft-wordmark.png` →
  `wordmark.png`
- `client/index.html` meta/title replaced with generic Open Portals
  branding
- `server/routes-ai.ts` org context now reads from `BRAND` instead of
  hardcoded handlekraft strings; system prompts use `BRAND.fullName`
- AI briefing loader now tries `ai-briefing.local.md` first, falls back
  to `ai-briefing.example.md`
- `JWT_SECRET` dev fallbacks renamed from `handlekraft-dev-secret-...`
  to `open-portals-dev-secret-CHANGE-IN-PRODUCTION`
- `tsconfig.json` target bumped to ES2020 (fixes downlevelIteration
  errors)
- Stripped handlekraft-specific phrases from board onboarding seed text
  in `server/routes.ts`
- Comments in `client/src/lib/sounds.ts` and `client/src/index.css` made
  org-agnostic

### Removed
- `client/public/docs/handlekraft-tier{1,2}-training-plan.docx` —
  internal training plans that were exposed in the public static bundle
- `client/src/components/footer.tsx` — leftover marketing-site footer
  that referenced fellowship/donation/San Diego copy and was no longer
  imported anywhere
- `attached_assets/` directory (now gitignored) — contained internal
  strategic documents that should never have been in the OSS repo
- `server/ai-briefing.md` (now gitignored as `ai-briefing.local.md`) —
  was 36-occurrence org-specific AI prompt
- `server/replit_integrations/chat/` — dead code with broken schema
  references (5 TS errors fixed by removal)

### Fixed
- 18 → ~0 TypeScript errors via tsconfig target bump, dead-code removal,
  AbortError type cast in `replit_integrations/batch/utils.ts`, and
  adding `photoUrl`/`avatarUrl` to the local `BoardProfile` interface
- `server/routes-ai.ts` implicit-any annotations on map callbacks

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
- README, CONTRIBUTING.md, .env.example
- AGPL-3.0 LICENSE

### Removed
- All marketing pages, application/fellowship forms, donation flows
- `MARKETING_ONLY` schema block and related storage methods
- Legacy session-based admin auth

[Unreleased]: ../../compare/v0.1.0...HEAD
[0.1.0]: ../../releases/tag/v0.1.0
