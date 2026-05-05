import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/auth";
import { Anchor, Sparkles, X } from "lucide-react";

type Weekly = {
  weekKey: string;
  questsShipped: number;
  reviewsCompleted: number;
  crewBondsThisWeek: number;
  averageEnergy: number | null;
  energySubmittedCount: number;
  threshold: number;
  fullCrew: boolean;
};

const ROWER_SLOTS = 12; // matches server FULL_CREW_THRESHOLD

function Rower({ filled, idx }: { filled: boolean; idx: number }) {
  // Anonymous silhouette — no faces, no names. Slight x-offset per slot.
  return (
    <g transform={`translate(${idx * 26}, 0)`} opacity={filled ? 1 : 0.18}>
      <circle cx="13" cy="10" r="4" fill={filled ? "#1A1F2B" : "#94a3b8"} />
      <path
        d={`M5 30 C5 20, 21 20, 21 30 L21 34 L5 34 Z`}
        fill={filled ? "#1A1F2B" : "#94a3b8"}
      />
      {/* oar */}
      <line
        x1="22"
        y1="22"
        x2="34"
        y2={filled ? 36 : 32}
        stroke={filled ? "#0D7377" : "#cbd5e1"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

export function CrewLongship() {
  const [data, setData] = useState<Weekly | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    function load() {
      apiRequest<Weekly>("GET", "/api/crew/weekly").then(res => {
        if (!cancelled && res.success) setData(res.data);
      }).catch(() => {});
    }
    load();
    const id = setInterval(load, 60_000);
    // Refresh whenever any quest XP fires
    const onXp = () => load();
    window.addEventListener("xp:awarded", onXp);
    window.addEventListener("crew:bond", onXp);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("xp:awarded", onXp);
      window.removeEventListener("crew:bond", onXp);
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    // Reset dismissal when the week ticks over
    const key = `crewBannerDismissed:${data.weekKey}`;
    setBannerDismissed(localStorage.getItem(key) === "1");
  }, [data?.weekKey]);

  if (!data) return null;

  const filled = Math.min(data.questsShipped, ROWER_SLOTS);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function dismissBanner() {
    if (!data) return;
    localStorage.setItem(`crewBannerDismissed:${data.weekKey}`, "1");
    setBannerDismissed(true);
  }

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-[#f5f3ef] to-[#ece8df] border border-[#D4A843]/20 mb-6 overflow-hidden"
      data-testid="card-crew-longship"
    >
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-[#0D7377]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#0D7377]">
            The Crew this week
          </span>
        </div>
        <span className="text-xs text-slate-500" data-testid="text-crew-count">
          {data.questsShipped} quest{data.questsShipped === 1 ? "" : "s"} shipped
          {data.reviewsCompleted > 0 && ` · ${data.reviewsCompleted} review${data.reviewsCompleted === 1 ? "" : "s"}`}
          {data.averageEnergy != null && ` · avg energy ${data.averageEnergy.toFixed(1)}`}
        </span>
      </div>

      <div className="px-5 pb-3">
        <svg
          viewBox={`0 0 ${ROWER_SLOTS * 26 + 60} 80`}
          className="w-full h-20"
          aria-label={`Longship with ${filled} of ${ROWER_SLOTS} rowers`}
        >
          {/* Hull */}
          <path
            d={`M10 50 Q ${(ROWER_SLOTS * 26 + 60) / 2} 75, ${ROWER_SLOTS * 26 + 50} 50 L${ROWER_SLOTS * 26 + 40} 60 L20 60 Z`}
            fill="#5b4636"
            stroke="#3a2c20"
            strokeWidth="1.5"
          />
          {/* Prow scroll */}
          <path d="M5 50 Q -2 38, 8 30 Q 14 35, 12 48 Z" fill="#5b4636" stroke="#3a2c20" strokeWidth="1.5" />
          {/* Stern scroll */}
          <path
            d={`M${ROWER_SLOTS * 26 + 55} 50 Q ${ROWER_SLOTS * 26 + 62} 38, ${ROWER_SLOTS * 26 + 52} 30 Q ${ROWER_SLOTS * 26 + 46} 35, ${ROWER_SLOTS * 26 + 48} 48 Z`}
            fill="#5b4636"
            stroke="#3a2c20"
            strokeWidth="1.5"
          />
          {/* Shield strake */}
          <rect x="10" y="44" width={ROWER_SLOTS * 26 + 40} height="6" fill="#D4A843" opacity="0.35" />
          {/* Rowers */}
          <g transform="translate(20, 8)">
            {Array.from({ length: ROWER_SLOTS }).map((_, i) => (
              <Rower key={i} filled={i < filled} idx={i} />
            ))}
          </g>
          {/* Waterline shimmer */}
          <line
            x1="0"
            y1="68"
            x2={ROWER_SLOTS * 26 + 60}
            y2="68"
            stroke="#0D7377"
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity="0.4"
          >
            {!reduceMotion && (
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="20"
                dur="3s"
                repeatCount="indefinite"
              />
            )}
          </line>
        </svg>
      </div>

      {/* Full crew banner */}
      {data.fullCrew && !bannerDismissed && (
        <div
          className="mx-3 mb-3 rounded-xl bg-gradient-to-r from-[#0D7377]/10 to-[#D4A843]/15 border border-[#D4A843]/30 px-4 py-2.5 flex items-center gap-2.5"
          data-testid="banner-full-crew"
        >
          <Sparkles className="w-4 h-4 text-[#D4A843] shrink-0" />
          <p className="text-xs text-[#1A1F2B] flex-1 leading-snug">
            <span className="font-semibold">Full crew this week.</span>{" "}
            <span className="text-slate-600">Every oar in the water — the longship sails.</span>
          </p>
          <button
            onClick={dismissBanner}
            className="text-slate-400 hover:text-slate-600 p-0.5"
            data-testid="button-dismiss-full-crew"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
