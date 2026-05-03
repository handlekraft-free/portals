import { useEffect, useState, useRef, useCallback } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth";
import { MessageSquare, Zap, AlertCircle, CheckCircle2, Circle, ArrowRight, CalendarDays, Mail, Users, Kanban, Ticket, RefreshCw, Clock } from "lucide-react";
import vikingCodingImg from "@/assets/images/viking-coding.png";
import { VikingArsenal, RuneDivider } from "@/components/portal/VikingDecor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TeamChat from "@/components/portal/TeamChat";
import ClaudeChat from "@/components/portal/ClaudeChat";

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "#94a3b8";
  if (score < 2) return "#ef4444";
  if (score < 3.5) return "#ca8a04";
  return "#16a34a";
}

function scoreEmoji(score: number | null): string {
  if (score === null) return "🔘";
  if (score <= 1.5) return "😔";
  if (score <= 2) return "😕";
  if (score <= 2.5) return "😐";
  if (score <= 3) return "🙂";
  if (score <= 4) return "😊";
  return "🤩";
}

function scoreLabel(score: number | null): string {
  if (score === null) return "Not set";
  if (score <= 1.5) return "Burned Out";
  if (score <= 2) return "Running Low";
  if (score <= 2.5) return "Getting By";
  if (score <= 3) return "Okay";
  if (score <= 3.5) return "Doing Well";
  if (score <= 4) return "Good Energy";
  if (score <= 4.5) return "Fired Up";
  return "Fully Energized";
}

function scoreBg(score: number | null): string {
  if (score === null) return "#f1f5f9";
  if (score < 2) return "#fee2e2";
  if (score < 3.5) return "#fefce8";
  return "#dcfce7";
}

// ── Balance Slider ────────────────────────────────────────────────────────────

