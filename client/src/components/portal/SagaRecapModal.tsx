import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Scroll, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
// (toast import is below to keep the import order tidy.)
import { STAT_META, getRankProgress, type Stat } from "@shared/xp";
import { useToast } from "@/hooks/use-toast";

interface XpEvent {
  id: number;
  amount: number;
  reason: string;
  sourceType: string;
  stat: string | null;
  createdAt: string;
}
interface TodayPayload {
  events: XpEvent[];
  total: number;
  byStat: Partial<Record<Stat, number>>;
  questsShipped: number;
  dailyRaidStreak: number;
  xpTotal: number;
}

interface Prefs {
  enabled: boolean;
  time: string; // HH:MM
}

const DEFAULT_PREFS: Prefs = { enabled: true, time: "17:00" };

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}
function lsKey(userId: number): string {
  return `hk_saga_recap_shown_${userId}_${todayKey()}`;
}

// Mounted once per session. Polls /api/auth/me for prefs (cheap), then a
// 60-second timer checks whether the user-set time has passed today and the
// recap hasn't been shown. Once shown, a localStorage flag suppresses re-fire.
export function SagaRecapModal() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TodayPayload | null>(null);

  // Pull prefs on mount + whenever the user updates them in Settings.
  // SagaRecapCard dispatches `hk:saga-recap-prefs-changed` after a successful
  // PATCH; we re-read /api/auth/me so the schedule takes effect immediately
  // without requiring a reload.
  useEffect(() => {
    if (!user) return;
    function loadPrefs() {
      apiRequest("GET", "/api/auth/me").then((res) => {
        if (res?.success && res.data) {
          setPrefs({
            enabled: res.data.sagaRecapEnabled !== false,
            time:    typeof res.data.sagaRecapTime === "string" ? res.data.sagaRecapTime : "17:00",
          });
        }
      }).catch(() => {});
    }
    loadPrefs();
    window.addEventListener("hk:saga-recap-prefs-changed", loadPrefs);
    return () => window.removeEventListener("hk:saga-recap-prefs-changed", loadPrefs);
  }, [user?.id]);

  // Schedule check
  useEffect(() => {
    if (!user || !prefs.enabled || open) return;
    function check() {
      try {
        if (localStorage.getItem(lsKey(user!.id)) === "1") return;
      } catch { return; }
      const [h, m] = prefs.time.split(":").map((s) => parseInt(s, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) return;
      const now = new Date();
      const target = new Date();
      target.setHours(h, m, 0, 0);
      if (now < target) return;
      // Time has passed — fetch today's XP and open
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      apiRequest("GET", `/api/xp/today?tz=${encodeURIComponent(tz)}`).then((res) => {
        if (res?.success && res.data) {
          setData(res.data);
          try { localStorage.setItem(lsKey(user!.id), "1"); } catch { /* ignore */ }
          setOpen(true);
        }
      }).catch(() => {});
    }
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [user?.id, prefs.enabled, prefs.time, open]);

  if (!user) return null;

  return (
    <AnimatePresence>
      {open && data && (
        <RecapDialog
          data={data}
          firstName={user.firstName ?? "Viking"}
          onClose={() => setOpen(false)}
        />
      )}
    </AnimatePresence>
  );
}

function RecapDialog({
  data, firstName, onClose,
}: {
  data: TodayPayload;
  firstName: string;
  onClose: () => void;
}) {
  const stats = useMemo(() => {
    const out: Array<{ stat: Stat; amount: number }> = [];
    for (const s of Object.keys(STAT_META) as Stat[]) {
      const amt = data.byStat[s] ?? 0;
      if (amt > 0) out.push({ stat: s, amount: amt });
    }
    return out;
  }, [data]);

  const eventCount = data.events.length;
  const headline = data.total === 0
    ? "A quiet day. Rest sharpens the next raid."
    : `+${data.total} XP across ${eventCount} ${eventCount === 1 ? "deed" : "deeds"}.`;
  const rank = useMemo(() => getRankProgress(data.xpTotal), [data.xpTotal]);
  const xpToNext = rank.nextRank ? Math.max(0, rank.nextRank.threshold - data.xpTotal) : 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" data-testid="modal-saga-recap">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 10 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#1A1F2B] to-[#0D7377] px-6 pt-5 pb-4 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10"
            data-testid="button-close-saga-recap"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-[#D4A843] text-[10px] font-semibold uppercase tracking-widest mb-1">
            <Scroll className="w-3 h-3" /> Today's Saga
          </div>
          <h2 className="text-white font-display text-2xl">Hail, {firstName}</h2>
          <p className="text-white/65 text-sm mt-1" data-testid="text-saga-headline">{headline}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Quick stats strip — quests shipped + daily-raid streak + next-rank line */}
          <div className="grid grid-cols-3 gap-2" data-testid="recap-quickstats">
            <QuickStat label="Quests shipped" value={data.questsShipped} testId="recap-quests-shipped" />
            <QuickStat label="Raid streak" value={`${data.dailyRaidStreak}d`} testId="recap-streak" />
            <QuickStat
              label={rank.nextRank ? `To ${rank.nextRank.name}` : "Konungr"}
              value={rank.nextRank ? `${xpToNext} XP` : "—"}
              testId="recap-next-rank"
            />
          </div>
          {rank.nextRank && (
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden" data-testid="recap-next-rank-bar">
              <div
                className="h-full bg-gradient-to-r from-[#0D7377] to-[#D4A843] transition-all"
                style={{ width: `${Math.round(rank.progressPct * 100)}%` }}
              />
            </div>
          )}

          <SaveMilestoneRow data={data} rankName={rank.rank.name} />

          {stats.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Stat tracks moved</p>
              <div className="grid grid-cols-2 gap-2">
                {stats.map(({ stat, amount }) => {
                  const meta = STAT_META[stat];
                  return (
                    <div
                      key={stat}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                      data-testid={`recap-stat-${stat}`}
                    >
                      <span className="text-sm font-medium" style={{ color: meta.color }}>{meta.name}</span>
                      <span className="text-xs font-semibold text-slate-700">+{amount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.events.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Deeds</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {data.events.slice(-8).reverse().map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-50 text-sm">
                    <Sparkles className="w-3 h-3 text-[#D4A843] shrink-0" />
                    <span className="flex-1 truncate text-slate-700">{e.reason}</span>
                    <span className="text-xs font-semibold text-[#0D7377]">+{e.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">
              Tomorrow is a fresh longship. Sleep well.
            </p>
          )}
        </div>


        <div className="px-6 pb-5 pt-1 flex items-center justify-between border-t border-slate-100">
          <p className="text-[11px] text-slate-400">Adjust time or turn off in Settings.</p>
          <button
            onClick={onClose}
            className="bg-[#0D7377] hover:bg-[#0a5f62] text-white rounded-xl px-4 py-2 text-sm font-semibold"
            data-testid="button-close-saga-recap-cta"
          >
            Close the scroll
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function QuickStat({ label, value, testId }: { label: string; value: number | string; testId: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2.5 py-2 text-center" data-testid={testId}>
      <p className="text-[9px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-display text-[#1A1F2B] leading-tight mt-0.5">{value}</p>
    </div>
  );
}

// "Save to my saga" — opt-in private timeline entry. Only useful for days
// with real activity, so the row hides for empty days. Once saved, the row
// confirms inline so the user knows it stuck.
function SaveMilestoneRow({ data, rankName }: { data: TodayPayload; rankName: string }) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  if (data.total === 0 && data.questsShipped === 0) return null;
  async function save() {
    setSaving(true);
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const title = data.questsShipped > 0
      ? `${today} — shipped ${data.questsShipped} quest${data.questsShipped === 1 ? "" : "s"} (+${data.total} XP)`
      : `${today} — +${data.total} XP earned`;
    const res = await apiRequest("POST", "/api/xp/milestones", {
      kind: "saga_recap",
      title,
      blurb: `As a ${rankName}, with a ${data.dailyRaidStreak}-day raid streak.`,
      meta: {
        total: data.total, questsShipped: data.questsShipped,
        dailyRaidStreak: data.dailyRaidStreak, xpTotal: data.xpTotal,
      },
    });
    setSaving(false);
    if (res?.success) {
      setSaved(true);
      window.dispatchEvent(new CustomEvent("hk:milestone-saved"));
      toast({ title: "Saved to your saga" });
    } else {
      toast({ title: "Could not save", variant: "destructive" });
    }
  }
  return (
    <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 px-3 py-2" data-testid="recap-save-milestone-row">
      <div>
        <p className="text-xs font-semibold text-slate-700">Keep today in your saga?</p>
        <p className="text-[10px] text-slate-400">Private to you — never shown to teammates.</p>
      </div>
      <button
        onClick={save}
        disabled={saving || saved}
        className="text-xs font-semibold rounded-lg px-3 py-1.5 bg-[#D4A843] hover:bg-[#c49535] text-[#1A1F2B] disabled:bg-slate-100 disabled:text-slate-400"
        data-testid="button-save-milestone"
      >
        {saved ? "Saved" : saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
