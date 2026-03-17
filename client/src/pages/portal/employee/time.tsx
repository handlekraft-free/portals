import { Fragment, useEffect, useState, useCallback } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import {
  Clock, Play, Square, Plus, Trash2, Check, X, ChevronLeft,
  ChevronRight, Send, ThumbsUp, ThumbsDown, FileText, AlertCircle,
  BarChart3, Download, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type DayKey = typeof DAY_KEYS[number];
const DAY_LABELS: Record<DayKey, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

function getMondayOfWeek(d = new Date()) {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(d.getDate() + diff);
  return mon;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFullDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtIso(d: Date) {
  return d.toISOString().split("T")[0];
}

const defaultHours = (): Record<DayKey, number> => ({ mon: 0, tue: 6, wed: 6, thu: 6, fri: 6, sat: 0, sun: 0 });
const formatDuration = (min: number | null) => min ? `${Math.floor(min / 60)}h ${min % 60}m` : "—";
const formatTime = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

// ── Simple Mode Timesheet ─────────────────────────────────────────────────────

function SimpleTimesheetPanel({ weekStart, onSubmitted }: { weekStart: Date; onSubmitted: () => void }) {
  const [hours, setHours] = useState<Record<DayKey, number>>(defaultHours());
  const [notes, setNotes] = useState("");
  const [existingReport, setExistingReport] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const weekEnd = addDays(weekStart, 6);
  const total = DAY_KEYS.reduce((s, k) => s + (hours[k] || 0), 0);

  useEffect(() => {
    loadExisting();
  }, [weekStart]);

  async function loadExisting() {
    const res = await apiRequest("GET", "/api/time/reports");
    if (res.success) {
      const report = res.data.find((r: any) => {
        const ps = new Date(r.periodStart);
        return r.mode === "simple" && fmtIso(ps) === fmtIso(weekStart);
      });
      if (report) {
        setExistingReport(report);
        if (report.simpleDayHours) {
          try { setHours(JSON.parse(report.simpleDayHours)); } catch {}
        }
        setNotes(report.notes || "");
      } else {
        setExistingReport(null);
        setHours(defaultHours());
        setNotes("");
      }
    }
  }

  const isLocked = existingReport?.status === "submitted" || existingReport?.status === "approved";

  async function saveDraft() {
    setSaving(true);
    const payload = {
      periodStart: weekStart.toISOString(),
      periodEnd: weekEnd.toISOString(),
      totalHours: String(total),
      mode: "simple",
      simpleDayHours: hours,
      notes,
    };
    if (existingReport) {
      await apiRequest("PATCH", `/api/time/reports/${existingReport.id}`, { totalHours: String(total), simpleDayHours: hours, notes });
    } else {
      const res = await apiRequest("POST", "/api/time/reports", payload);
      if (res.success) setExistingReport(res.data);
    }
    setSaving(false);
    await loadExisting();
  }

  async function submitSheet() {
    if (!confirm("Submit this timesheet for approval? You won't be able to edit it after submission.")) return;
    setSaving(true);
    if (existingReport) {
      await apiRequest("PATCH", `/api/time/reports/${existingReport.id}/submit`, { totalHours: String(total), simpleDayHours: hours, notes });
    } else {
      const createRes = await apiRequest("POST", "/api/time/reports", {
        periodStart: weekStart.toISOString(),
        periodEnd: weekEnd.toISOString(),
        totalHours: String(total),
        mode: "simple",
        simpleDayHours: hours,
        notes,
      });
      if (createRes.success) {
        await apiRequest("PATCH", `/api/time/reports/${createRes.data.id}/submit`, {});
      }
    }
    setSaving(false);
    await loadExisting();
    onSubmitted();
  }

  return (
    <div className="space-y-4">
      {existingReport && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${STATUS_COLORS[existingReport.status] || "bg-slate-100 text-slate-600"}`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {existingReport.status === "draft" && "Draft saved — edit and submit when ready."}
          {existingReport.status === "submitted" && "Submitted — awaiting approval."}
          {existingReport.status === "approved" && "Approved — this timesheet is locked."}
          {existingReport.status === "rejected" && `Rejected: "${existingReport.rejectReason}" — edit and resubmit.`}
        </div>
      )}

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-2">
        {DAY_KEYS.map((day, i) => {
          const date = addDays(weekStart, i);
          const isWeekend = day === "sat" || day === "sun";
          const isToday = fmtIso(date) === fmtIso(new Date());
          return (
            <div key={day} className={`rounded-xl p-3 flex flex-col gap-2 ${isWeekend ? "bg-slate-50 border border-slate-100" : "bg-white border border-slate-200 shadow-sm"} ${isToday ? "ring-2 ring-[#0D7377]" : ""}`}>
              <div className="text-center">
                <p className={`text-xs font-semibold uppercase tracking-wide ${isWeekend ? "text-slate-400" : "text-slate-600"}`}>{DAY_LABELS[day]}</p>
                <p className={`text-xs mt-0.5 ${isToday ? "text-[#0D7377] font-bold" : "text-slate-400"}`}>{fmtDate(date)}</p>
              </div>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={hours[day]}
                onChange={e => setHours(prev => ({ ...prev, [day]: parseFloat(e.target.value) || 0 }))}
                disabled={isLocked}
                data-testid={`input-hours-${day}`}
                className={`w-full text-center border rounded-lg py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 ${
                  isLocked ? "bg-slate-50 text-slate-400 cursor-not-allowed" :
                  hours[day] > 0 ? "border-[#0D7377]/40 text-[#1A1F2B]" : "border-slate-200 text-slate-400"
                }`}
              />
              <p className="text-center text-xs text-slate-400">{hours[day] > 0 ? `${hours[day]}h` : "—"}</p>
            </div>
          );
        })}
      </div>

      {/* Total + notes */}
      <div className="flex gap-4 items-start">
        <div className="bg-[#0D7377]/10 rounded-xl px-4 py-3 flex items-center gap-3 shrink-0">
          <Clock className="w-5 h-5 text-[#0D7377]" />
          <div>
            <p className="text-xs text-[#0D7377] font-medium">Total</p>
            <p className="text-xl font-bold text-[#1A1F2B]">{total}h</p>
          </div>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={isLocked}
          placeholder="Notes (optional) — any context for your approver"
          rows={3}
          data-testid="input-timesheet-notes"
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 resize-none disabled:bg-slate-50 disabled:text-slate-400"
        />
      </div>

      {!isLocked && (
        <div className="flex gap-2">
          <Button onClick={saveDraft} disabled={saving} variant="outline" className="gap-2" data-testid="button-save-draft">
            <FileText className="w-4 h-4" /> Save Draft
          </Button>
          <Button onClick={submitSheet} disabled={saving || total === 0} className="bg-[#0D7377] text-white gap-2" data-testid="button-submit-timesheet">
            <Send className="w-4 h-4" /> Submit for Approval
          </Button>
        </div>
      )}

      {existingReport?.status === "rejected" && (
        <Button onClick={() => { setExistingReport((p: any) => ({ ...p, status: "draft" })); }} variant="outline" size="sm">
          Edit & Resubmit
        </Button>
      )}
    </div>
  );
}

// ── Project Tracked Mode ──────────────────────────────────────────────────────

function ProjectTimesheetPanel({ onSubmitted }: { onSubmitted: () => void }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [runningTimer, setRunningTimer] = useState<any>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ projectId: "", taskDescription: "", durationMinutes: "", billable: false, notes: "" });

  useEffect(() => { load(); }, []);
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
    if (timerRes.success && timerRes.data) {
      setRunningTimer(timerRes.data);
      setTimerSeconds(Math.floor((Date.now() - new Date(timerRes.data.startTime).getTime()) / 1000));
    }
    setLoading(false);
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiRequest("POST", "/api/time/entries", { ...form, projectId: form.projectId || null, durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes) : null });
    if (res.success) { setEntries(prev => [res.data, ...prev]); setShowAdd(false); setForm({ projectId: "", taskDescription: "", durationMinutes: "", billable: false, notes: "" }); }
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

  const grouped = entries.reduce((acc: any, e: any) => {
    const day = new Date(e.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    if (!acc[day]) acc[day] = [];
    acc[day].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {runningTimer ? (
          <Button onClick={stopTimer} className="bg-red-500 hover:bg-red-600 text-white gap-2" data-testid="button-stop-timer">
            <Square className="w-4 h-4" /> {formatTime(timerSeconds)} Stop
          </Button>
        ) : (
          <Button onClick={startTimer} className="bg-[#0D7377] hover:bg-[#0D7377]/90 text-white gap-2" data-testid="button-start-timer">
            <Play className="w-4 h-4" /> Start Timer
          </Button>
        )}
        <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-2" data-testid="button-add-entry">
          <Plus className="w-4 h-4" /> Manual Entry
        </Button>
      </div>

      {showAdd && (
        <Card className="border-[#0D7377]/30 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Add Time Entry</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addEntry} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <input required value={form.taskDescription} onChange={e => setForm(f => ({ ...f, taskDescription: e.target.value }))} placeholder="Task description *" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-task-desc" />
              </div>
              <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-project">
                <option value="">No Project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))} placeholder="Duration (minutes)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-duration" />
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" id="billable" checked={form.billable} onChange={e => setForm(f => ({ ...f, billable: e.target.checked }))} data-testid="checkbox-billable" />
                <label htmlFor="billable">Billable</label>
              </div>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" rows={2} className="md:col-span-2 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-[#0D7377] text-white gap-1" data-testid="button-save-entry"><Check className="w-4 h-4" /> Save</Button>
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No entries yet. Start the timer or add a manual entry.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([day, dayEntries]: [string, any]) => {
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
                          <p className="text-xs text-slate-400 mt-0.5">{formatDuration(entry.durationMinutes)}{entry.billable && " · Billable"}</p>
                        </div>
                        <Badge variant="secondary" className={`text-xs shrink-0 ${STATUS_COLORS[entry.status] || ""}`}>{entry.status}</Badge>
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

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryPanel() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("GET", "/api/time/reports").then(res => {
      if (res.success) setReports(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>;

  if (reports.length === 0) return (
    <div className="text-center py-12 text-slate-400">
      <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">No timesheets submitted yet.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {reports.map((r: any) => {
        const start = new Date(r.periodStart);
        const end = new Date(r.periodEnd);
        const dayHours = r.simpleDayHours ? (() => { try { return JSON.parse(r.simpleDayHours); } catch { return null; } })() : null;
        return (
          <Card key={r.id} className="border-0 shadow-sm">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#1A1F2B]">Week of {fmtDate(start)} – {fmtDate(end)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                    <span className="text-xs text-slate-400 capitalize">{r.mode}</span>
                  </div>
                  {r.rejectReason && <p className="text-xs text-red-600 mt-1">Reason: {r.rejectReason}</p>}
                  {dayHours && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {DAY_KEYS.map(k => dayHours[k] > 0 && (
                        <span key={k} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{DAY_LABELS[k]} {dayHours[k]}h</span>
                      ))}
                    </div>
                  )}
                  {r.notes && <p className="text-xs text-slate-500 mt-1 italic">{r.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-[#1A1F2B]">{r.totalHours}h</p>
                  {r.submittedAt && <p className="text-xs text-slate-400">Submitted {new Date(r.submittedAt).toLocaleDateString()}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Approvals Tab ─────────────────────────────────────────────────────────────

function ApprovalsPanel() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiRequest("GET", "/api/time/reports?all=1");
    if (res.success) setReports(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(id: number) {
    await apiRequest("PATCH", `/api/time/reports/${id}/approve`, {});
    setReports(prev => prev.filter(r => r.id !== id));
  }

  async function reject(id: number) {
    if (!rejectReason.trim()) return;
    await apiRequest("PATCH", `/api/time/reports/${id}/reject`, { reason: rejectReason });
    setReports(prev => prev.filter(r => r.id !== id));
    setRejectModal(null);
    setRejectReason("");
  }

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>;

  if (reports.length === 0) return (
    <div className="text-center py-12 text-slate-400">
      <ThumbsUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">No timesheets pending approval.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-[#1A1F2B] mb-3">Reject Timesheet</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (required)" rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 mb-3" data-testid="input-reject-reason" autoFocus />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setRejectModal(null); setRejectReason(""); }}>Cancel</Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={() => reject(rejectModal.id)} disabled={!rejectReason.trim()} data-testid="button-confirm-reject">Reject</Button>
            </div>
          </div>
        </div>
      )}

      {reports.map((r: any) => {
        const start = new Date(r.periodStart);
        const end = new Date(r.periodEnd);
        const dayHours = r.simpleDayHours ? (() => { try { return JSON.parse(r.simpleDayHours); } catch { return null; } })() : null;
        return (
          <Card key={r.id} className="border-0 shadow-sm">
            <CardContent className="py-4 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-7 h-7 rounded-full bg-[#0D7377] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {r.employeeFirstName?.[0]}{r.employeeLastName?.[0]}
                    </div>
                    <span className="font-semibold text-[#1A1F2B] text-sm">{r.employeeFirstName} {r.employeeLastName}</span>
                    <span className="text-xs text-slate-400">{r.employeeEmail}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">Week of {fmtDate(start)} – {fmtDate(end)} · <strong>{r.totalHours}h</strong> · <span className="capitalize">{r.mode}</span></p>
                  {dayHours && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {DAY_KEYS.map(k => dayHours[k] > 0 && (
                        <span key={k} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{DAY_LABELS[k]} {dayHours[k]}h</span>
                      ))}
                    </div>
                  )}
                  {r.notes && <p className="text-xs text-slate-500 mt-1 italic">"{r.notes}"</p>}
                  {r.submittedAt && <p className="text-xs text-slate-400 mt-1">Submitted {new Date(r.submittedAt).toLocaleDateString()}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5" onClick={() => approve(r.id)} data-testid={`button-approve-${r.id}`}>
                    <ThumbsUp className="w-3.5 h-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5" onClick={() => setRejectModal({ id: r.id })} data-testid={`button-reject-${r.id}`}>
                    <ThumbsDown className="w-3.5 h-3.5" /> Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Monthly Reports Panel ─────────────────────────────────────────────────────

function ReportsPanel({ canApprove }: { canApprove: boolean }) {
  const now = new Date();
  const [monthDate, setMonthDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [employeeId, setEmployeeId] = useState("all");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedEmp, setExpandedEmp] = useState<number | null>(null);

  const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const load = useCallback(async () => {
    setLoading(true);
    const url = canApprove
      ? `/api/time/monthly-report?month=${monthStr}&employeeId=${employeeId}`
      : `/api/time/monthly-report?month=${monthStr}`;
    const res = await apiRequest("GET", url);
    if (res.success) setReport(res.data);
    setLoading(false);
  }, [monthStr, employeeId, canApprove]);

  useEffect(() => { load(); }, [load]);

  function prevMonth() { setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth() {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    if (next <= new Date(now.getFullYear(), now.getMonth(), 1)) setMonthDate(next);
  }
  const isCurrentMonth = monthDate.getFullYear() === now.getFullYear() && monthDate.getMonth() === now.getMonth();

  function downloadCSV() {
    const url = canApprove
      ? `/api/time/monthly-report?month=${monthStr}&employeeId=${employeeId}&format=csv`
      : `/api/time/monthly-report?month=${monthStr}&format=csv`;
    window.open(url, "_blank");
  }

  // Build all week labels that appear in data
  const allWeekStarts = Array.from(new Set(
    (report?.employees || []).flatMap((e: any) => e.timesheets.map((t: any) => t.periodStart.split("T")[0]))
  )).sort() as string[];

  const employees: any[] = report?.employees || [];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" data-testid="button-prev-month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-36">
            <p className="font-semibold text-[#1A1F2B] text-sm">{monthLabel}</p>
            {isCurrentMonth && <p className="text-xs text-[#0D7377]">Current Month</p>}
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30" data-testid="button-next-month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {canApprove && employees.length > 0 && (
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 min-w-44"
              data-testid="select-report-employee"
            >
              <option value="all">All Employees</option>
              {employees.map((e: any) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          )}
          <Button variant="outline" onClick={downloadCSV} className="gap-2 text-sm" data-testid="button-export-report">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No timesheets found for {monthLabel}.</p>
          <p className="text-xs mt-1 text-slate-300">Timesheets must be submitted to appear here.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {canApprove && employeeId === "all" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Hours", value: employees.reduce((s: number, e: any) => s + e.monthTotalHours, 0).toFixed(1), color: "text-[#1A1F2B]" },
                { label: "Approved", value: employees.reduce((s: number, e: any) => s + e.approvedHours, 0).toFixed(1), color: "text-green-600" },
                { label: "Pending Review", value: employees.reduce((s: number, e: any) => s + e.pendingHours, 0).toFixed(1), color: "text-blue-600" },
                { label: "Employees", value: employees.length, color: "text-[#0D7377]" },
              ].map(s => (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="pt-3 pb-3">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Report table */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {canApprove && employeeId === "all" && <th className="text-left p-3 pl-4 text-slate-500 font-medium whitespace-nowrap">Employee</th>}
                    {allWeekStarts.map(ws => (
                      <th key={ws} className="text-center p-3 text-slate-500 font-medium whitespace-nowrap text-xs">
                        Wk of {fmtDate(new Date(ws + "T12:00:00"))}
                      </th>
                    ))}
                    <th className="text-right p-3 pr-4 text-slate-500 font-medium">Total</th>
                    <th className="text-right p-3 pr-4 text-slate-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp: any) => {
                    const weekMap = new Map<string, any>();
                    for (const ts of emp.timesheets) {
                      weekMap.set(ts.periodStart.split("T")[0], ts);
                    }
                    const isExpanded = expandedEmp === emp.id;
                    return (
                      <Fragment key={emp.id}>
                        <tr
                          className="border-b last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}
                          data-testid={`report-row-${emp.id}`}
                        >
                          {canApprove && employeeId === "all" && (
                            <td className="p-3 pl-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#0D7377] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {emp.firstName[0]}{emp.lastName[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-[#1A1F2B]">{emp.firstName} {emp.lastName}</p>
                                  <p className="text-xs text-slate-400">{emp.email}</p>
                                </div>
                              </div>
                            </td>
                          )}
                          {allWeekStarts.map(ws => {
                            const ts = weekMap.get(ws);
                            return (
                              <td key={ws} className="p-3 text-center">
                                {ts ? (
                                  <span className={`font-semibold ${ts.status === "approved" ? "text-green-600" : ts.status === "rejected" ? "text-red-500" : ts.status === "submitted" ? "text-blue-600" : "text-slate-400"}`}>
                                    {parseFloat(ts.totalHours).toFixed(0)}h
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-3 pr-4 text-right">
                            <span className="font-bold text-[#1A1F2B]">{emp.monthTotalHours.toFixed(1)}h</span>
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <div className="flex flex-col gap-0.5 items-end">
                              {emp.approvedHours > 0 && <span className="text-xs text-green-600">{emp.approvedHours.toFixed(0)}h approved</span>}
                              {emp.pendingHours > 0 && <span className="text-xs text-blue-600">{emp.pendingHours.toFixed(0)}h pending</span>}
                              {emp.rejectedHours > 0 && <span className="text-xs text-red-500">{emp.rejectedHours.toFixed(0)}h rejected</span>}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${emp.id}-detail`} className="bg-slate-50/50">
                            <td colSpan={allWeekStarts.length + (canApprove && employeeId === "all" ? 3 : 2)} className="px-4 pb-4 pt-2">
                              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Weekly Breakdown</p>
                              <div className="space-y-2">
                                {emp.timesheets.map((ts: any) => {
                                  const dayHours = ts.simpleDayHours ? (() => { try { return JSON.parse(ts.simpleDayHours); } catch { return null; } })() : null;
                                  return (
                                    <div key={ts.id} className="bg-white rounded-lg px-3 py-2 shadow-sm flex flex-wrap gap-3 items-center">
                                      <div className="min-w-32">
                                        <p className="text-xs font-medium text-[#1A1F2B]">
                                          {fmtDate(new Date(ts.periodStart + "T12:00:00"))} – {fmtDate(new Date(ts.periodEnd + "T12:00:00"))}
                                        </p>
                                        <p className="text-xs text-slate-400 capitalize">{ts.mode} · <span className={STATUS_COLORS[ts.status]?.includes("green") ? "text-green-600" : ts.status === "submitted" ? "text-blue-600" : "text-slate-500"}>{ts.status}</span></p>
                                      </div>
                                      {dayHours && (
                                        <div className="flex gap-1.5 flex-wrap">
                                          {DAY_KEYS.map(k => dayHours[k] > 0 && (
                                            <span key={k} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{DAY_LABELS[k]} {dayHours[k]}h</span>
                                          ))}
                                        </div>
                                      )}
                                      <span className="ml-auto font-bold text-sm text-[#1A1F2B]">{parseFloat(ts.totalHours).toFixed(0)}h</span>
                                      {ts.notes && <p className="w-full text-xs text-slate-400 italic">"{ts.notes}"</p>}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-slate-400 text-center">Click any row to expand weekly detail. Hours highlighted in <span className="text-green-600">green</span> are approved, <span className="text-blue-600">blue</span> are pending review.</p>
        </>
      )}
    </div>
  );
}

// ── Main Time Page ────────────────────────────────────────────────────────────

function TimeContent() {
  const { user } = useAuth();
  const [timesheetMode, setTimesheetMode] = useState<"simple" | "project">("simple");
  const [tab, setTab] = useState<"current" | "history" | "approvals" | "reports">("current");
  const [weekStart, setWeekStart] = useState<Date>(getMondayOfWeek());
  const [historyKey, setHistoryKey] = useState(0);

  const canApprove = user?.role === "admin" || user?.canApprove === true;

  useEffect(() => { document.title = "Timesheets | handləkraft.ai"; }, []);

  const weekEnd = addDays(weekStart, 6);

  function prevWeek() { setWeekStart(d => addDays(d, -7)); }
  function nextWeek() { setWeekStart(d => addDays(d, 7)); }
  const isCurrentWeek = fmtIso(weekStart) === fmtIso(getMondayOfWeek());

  const tabs = [
    { key: "current", label: "Current Timesheet" },
    { key: "history", label: "My History" },
    { key: "reports", label: "Monthly Reports" },
    ...(canApprove ? [{ key: "approvals", label: "Approvals Queue" }] : []),
  ];

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">Timesheets</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track your hours and submit for approval.</p>
        </div>
        {/* Mode toggle */}
        {tab === "current" && (
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 self-start sm:self-auto">
            <button
              onClick={() => setTimesheetMode("simple")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timesheetMode === "simple" ? "bg-white shadow text-[#1A1F2B]" : "text-slate-500 hover:text-slate-700"}`}
              data-testid="button-mode-simple"
            >
              Simple
            </button>
            <button
              onClick={() => setTimesheetMode("project")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timesheetMode === "project" ? "bg-white shadow text-[#1A1F2B]" : "text-slate-500 hover:text-slate-700"}`}
              data-testid="button-mode-project"
            >
              Project Tracked
            </button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key ? "border-[#0D7377] text-[#0D7377]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            data-testid={`tab-${t.key}`}
          >
            {t.label}
            {t.key === "approvals" && <span className="ml-1.5 bg-[#0D7377] text-white text-xs rounded-full px-1.5 py-0.5">!</span>}
          </button>
        ))}
      </div>

      {/* Current timesheet: week nav + content */}
      {tab === "current" && timesheetMode === "simple" && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500" data-testid="button-prev-week">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold text-[#1A1F2B]">{fmtDate(weekStart)} – {fmtDate(weekEnd)}</p>
              {isCurrentWeek && <span className="text-xs text-[#0D7377] font-medium">Current Week</span>}
            </div>
            <button onClick={nextWeek} disabled={isCurrentWeek} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 disabled:opacity-30" data-testid="button-next-week">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <SimpleTimesheetPanel key={fmtIso(weekStart)} weekStart={weekStart} onSubmitted={() => { setHistoryKey(k => k + 1); }} />
        </>
      )}

      {tab === "current" && timesheetMode === "project" && (
        <ProjectTimesheetPanel onSubmitted={() => setHistoryKey(k => k + 1)} />
      )}

      {tab === "history" && <HistoryPanel key={historyKey} />}
      {tab === "reports" && <ReportsPanel canApprove={canApprove} />}
      {tab === "approvals" && <ApprovalsPanel />}
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
