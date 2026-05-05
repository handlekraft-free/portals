import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { CrewBond } from "@/lib/auth";

// Listens for crew:bond events dispatched by apiRequest and surfaces a quiet toast.
// No XP, no leaderboard — just acknowledges the partnership.
export function CrewBondToaster() {
  const { toast } = useToast();
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ bonds: CrewBond[] }>).detail;
      if (!detail?.bonds?.length) return;
      for (const b of detail.bonds) {
        toast({
          title: "⚓ Crew Bond",
          description: `You shipped a review with ${b.partnerFirstName}.`,
        });
      }
    }
    window.addEventListener("crew:bond", handler as EventListener);
    return () => window.removeEventListener("crew:bond", handler as EventListener);
  }, [toast]);
  return null;
}
