/**
 * Single source of truth for the app version, exposed to both client and
 * server. Surfaced in the UI footer and in the `/api/public/version`
 * endpoint so deployments (and ops dashboards) can confirm what's running.
 *
 * ## Versioning policy
 *
 * - This file uses **Semantic Versioning** (https://semver.org/) for the
 *   public, open-source release line. Bump as follows:
 *     - PATCH: bug fixes, no behavior change for forks
 *     - MINOR: new features, backward-compatible schema additions
 *     - MAJOR: breaking schema/API/branding contract changes
 *
 * - This project is downstream of an internal handləkraft codebase. To make
 *   it possible to merge fixes upstream→downstream (or downstream→upstream)
 *   we record an `upstreamRef` alongside the semver. When you port a batch
 *   of internal changes into this fork, update BOTH:
 *     1. Bump `version` per semver above
 *     2. Update `upstreamRef` to the internal commit/tag the port was
 *        synced from
 *     3. Add a CHANGELOG.md entry that references the upstream commit
 *
 * - Keep `version` here in sync with `package.json` (`"version"`). The
 *   release script (or a pre-commit hook) can enforce this.
 */
export const VERSION = "0.1.0" as const;

/**
 * The internal-source commit (or tag) this OSS release was synced from.
 * Use a short SHA, an internal version tag (e.g. "internal-2026.05.07"),
 * or `"initial-extraction"` for the first cut. Set to `null` only if this
 * fork has fully diverged and upstream sync is no longer tracked.
 */
export const UPSTREAM_REF: string | null = "initial-extraction";
