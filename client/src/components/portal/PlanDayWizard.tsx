import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  X, ChevronLeft, ChevronRight, Calendar, MessageSquare,
  Target, BookOpen, CheckCircle2, Flame,
} from "lucide-react";

import vikingProudPath from "@/assets/images/viking-proud.png";
import vikingWavePath from "@/assets/images/viking-wave.png";
import vikingCodingPath from "@/assets/images/viking-coding.png";
import vikingTriumphPath from "@/assets/images/viking-triumph.png";

// ── Public types & localStorage helpers ────────────────────────────────────────

export interface DayPlanTask {
  id: number;
  title: string;
  boardName: string;
  columnTitle: string;
  priority: string;
}

export interface DayPlanLearning {
  lessonId: number;
  lessonTitle: string;
  moduleTitle: string;
  courseId: number;
  courseTitle: string;
}

export interface DayPlan {
  date: string;
  tasks: DayPlanTask[];
  learningGoal: DayPlanLearning | null;
  completedTaskIds: number[];
  createdAt: string;
}

function planKey(userId: number) {
  return `hk_dayplan_${userId}_${new Date().toDateString()}`;
}

export function loadTodayPlan(userId: number): DayPlan | null {
  try {
    const raw = localStorage.getItem(planKey(userId));
    return raw ? (JSON.parse(raw) as DayPlan) : null;
  } catch {
    return null;
  }
}

export function saveTodayPlan(userId: number, plan: DayPlan): void {
  localStorage.setItem(planKey(userId), JSON.stringify(plan));
}

export function togglePlanTaskDone(userId: number, taskId: number, done: boolean): void {
  const plan = loadTodayPlan(userId);
  if (!plan) return;
  const ids = new Set(plan.completedTaskIds);
  done ? ids.add(taskId) : ids.delete(taskId);
  saveTodayPlan(userId, { ...plan, completedTaskIds: Array.from(ids) });
}

// ── Wizard ──────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (plan: DayPlan) => void;
}

const STEPS = ["welcome", "calendar", "inbox", "tasks", "learning", "oath"] as const;
type Step = typeof STEPS[number];

const STEP_META: Record<Step, { title: string; subtitle: string; viking: string }> = {
  welcome:  { title: "Time to set your course!",          subtitle: "2 minutes. Then: full focus.",          viking: vikingProudPath },
  calendar: { title: "What's on the horizon?",            subtitle: "Let's see what the day holds.",         viking: vikingWavePath },
  inbox:    { title: "Any messages need your eye?",        subtitle: "Park the inbox, then dive in.",         viking: vikingWavePath },
  tasks:    { title: "Pick your 3 quests",                 subtitle: "Choose up to 3 tasks to own today.",    viking: vikingCodingPath },
  learning: { title: "One thing to learn today",           subtitle: "Optional — skip if you prefer.",        viking: vikingCodingPath },
  oath:     { title: "Your raid plan is set!",             subtitle: "Commit, then begin.",                   viking: vikingTriumphPath },
};

const PRIORITY_PILL: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high:   "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-blue-100 text-blue-700",
};

const CONTENT_STEPS: Step[] = ["calendar", "inbox", "tasks", "learning"];

// Lower number = picked first when energy is low. Mirrors PRIORITY_PILL keys.
const PRIORITY_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, urgent: 3 };

