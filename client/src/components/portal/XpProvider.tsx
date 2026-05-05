import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { apiRequest } from "@/lib/auth";
import { getRankProgress, type RankProgress, type Rank } from "@shared/xp";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Volume2, VolumeX } from "lucide-react";

type XpAwardDetail = { amount: number; reason: string; newTotal: number };

interface XpContextValue {
  progress: RankProgress | null;
  soundEnabled: boolean;
  loading: boolean;
  setSoundEnabled: (v: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const XpContext = createContext<XpContextValue | null>(null);

export function useXp() {
  const ctx = useContext(XpContext);
  if (!ctx) throw new Error("useXp must be inside XpProvider");
  return ctx;
}

// ── Tiny synthesised "drum + horn" via Web Audio (no asset wrangling) ────────
function playCompletionSound() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    // Drum thump (low sine, fast decay)
    const drum = ctx.createOscillator();
    const drumGain = ctx.createGain();
    drum.type = "sine";
    drum.frequency.setValueAtTime(110, ctx.currentTime);
    drum.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.18);
    drumGain.gain.setValueAtTime(0.001, ctx.currentTime);
    drumGain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.01);
    drumGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    drum.connect(drumGain).connect(ctx.destination);
    drum.start();
    drum.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close().catch(() => {}), 400);
  } catch {}
}

function playRankUpSound() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    // Horn-ish chord — root + fifth, soft attack
    const t0 = ctx.currentTime;
    [196, 294].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.08 + i * 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 1.3);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1400);
  } catch {}
}

// ── Rank-up title-card overlay ───────────────────────────────────────────────
function RankUpOverlay({ rank, onDismiss }: { rank: Rank; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none animate-in fade-in duration-300"
      data-testid="overlay-rank-up"
    >
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onDismiss} />
      <div className="relative pointer-events-auto bg-gradient-to-br from-[#1A1F2B] to-[#0D7377] rounded-2xl shadow-2xl border border-[#D4A843]/40 px-10 py-8 max-w-sm text-center animate-in zoom-in-95 duration-500">
        <div className="text-[#D4A843] text-xs uppercase tracking-[0.25em] font-semibold mb-2">A new rank</div>
        <div className="font-display text-4xl text-white mb-2" data-testid="text-new-rank">You are now a {rank.name}</div>
        <div className="text-white/70 text-sm italic">{rank.blurb}</div>
        <button
          onClick={onDismiss}
          className="mt-5 text-white/50 hover:text-white text-xs underline-offset-4 hover:underline"
          data-testid="button-dismiss-rank-up"
        >
          continue
        </button>
      </div>
    </div>
  );
}

export function XpProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [progress, setProgress] = useState<RankProgress | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rankUp, setRankUp] = useState<Rank | null>(null);
  const lastRankKeyRef = useRef<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    const res = await apiRequest("GET", "/api/xp/me");
    if (res?.success && res.data) {
      setProgress(res.data);
      setSoundEnabledState(!!res.data.soundEnabled);
      // Initialize lastRank silently on first load — no spurious rank-up
      if (!hasLoadedRef.current) {
        lastRankKeyRef.current = res.data.rank?.key ?? null;
        hasLoadedRef.current = true;
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Listen for XP gains broadcast by apiRequest
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent<XpAwardDetail>).detail;
      if (!detail) return;

      // Optimistic update + smooth bar fill
      const next = getRankProgress(detail.newTotal);
      setProgress(next);

      // Toast (TOAST_LIMIT=1 so rapid completions just replace)
      toast({
        title: `+${detail.amount} XP`,
        description: detail.reason,
      });

      // Sound (muted by default)
      const isRankUp = lastRankKeyRef.current && next.rank.key !== lastRankKeyRef.current;
      if (soundEnabled) {
        if (isRankUp) playRankUpSound();
        else playCompletionSound();
      }

      if (isRankUp) {
        setRankUp(next.rank);
      }
      lastRankKeyRef.current = next.rank.key;
    };
    window.addEventListener("xp:awarded", handler as EventListener);
    return () => window.removeEventListener("xp:awarded", handler as EventListener);
  }, [toast, soundEnabled]);

  const setSoundEnabled = useCallback(async (v: boolean) => {
    setSoundEnabledState(v);
    await apiRequest("POST", "/api/xp/sound", { enabled: v });
  }, []);

  return (
    <XpContext.Provider value={{ progress, soundEnabled, loading, setSoundEnabled, refresh }}>
      {children}
      {rankUp && <RankUpOverlay rank={rankUp} onDismiss={() => setRankUp(null)} />}
    </XpContext.Provider>
  );
}

// Tiny inline sound toggle for use in HeroCard
export function SoundToggle({ className = "" }: { className?: string }) {
  const { soundEnabled, setSoundEnabled } = useXp();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); setSoundEnabled(!soundEnabled); }}
      title={soundEnabled ? "Mute completion sounds" : "Enable completion sounds"}
      className={`text-white/40 hover:text-white/80 transition-colors ${className}`}
      data-testid="button-toggle-xp-sound"
    >
      {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
    </button>
  );
}

export { Sparkles };
