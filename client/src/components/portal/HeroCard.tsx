import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth";
import { useXp, SoundToggle } from "./XpProvider";
import { Battery } from "lucide-react";

const ENERGY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Drained",   color: "bg-red-400" },
  2: { label: "Low",       color: "bg-orange-400" },
  3: { label: "Steady",    color: "bg-amber-400" },
  4: { label: "Strong",    color: "bg-emerald-400" },
  5: { label: "Energized", color: "bg-[#0D7377]" },
};

export function HeroCard() {
  const { user } = useAuth();
  const { progress, loading } = useXp();
  const [energy, setEnergy] = useState<number | null>(null);
  const [animatedPct, setAnimatedPct] = useState(0);

  // Pull today's energy reading (cheap, polled occasionally)
  useEffect(() => {
    let cancelled = false;
    function fetchEnergy() {
      apiRequest("GET", "/api/balance/me").then(res => {
        if (!cancelled && res?.success && res.data) {
          const score = res.data.score ?? res.data.value ?? null;
          if (typeof score === "number") setEnergy(Math.round(score));
        }
      }).catch(() => {});
    }
    fetchEnergy();
    const id = setInterval(fetchEnergy, 5 * 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Smooth bar fill — animate from current rendered value to target
  useEffect(() => {
    if (!progress) return;
    const target = Math.round(progress.progressPct * 100);
    let raf = 0;
    const start = animatedPct;
    const startTs = performance.now();
    const dur = 700;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTs) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimatedPct(start + (target - start) * ease);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.xp]);

  if (loading || !progress) {
    return (
      <div className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 animate-pulse">
        <div className="h-3 w-20 bg-white/10 rounded mb-2" />
        <div className="h-2 w-full bg-white/10 rounded" />
      </div>
    );
  }

  const energyMeta = energy ? ENERGY_LABELS[energy] : null;
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;

  return (
    <div
      className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden"
      data-testid="card-hero"
    >
      {/* Header: avatar + name + rank */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0D7377] to-[#0a5f62] ring-2 ring-[#D4A843]/40 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate leading-tight" data-testid="text-hero-name">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-[#D4A843] text-[11px] uppercase tracking-wider font-semibold truncate" data-testid="text-hero-rank">
            {progress.rank.name} · L{progress.level}
          </p>
        </div>
        <SoundToggle />
      </div>

      {/* XP bar */}
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#D4A843] to-[#e6bd5e] rounded-full"
            style={{ width: `${animatedPct}%`, transition: "background-color 0.4s" }}
            data-testid="bar-xp-fill"
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-white/50" data-testid="text-xp-progress">
          {progress.nextRank ? (
            <>
              <span>{progress.xp.toLocaleString()} XP</span>
              <span>{progress.xpToNextRank} to {progress.nextRank.name}</span>
            </>
          ) : (
            <span className="mx-auto text-[#D4A843]/80">Konungr · max rank</span>
          )}
        </div>
      </div>

      {/* Energy reading */}
      {energyMeta && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/55" data-testid="text-hero-energy">
          <Battery className="w-3 h-3" />
          <span>Today:</span>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${energyMeta.color}`} />
          <span className="text-white/75">{energyMeta.label}</span>
        </div>
      )}
    </div>
  );
}
