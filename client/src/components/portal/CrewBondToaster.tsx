import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, type CrewBond } from "@/lib/auth";

// Listens for crew:bond events dispatched by apiRequest (actor's path) AND
// polls /api/crew/bonds/pending so the *recipient* (assignee whose card was
// reviewed by someone else) also sees a quiet "Crew Bond" toast.
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

  // Recipient delivery — poll for queued bonds and emit local toasts.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await apiRequest<CrewBond[]>("GET", "/api/crew/bonds/pending");
        if (cancelled || !res.success || !Array.isArray(res.data) || res.data.length === 0) return;
        for (const b of res.data) {
          toast({
            title: "⚓ Crew Bond",
            description: `${b.partnerFirstName} shipped a review of your work.`,
          });
        }
      } catch {}
    }
    poll();
    const id = setInterval(poll, 30_000);
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [toast]);

  return null;
}
