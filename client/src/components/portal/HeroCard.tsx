import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth";
import { useXp } from "./XpProvider";
import { STAT_META, type Stat, type StatProgress } from "@shared/xp";
import { Battery, Settings, Volume2, VolumeX, Flame, Heart, Shield, ScrollText, Target, Zap, Anchor, Wand2 } from "lucide-react";
import { AvatarRenderer, type AvatarConfig } from "./AvatarRenderer";
import { AvatarCustomizer } from "./AvatarCustomizer";
import {
  SOUND_LABELS, getSoundMuted, setSoundMuted as setSoundMutedLib,
  type SoundName,
} from "@/lib/sounds";

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

// Personal saga timeline. Reads `/api/xp/milestones` (private to the user)
// and lists the most recent saved entries (rank-ups + recap saves). Refreshes
// when a new milestone is saved anywhere in the app via `hk:milestone-saved`.
function SagaTimeline() {
  type Item = { id: number; kind: string; title: string; blurb: string | null; createdAt: string };
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const refresh = () => {
    apiRequest("GET", "/api/xp/milestones").then((res) => {
      if (res?.success && Array.isArray(res.data?.items)) {
        setItems(
          (res.data.items as Array<{
            id: number; kind: string; title: string;
            blurb: string | null; created_at: string;
          }>).map((r) => ({
            id: r.id, kind: r.kind, title: r.title, blurb: r.blurb,
            createdAt: r.created_at,
          })),
        );
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  };
  useEffect(() => {
    refresh();
    const onSaved = () => refresh();
    window.addEventListener("hk:milestone-saved", onSaved);
    return () => window.removeEventListener("hk:milestone-saved", onSaved);
  }, []);
  if (!loaded) return null;
  return (
    <div className="bg-white/5 rounded-md px-2 py-1.5" data-testid="panel-saga-timeline">
      <div className="flex items-center gap-1 text-white/50 text-[9px] uppercase tracking-wider mb-1">
        <ScrollText className="w-2.5 h-2.5" /> My saga
      </div>
      {items.length === 0 ? (
        <p className="text-white/40 text-[11px] italic" data-testid="text-saga-empty">
          No saved moments yet — save a rank-up or recap to start your saga.
        </p>
      ) : (
        <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {items.slice(0, 10).map((m) => (
            <li
              key={m.id}
              className="text-white/80 text-[11px] leading-tight"
              data-testid={`item-saga-milestone-${m.id}`}
            >
              <span className="text-[#D4A843]">•</span>{" "}
              <span className="font-medium">{m.title}</span>
              <span className="text-white/30 text-[10px]"> · {new Date(m.createdAt).toLocaleDateString()}</span>
              {m.blurb && (
                <div className="text-white/45 text-[10px] pl-2.5">{m.blurb}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Per-event sound opt-outs — only meaningful when the global toggle is on.
// Persists locally + best-effort to server (PATCH /api/auth/sound-prefs).
function PerEventSoundToggles() {
  const [muted, setMuted] = useState<Set<SoundName>>(() => new Set(getSoundMuted()));
  // Stay in sync with mute changes from any other surface (server hydration on
  // boot, future settings UIs, cross-tab) so this panel never drifts.
  useEffect(() => {
    const onChanged = (e: Event) => {
      const list = (e as CustomEvent<{ muted: SoundName[] }>).detail?.muted;
      if (Array.isArray(list)) setMuted(new Set(list));
    };
    window.addEventListener("hk:sound-muted-changed", onChanged);
    return () => window.removeEventListener("hk:sound-muted-changed", onChanged);
  }, []);
  function toggle(name: SoundName) {
    const next = new Set(muted);
    if (next.has(name)) next.delete(name); else next.add(name);
    setMuted(next);
    setSoundMutedLib(name, next.has(name));
    void apiRequest("PATCH", "/api/auth/sound-prefs", { muted: Array.from(next) });
  }
  return (
    <div className="px-2 pb-1" data-testid="panel-sound-event-prefs">
      <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Per-event</p>
      {(Object.keys(SOUND_LABELS) as SoundName[]).map((s) => {
        const on = !muted.has(s);
        return (
          <label
            key={s}
            className="flex items-center justify-between py-0.5 cursor-pointer hover:bg-white/5 rounded px-1"
            data-testid={`row-sound-${s}`}
          >
            <span className="text-white/70 text-[11px]">{SOUND_LABELS[s]}</span>
            <input
              type="checkbox"
              checked={on}
              onChange={() => toggle(s)}
              className="accent-[#D4A843] w-3 h-3"
              data-testid={`toggle-sound-${s}`}
            />
          </label>
        );
      })}
    </div>
  );
}

// ── Hero popover (Settings + My Saga tabs) ───────────────────────────────
function HeroCardPopover({ onCustomizeAvatar }: { onCustomizeAvatar: () => void }) {
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
  const [crewBond, setCrewBond] = useState<number | null>(null);

  useEffect(() => {
    if (!open || tab !== "saga") return;
    let cancelled = false;
    function load() {
      apiRequest("GET", "/api/auth/me").then(res => {
        if (!cancelled && res?.success && res.data) {
          const cb = (res.data as { crewBond?: number }).crewBond;
          if (typeof cb === "number") setCrewBond(cb);
        }
      }).catch(() => {});
    }
    load();
    const onBond = () => load();
    window.addEventListener("crew:bond", onBond);
    return () => { cancelled = true; window.removeEventListener("crew:bond", onBond); };
  }, [open, tab]);

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
              <SagaTimeline />
              {/* Quick avatar customizer entry — duplicates the Settings tab
                  entry so it's discoverable from the saga view too. */}
              <button
                onClick={() => { setOpen(false); onCustomizeAvatar(); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white/80 text-xs transition-colors"
                data-testid="button-open-avatar-customizer-saga"
              >
                <Wand2 className="w-3.5 h-3.5 text-[#D4A843]" />
                <span className="flex-1 text-left">Customize avatar</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D4A843]">Edit</span>
              </button>
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

              {/* Crew Bond — silent counter, never compared between teammates */}
              <div
                className="bg-white/5 rounded-md px-2 py-1.5 flex items-center gap-2"
                data-testid="stat-crew-bond"
              >
                <Anchor className="w-3 h-3 text-[#0D7377]" />
                <div className="flex-1">
                  <div className="text-white/50 text-[9px] uppercase tracking-wider">Crew Bond</div>
                  <div className="text-white text-xs">
                    {crewBond ?? "—"}
                    <span className="text-white/40 text-[10px] font-normal"> shared review{(crewBond ?? 0) === 1 ? "" : "s"}</span>
                  </div>
                </div>
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
              <p className="text-white/30 text-[10px] px-2 pt-1.5 pb-2 leading-snug">
                A soft drum on completion, a horn on rank-up. Off by default.
              </p>
              {soundEnabled && <PerEventSoundToggles />}
              <button
                onClick={() => { setOpen(false); onCustomizeAvatar(); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-white/80 text-xs transition-colors mt-1"
                data-testid="button-open-avatar-customizer"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">Customize avatar</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D4A843]">Edit</span>
              </button>
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
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
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

  // Avatar config — pulled once per mount from /api/auth/me, plus live-sync
  // via the `hk:avatar-changed` window event so saves elsewhere reflect here.
  useEffect(() => {
    let cancelled = false;
    apiRequest("GET", "/api/auth/me").then((res) => {
      if (!cancelled && res?.success && res.data?.avatarConfig) {
        setAvatarConfig(res.data.avatarConfig as AvatarConfig);
      }
    }).catch(() => {});
    const onChanged = (e: Event) => {
      const c = (e as CustomEvent<{ config: AvatarConfig }>).detail?.config;
      if (c) setAvatarConfig(c);
    };
    window.addEventListener("hk:avatar-changed", onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("hk:avatar-changed", onChanged);
    };
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
        <button
          type="button"
          onClick={() => setCustomizerOpen(true)}
          title="Customize avatar"
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#D4A843]/50"
          data-testid="button-hero-avatar"
        >
          <AvatarRenderer initials={initials} config={avatarConfig} size={36} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate leading-tight" data-testid="text-hero-name">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-[#D4A843] text-[11px] uppercase tracking-wider font-semibold truncate" data-testid="text-hero-rank">
            {progress.rank.name} · L{progress.level}
          </p>
        </div>
        <HeroCardPopover onCustomizeAvatar={() => setCustomizerOpen(true)} />
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

      <AvatarCustomizer
        isOpen={customizerOpen}
        initials={initials}
        initialConfig={avatarConfig}
        onClose={() => setCustomizerOpen(false)}
        onSaved={(c) => setAvatarConfig(c)}
      />
    </div>
  );
}
