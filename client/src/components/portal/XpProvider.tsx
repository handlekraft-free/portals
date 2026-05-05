import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { apiRequest, type XpAward } from "@/lib/auth";
import {
  getRankProgress, type RankProgress, type Rank,
  type Stat, type StatProgress,
} from "@shared/xp";
import { useToast } from "@/hooks/use-toast";
import { playSound, isGlobalSoundEnabled, setGlobalSoundEnabled } from "@/lib/sounds";
import { Anchor, Hammer, Crown, Swords, Scroll, Sparkles, type LucideIcon } from "lucide-react";

const RANK_ICONS: Record<string, LucideIcon> = {
  thrall: Anchor,
  karl: Hammer,
  jarl: Swords,
  hersir: Crown,
  skald: Scroll,
  konungr: Sparkles,
};

interface XpMeData extends RankProgress {
  soundEnabled?: boolean;
  recentEvents?: any[];
  stats?: StatProgress[];
  streaks?: {
    dailyRaid:   { count: number; lastDate: string | null };
    honestPulse: { count: number; lastDate: string | null };
  };
  restTokens?: number;
  restTokenMonth?: string;
}

interface XpContextValue {
  progress: RankProgress | null;
  data: XpMeData | null;
  soundEnabled: boolean;
  loading: boolean;
  hasGainedThisSession: boolean;
  setSoundEnabled: (v: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const XpContext = createContext<XpContextValue | null>(null);

export function useXp() {
  const ctx = useContext(XpContext);
  if (!ctx) throw new Error("useXp must be inside XpProvider");
  return ctx;
}

// ── Rank-up title-card overlay ─────────────────────────────────────────────
function RankUpOverlay({ rank, onDismiss }: { rank: Rank; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); onDismiss(); }
    }
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [onDismiss]);

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="rank-up-title"
      className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none animate-in fade-in duration-300"
      data-testid="overlay-rank-up"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-auto" onClick={onDismiss} />
      <div className="relative pointer-events-auto bg-gradient-to-br from-[#1A1F2B] to-[#0D7377] rounded-2xl shadow-2xl border border-[#D4A843]/40 px-10 py-8 max-w-sm text-center animate-in zoom-in-95 duration-500">
        {(() => {
          const Icon = RANK_ICONS[rank.key] ?? Sparkles;
          return (
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-[#D4A843]/15 ring-2 ring-[#D4A843]/50 flex items-center justify-center" data-testid="icon-new-rank">
              <Icon className="w-7 h-7 text-[#D4A843]" />
            </div>
          );
        })()}
        <div className="text-[#D4A843] text-xs uppercase tracking-[0.25em] font-semibold mb-2">A new rank</div>
        <div id="rank-up-title" className="font-display text-4xl text-white mb-2" data-testid="text-new-rank">
          You are now a {rank.name}
        </div>
        <div className="text-white/70 text-sm italic">{rank.blurb}</div>
        <button
          onClick={onDismiss} autoFocus
          className="mt-5 text-white/50 hover:text-white text-xs underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[#D4A843]/50 rounded px-2 py-0.5"
          data-testid="button-dismiss-rank-up"
        >continue (Esc)</button>
      </div>
    </div>
  );
}

// Plain-language reason for a single award. Keeps copy short, friendly,
// and stat-aware ("Initiative bonus", "Loved this", "Review handoff", …).
function shortReason(a: XpAward): string {
  const r = (a.reason ?? "").toLowerCase();
  if (r.startsWith("initiative bonus")) return "Initiative bonus";
  if (r.startsWith("loved this"))       return "Loved this";
  if (r.startsWith("review handoff"))   return "Review handoff";
  if (r.startsWith("daily raid"))       return a.reason; // already plain
  if (r.startsWith("honest pulse"))     return a.reason;
  if (r.startsWith("quest complete"))   return "quest complete";
  if (r.startsWith("completed:"))       return "quest complete";
  return a.reason;
}

