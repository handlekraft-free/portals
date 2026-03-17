import { useEffect, useState } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth";
import { Clock, Receipt, Kanban, MessageSquare, Play, Square, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      setWeekHours(Math.round(totalMin / 60 * 10) / 10);
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

  const formatTime = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const greetings = ["Ready to raid the backlog", "Onward, Viking", "The longship awaits", "Shields up"];
  const greeting = greetings[new Date().getHours() % greetings.length];

  return (
    <div>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1A1F2B] to-[#0D7377] rounded-2xl p-6 mb-6 text-white">
        <p className="text-white/60 text-sm mb-1">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
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
              <input value={timerTask} onChange={e => setTimerTask(e.target.value)} placeholder="What are you working on?" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-timer-task" onKeyDown={e => e.key === "Enter" && startTimer()} />
              <Button onClick={startTimer} disabled={!timerTask.trim()} className="bg-[#0D7377] hover:bg-[#0D7377]/90 text-white gap-2 shrink-0" data-testid="button-start-timer">
                <Play className="w-4 h-4" /> Start
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/portal/employee/time", label: "Log Time", icon: <Clock className="w-5 h-5" />, color: "bg-[#0D7377] text-white" },
          { href: "/portal/employee/kanban", label: "View Boards", icon: <Kanban className="w-5 h-5" />, color: "bg-[#1A1F2B] text-white" },
          { href: "/portal/employee/expenses", label: "Add Expense", icon: <Receipt className="w-5 h-5" />, color: "bg-[#D4A843] text-[#1A1F2B]" },
          { href: "/portal/employee/tickets", label: "View Tickets", icon: <MessageSquare className="w-5 h-5" />, color: "bg-purple-600 text-white" },
        ].map(link => (
          <a key={link.href} href={link.href} className={`${link.color} rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity text-center`} data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}>
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
