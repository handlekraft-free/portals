# Upstream sync workflow

This repository is the open-source extraction of an internal portal system.
Changes flow in **both directions**:

- **Upstream → here**: bug fixes and features built in the internal repo
  that are portable get periodically synced into this OSS fork.
- **Here → upstream**: contributions from external contributors that the
  internal team accepts get merged back into the internal codebase.

To make these syncs traceable, every OSS release records an `UPSTREAM_REF`
in [`shared/version.ts`](./shared/version.ts) and in [`CHANGELOG.md`](./CHANGELOG.md).

## What `UPSTREAM_REF` means

It's the internal-source commit (or tag) that this OSS release was synced
from. Examples of valid values:

- `initial-extraction` — the very first cut, before any sync has happened
- `internal-2026.05.07` — an internal release tag
- `a1b2c3d` — a short commit SHA from the internal repo
- `null` — this fork has fully diverged; no further syncs planned

## How to do an upstream-to-here sync

1. **Identify the internal commits to port.** Cherry-pick or rebase only
   changes that are organization-agnostic. Anything specific to a
   deploying org belongs behind `BRAND` / `ENABLED_PORTALS` / a config
   table — not hard-coded.

2. **Apply the changes** to this repo. Resolve conflicts manually;
   prioritize the OSS structure (no marketing pages, no MARKETING_ONLY
   schema, no internal branding).

3. **Bump the version** in BOTH places:
   - [`package.json`](./package.json) → `"version"`
   - [`shared/version.ts`](./shared/version.ts) → `VERSION`

   Use semver:
   - **PATCH** (`0.1.0` → `0.1.1`): bug fixes only
   - **MINOR** (`0.1.0` → `0.2.0`): new features, backward-compatible
   - **MAJOR** (`0.1.0` → `1.0.0`): breaking schema/API/branding changes

4. **Update `UPSTREAM_REF`** in [`shared/version.ts`](./shared/version.ts)
   to the latest internal commit/tag included in this sync.

5. **Add a `CHANGELOG.md` entry** under `## [Unreleased]` describing what
   changed, then on release move it under a new `## [x.y.z]` heading with
   the date and `**Upstream ref:** <ref>` line.

6. **Tag the release** in git: `git tag v0.2.0 && git push --tags`.

## How to do a here-to-upstream sync (if you maintain the internal repo)

1. Identify external PRs / commits to bring back internally.
2. Cherry-pick them onto an internal branch. Re-apply any internal-only
   modifications (marketing surfaces, organization branding, etc.).
3. Note the OSS version they came from in your internal commit message
   (e.g. `Sync from open-portals v0.2.0`).

## Verifying what's running

The deployed app exposes its version at `GET /api/public/version`:

```json
{
  "success": true,
  "data": { "version": "0.1.0", "upstreamRef": "initial-extraction" }
}
```

The version also appears in the footer of the login screen.
