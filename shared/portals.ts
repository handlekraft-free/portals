/**
 * Portal module selector.
 *
 * Operators choose which portals are exposed in their fork by setting
 * `ENABLED_PORTALS` (server) and/or relying on the public `/api/public/portals`
 * endpoint (client). The `admin` portal is always enabled — disabling it would
 * leave the deployment with no way to manage users.
 *
 * Examples:
 *   ENABLED_PORTALS=board                       # board-only deployment
 *   ENABLED_PORTALS=employee,client             # services org without students
 *   (unset)                                     # all four portals enabled
 */
export const ALL_PORTALS = ["employee", "client", "student", "board"] as const;
export type PortalKey = (typeof ALL_PORTALS)[number];

const PORTAL_SET: ReadonlySet<string> = new Set(ALL_PORTALS);

/** Pure parser. `raw` is the raw env string (or undefined). Returns the canonical enabled list. */
export function parseEnabledPortals(raw: string | undefined | null): PortalKey[] {
  if (!raw) return [...ALL_PORTALS];
  const picked = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is PortalKey => PORTAL_SET.has(s));
  // Preserve canonical ordering, dedupe.
  return ALL_PORTALS.filter((p) => picked.includes(p));
}
