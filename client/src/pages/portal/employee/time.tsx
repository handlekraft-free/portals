import { useEffect, useState } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Clock, Play, Square, Plus, Trash2, Edit, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function TimeContent() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [runningTimer, setRunningTimer] = useState<any>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ projectId: "", taskDescription: "", startTime: "", endTime: "", durationMinutes: "", billable: false, notes: "" });

  useEffect(() => { document.title = "Time Tracking | handləkraft.ai"; load(); }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (runningTimer) {
      const startMs = new Date(runningTimer.startTime).getTime();
      interval = setInterval(() => setTimerSeconds(Math.floor((Date.now() - startMs) / 1000)), 1000);
    }
    return () => clearInterval(interval);
  }, [runningTimer]);

  async function load() {
    setLoading(true);
    const [entriesRes, projectsRes, timerRes] = await Promise.all([
      apiRequest("GET", "/api/time/entries"),
      apiRequest("GET", "/api/time/projects"),
      apiRequest("GET", "/api/time/timer/running"),
    ]);
    if (entriesRes.success) setEntries(entriesRes.data);
    if (projectsRes.success) setProjects(projectsRes.data);
    if (timerRes.success && timerRes.data) { setRunningTimer(timerRes.data); setTimerSeconds(Math.floor((Date.now() - new Date(timerRes.data.startTime).getTime()) / 1000)); }
    setLoading(false);
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiRequest("POST", "/api/time/entries", { ...form, projectId: form.projectId || null, durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes) : null });
    if (res.success) { setEntries(prev => [res.data, ...prev]); setShowAdd(false); setForm({ projectId: "", taskDescription: "", startTime: "", endTime: "", durationMinutes: "", billable: false, notes: "" }); }
  }

  async function deleteEntry(id: number) {
    if (!confirm("Delete this entry?")) return;
    await apiRequest("DELETE", `/api/time/entries/${id}`);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  async function startTimer() {
    const task = prompt("What are you working on?");
    if (!task) return;
    const res = await apiRequest("POST", "/api/time/timer/start", { taskDescription: task });
    if (res.success) { setRunningTimer(res.data); setTimerSeconds(0); }
  }

  async function stopTimer() {
    await apiRequest("POST", "/api/time/timer/stop");
    setRunningTimer(null); setTimerSeconds(0); load();
  }

  const formatTime = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const formatDuration = (min: number | null) => min ? `${Math.floor(min / 60)}h ${min % 60}m` : "—";

  const grouped = entries.reduce((acc: any, e: any) => {
    const day = new Date(e.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    if (!acc[day]) acc[day] = [];
    acc[day].push(e);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-display text-[#1A1F2B]">Time Tracking</h1><p className="text-slate-500 text-sm mt-0.5">Log your hours and track what you've been pillaging.</p></div>
        <div className="flex gap-2">
          {runningTimer ? (
            <Button onClick={stopTimer} className="bg-red-500 hover:bg-red-600 text-white gap-2" data-testid="button-stop-timer">
              <Square className="w-4 h-4" /> {formatTime(timerSeconds)} Stop
            </Button>
          ) : (
            <Button onClick={startTimer} className="bg-[#0D7377] hover:bg-[#0D7377]/90 text-white gap-2" data-testid="button-start-timer">
              <Play className="w-4 h-4" /> Start Timer
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-2" data-testid="button-add-entry"><Plus className="w-4 h-4" /> Manual Entry</Button>
        </div>
      </div>

      {showAdd && (
        <Card className="border-[#0D7377]/30 shadow-sm mb-6">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Add Time Entry</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addEntry} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <input required value={form.taskDescription} onChange={e => setForm(f => ({ ...f, taskDescription: e.target.value }))} placeholder="Task description *" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-task-desc" />
              </div>
              <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="select-project">
                <option value="">No Project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))} placeholder="Duration (minutes)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-duration" />
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" id="billable" checked={form.billable} onChange={e => setForm(f => ({ ...f, billable: e.target.checked }))} data-testid="checkbox-billable" />
                <label htmlFor="billable">Billable</label>
              </div>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" rows={2} className="md:col-span-2 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-[#0D7377] text-white gap-1" data-testid="button-save-entry"><Check className="w-4 h-4" /> Save</Button>
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)} data-testid="button-cancel-entry"><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-16 text-slate-400"><Clock className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No time entries yet. Start the timer or add a manual entry.</p></div>
          ) : Object.entries(grouped).map(([day, dayEntries]: [string, any]) => {
            const dayTotal = dayEntries.reduce((s: number, e: any) => s + (e.durationMinutes || 0), 0);
            return (
              <div key={day}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-600">{day}</h3>
                  <span className="text-xs text-slate-400">{formatDuration(dayTotal)} total</span>
                </div>
                <div className="space-y-2">
                  {dayEntries.map((entry: any) => (
                    <Card key={entry.id} className="border-0 shadow-sm">
                      <CardContent className="py-3 px-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1F2B] truncate">{entry.taskDescription}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDuration(entry.durationMinutes)} {entry.billable && "· Billable"}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">{entry.status}</Badge>
                        {entry.status === "draft" && (
                          <button onClick={() => deleteEntry(entry.id)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0" data-testid={`button-delete-entry-${entry.id}`}><Trash2 className="w-4 h-4" /></button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EmployeeTime() {
  return (
    <PortalGuard allowedRoles={["admin", "employee"]}>
      <EmployeeLayout><TimeContent /></EmployeeLayout>
    </PortalGuard>
  );
}