export function PlanDayWizard({ isOpen, onClose, onComplete }: Props) {
  const { user } = useAuth();

  const [stepIdx, setStepIdx]   = useState(0);
  const [direction, setDir]     = useState(1);
  const [loading, setLoading]   = useState(false);

  // fetched data
  const [todayEvents, setTodayEvents]     = useState<any[]>([]);
  const [gmailItems, setGmailItems]       = useState<any[]>([]);
  const [navCounts, setNavCounts]         = useState<{ dmUnread: number; clientMsgUnread: number } | null>(null);
  const [allTasks, setAllTasks]           = useState<any[]>([]);
  const [availLessons, setAvailLessons]   = useState<DayPlanLearning[]>([]);
  const [energy, setEnergy]               = useState<number | null>(null);

  // selections
  const [selectedTaskIds, setSelectedTaskIds]   = useState<Set<number>>(new Set());
  const [selectedLesson, setSelectedLesson]     = useState<DayPlanLearning | null>(null);

  // Track whether finish() ran so onClose can spend a rest token if low-energy
  // user backed out without committing. Ref (not state) avoids stale closures.
  const committedRef = useRef(false);

  const lowEnergy = energy !== null && energy <= 2;
  const taskTarget = lowEnergy ? 1 : 3;

  // reset + fetch on open
  useEffect(() => {
    if (!isOpen) return;
    setStepIdx(0);
    setDir(1);
    setSelectedTaskIds(new Set());
    setSelectedLesson(null);
    setLoading(true);
    committedRef.current = false;
    // Reset energy so a fast close before /api/balance/me resolves doesn't
    // act on stale "low energy" state from a previous open cycle.
    setEnergy(null);

    const today = new Date().toDateString();

    Promise.all([
      apiRequest("GET", "/api/google/dashboard"),
      apiRequest("GET", "/api/auth/nav-counts"),
      apiRequest("GET", "/api/kanban/my-tasks"),
      apiRequest("GET", "/api/student/courses"),
      apiRequest("GET", "/api/balance/me"),
    ]).then(([google, counts, tasks, learn, balance]) => {
      // Calendar / Gmail
      if (google.success && google.data?.accounts) {
        const evs: any[] = [];
        const mail: any[] = [];
        for (const acct of google.data.accounts) {
          for (const ev of acct.calendar ?? []) {
            if (ev.eventTime && new Date(ev.eventTime).toDateString() === today) {
              evs.push({ ...ev, accountEmail: acct.email });
            }
          }
          mail.push(...(acct.gmail ?? []).map((m: any) => ({ ...m, accountEmail: acct.email })));
        }
        setTodayEvents(evs);
        setGmailItems(mail);
      }

      // Nav counts
      if (counts.success) setNavCounts(counts.data);

      // Energy reading — drives task target + sort order + copy.
      let currentEnergy: number | null = null;
      if (balance?.success && balance.data) {
        const s = balance.data.score ?? balance.data.value;
        if (typeof s === "number") {
          currentEnergy = Math.round(s);
          setEnergy(currentEnergy);
        }
      }
      const isLow = currentEnergy !== null && currentEnergy <= 2;

      // Open tasks (not done/archived). When low-energy, prefer low/medium
      // first so the easiest wins surface to the top.
      if (tasks.success) {
        const open = (tasks.data ?? []).filter(
          (t: any) =>
            !t.archived &&
            t.column?.title?.toLowerCase() !== "done" &&
            t.column?.title?.toLowerCase() !== "valhalla",
        );
        if (isLow) {
          open.sort((a: any, b: any) => {
            const ra = PRIORITY_RANK[a.priority ?? "medium"] ?? 1;
            const rb = PRIORITY_RANK[b.priority ?? "medium"] ?? 1;
            return ra - rb;
          });
        }
        setAllTasks(open);
      }

      // Incomplete lessons
      if (learn.success) {
        const lessons: DayPlanLearning[] = [];
        for (const course of learn.data ?? []) {
          for (const mod of course.modules ?? []) {
            for (const lesson of mod.lessons ?? []) {
              if (!lesson.completed) {
                lessons.push({
                  lessonId: lesson.id,
                  lessonTitle: lesson.title,
                  moduleTitle: mod.title,
                  courseId: course.id,
                  courseTitle: course.title,
                });
              }
            }
          }
        }
        setAvailLessons(lessons);
      }

      setLoading(false);
    });
  }, [isOpen]);

  const step = STEPS[stepIdx];
  const meta = STEP_META[step];

  // skip learning if nothing available
  const visibleDots = availLessons.length === 0
    ? CONTENT_STEPS.filter(s => s !== "learning")
    : CONTENT_STEPS;

  function advance() {
    setDir(1);
    // Skip learning step if no lessons
    if (step === "tasks" && availLessons.length === 0) {
      setStepIdx(STEPS.indexOf("oath"));
    } else {
      setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
    }
  }

  function back() {
    setDir(-1);
    if (step === "oath" && availLessons.length === 0) {
      setStepIdx(STEPS.indexOf("tasks"));
    } else {
      setStepIdx(i => Math.max(i - 1, 0));
    }
  }

  function toggleTask(id: number) {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else if (next.size < taskTarget) { next.add(id); }
      return next;
    });
  }

  // Wrapped close: when a low-energy user backs out without committing, spend
  // one rest token (server-side, idempotent) so today's Daily Raid streak is
  // preserved instead of broken. Server no-ops on weekends or no-tokens.
  // Guard: only fire when energy actually loaded (not null) — this prevents a
  // stale-state spend if the user closes before /api/balance/me resolves.
  function handleClose() {
    if (energy !== null && lowEnergy && !committedRef.current) {
      void apiRequest("POST", "/api/xp/streak/raid/skip");
    }
    onClose();
  }

  function finish() {
    if (!user) return;
    committedRef.current = true;
    const chosen = allTasks
      .filter(t => selectedTaskIds.has(t.id))
      .map(t => ({
        id: t.id,
        title: t.title,
        boardName: t.board?.name ?? "Board",
        columnTitle: t.column?.title ?? "",
        priority: t.priority ?? "medium",
      }));
    const plan: DayPlan = {
      date: new Date().toDateString(),
      tasks: chosen,
      learningGoal: selectedLesson,
      completedTaskIds: [],
      createdAt: new Date().toISOString(),
    };
    saveTodayPlan(user.id, plan);
    // Fire-and-forget: advance the Daily Raid streak. apiRequest broadcasts
    // any xpAwards via the xp:awarded event so XpProvider toasts naturally.
    void apiRequest("POST", "/api/xp/streak/raid");
    onComplete(plan);
  }

  const variants = {
    enter:  (d: number) => ({ x: d * 44, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
    exit:   (d: number) => ({ x: d * -44, opacity: 0, transition: { duration: 0.15 } }),
  };

  if (!isOpen) return null;

  const dotIdx = visibleDots.indexOf(step as any);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1,    opacity: 1, y: 0 }}
        exit={{    scale: 0.94, opacity: 0, y: 10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#1A1F2B] to-[#0D7377] px-6 pt-5 pb-4 relative overflow-hidden">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 z-10"
            data-testid="button-wizard-close"
          >
            <X className="w-4 h-4" />
          </button>

          <img
            src={meta.viking}
            alt=""
            aria-hidden="true"
            className="absolute right-4 bottom-0 h-20 object-contain object-bottom pointer-events-none select-none opacity-90"
          />

          <div className="pr-20">
            <p className="text-white/45 text-[10px] font-semibold uppercase tracking-widest mb-1">
              {step === "welcome"
                ? "Daily planning"
                : step === "oath"
                  ? "Ready to raid"
                  : `Step ${dotIdx + 1} of ${visibleDots.length}`}
            </p>
            <h2 className="text-white font-display text-xl leading-snug">{meta.title}</h2>
            <p className="text-white/55 text-sm mt-0.5">{meta.subtitle}</p>
          </div>

          {/* Progress dots */}
          {step !== "welcome" && step !== "oath" && (
            <div className="flex items-center gap-1.5 mt-3">
              {visibleDots.map(s => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? "bg-[#D4A843] w-5"
                      : CONTENT_STEPS.indexOf(s) < CONTENT_STEPS.indexOf(step as any)
                        ? "bg-white/45 w-2"
                        : "bg-white/15 w-2"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Step content ── */}
        <div style={{ minHeight: 256 }} className="overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="px-6 py-5"
            >
              {loading && step !== "welcome" ? (
                <div className="space-y-3 pt-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {step === "welcome"  && <WelcomeStep  name={user?.firstName ?? "Viking"} lowEnergy={lowEnergy} />}
                  {step === "calendar" && <CalendarStep events={todayEvents} />}
                  {step === "inbox"    && <InboxStep    navCounts={navCounts} gmail={gmailItems} />}
                  {step === "tasks"    && (
                    <TasksStep
                      tasks={allTasks}
                      selectedIds={selectedTaskIds}
                      onToggle={toggleTask}
                      target={taskTarget}
                      lowEnergy={lowEnergy}
                    />
                  )}
                  {step === "learning" && (
                    <LearningStep
                      lessons={availLessons}
                      selected={selectedLesson}
                      onSelect={setSelectedLesson}
                    />
                  )}
                  {step === "oath" && (
                    <OathStep
                      tasks={allTasks.filter(t => selectedTaskIds.has(t.id))}
                      learning={selectedLesson}
                      navCounts={navCounts}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 pb-5 pt-2 flex items-center justify-between border-t border-slate-100">
          {stepIdx > 0 ? (
            <button
              onClick={back}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors"
              data-testid="button-wizard-back"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            {(step === "welcome" || step === "calendar" || step === "inbox") && (
              <Button
                onClick={advance}
                className="bg-[#0D7377] hover:bg-[#0a5f62] text-white gap-1.5 rounded-xl px-5"
                data-testid="button-wizard-next"
              >
                {step === "welcome" ? "Let's go" : "Got it"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}

            {step === "tasks" && (
              <Button
                onClick={advance}
                disabled={selectedTaskIds.size === 0 && allTasks.length > 0}
                className="bg-[#0D7377] hover:bg-[#0a5f62] text-white gap-1.5 rounded-xl px-5 disabled:opacity-40"
                data-testid="button-wizard-next"
              >
                {allTasks.length === 0
                  ? "Continue"
                  : selectedTaskIds.size === 0
                    ? (lowEnergy ? "Pick one gentle quest" : "Pick at least one")
                    : `Lock in my ${selectedTaskIds.size}`}
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}

            {step === "learning" && (
              <>
                <button
                  onClick={() => { setSelectedLesson(null); advance(); }}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  data-testid="button-wizard-skip"
                >
                  Skip today
                </button>
                <Button
                  onClick={advance}
                  disabled={!selectedLesson}
                  className="bg-[#0D7377] hover:bg-[#0a5f62] text-white gap-1.5 rounded-xl px-5 disabled:opacity-40"
                  data-testid="button-wizard-next"
                >
                  Add to plan <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {step === "oath" && (
              <Button
                onClick={finish}
                className="bg-[#D4A843] hover:bg-[#c49535] text-[#1A1F2B] font-semibold gap-1.5 rounded-xl px-6"
                data-testid="button-wizard-begin"
              >
                Begin the Raid <Flame className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Step sub-components ────────────────────────────────────────────────────────

function WelcomeStep({ name, lowEnergy }: { name: string; lowEnergy: boolean }) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  return (
    <div className="text-center py-3">
      <p className="text-slate-400 text-sm mb-2">{today}</p>
      <p className="text-[#1A1F2B] text-xl font-semibold mb-2">
        {lowEnergy ? <>Easy does it, <span className="text-[#0D7377]">{name}</span>.</>
                   : <>Ready to raid, <span className="text-[#0D7377]">{name}</span>?</>}
      </p>
      <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto mb-6">
        {lowEnergy
          ? "Your energy is low today. Let's pick just one gentle quest — protecting the streak matters more than chasing XP."
          : "In about 2 minutes we'll look at your calendar, check your inbox, pick 3 tasks to focus on, and lock in one thing to learn."}
      </p>
      <div className="flex justify-center gap-5">
        {[
          { icon: <Calendar    className="w-5 h-5 text-[#0D7377]"  />, label: "Calendar" },
          { icon: <MessageSquare className="w-5 h-5 text-amber-500" />, label: "Inbox"    },
          { icon: <Target      className="w-5 h-5 text-teal-600"   />, label: "3 Tasks"  },
          { icon: <BookOpen    className="w-5 h-5 text-purple-500" />, label: "1 Lesson" },
        ].map(({ icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center shadow-sm">
              {icon}
            </div>
            <span className="text-[11px] text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarStep({ events }: { events: any[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-7 h-7 text-[#0D7377]" />
        </div>
        <p className="font-semibold text-[#1A1F2B] mb-1">Clear skies today!</p>
        <p className="text-slate-400 text-sm">No meetings on the calendar. The day is yours.</p>
      </div>
    );
  }

  const first = events[0];
  const firstTime = first?.eventTime
    ? new Date(first.eventTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : null;

  return (
    <div>
      <div className="bg-teal-50 rounded-xl px-4 py-3 mb-4 text-sm text-[#1A1F2B]">
        <span className="font-semibold">
          {events.length} meeting{events.length !== 1 ? "s" : ""} today.
        </span>
        {firstTime && (
          <> First one at{" "}
            <span className="font-semibold text-[#0D7377]">{firstTime}</span>.
          </>
        )}
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {events.map((ev, i) => {
          const t = ev.eventTime
            ? new Date(ev.eventTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
            : "All day";
          const minsUntil = ev.eventTime
            ? Math.round((new Date(ev.eventTime).getTime() - Date.now()) / 60000)
            : null;
          const soon = minsUntil !== null && minsUntil >= 0 && minsUntil <= 60;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                soon ? "bg-amber-50 border border-amber-100" : "bg-slate-50"
              }`}
            >
              <span className={`text-xs font-mono font-semibold shrink-0 ${soon ? "text-amber-600" : "text-[#0D7377]"}`}>
                {t}
              </span>
              <span className="text-sm font-medium text-[#1A1F2B] truncate flex-1">{ev.title}</span>
              {soon && <span className="text-[10px] text-amber-500 shrink-0 font-semibold">soon</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InboxStep({ navCounts, gmail }: { navCounts: any; gmail: any[] }) {
  const unread = (navCounts?.dmUnread ?? 0) + (navCounts?.clientMsgUnread ?? 0);

  return (
    <div>
      {unread > 0 ? (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
          <p className="font-semibold text-[#1A1F2B] text-sm">
            <span className="text-amber-600">{unread} unread message{unread !== 1 ? "s" : ""}</span> waiting.
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            {navCounts?.dmUnread > 0 && `${navCounts.dmUnread} direct · `}
            {navCounts?.clientMsgUnread > 0 && `${navCounts.clientMsgUnread} client`}
          </p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4">
          <p className="font-semibold text-green-700 text-sm">Inbox is clear — you're ahead of it.</p>
        </div>
      )}

      {gmail.length > 0 && (
        <>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Recent email</p>
          <div className="space-y-2 max-h-36 overflow-y-auto">
            {gmail.slice(0, 4).map((m, i) => (
              <div key={i} className="flex items-start gap-2.5 px-3 py-2 bg-slate-50 rounded-xl">
                <span className="text-xs text-slate-400 shrink-0 pt-0.5 truncate max-w-[5rem]">{m.subtitle}</span>
                <span className="text-sm font-medium text-[#1A1F2B] truncate">{m.title}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {unread === 0 && gmail.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-4">All quiet. No messages to review.</p>
      )}
    </div>
  );
}

function TasksStep({
  tasks, selectedIds, onToggle, target, lowEnergy,
}: {
  tasks: any[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  target: number;
  lowEnergy: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-7 h-7 text-green-500" />
        </div>
        <p className="font-semibold text-[#1A1F2B] mb-1">No open tasks.</p>
        <p className="text-slate-400 text-sm">Enjoy the open horizon, Viking.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400">
          {lowEnergy
            ? "Pick one gentle quest — low priority shows first"
            : `Select up to ${target} — these become your focus`}
        </p>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
            selectedIds.size === target ? "bg-[#0D7377] text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {selectedIds.size}/{target}
        </span>
      </div>
      <div className={`space-y-2 ${lowEnergy ? "max-h-44" : "max-h-52"} overflow-y-auto pr-1`}>
        {tasks.map(task => {
          const selected  = selectedIds.has(task.id);
          const disabled  = !selected && selectedIds.size >= target;
          const priClass  = PRIORITY_PILL[task.priority ?? "medium"] ?? PRIORITY_PILL.medium;
          return (
            <button
              key={task.id}
              onClick={() => !disabled && onToggle(task.id)}
              disabled={disabled}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                selected
                  ? "border-[#0D7377] bg-teal-50"
                  : disabled
                    ? "border-transparent bg-slate-50 opacity-35 cursor-not-allowed"
                    : "border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white"
              }`}
              data-testid={`task-select-${task.id}`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                selected ? "border-[#0D7377] bg-[#0D7377]" : "border-slate-300"
              }`}>
                {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1F2B] truncate leading-tight">{task.title}</p>
                <p className="text-xs text-slate-400 truncate">{task.board?.name} · {task.column?.title}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${priClass}`}>
                {task.priority ?? "medium"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LearningStep({
  lessons, selected, onSelect,
}: {
  lessons: DayPlanLearning[];
  selected: DayPlanLearning | null;
  onSelect: (l: DayPlanLearning | null) => void;
}) {
  if (lessons.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <BookOpen className="w-7 h-7 text-purple-400" />
        </div>
        <p className="font-semibold text-[#1A1F2B] mb-1">No lessons available yet.</p>
        <p className="text-slate-400 text-sm">This step will skip automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
      {lessons.slice(0, 8).map(lesson => {
        const isSelected = selected?.lessonId === lesson.lessonId;
        return (
          <button
            key={lesson.lessonId}
            onClick={() => onSelect(isSelected ? null : lesson)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
              isSelected
                ? "border-purple-400 bg-purple-50"
                : "border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white"
            }`}
            data-testid={`lesson-select-${lesson.lessonId}`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              isSelected ? "border-purple-500 bg-purple-500" : "border-slate-300"
            }`}>
              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1A1F2B] truncate">{lesson.lessonTitle}</p>
              <p className="text-xs text-slate-400 truncate">{lesson.courseTitle} · {lesson.moduleTitle}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function OathStep({
  tasks, learning, navCounts,
}: {
  tasks: any[];
  learning: DayPlanLearning | null;
  navCounts: any;
}) {
  const unread = (navCounts?.dmUnread ?? 0) + (navCounts?.clientMsgUnread ?? 0);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-[#0D7377]" /> Today's quests
        </p>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400 italic px-1">No tasks — free exploration day!</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2 bg-teal-50 rounded-xl">
                <span className="text-xs font-bold text-[#0D7377] shrink-0 w-4">{i + 1}</span>
                <span className="text-sm font-medium text-[#1A1F2B] truncate">{t.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {unread > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-500" /> To check first
          </p>
          <div className="px-3 py-2 bg-amber-50 rounded-xl text-sm text-[#1A1F2B]">
            {unread} unread message{unread !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {learning && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-purple-500" /> Learning goal
          </p>
          <div className="px-3 py-2 bg-purple-50 rounded-xl text-sm">
            <span className="font-medium text-[#1A1F2B]">{learning.lessonTitle}</span>
            <span className="text-slate-400"> · {learning.courseTitle}</span>
          </div>
        </div>
      )}
    </div>
  );
}
