import { parseEnabledPortals, type PortalKey, ALL_PORTALS } from "@shared/portals";

export const ENABLED_PORTALS: ReadonlyArray<PortalKey> = parseEnabledPortals(
  process.env.ENABLED_PORTALS,
);

const enabledSet = new Set<PortalKey>(ENABLED_PORTALS);

export function isPortalEnabled(key: PortalKey): boolean {
  return enabledSet.has(key);
}

/** Roles that can never be disabled (admin always available). */
export const ALWAYS_ENABLED_ROLES = ["admin"] as const;

export function isRoleEnabled(role: string): boolean {
  if ((ALWAYS_ENABLED_ROLES as readonly string[]).includes(role)) return true;
  return (ENABLED_PORTALS as readonly string[]).includes(role);
}

if (ENABLED_PORTALS.length < ALL_PORTALS.length) {
  const disabled = ALL_PORTALS.filter((p) => !enabledSet.has(p));
  console.log(
    `[portals] Enabled: ${ENABLED_PORTALS.join(", ")} (disabled: ${disabled.join(", ")})`,
  );
}