export function XpProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [data, setData] = useState<XpMeData | null>(null);
  const [progress, setProgress] = useState<RankProgress | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(() => isGlobalSoundEnabled());
  const [loading, setLoading] = useState(true);
  const [hasGainedThisSession, setHasGainedThisSession] = useState(false);
  const [rankUp, setRankUp] = useState<Rank | null>(null);
  const lastRankKeyRef = useRef<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Aggregation buffer: collect awards arriving within ~250ms into one toast.
  const bufferRef = useRef<XpAward[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const res = await apiRequest("GET", "/api/xp/me");
    if (res?.success && res.data) {
      const d = res.data as XpMeData;
      setData(d);
      setProgress(d);
      // Server pref is a soft default; the global lib state (localStorage) wins
      // so the user's per-device choice persists across reloads instantly.
      setSoundEnabledState(isGlobalSoundEnabled());
      if (!hasLoadedRef.current) {
        lastRankKeyRef.current = d.rank?.key ?? null;
        hasLoadedRef.current = true;
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Listen for XP gains broadcast by apiRequest (single-aggregated event)
  useEffect(() => {
    function flush() {
      const awards = bufferRef.current;
      bufferRef.current = [];
      flushTimerRef.current = null;
      if (awards.length === 0) return;

      // Use the LAST award's newTotal as the canonical post-gain XP — server
      // applies them sequentially so the last total reflects all gains.
      const finalTotal = awards[awards.length - 1].newTotal;
      const next = getRankProgress(finalTotal);
      setProgress(next);
      setHasGainedThisSession(true);
      // Refresh stats/streaks in the My Saga tab without blocking the toast.
      void refresh();

      const total = awards.reduce((s, a) => s + a.amount, 0);
      const title = awards.length === 1
        ? `+${awards[0].amount} XP — ${shortReason(awards[0])}`
        : `+${total} XP — ${awards.length} awards`;
      const description = awards.length === 1
        ? awards[0].reason
        : awards.map(a => `+${a.amount} · ${shortReason(a)}`).join("  ·  ");

      toast({ title, description });

      const isRankUp = lastRankKeyRef.current && next.rank.key !== lastRankKeyRef.current;
      // Audio service honors the global mute itself — no need to gate here.
      if (isRankUp) playSound("horn"); else playSound("drum");
      if (isRankUp) setRankUp(next.rank);
      lastRankKeyRef.current = next.rank.key;
    }

    function handler(e: Event) {
      const detail = (e as CustomEvent<{ awards: XpAward[] }>).detail;
      const awards = detail?.awards;
      if (!awards || awards.length === 0) return;
      bufferRef.current.push(...awards);
      if (flushTimerRef.current == null) {
        flushTimerRef.current = setTimeout(flush, 250);
      }
    }

    window.addEventListener("xp:awarded", handler as EventListener);
    return () => {
      window.removeEventListener("xp:awarded", handler as EventListener);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, [toast, refresh]);

  // Crew bond toast → soft lute pluck. Reduced-motion + global mute are
  // honored inside playSound; no extra guard needed.
  useEffect(() => {
    function onBond() { playSound("lute"); }
    window.addEventListener("crew:bond", onBond);
    return () => window.removeEventListener("crew:bond", onBond);
  }, []);

  // Cross-tab sync: if the user toggles sound elsewhere, mirror it here.
  useEffect(() => {
    function onChange(e: Event) {
      const enabled = (e as CustomEvent<{ enabled: boolean }>).detail?.enabled;
      if (typeof enabled === "boolean") setSoundEnabledState(enabled);
    }
    window.addEventListener("hk:sound-changed", onChange as EventListener);
    return () => window.removeEventListener("hk:sound-changed", onChange as EventListener);
  }, []);

  const setSoundEnabled = useCallback(async (v: boolean) => {
    setGlobalSoundEnabled(v);
    setSoundEnabledState(v);
    // Mirror to server preference (advisory — local state is canonical).
    void apiRequest("POST", "/api/xp/sound", { enabled: v });
  }, []);

  return (
    <XpContext.Provider value={{ progress, data, soundEnabled, loading, hasGainedThisSession, setSoundEnabled, refresh }}>
      {children}
      {rankUp && <RankUpOverlay rank={rankUp} onDismiss={() => setRankUp(null)} />}
    </XpContext.Provider>
  );
}
