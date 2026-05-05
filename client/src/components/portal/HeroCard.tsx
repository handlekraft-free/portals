import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth";
import { useXp } from "./XpProvider";
import { STAT_META, type Stat, type StatProgress } from "@shared/xp";
import { Battery, Settings, Volume2, VolumeX, Flame, Heart, Shield, ScrollText, Target, Zap } from "lucide-react";

const ENERGY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Drained",   color: "bg-red-400" },
  2: { label: "Low",       color: "bg-orange-400" },
  3: { label: "Steady",    color: "bg-amber-400" },
  4: { label: "Strong",    color: "bg-emerald-400" },
  5: { label: "Energized", color: "bg-[#0D7377]" },
};

const STAT_ICON: Record<Stat, typeof Target> = {
  focus:       Target,
  initiative:  Zap,
  stewardship: Shield,
  craft:       Heart,
};

// ── Hero popover (Settings + My Saga tabs) ───────────────────────────────
function HeroCardPopover() {
  const { soundEnabled, setSoundEnabled, data } = useXp();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"saga" | "settings">("saga");
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const stats: StatProgress[] = data?.stats ?? [];
  const streaks = data?.streaks;
  const restTokens = data?.restTokens ?? 2;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        title="Hero menu"
        aria-label="Hero menu"
        aria-expanded={open}
        className="text-white/40 hover:text-white/80 transition-colors p-1 -m-1 rounded focus:outline-none focus:ring-1 focus:ring-[#D4A843]/40"
        data-testid="button-hero-settings"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          ref={popRef}
          role="menu"
          className="absolute right-0 top-6 z-30 w-72 bg-[#222836] border border-white/10 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-150"
          data-testid="popover-hero-settings"
        >
          {/* Tab strip */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setTab("saga")}
              className={`flex-1 text-[10px] uppercase tracking-wider font-semibold py-2 transition-colors ${
                tab === "saga" ? "text-[#D4A843] border-b-2 border-[#D4A843]" : "text-white/40 hover:text-white/70"
              }`}
              data-testid="tab-my-saga"
            >My Saga</button>
            <button
              onClick={() => setTab("settings")}
              className={`flex-1 text-[10px] uppercase tracking-wider font-semibold py-2 transition-colors ${
                tab === "settings" ? "text-[#D4A843] border-b-2 border-[#D4A843]" : "text-white/40 hover:text-white/70"
              }`}
              data-testid="tab-hero-settings"
            >Settings</button>
          </div>

          {tab === "saga" && (
            <div className="p-3 space-y-3" data-testid="panel-my-saga">
              {/* Streaks row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 rounded-md px-2 py-1.5" data-testid="stat-daily-raid">
                  <div className="flex items-center gap-1 text-white/50 text-[9px] uppercase tracking-wider">
                    <Flame className="w-2.5 h-2.5" /> Daily Raid
                  </div>
                  <div className="text-white text-sm font-semibold">
                    {streaks?.dailyRaid.count ?? 0}<span className="text-white/40 text-[10px] font-normal"> day{(streaks?.dailyRaid.count ?? 0) === 1 ? "" : "s"}</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-md px-2 py-1.5" data-testid="stat-honest-pulse">
                  <div className="flex items-center gap-1 text-white/50 text-[9px] uppercase tracking-wider">
                    <Battery className="w-2.5 h-2.5" /> Honest Pulse
                  </div>
                  <div className="text-white text-sm font-semibold">
                    {streaks?.honestPulse.count ?? 0}<span className="text-white/40 text-[10px] font-normal"> day{(streaks?.honestPulse.count ?? 0) === 1 ? "" : "s"}</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-white/40 italic flex items-center gap-1" data-testid="text-rest-tokens">
                <ScrollText className="w-3 h-3" />
                {restTokens} rest day{restTokens === 1 ? "" : "s"} left this month — streaks pause, never reset.
              </div>

              {/* Stat tracks */}
              <div className="space-y-2 pt-1 border-t border-white/5">
                <p className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">Stat tracks</p>
                {stats.map(s => {
                  const meta = STAT_META[s.stat];
                  const Icon = STAT_ICON[s.stat];
                  return (
                    <div key={s.stat} data-testid={`stat-${s.stat}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon className="w-3 h-3" style={{ color: meta.color }} />
                        <span className="text-white/85 text-[11px] font-medium flex-1">{meta.name}</span>
                        <span className="text-white/40 text-[10px]">L{s.level} · {s.xp} XP</span>
                      </div>
                      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.round(s.progressPct * 100)}%`, backgroundColor: meta.color }}
                        />
                      </div>
                      <p className="text-white/35 text-[9px] mt-0.5 leading-tight">{meta.blurb}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="p-2" data-testid="panel-hero-settings">
              <button
                onClick={() => { void setSoundEnabled(!soundEnabled); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-white/80 text-xs transition-colors"
                data-testid="button-toggle-xp-sound"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="flex-1 text-left">Completion sounds</span>
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${soundEnabled ? "text-[#D4A843]" : "text-white/30"}`}>
                  {soundEnabled ? "On" : "Off"}
                </span>
              </button>
              <p className="text-white/30 text-[10px] px-2 pt-1.5 pb-0.5 leading-snug">
                A soft drum on completion, a horn on rank-up. Off by default.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HeroCard() {
  const { user } = useAuth();
  const { progress, loading, hasGainedThisSession } = useXp();
  const [energy, setEnergy] = useState<number | null>(null);
  const [animatedPct, setAnimatedPct] = useState<number | null>(null);
  const lastXpRef = useRef<number | null>(null);

  // Pull today's energy reading
  useEffect(() => {
    let cancelled = false;
    function fetchEnergy() {
      apiRequest("GET", "/api/balance/me").then(res => {
        if (!cancelled && res?.success && res.data) {
          const d = res.data as { score?: number; value?: number };
          const score = d.score ?? d.value ?? null;
          if (typeof score === "number") setEnergy(Math.round(score));
        }
      }).catch(() => {});
    }
    fetchEnergy();
    const id = setInterval(fetchEnergy, 5 * 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Smooth bar fill ONLY when XP actually changes — quiet on first paint.
  useEffect(() => {
    if (!progress) return;
    const targetPct = Math.round(progress.progressPct * 100);
    if (animatedPct === null || lastXpRef.current === null) {
      setAnimatedPct(targetPct);
      lastXpRef.current = progress.xp;
      return;
    }
    if (!hasGainedThisSession || progress.xp === lastXpRef.current) {
      setAnimatedPct(targetPct);
      lastXpRef.current = progress.xp;
      return;
    }
    const start = animatedPct;
    const startTs = performance.now();
    const dur = 700;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTs) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimatedPct(start + (targetPct - start) * ease);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    lastXpRef.current = progress.xp;
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.xp, hasGainedThisSession]);

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
  const renderedPct = animatedPct ?? Math.round(progress.progressPct * 100);

  return (
    <div className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden" data-testid="card-hero">
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
        <HeroCardPopover />
      </div>

      <div className="space-y-1">
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#D4A843] to-[#e6bd5e] rounded-full"
            style={{ width: `${renderedPct}%` }}
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
