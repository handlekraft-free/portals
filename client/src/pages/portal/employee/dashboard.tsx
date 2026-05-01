import { useEffect, useState, useCallback, useRef } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth";
import { Clock, Receipt, Kanban, MessageSquare, Play, Square, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "#94a3b8";
  if (score < 2) return "#ef4444";
  if (score < 3) return "#f97316";
  if (score < 3.5) return "#eab308";
  if (score < 4.5) return "#0D7377";
  return "#22c55e";
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
  if (score < 3) return "#ffedd5";
  if (score < 3.5) return "#fef9c3";
  if (score < 4.5) return "#ccfbf1";
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
    <Card className="border-0 shadow-sm mb-6">
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
      <Card className="border-0 shadow-sm mb-6">
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
    <Card className="border-0 shadow-sm mb-6">
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

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardContent() {
  const { user } = useAuth();
  const [weekHours, setWeekHours] = useState<number>(0);
  const [runningTimer, setRunningTimer] = useState<any>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timerTask, setTimerTask] = useState("");

  useEffect(() => {
    document.title = "Dashboard | handləkraft.ai";
    loadDashboard();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (runningTimer) {
      const startMs = new Date(runningTimer.startTime).getTime();
      interval = setInterval(() => {
        setTimerSeconds(Math.floor((Date.now() - startMs) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [runningTimer]);

  async function loadDashboard() {
    setLoading(true);
    const [timerRes, entriesRes] = await Promise.all([
      apiRequest("GET", "/api/time/timer/running"),
      apiRequest("GET", "/api/time/entries"),
    ]);
    if (timerRes.success && timerRes.data) {
      setRunningTimer(timerRes.data);
      setTimerSeconds(Math.floor((Date.now() - new Date(timerRes.data.startTime).getTime()) / 1000));
    }
    if (entriesRes.success) {
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
      const weekEntries = entriesRes.data.filter((e: any) => new Date(e.createdAt) >= thisWeek);
      const totalMin = weekEntries.reduce((sum: number, e: any) => sum + (e.durationMinutes || 0), 0);
      setWeekHours(Math.round((totalMin / 60) * 10) / 10);
    }
    setLoading(false);
  }

  async function startTimer() {
    if (!timerTask.trim()) return;
    const res = await apiRequest("POST", "/api/time/timer/start", { taskDescription: timerTask });
    if (res.success) { setRunningTimer(res.data); setTimerSeconds(0); setTimerTask(""); }
  }

  async function stopTimer() {
    await apiRequest("POST", "/api/time/timer/stop");
    setRunningTimer(null);
    setTimerSeconds(0);
    loadDashboard();
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const greetings = ["Ready to raid the backlog", "Onward, Viking", "The longship awaits", "Shields up"];
  const greeting = greetings[new Date().getHours() % greetings.length];

  return (
    <div>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1A1F2B] to-[#0D7377] rounded-2xl p-6 mb-6 text-white">
        <p className="text-white/60 text-sm mb-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl font-display">
          {greeting}, {user?.firstName}! ⚔️
        </h1>
        <p className="text-white/70 text-sm mt-1">Here's your daily briefing from HQ.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: <Clock className="w-5 h-5 text-[#0D7377]" />, label: "Hours This Week", value: loading ? "—" : `${weekHours}h`, bg: "bg-teal-50" },
          { icon: <Receipt className="w-5 h-5 text-[#D4A843]" />, label: "Pending Expenses", value: "—", bg: "bg-amber-50" },
          { icon: <Kanban className="w-5 h-5 text-purple-500" />, label: "Open Tasks", value: "—", bg: "bg-purple-50" },
          { icon: <MessageSquare className="w-5 h-5 text-blue-500" />, label: "Unread Messages", value: "—", bg: "bg-blue-50" },
        ].map((card, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>{card.icon}</div>
              <p className="text-2xl font-bold text-[#1A1F2B]" data-testid={`stat-${i}`}>{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timer Widget */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0D7377]" /> Quick Timer
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runningTimer ? (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-3xl font-mono font-bold text-[#0D7377]" data-testid="text-timer-running">{formatTime(timerSeconds)}</p>
                <p className="text-sm text-slate-500 mt-1 truncate">{runningTimer.taskDescription}</p>
              </div>
              <Button onClick={stopTimer} className="bg-red-500 hover:bg-red-600 text-white gap-2 shrink-0" data-testid="button-stop-timer">
                <Square className="w-4 h-4" /> Stop
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={timerTask}
                onChange={(e) => setTimerTask(e.target.value)}
                placeholder="What are you working on?"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
                data-testid="input-timer-task"
                onKeyDown={(e) => e.key === "Enter" && startTimer()}
              />
              <Button
                onClick={startTimer}
                disabled={!timerTask.trim()}
                className="bg-[#0D7377] hover:bg-[#0D7377]/90 text-white gap-2 shrink-0"
                data-testid="button-start-timer"
              >
                <Play className="w-4 h-4" /> Start
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Energy Slider */}
      <BalanceSlider />

      {/* Team Pulse */}
      <TeamPulse />

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/portal/employee/time", label: "Log Time", icon: <Clock className="w-5 h-5" />, color: "bg-[#0D7377] text-white" },
          { href: "/portal/employee/kanban", label: "View Boards", icon: <Kanban className="w-5 h-5" />, color: "bg-[#1A1F2B] text-white" },
          { href: "/portal/employee/expenses", label: "Add Expense", icon: <Receipt className="w-5 h-5" />, color: "bg-[#D4A843] text-[#1A1F2B]" },
          { href: "/portal/employee/tickets", label: "View Tickets", icon: <MessageSquare className="w-5 h-5" />, color: "bg-purple-600 text-white" },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`${link.color} rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity text-center`}
            data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {link.icon}
            {link.label}
          </a>
        ))}
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
