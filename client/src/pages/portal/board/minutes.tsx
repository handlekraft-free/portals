import { useEffect, useState, useCallback } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import {
  ScrollText, Plus, ChevronRight, ArrowLeft, Check, Gavel,
  FileText, Clock, Download, History, Send, Lock, Pencil, Trash2,
  X, ChevronDown, ChevronUp, Users, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  if (status === "approved") return "bg-green-100 text-green-700 border-green-200";
  if (status === "pending_approval") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-500 border-slate-200";
}
function statusLabel(status: string) {
  if (status === "approved") return "Approved";
  if (status === "pending_approval") return "Pending Approval";
  return "Draft";
}

function parseContent(content: string | null): Record<string, any> {
  if (!content) return {};
  try { return JSON.parse(content); } catch { return { generalNotes: content }; }
}

// ─── Version History Drawer ───────────────────────────────────────────────────

function HistoryDrawer({ minutesId, onClose }: { minutesId: number; onClose: () => void }) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    apiRequest("GET", `/api/board/minutes/${minutesId}/history`).then(r => {
      if (r.success) setVersions(r.data);
      setLoading(false);
    });
  }, [minutesId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="history-drawer">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-[#1A1F2B]">Version History</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" data-testid="button-close-history"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)
          ) : versions.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">No saved versions yet.</p>
          ) : versions.map(v => (
            <div key={v.id} className="border border-slate-200 rounded-lg overflow-hidden" data-testid={`version-${v.id}`}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
                onClick={() => setExpanded(expanded === v.id ? null : v.id)}
              >
                <div>
                  <p className="text-sm font-semibold text-[#1A1F2B]">Version {v.version_number}</p>
                  <p className="text-xs text-slate-400">{new Date(v.saved_at).toLocaleString()} — {v.first_name} {v.last_name}</p>
                </div>
                {expanded === v.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {expanded === v.id && (
                <div className="px-4 pb-3 border-t border-slate-100 bg-slate-50">
                  {v.content_snapshot ? (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Content Snapshot:</p>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-6">
                        {(() => { try { const p = JSON.parse(v.content_snapshot); return p.generalNotes || p.callToOrder || JSON.stringify(p, null, 2); } catch { return v.content_snapshot; } })()}
                      </p>
                    </div>
                  ) : <p className="text-xs text-slate-400 mt-2 italic">No content snapshot.</p>}
                  {v.motions_snapshot && (() => {
                    try {
                      const motions = JSON.parse(v.motions_snapshot);
                      if (!motions.length) return null;
                      return (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-slate-500 mb-1">{motions.length} Motion(s)</p>
                          {motions.map((m: any, i: number) => (
                            <p key={i} className="text-xs text-slate-600 truncate">• {m.motionText}</p>
                          ))}
                        </div>
                      );
                    } catch { return null; }
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Motion Form ──────────────────────────────────────────────────────────────

function MotionForm({ boardMembers, onSave, onCancel, initial }: {
  boardMembers: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
  initial?: any;
}) {
  const [form, setForm] = useState({
    motionText: initial?.motionText ?? "",
    moverId: initial?.moverId ?? "",
    seconderId: initial?.seconderId ?? "",
    votesFor: initial?.votesFor ?? 0,
    votesAgainst: initial?.votesAgainst ?? 0,
    votesAbstain: initial?.votesAbstain ?? 0,
    passed: initial?.passed ?? false,
    recusedDirectors: initial?.recusedDirectors ?? "",
  });
  return (
    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <textarea
        value={form.motionText}
        onChange={e => setForm(f => ({ ...f, motionText: e.target.value }))}
        placeholder="Motion text (required)…"
        rows={3}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
        data-testid="input-motion-text"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 font-medium">Moved by</label>
          <select value={form.moverId} onChange={e => setForm(f => ({ ...f, moverId: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none mt-0.5" data-testid="select-mover">
            <option value="">— Select —</option>
            {boardMembers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium">Seconded by</label>
          <select value={form.seconderId} onChange={e => setForm(f => ({ ...f, seconderId: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none mt-0.5" data-testid="select-seconder">
            <option value="">— Select —</option>
            {boardMembers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["votesFor", "votesAgainst", "votesAbstain"] as const).map((key, i) => (
          <div key={key}>
            <label className="text-xs text-slate-500 font-medium">{["For", "Against", "Abstain"][i]}</label>
            <input type="number" min={0} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) || 0 }))}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none mt-0.5" data-testid={`input-votes-${key}`} />
          </div>
        ))}
      </div>
      <div>
        <label className="text-xs text-slate-500 font-medium">Recused directors (optional)</label>
        <input value={form.recusedDirectors} onChange={e => setForm(f => ({ ...f, recusedDirectors: e.target.value }))}
          placeholder="e.g. Jane Doe (conflict of interest)"
          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none mt-0.5" data-testid="input-recused" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer" data-testid="label-motion-passed">
        <input type="checkbox" checked={form.passed} onChange={e => setForm(f => ({ ...f, passed: e.target.checked }))} className="rounded" data-testid="checkbox-motion-passed" />
        Motion passed
      </label>
      <div className="flex gap-2">
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => onSave(form)} data-testid="button-save-motion">Save Motion</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Action Item Form ─────────────────────────────────────────────────────────

function ActionItemForm({ boardMembers, onSave, onCancel, initial }: {
  boardMembers: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
  initial?: any;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    assignedTo: initial?.assignedTo ?? "",
    dueDate: initial?.dueDate ? new Date(initial.dueDate).toISOString().split("T")[0] : "",
  });
  return (
    <div className="space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Action item title (required)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-action-title" />
      <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-action-desc" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 font-medium">Assigned to</label>
          <select value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none mt-0.5" data-testid="select-action-assignee">
            <option value="">— Unassigned —</option>
            {boardMembers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium">Due date</label>
          <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none mt-0.5" data-testid="input-action-due" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => onSave(form)} data-testid="button-save-action">Save Item</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Full Minutes Editor ──────────────────────────────────────────────────────

function MinutesEditor({ meeting, onBack }: { meeting: any; onBack: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [minutes, setMinutes] = useState<any>(null);
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Structured content
  const [content, setContent] = useState<Record<string, any>>({});

  // Attendance
  const [attendance, setAttendance] = useState<Record<number, "present" | "absent" | "excused">>({});

  // Motions
  const [addingMotion, setAddingMotion] = useState(false);
  const [editingMotion, setEditingMotion] = useState<number | null>(null);

  // Action items
  const [addingAction, setAddingAction] = useState(false);
  const [editingAction, setEditingAction] = useState<number | null>(null);

  // Reports array
  const [reports, setReports] = useState<Array<{ title: string; presenter: string; content: string }>>([]);

  const locked = minutes?.status === "approved";

  useEffect(() => {
    async function load() {
      const [minsRes, membersRes, attendeeRes] = await Promise.all([
        apiRequest("GET", `/api/board/meetings/${meeting.id}/minutes`),
        apiRequest("GET", "/api/board/members"),
        apiRequest("GET", `/api/board/meetings/${meeting.id}`),
      ]);
      setBoardMembers(membersRes.success ? membersRes.data : []);
      if (minsRes.success && minsRes.data) {
        setMinutes(minsRes.data);
        const parsed = parseContent(minsRes.data.content);
        setContent(parsed);
        setReports(parsed.reports ?? []);
      }
      // Pre-fill attendance from meeting attendees
      if (attendeeRes.success && attendeeRes.data?.attendees?.length) {
        const map: Record<number, any> = {};
        for (const a of attendeeRes.data.attendees) map[a.userId] = a.attendance ?? "present";
        setAttendance(map);
      }
      setLoading(false);
    }
    load();
  }, [meeting.id]);

  const contentJson = useCallback(() => JSON.stringify({ ...content, reports }), [content, reports]);

  async function ensureMinutes(): Promise<any> {
    if (minutes) return minutes;
    const r = await apiRequest("POST", `/api/board/meetings/${meeting.id}/minutes`, {});
    if (r.success) { setMinutes(r.data); return r.data; }
    return null;
  }

  async function saveDraft() {
    setSaving(true);
    const m = await ensureMinutes();
    if (!m) { setSaving(false); return; }
    const r = await apiRequest("PATCH", `/api/board/minutes/${m.id}`, {
      content: contentJson(),
      quorumPresent: content.quorumPresent,
      quorumCount: content.quorumCount,
      adjournmentTime: content.adjournmentTime || null,
    });
    if (r.success) {
      setMinutes(r.data);
      toast({ title: "Minutes saved", description: "Draft saved successfully." });
    }
    setSaving(false);
  }

  async function submitForApproval() {
    const m = await ensureMinutes();
    if (!m) return;
    await saveDraft();
    const r = await apiRequest("POST", `/api/board/minutes/${m.id}/submit`, {});
    if (r.success) { setMinutes((prev: any) => ({ ...prev, status: "pending_approval" })); toast({ title: "Submitted", description: "Minutes submitted for board approval." }); }
    else toast({ title: "Error", description: r.error, variant: "destructive" });
  }

  async function approve() {
    if (!minutes) return;
    const r = await apiRequest("POST", `/api/board/minutes/${minutes.id}/approve`, {});
    if (r.success) { setMinutes((prev: any) => ({ ...prev, status: "approved", approvedAt: new Date() })); toast({ title: "Approved", description: "Minutes have been officially approved and locked." }); }
    else toast({ title: "Error", description: r.error, variant: "destructive" });
  }

  async function addMotion(data: any) {
    const m = await ensureMinutes();
    if (!m) return;
    const r = await apiRequest("POST", `/api/board/minutes/${m.id}/motions`, data);
    if (r.success) { setMinutes((prev: any) => ({ ...prev, motions: [...(prev.motions ?? []), r.data] })); setAddingMotion(false); }
    else toast({ title: "Error", description: r.error, variant: "destructive" });
  }

  async function updateMotion(motionId: number, data: any) {
    if (!minutes) return;
    const r = await apiRequest("PATCH", `/api/board/minutes/${minutes.id}/motions/${motionId}`, data);
    if (r.success) { setMinutes((prev: any) => ({ ...prev, motions: prev.motions.map((m: any) => m.id === motionId ? r.data : m) })); setEditingMotion(null); }
  }

  async function deleteMotion(motionId: number) {
    if (!minutes || !confirm("Delete this motion?")) return;
    await apiRequest("DELETE", `/api/board/minutes/${minutes.id}/motions/${motionId}`);
    setMinutes((prev: any) => ({ ...prev, motions: prev.motions.filter((m: any) => m.id !== motionId) }));
  }

  async function addAction(data: any) {
    const m = await ensureMinutes();
    if (!m) return;
    const r = await apiRequest("POST", `/api/board/minutes/${m.id}/action-items`, data);
    if (r.success) { setMinutes((prev: any) => ({ ...prev, actionItems: [...(prev.actionItems ?? []), r.data] })); setAddingAction(false); }
    else toast({ title: "Error", description: r.error, variant: "destructive" });
  }

  async function updateAction(itemId: number, data: any) {
    if (!minutes) return;
    const r = await apiRequest("PATCH", `/api/board/minutes/${minutes.id}/action-items/${itemId}`, data);
    if (r.success) { setMinutes((prev: any) => ({ ...prev, actionItems: prev.actionItems.map((a: any) => a.id === itemId ? r.data : a) })); setEditingAction(null); }
  }

  async function deleteAction(itemId: number) {
    if (!minutes || !confirm("Delete this action item?")) return;
    await apiRequest("DELETE", `/api/board/minutes/${minutes.id}/action-items/${itemId}`);
    setMinutes((prev: any) => ({ ...prev, actionItems: prev.actionItems.filter((a: any) => a.id !== itemId) }));
  }

  function addReport() {
    setReports(r => [...r, { title: "", presenter: "", content: "" }]);
  }
  function removeReport(i: number) {
    setReports(r => r.filter((_, idx) => idx !== i));
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  const meetingDate = new Date(meeting.scheduledAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div>
      {showHistory && minutes && <HistoryDrawer minutesId={minutes.id} onClose={() => setShowHistory(false)} />}

      {/* Back + title */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mb-2" data-testid="button-back-minutes">
            <ArrowLeft className="w-4 h-4" /> All Meetings
          </button>
          <h1 className="text-2xl font-display text-[#1A1F2B] leading-tight">{meeting.title}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{meetingDate}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end mt-1">
          {minutes && (
            <Badge className={`text-xs border ${statusColor(minutes.status)}`} data-testid="badge-minutes-status">
              {minutes.status === "approved" && <Lock className="w-3 h-3 mr-1" />}
              {statusLabel(minutes.status)}
            </Badge>
          )}
          {minutes && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setShowHistory(true)} data-testid="button-history">
              <History className="w-3.5 h-3.5" /> History
            </Button>
          )}
          <a href={`/api/board/meetings/${meeting.id}/packet`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50" data-testid="button-download-packet">
              <Download className="w-3.5 h-3.5" /> Download Packet
            </Button>
          </a>
        </div>
      </div>

      <div className="space-y-4">

        {/* ── Header / Meeting Info ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Meeting Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 pb-4">
            <div><p className="text-xs text-slate-400">Type</p><p className="text-sm text-slate-700 capitalize">{meeting.meetingType || "Regular"}</p></div>
            <div><p className="text-xs text-slate-400">Date & Time</p><p className="text-sm text-slate-700">{meetingDate}</p></div>
            {meeting.location && <div><p className="text-xs text-slate-400">Location</p><p className="text-sm text-slate-700">{meeting.location}</p></div>}
            {meeting.platform && <div><p className="text-xs text-slate-400">Platform</p><p className="text-sm text-slate-700">{meeting.platform}</p></div>}
            <div><p className="text-xs text-slate-400">Quorum required</p><p className="text-sm text-slate-700">{meeting.quorumNumber ?? 3} members</p></div>
          </CardContent>
        </Card>

        {/* ── Attendance & Quorum ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Attendance & Quorum
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            {boardMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {boardMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg" data-testid={`attendee-${m.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1F2B] truncate">{m.firstName} {m.lastName}</p>
                      {m.boardPosition && <p className="text-xs text-slate-400">{m.boardPosition}</p>}
                    </div>
                    <select
                      value={attendance[m.id] ?? ""}
                      onChange={e => setAttendance(a => ({ ...a, [m.id]: e.target.value as any }))}
                      disabled={locked || !isAdmin}
                      className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none disabled:opacity-60"
                      data-testid={`select-attendance-${m.id}`}
                    >
                      <option value="">—</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="excused">Excused</option>
                    </select>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400 italic">No board members found.</p>}

            {/* Quorum summary */}
            <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600 font-medium">Quorum present?</label>
                <input
                  type="checkbox"
                  checked={!!content.quorumPresent}
                  onChange={e => setContent(c => ({ ...c, quorumPresent: e.target.checked }))}
                  disabled={locked || !isAdmin}
                  className="rounded"
                  data-testid="checkbox-quorum"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Count:</label>
                <input
                  type="number"
                  min={0}
                  value={content.quorumCount ?? ""}
                  onChange={e => setContent(c => ({ ...c, quorumCount: e.target.value }))}
                  disabled={locked || !isAdmin}
                  className="w-16 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none disabled:opacity-60"
                  data-testid="input-quorum-count"
                />
              </div>
              {content.quorumPresent && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Quorum Met</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Narrative Notes ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ScrollText className="w-3.5 h-3.5" /> Meeting Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-4">
            {/* Call to order */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Call to Order</label>
              <input
                value={content.callToOrder ?? ""}
                onChange={e => setContent(c => ({ ...c, callToOrder: e.target.value }))}
                disabled={locked}
                placeholder="e.g. Meeting called to order at 7:00 PM by the Chair."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50 disabled:text-slate-400"
                data-testid="input-call-to-order"
              />
            </div>
            {/* Opening remarks */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Opening Remarks</label>
              <textarea
                value={content.openingRemarks ?? ""}
                onChange={e => setContent(c => ({ ...c, openingRemarks: e.target.value }))}
                disabled={locked}
                placeholder="Any opening remarks or announcements…"
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none disabled:bg-slate-50 disabled:text-slate-400"
                data-testid="textarea-opening-remarks"
              />
            </div>
            {/* Reports */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-500">Reports</label>
                {!locked && isAdmin && (
                  <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" onClick={addReport} data-testid="button-add-report">
                    <Plus className="w-3 h-3" /> Add Report
                  </Button>
                )}
              </div>
              {reports.length === 0 && <p className="text-sm text-slate-400 italic">No reports added.</p>}
              <div className="space-y-3">
                {reports.map((report, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50" data-testid={`report-${i}`}>
                    <div className="flex items-center gap-2">
                      <input
                        value={report.title}
                        onChange={e => setReports(r => r.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
                        disabled={locked}
                        placeholder="Report title (e.g. Executive Director Report)"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none disabled:bg-white"
                        data-testid={`input-report-title-${i}`}
                      />
                      {!locked && isAdmin && (
                        <button onClick={() => removeReport(i)} className="text-slate-400 hover:text-red-500" data-testid={`button-remove-report-${i}`}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <input
                      value={report.presenter}
                      onChange={e => setReports(r => r.map((x, idx) => idx === i ? { ...x, presenter: e.target.value } : x))}
                      disabled={locked}
                      placeholder="Presenter (optional)"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none disabled:bg-white"
                      data-testid={`input-report-presenter-${i}`}
                    />
                    <textarea
                      value={report.content}
                      onChange={e => setReports(r => r.map((x, idx) => idx === i ? { ...x, content: e.target.value } : x))}
                      disabled={locked}
                      placeholder="Report notes and discussion…"
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none resize-none disabled:bg-white"
                      data-testid={`textarea-report-content-${i}`}
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* General business */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">General Business / Other Notes</label>
              <textarea
                value={content.generalNotes ?? ""}
                onChange={e => setContent(c => ({ ...c, generalNotes: e.target.value }))}
                disabled={locked}
                placeholder="Any other business discussed…"
                rows={4}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none disabled:bg-slate-50 disabled:text-slate-400"
                data-testid="textarea-general-notes"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Motions ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Gavel className="w-3.5 h-3.5" /> Motions ({minutes?.motions?.length ?? 0})
              </CardTitle>
              {!locked && isAdmin && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddingMotion(true)} data-testid="button-add-motion">
                  <Plus className="w-3 h-3" /> Add Motion
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            {(!minutes?.motions || minutes.motions.length === 0) && !addingMotion && (
              <p className="text-sm text-slate-400 italic text-center py-2">No motions recorded.</p>
            )}
            {minutes?.motions?.map((m: any, i: number) => (
              <div key={m.id} data-testid={`motion-${m.id}`}>
                {editingMotion === m.id ? (
                  <MotionForm boardMembers={boardMembers} initial={m} onSave={d => updateMotion(m.id, d)} onCancel={() => setEditingMotion(null)} />
                ) : (
                  <div className={`p-3 rounded-lg border ${m.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-400 mt-0.5 shrink-0">#{i + 1}</span>
                        <p className="text-sm font-medium text-[#1A1F2B]">{m.motionText}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge className={`text-xs border ${m.passed ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                          {m.passed ? <><Check className="w-3 h-3 mr-0.5" />Passed</> : <>Failed</>}
                        </Badge>
                        {!locked && isAdmin && (
                          <>
                            <button onClick={() => setEditingMotion(m.id)} className="text-slate-400 hover:text-indigo-500 ml-1" data-testid={`button-edit-motion-${m.id}`}><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteMotion(m.id)} className="text-slate-400 hover:text-red-500" data-testid={`button-delete-motion-${m.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 mt-1.5 text-xs text-slate-500 flex-wrap pl-5">
                      {(m.votesFor > 0 || m.votesAgainst > 0 || m.votesAbstain > 0) && (
                        <span>Vote: {m.votesFor} For — {m.votesAgainst} Against — {m.votesAbstain} Abstain</span>
                      )}
                      {m.recusedDirectors && <span>Recused: {m.recusedDirectors}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {addingMotion && (
              <MotionForm boardMembers={boardMembers} onSave={addMotion} onCancel={() => setAddingMotion(false)} />
            )}
          </CardContent>
        </Card>

        {/* ── Action Items ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" /> Action Items ({minutes?.actionItems?.length ?? 0})
              </CardTitle>
              {!locked && isAdmin && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddingAction(true)} data-testid="button-add-action">
                  <Plus className="w-3 h-3" /> Add Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-4 space-y-2">
            {(!minutes?.actionItems || minutes.actionItems.length === 0) && !addingAction && (
              <p className="text-sm text-slate-400 italic text-center py-2">No action items recorded.</p>
            )}
            {minutes?.actionItems?.map((a: any) => (
              <div key={a.id} data-testid={`action-${a.id}`}>
                {editingAction === a.id ? (
                  <ActionItemForm boardMembers={boardMembers} initial={a} onSave={d => updateAction(a.id, d)} onCancel={() => setEditingAction(null)} />
                ) : (
                  <div className="flex items-start gap-2 py-2.5 border-b border-slate-100 last:border-0 group">
                    <Check className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1F2B]">{a.title}</p>
                      {a.description && <p className="text-xs text-slate-500">{a.description}</p>}
                      <div className="flex gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
                        {(a.first_name || a.last_name) && <span>Assigned: {a.first_name} {a.last_name}</span>}
                        {a.due_date && <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                        {a.status && a.status !== "open" && (
                          <Badge className={`text-xs px-1.5 py-0 ${a.status === "done" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {a.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {!locked && isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingAction(a.id)} className="text-slate-400 hover:text-indigo-500" data-testid={`button-edit-action-${a.id}`}><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteAction(a.id)} className="text-slate-400 hover:text-red-500" data-testid={`button-delete-action-${a.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {addingAction && (
              <ActionItemForm boardMembers={boardMembers} onSave={addAction} onCancel={() => setAddingAction(false)} />
            )}
          </CardContent>
        </Card>

        {/* ── Adjournment ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Adjournment
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600">Time adjourned:</label>
              <input
                type="datetime-local"
                value={content.adjournmentTime ?? ""}
                onChange={e => setContent(c => ({ ...c, adjournmentTime: e.target.value }))}
                disabled={locked}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50 disabled:text-slate-400"
                data-testid="input-adjournment-time"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Save / Submit / Approve footer ── */}
        {isAdmin && (
          <div className="flex items-center gap-3 pt-2 pb-6 flex-wrap">
            {!locked && (
              <Button
                onClick={saveDraft}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                data-testid="button-save-draft"
              >
                {saving ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <FileText className="w-4 h-4" />}
                Save Draft
              </Button>
            )}
            {!locked && minutes?.status === "draft" && (
              <Button
                onClick={submitForApproval}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50 gap-1.5"
                data-testid="button-submit-for-approval"
              >
                <Send className="w-4 h-4" /> Submit for Approval
              </Button>
            )}
            {!locked && minutes?.status === "pending_approval" && (
              <Button
                onClick={approve}
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                data-testid="button-approve-minutes"
              >
                <Check className="w-4 h-4" /> Approve & Lock Minutes
              </Button>
            )}
            {locked && (
              <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                <Lock className="w-4 h-4" />
                Minutes approved and locked on {minutes?.approvedAt ? new Date(minutes.approvedAt).toLocaleDateString() : "—"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Meeting List ─────────────────────────────────────────────────────────────

function MinutesContent() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [minutesMap, setMinutesMap] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    document.title = "Board Minutes | handləkraft.ai";
    Promise.all([
      apiRequest("GET", "/api/board/meetings"),
      apiRequest("GET", "/api/board/minutes"),
    ]).then(([mRes, minsRes]) => {
      if (mRes.success) {
        const past = mRes.data.filter((m: any) =>
          m.status === "held" || new Date(m.scheduledAt) <= new Date()
        ).sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
        setMeetings(past);
      }
      if (minsRes.success) {
        const map: Record<number, any> = {};
        for (const m of minsRes.data) map[m.meeting_id] = m;
        setMinutesMap(map);
      }
      setLoading(false);
    });
  }, []);

  if (selected) return <MinutesEditor meeting={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">Meeting Minutes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Select a meeting to view or record minutes.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse shadow-sm" />)}</div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No past meetings yet.</p>
          <p className="text-sm mt-1">Hold or schedule meetings first, then record minutes here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map(m => {
            const mins = minutesMap[m.id];
            return (
              <Card
                key={m.id}
                className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(m)}
                data-testid={`minutes-meeting-${m.id}`}
              >
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${mins?.status === "approved" ? "bg-green-100" : mins?.status === "pending_approval" ? "bg-amber-100" : mins ? "bg-indigo-100" : "bg-slate-100"}`}>
                      <ScrollText className={`w-5 h-5 ${mins?.status === "approved" ? "text-green-600" : mins?.status === "pending_approval" ? "text-amber-600" : mins ? "text-indigo-600" : "text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#1A1F2B] truncate">{m.title}</p>
                      <p className="text-xs text-slate-400">{new Date(m.scheduledAt).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {mins ? (
                        <Badge className={`text-xs border ${statusColor(mins.status)}`}>
                          {mins.status === "approved" && <Lock className="w-3 h-3 mr-1" />}
                          {statusLabel(mins.status)}
                          {mins.motion_count > 0 && ` · ${mins.motion_count} motion${mins.motion_count > 1 ? "s" : ""}`}
                        </Badge>
                      ) : (
                        <Badge className="text-xs border bg-slate-50 text-slate-400 border-slate-200">No Minutes</Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BoardMinutes() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><MinutesContent /></BoardLayout>
    </PortalGuard>
  );
}
