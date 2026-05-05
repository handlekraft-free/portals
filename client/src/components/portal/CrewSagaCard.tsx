import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { ScrollText, X, EyeOff } from "lucide-react";

type Saga = {
  weekKey: string;
  narrative: string | null;
  optOut: boolean;
  available: boolean;
};

export function CrewSagaCard() {
  const { user } = useAuth();
  const [saga, setSaga] = useState<Saga | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [togglingOptOut, setTogglingOptOut] = useState(false);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
    apiRequest<Saga>("GET", `/api/crew/saga?tz=${encodeURIComponent(tz)}`).then(res => {
      if (res.success) setSaga(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!saga) return;
    setDismissed(localStorage.getItem(`crewSagaDismissed:${saga.weekKey}`) === "1");
  }, [saga?.weekKey]);

  if (!saga || !saga.available || !saga.narrative || saga.optOut || dismissed) return null;

  // Manager = admin OR canApprove flag — matches server-side check.
  const isManager = user?.role === "admin" || (user as unknown as { canApprove?: boolean })?.canApprove === true;

  function dismiss() {
    if (!saga) return;
    localStorage.setItem(`crewSagaDismissed:${saga.weekKey}`, "1");
    setDismissed(true);
  }

  async function optOut() {
    setTogglingOptOut(true);
    const res = await apiRequest("PATCH", "/api/crew/saga/optout", { optOut: true });
    setTogglingOptOut(false);
    if (res.success) setSaga(s => s ? { ...s, optOut: true } : s);
  }

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-[#1A1F2B] to-[#2a3142] text-white mb-6 overflow-hidden relative"
      data-testid="card-saga-of-week"
    >
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/old-mathematics.png')" }}
        aria-hidden="true"
      />
      <div className="relative px-5 py-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-[#D4A843]" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#D4A843]">
              Saga of the Week
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isManager && (
              <button
                onClick={optOut}
                disabled={togglingOptOut}
                className="text-white/40 hover:text-white/70 p-1 text-[10px] flex items-center gap-1 rounded transition-colors"
                title="Hide Saga of the Week for the whole team"
                data-testid="button-saga-optout"
              >
                <EyeOff className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={dismiss}
              className="text-white/40 hover:text-white/70 p-1 rounded transition-colors"
              data-testid="button-saga-dismiss"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-white/85 font-display" data-testid="text-saga-narrative">
          {saga.narrative}
        </p>
      </div>
    </div>
  );
}
