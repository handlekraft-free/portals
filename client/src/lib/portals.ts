import { useQuery } from "@tanstack/react-query";
import { ALL_PORTALS, type PortalKey } from "@shared/portals";

type PortalsConfig = { enabled: PortalKey[] };

/**
 * Fetches the set of portals the server has enabled. Falls back to all four
 * while loading or if the request fails (so the login page is never empty
 * during a transient hiccup).
 */
export function useEnabledPortals(): { enabled: PortalKey[]; isLoading: boolean } {
  const { data, isLoading } = useQuery<{ success: boolean; data: PortalsConfig }>({
    queryKey: ["/api/public/portals"],
    staleTime: 5 * 60 * 1000,
  });
  return {
    enabled: data?.data?.enabled ?? [...ALL_PORTALS],
    isLoading,
  };
}