function BalanceSlider() {
  const [score, setScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiRequest("GET", "/api/balance/me").then((res) => {
      if (res.success && res.data) setScore(res.data.score);
    });
  }, []);

  const saveScore = useCallback(async (val: number) => {
    setSaving(true);
    setSaved(false);
    await apiRequest("POST", "/api/balance/me", { score: val });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    setScore(val);
    setSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveScore(val), 600);
  }

  const display = score ?? 2.5;
  const color = scoreColor(score);
  const pct = ((display - 1) / 4) * 100;

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#D4A843]" /> My Energy Level
          {saving && <span className="text-xs text-slate-400 font-normal ml-auto">Saving…</span>}
          {saved && <span className="text-xs text-[#0D7377] font-normal ml-auto">Saved</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <span
            className="text-4xl select-none transition-all duration-300"
            data-testid="text-balance-emoji"
          >
            {scoreEmoji(score)}
          </span>
          <div className="flex-1">
            <div className="flex justify-between items-baseline mb-1">
              <span
                className="text-2xl font-bold transition-colors duration-300"
                style={{ color }}
                data-testid="text-balance-score"
              >
                {score !== null ? display.toFixed(1) : "—"}
              </span>
              <span
                className="text-sm font-medium transition-colors duration-300"
                style={{ color }}
                data-testid="text-balance-label"
              >
                {scoreLabel(score)}
              </span>
            </div>
            {/* Custom slider */}
            <div className="relative h-6 flex items-center">
              <div className="absolute inset-x-0 h-2 rounded-full bg-slate-200" />
              <div
                className="absolute left-0 h-2 rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: color }}
              />
              <input
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={display}
                onChange={handleChange}
                className="relative w-full h-2 appearance-none bg-transparent cursor-pointer"
                style={{
                  // Thumb styling via inline for broad browser support
                  ["--thumb-color" as any]: color,
                }}
                data-testid="slider-balance"
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-slate-400 select-none">
              <span>😔 Burned Out</span>
              <span>😐 Okay</span>
              <span>🤩 Energized</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          How are you feeling today? Your score is visible to the team. Updates save automatically.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Team Pulse Panel ──────────────────────────────────────────────────────────

function TeamPulse() {
  const [data, setData] = useState<{
    team: Array<{ id: number; firstName: string; lastName: string; role: string; score: number | null; updatedAt: string | null }>;
    composite: number | null;
    submittedCount: number;
    totalCount: number;
  } | null>(null);

  useEffect(() => {
    apiRequest("GET", "/api/balance/team").then((res) => {
      if (res.success) setData(res.data);
    });
  }, []);

  if (!data) {
    return (
      <Card className="border-0 shadow-sm h-full">
        <CardContent className="pt-6">
          <div className="animate-pulse flex gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 flex-1 bg-slate-100 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const compositeColor = scoreColor(data.composite);
  const compositeBg = scoreBg(data.composite);

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0D7377]" /> Team Pulse
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Composite score */}
        <div
          className="rounded-xl p-4 flex items-center gap-4 mb-4"
          style={{ background: compositeBg }}
          data-testid="card-composite-score"
        >
          <span className="text-4xl select-none">{scoreEmoji(data.composite)}</span>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Collective Energy</p>
            <p
              className="text-4xl font-bold leading-none"
              style={{ color: compositeColor }}
              data-testid="text-composite-value"
            >
              {data.composite !== null ? data.composite.toFixed(1) : "—"}
            </p>
            <p className="text-sm mt-0.5" style={{ color: compositeColor }}>
              {scoreLabel(data.composite)}
              <span className="text-slate-400 ml-2 text-xs">
                ({data.submittedCount}/{data.totalCount} reported)
              </span>
            </p>
          </div>
        </div>

        {/* Per-member grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {data.team.map((member) => {
            const color = scoreColor(member.score);
            const bg = scoreBg(member.score);
            const initials = `${member.firstName[0]}${member.lastName[0]}`;
            const ago = member.updatedAt
              ? (() => {
                  const diff = Date.now() - new Date(member.updatedAt).getTime();
                  const h = Math.floor(diff / 3_600_000);
                  if (h < 1) return "just now";
                  if (h < 24) return `${h}h ago`;
                  return `${Math.floor(h / 24)}d ago`;
                })()
              : null;

            return (
              <div
                key={member.id}
                className="rounded-xl p-3 flex flex-col items-center gap-1 text-center transition-all"
                style={{ background: bg }}
                data-testid={`card-member-score-${member.id}`}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: color }}
                >
                  {initials}
                </div>
                <p className="text-xs font-medium text-slate-700 leading-tight">
                  {member.firstName} {member.lastName[0]}.
                </p>
                {member.score !== null ? (
                  <>
                    <p className="text-lg font-bold leading-none" style={{ color }}>
                      {member.score.toFixed(1)}
                    </p>
                    <p className="text-[10px]" style={{ color }}>
                      {scoreEmoji(member.score)}
                    </p>
                    {ago && <p className="text-[10px] text-slate-400">{ago}</p>}
                  </>
                ) : (
                  <p className="text-xs text-slate-400 italic">No score</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── My Kanban Tasks Panel ─────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: "bg-red-100",    text: "text-red-700",    label: "Urgent" },
  high:   { bg: "bg-orange-100", text: "text-orange-700", label: "High" },
  medium: { bg: "bg-amber-100",  text: "text-amber-700",  label: "Medium" },
  low:    { bg: "bg-blue-100",   text: "text-blue-700",   label: "Low" },
};

function MyTasksPanel() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    apiRequest("GET", "/api/kanban/my-tasks").then((res) => {
      if (res.success) setTasks(res.data.filter((t: any) => !t.archived));
      setLoading(false);
    });
  }, []);

  const open = tasks.filter((t) => t.column?.title?.toLowerCase() !== "done" && t.column?.title?.toLowerCase() !== "valhalla");
  const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
  const VISIBLE = 3;

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Kanban className="w-4 h-4 text-purple-500" /> My Tasks
          </span>
          <span className="text-xs font-normal text-slate-400">{open.length} open{overdue.length > 0 && ` · `}{overdue.length > 0 && <span className="text-red-500">{overdue.length} overdue</span>}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : open.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">All clear — no open tasks.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(showAll ? open : open.slice(0, VISIBLE)).map((task) => {
              const pri = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium;
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
              const dueLabel = task.dueDate
                ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : null;
              return (
                <a
                  key={task.id}
                  href={`/portal/employee/kanban?board=${task.boardId}`}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors group"
                  data-testid={`task-item-${task.id}`}
                >
                  <Circle className="w-4 h-4 mt-0.5 text-slate-300 shrink-0 group-hover:text-[#0D7377] transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F2B] truncate leading-tight">{task.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{task.board?.name} · {task.column?.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {dueLabel && (
                      <span className={`text-xs font-medium ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
                        {isOverdue && <AlertCircle className="w-3 h-3 inline mr-0.5" />}{dueLabel}
                      </span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${pri.bg} ${pri.text}`}>{pri.label}</span>
                  </div>
                </a>
              );
            })}
            {open.length > VISIBLE && (
              <button
                onClick={() => setShowAll(v => !v)}
                className="flex items-center gap-1 text-xs text-[#0D7377] font-medium px-3 py-1 hover:underline w-full text-left"
                data-testid="button-tasks-toggle"
              >
                {showAll ? "Show less" : `See ${open.length - VISIBLE} more`}
                <ArrowRight className={`w-3 h-3 transition-transform ${showAll ? "rotate-90" : ""}`} />
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Client Tickets Panel ──────────────────────────────────────────────────────

const TICKET_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  open:        { bg: "bg-blue-100",   text: "text-blue-700",   label: "Open" },
  in_progress: { bg: "bg-teal-100",   text: "text-[#0D7377]",  label: "In Progress" },
  resolved:    { bg: "bg-green-100",  text: "text-green-700",  label: "Resolved" },
  closed:      { bg: "bg-slate-100",  text: "text-slate-500",  label: "Closed" },
};

function ClientTicketsPanel() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("GET", "/api/employee/tickets").then((res) => {
      if (res.success) setTickets(res.data);
      setLoading(false);
    });
  }, []);

  const active = tickets.filter((t) => t.status !== "closed" && t.status !== "resolved");

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#0D7377]" /> Client Tickets
          </span>
          <span className="text-xs font-normal text-slate-400">{active.length} active</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : active.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active tickets right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.slice(0, 6).map((ticket) => {
              const st = TICKET_STATUS_STYLES[ticket.status] ?? TICKET_STATUS_STYLES.open;
              const pri = PRIORITY_STYLES[ticket.priority] ?? PRIORITY_STYLES.medium;
              const age = (() => {
                const diff = Date.now() - new Date(ticket.createdAt).getTime();
                const h = Math.floor(diff / 3_600_000);
                if (h < 1) return "just now";
                if (h < 24) return `${h}h ago`;
                return `${Math.floor(h / 24)}d ago`;
              })();
              return (
                <a
                  key={ticket.id}
                  href={`/portal/employee/tickets`}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors"
                  data-testid={`ticket-item-${ticket.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F2B] truncate leading-tight">{ticket.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Opened {age}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${pri.bg} ${pri.text}`}>{pri.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                  </div>
                </a>
              );
            })}
            {active.length > 6 && (
              <a href="/portal/employee/tickets" className="flex items-center gap-1 text-xs text-[#0D7377] font-medium px-3 py-1 hover:underline">
                View {active.length - 6} more <ArrowRight className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardContent() {
  const { user } = useAuth();
  type GoogleAccountData = { id: number; email: string; label: string; calendar: any[]; gmail: any[] };
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccountData[]>([]);
  const [syncing, setSyncing] = useState(false);

  async function syncGoogle() {
    setSyncing(true);
    try {
      const res = await apiRequest("GET", "/api/google/dashboard");
      if (res.success && res.data?.accounts) setGoogleAccounts(res.data.accounts);
    } catch {}
    setSyncing(false);
  }

  useEffect(() => {
    document.title = "Dashboard | handləkraft.ai";
    syncGoogle();
  }, []);

  const greetings = ["Ready to raid the backlog", "Onward, Viking", "The longship awaits", "Shields up"];
  const greeting = greetings[new Date().getHours() % greetings.length];

  return (
    <div>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1A1F2B] to-[#0D7377] rounded-2xl mb-6 text-white relative overflow-hidden">
        {/* Decorative Viking */}
        <img
          src={vikingCodingImg}
          alt=""
          aria-hidden="true"
          className="absolute right-0 bottom-0 h-28 sm:h-32 opacity-90 pointer-events-none select-none object-contain object-bottom"
        />
        {/* Subtle background rune pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none" aria-hidden="true"
          style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }} />

        {/* Top row: greeting */}
        <div className="px-6 pt-5 pb-4 pr-28">
          <p className="text-white/55 text-sm mb-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-2xl font-display flex items-center gap-2 flex-wrap">
            {greeting}, {user?.firstName}!
            <VikingArsenal className="text-white/30" />
          </h1>
          <p className="text-white/65 text-sm mt-1.5">Here's your daily briefing from HQ.</p>
        </div>

        {/* Google feed — one section per connected account */}
        {googleAccounts.filter(a => a.calendar.length > 0 || a.gmail.length > 0).length > 0 && (
          <div className="border-t border-white/10 mx-4 mb-1 mt-1" />
        )}
        {googleAccounts.filter(a => a.calendar.length > 0 || a.gmail.length > 0).map((acct, acctIdx) => {
          const LABEL_COLORS = ["text-[#D4A843]", "text-purple-300", "text-orange-300", "text-blue-300"];
          const DOT_COLORS = ["bg-[#D4A843]", "bg-purple-400", "bg-orange-400", "bg-blue-400"];
          const labelColor = LABEL_COLORS[acctIdx % LABEL_COLORS.length];
          const dotColor = DOT_COLORS[acctIdx % DOT_COLORS.length];
          const hasData = acct.calendar.length > 0 || acct.gmail.length > 0;
          if (!hasData) return null;
          return (
            <div key={acct.id} className="px-4 pb-3 pr-28">
              {/* Account label header */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>{acct.label}</span>
                <span className="text-white/30 text-[10px] truncate flex-1">{acct.email}</span>
                <button
                  onClick={syncGoogle}
                  disabled={syncing}
                  title="Sync now"
                  data-testid={`button-sync-google-${acct.id}`}
                  className="text-white/30 hover:text-white/70 disabled:opacity-30 transition-colors p-0.5 rounded shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                </button>
              </div>
              {/* Calendar + Gmail columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Calendar */}
                {acct.calendar.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1.5 text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                      <CalendarDays className="w-3 h-3" /> Upcoming
                    </p>
                    <div className="space-y-1.5">
                      {acct.calendar.map((ev: any) => {
                        const d = ev.eventTime ? new Date(ev.eventTime) : null;
                        const minsUntil = d ? Math.round((d.getTime() - Date.now()) / 60000) : null;
                        const isImminent = minsUntil !== null && minsUntil >= 0 && minsUntil <= 60;
                        const countdown = minsUntil !== null && minsUntil >= 0
                          ? minsUntil === 0 ? "now!" : `in ${minsUntil}m`
                          : null;
                        const dateLabel = d
                          ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                          : "All day";
                        const timeLabel = d
                          ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                          : "";
                        return (
                          <a
                            key={ev.id}
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`banner-cal-${acct.id}-${ev.id}`}
                            className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors group ${
                              isImminent
                                ? "bg-amber-400/20 border border-amber-400/30 hover:bg-amber-400/25"
                                : "hover:bg-white/10"
                            }`}
                          >
                            <div className="shrink-0 text-right min-w-[5.5rem]">
                              <div className={`text-xs font-semibold leading-tight ${isImminent ? "text-amber-300" : labelColor}`}>{dateLabel}</div>
                              {timeLabel && <div className={`text-xs font-mono leading-tight ${isImminent ? "text-amber-300/80" : `${labelColor} opacity-80`}`}>{timeLabel}</div>}
                              {isImminent && countdown && (
                                <div className="text-[10px] font-bold text-amber-400 animate-pulse mt-0.5">{countdown}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0 pt-0.5">
                              {isImminent && (
                                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                              )}
                              <span className={`text-sm font-semibold truncate leading-snug transition-colors ${
                                isImminent ? "text-amber-100" : "text-white group-hover:text-white/80"
                              }`}>{ev.title}</span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Gmail */}
                {acct.gmail.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1.5 text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                      <Mail className="w-3 h-3" /> Recent Mail
                    </p>
                    <div className="space-y-1.5">
                      {acct.gmail.map((email: any) => (
                        <a
                          key={email.id}
                          href={email.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`banner-email-${acct.id}-${email.id}`}
                          className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors group"
                        >
                          <span className={`${labelColor} text-xs font-semibold shrink-0 truncate max-w-[5rem] leading-snug pt-0.5`}>{email.subtitle ?? ""}</span>
                          <span className="text-white text-sm font-semibold truncate leading-snug group-hover:text-white/80 transition-colors">{email.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Divider between accounts */}
              {acctIdx < googleAccounts.filter(a => a.calendar.length > 0 || a.gmail.length > 0).length - 1 && (
                <div className="border-t border-white/10 mt-3" />
              )}
            </div>
          );
        })}
      </div>

      {/* My Tasks + Client Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <MyTasksPanel />
        <ClientTicketsPanel />
      </div>

      {/* ── Communication Hub ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-[#1A1F2B] mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#0D7377]" /> Communication Hub
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0D7377] inline-block" /> Team Chat
            </p>
            <TeamChat />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1A1F2B] inline-block" /> AI Assistant
            </p>
            <ClaudeChat />
          </div>
        </div>
      </div>

      {/* ── Balance Hub ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-[#1A1F2B] mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#D4A843]" /> Balance Hub
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <BalanceSlider />
          <TeamPulse />
        </div>
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  return (
    <PortalGuard allowedRoles={["admin", "employee"]}>
      <EmployeeLayout>
        <DashboardContent />
      </EmployeeLayout>
    </PortalGuard>
  );
}
