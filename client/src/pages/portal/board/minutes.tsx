import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearch } from "wouter";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import {
  ScrollText, Plus, ChevronRight, ArrowLeft, Check, Gavel,
  FileText, Clock, Download, History, Send, Lock, Pencil, Trash2,
  X, ChevronDown, ChevronUp, Users, ClipboardList, AlertTriangle,
  Info, Filter,
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

const CONTENT_FIELDS: Array<{ key: string; label: string }> = [
  { key: "callToOrder", label: "Call to Order" },
  { key: "openingRemarks", label: "Opening Remarks" },
  { key: "generalNotes", label: "General Notes" },
  { key: "absentDirectorsNote", label: "Absent Directors" },
  { key: "noticeSummary", label: "Notice Summary" },
  { key: "quorumPresent", label: "Quorum Present?" },
  { key: "quorumCount", label: "Quorum Count" },
  { key: "adjournmentTime", label: "Adjournment" },
];

function fieldVal(content: Record<string, any>, key: string): string {
  const v = content[key];
  if (v === undefined || v === null || v === "") return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function SnapshotDiff({ current, prev }: { current: any; prev: any | null }) {
  const cur = (() => { try { return JSON.parse(current.content_snapshot ?? "{}"); } catch { return {}; } })();
  const prv = prev ? (() => { try { return JSON.parse(prev.content_snapshot ?? "{}"); } catch { return {}; } })() : null;
  const curMotions: any[] = (() => { try { return JSON.parse(current.motions_snapshot ?? "[]"); } catch { return []; } })();
  const prvMotions: any[] = prv ? (() => { try { return JSON.parse(prev?.motions_snapshot ?? "[]"); } catch { return []; } })() : [];
  const isInitial = prv === null;

  const changedFields = CONTENT_FIELDS.filter(({ key }) => {
    if (isInitial) return fieldVal(cur, key) !== "";
    return fieldVal(cur, key) !== fieldVal(prv!, key);
  });
  const unchangedFields = isInitial ? [] : CONTENT_FIELDS.filter(({ key }) => fieldVal(cur, key) !== "" && fieldVal(cur, key) === fieldVal(prv!, key));

  return (
    <div className="px-4 pb-3 pt-2 border-t border-slate-100 bg-slate-50 space-y-2 text-xs" data-testid="snapshot-diff">
      {isInitial ? (
        <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Initial version — all fields shown</p>
      ) : (
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Comparing to Version {prev.version_number} · {changedFields.length} field{changedFields.length !== 1 ? "s" : ""} changed
        </p>
      )}

      {changedFields.length === 0 && !isInitial && (
        <p className="text-slate-400 italic">No text field changes (motion or action item may have changed).</p>
      )}

      {/* Changed / added fields */}
      {changedFields.map(({ key, label }) => {
        const oldVal = isInitial ? null : fieldVal(prv!, key);
        const newVal = fieldVal(cur, key);
        return (
          <div key={key} className="rounded border border-amber-200 bg-amber-50 p-2 space-y-1">
            <p className="font-semibold text-amber-700">{label}</p>
            {!isInitial && oldVal && (
              <p className="line-through text-red-500 text-[11px] leading-snug">− {oldVal}</p>
            )}
            {newVal && (
              <p className={`text-[11px] leading-snug ${isInitial ? "text-slate-700" : "text-green-700"}`}>
                {isInitial ? newVal : `+ ${newVal}`}
              </p>
            )}
            {!isInitial && !newVal && oldVal && (
              <p className="text-slate-400 italic text-[11px]">(field cleared)</p>
            )}
          </div>
        );
      })}

      {/* Unchanged fields (collapsed) */}
      {unchangedFields.length > 0 && (
        <details className="text-slate-400">
          <summary className="cursor-pointer select-none text-[10px] font-semibold uppercase tracking-wider">
            {unchangedFields.length} unchanged field{unchangedFields.length !== 1 ? "s" : ""}
          </summary>
          <div className="mt-1 space-y-0.5 pl-2">
            {unchangedFields.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-[120px_1fr] gap-1 py-0.5">
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-500">{fieldVal(cur, key)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Motions diff */}
      {(curMotions.length > 0 || prvMotions.length > 0) && (
        <>
          <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] pt-1 border-t border-slate-200">
            Motions {isInitial ? `(${curMotions.length})` : `(was ${prvMotions.length} → now ${curMotions.length})`}
          </p>
          {curMotions.map((m: any, i: number) => {
            const old = prvMotions[i];
            const changed = !isInitial && (
              old?.motionText !== m.motionText ||
              old?.passed !== m.passed ||
              old?.votesFor !== m.votesFor ||
              old?.votesAgainst !== m.votesAgainst
            );
            return (
              <div key={i} className={`rounded px-2 py-1.5 border ${changed ? "border-amber-200 bg-amber-50" : m.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
                data-testid={`diff-motion-${i}`}>
                <span className={`font-semibold ${m.passed ? "text-green-700" : "text-red-700"}`}>
                  #{i + 1} {m.passed ? "PASSED" : "FAILED"}
                  {changed && <span className="text-amber-600 font-normal ml-1">(modified)</span>}
                </span>{" "}
                <span className="text-slate-700">{m.motionText}</span>
                {(m.votesFor !== undefined) && (
                  <span className="text-slate-400 ml-1">({m.votesFor}–{m.votesAgainst}–{m.votesAbstain})</span>
                )}
              </div>
            );
          })}
          {!isInitial && prvMotions.slice(curMotions.length).map((_: any, i: number) => (
            <div key={`removed-${i}`} className="rounded px-2 py-1 border border-red-200 bg-red-50 text-red-500 text-[11px]">
              Motion #{curMotions.length + i + 1} removed
            </div>
          ))}
        </>
      )}
    </div>
  );
}

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
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-[#1A1F2B]">Version History</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" data-testid="button-close-history">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-5 py-2 text-xs text-slate-400 border-b border-slate-100">
          Changed fields are highlighted amber. Removed text shown in red, added text in green.
        </p>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)
          ) : versions.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">No saved versions yet.</p>
          ) : versions.map((v, idx) => {
            const prev = versions[idx + 1] ?? null;
            return (
              <div key={v.id} className="border border-slate-200 rounded-lg overflow-hidden" data-testid={`version-${v.id}`}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
                  onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                  data-testid={`button-expand-version-${v.id}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#1A1F2B]">Version {v.version_number}</p>
                      {idx === 0 && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">Latest</span>}
                      {prev === null && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Initial</span>}
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(v.saved_at).toLocaleString()} — {v.first_name} {v.last_name}
                    </p>
                  </div>
                  {expanded === v.id
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {expanded === v.id && <SnapshotDiff current={v} prev={prev} />}
              </div>
            );
          })}
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

  const interestedDirectors = boardMembers.filter(m => m.isInterestedDirector);

  return (
    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
      {interestedDirectors.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>Conflict of Interest Notice:</strong>{" "}
            {interestedDirectors.map(d => `${d.firstName} ${d.lastName}`).join(", ")}{" "}
            {interestedDirectors.length === 1 ? "has" : "have"} a flagged conflict of interest on record. Review recusal requirements under your conflict-of-interest policy before recording this vote. Any recusal must be noted below.
          </span>
        </div>
      )}
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
          <select value={form.moverId} onChange={e => setForm(f => ({ ...f, moverId: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none mt-0.5" data-testid="select-mover">
            <option value="">— Select —</option>
            {boardMembers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium">Seconded by</label>
          <select value={form.seconderId} onChange={e => setForm(f => ({ ...f, seconderId: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none mt-0.5" data-testid="select-seconder">
            <option value="">— Select —</option>
            {boardMembers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["votesFor", "votesAgainst", "votesAbstain"] as const).map((key, i) => (
          <div key={key}>
            <label className="text-xs text-slate-500 font-medium">{["For", "Against", "Abstain"][i]}</label>
            <input type="number" min={0} value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) || 0 }))}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none mt-0.5"
              data-testid={`input-votes-${key}`} />
          </div>
        ))}
      </div>
      <div>
        <label className="text-xs text-slate-500 font-medium">Recused directors (if any)</label>
        <input value={form.recusedDirectors} onChange={e => setForm(f => ({ ...f, recusedDirectors: e.target.value }))}
          placeholder="e.g. Jane Doe — conflict of interest per COI policy"
          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none mt-0.5"
          data-testid="input-recused" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
        <input type="checkbox" checked={form.passed} onChange={e => setForm(f => ({ ...f, passed: e.target.checked }))}
          className="rounded" data-testid="checkbox-motion-passed" />
        Motion passed
      </label>
      <div className="flex gap-2">
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => onSave(form)} data-testid="button-save-motion">
          Save Motion
        </Button>
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
      <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder="Action item title (required)"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        data-testid="input-action-title" />
      <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="Description (optional)"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
        data-testid="input-action-desc" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 font-medium">Assigned to</label>
          <select value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none mt-0.5"
            data-testid="select-action-assignee">
            <option value="">— Unassigned —</option>
            {boardMembers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium">Due date</label>
          <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none mt-0.5"
            data-testid="input-action-due" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => onSave(form)} data-testid="button-save-action">
          Save Item
        </Button>
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
  // Board members and admins can draft/submit; only admin can approve
  const canEdit = user?.role === "admin" || user?.role === "board";

  const [minutes, setMinutes] = useState<any>(null);
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [packetDocs, setPacketDocs] = useState<any[]>([]);
  const [addingDoc, setAddingDoc] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [docNote, setDocNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Structured content fields
  const [content, setContent] = useState<Record<string, any>>({});
  // Per-member attendance overrides: { [memberId]: { attendance, participationMethod, waivedNotice } }
  const [attendance, setAttendance] = useState<Record<number, { attendance: string; participationMethod: string; waivedNotice: boolean }>>({});
  const [reports, setReports] = useState<Array<{ title: string; presenter: string; content: string }>>([]);

  const [addingMotion, setAddingMotion] = useState(false);
  const [editingMotion, setEditingMotion] = useState<number | null>(null);
  const [addingAction, setAddingAction] = useState(false);
  const [editingAction, setEditingAction] = useState<number | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minutesRef = useRef<any>(null);
  const contentRef = useRef<Record<string, any>>({});
  const reportsRef = useRef<Array<any>>([]);
  const attendanceRef = useRef<Record<number, any>>({});

  const locked = minutes?.status === "approved";

  useEffect(() => { minutesRef.current = minutes; }, [minutes]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { reportsRef.current = reports; }, [reports]);
  useEffect(() => { attendanceRef.current = attendance; }, [attendance]);

  useEffect(() => {
    async function load() {
      const [minsRes, membersRes, meetingRes, packetDocsRes, allDocsRes] = await Promise.all([
        apiRequest("GET", `/api/board/meetings/${meeting.id}/minutes`),
        apiRequest("GET", "/api/board/members"),
        apiRequest("GET", `/api/board/meetings/${meeting.id}`),
        apiRequest("GET", `/api/board/meetings/${meeting.id}/packet-docs`),
        apiRequest("GET", "/api/board/documents"),
      ]);
      setBoardMembers(membersRes.success ? membersRes.data : []);
      if (packetDocsRes.success) setPacketDocs(packetDocsRes.data);
      if (allDocsRes.success) setAllDocs(allDocsRes.data);

      // If minutes exist, restore all saved state from content JSON
      if (minsRes.success && minsRes.data) {
        setMinutes(minsRes.data);
        const parsed = parseContent(minsRes.data.content);
        const { reports: savedReports, attendanceOverrides, ...rest } = parsed;
        setContent(rest);
        setReports(savedReports ?? []);
        if (attendanceOverrides && typeof attendanceOverrides === "object") {
          setAttendance(attendanceOverrides);
        }
      }

      // Pre-fill attendance from meeting attendees (only for fields not already saved in minutes)
      if (meetingRes.success && meetingRes.data?.attendees?.length) {
        setAttendance(prev => {
          const map: Record<number, any> = { ...prev };
          for (const a of meetingRes.data.attendees) {
            if (!map[a.userId]) {
              map[a.userId] = {
                attendance: a.attendance ?? "present",
                participationMethod: a.participationMethod ?? "in_person",
                waivedNotice: a.waivedNotice ?? false,
              };
            }
          }
          return map;
        });
      }
      setLoading(false);
    }
    load();
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [meeting.id]);

  function contentJson() {
    return JSON.stringify({
      ...contentRef.current,
      reports: reportsRef.current,
      attendanceOverrides: attendanceRef.current,
    });
  }

  async function ensureMinutes(): Promise<any> {
    if (minutesRef.current) return minutesRef.current;
    const r = await apiRequest("POST", `/api/board/meetings/${meeting.id}/minutes`, {});
    if (r.success) { setMinutes(r.data); minutesRef.current = r.data; return r.data; }
    return null;
  }

  async function saveDraft(silent = false) {
    setSaving(true);
    const m = await ensureMinutes();
    if (!m) { setSaving(false); return; }
    // Attendance overrides are serialized into the content JSON so no extra table is needed
    const r = await apiRequest("PATCH", `/api/board/minutes/${m.id}`, {
      content: contentJson(),
      quorumPresent: contentRef.current.quorumPresent ?? null,
      quorumCount: contentRef.current.quorumCount ?? null,
      adjournmentTime: contentRef.current.adjournmentTime || null,
    });
    if (r.success) {
      setMinutes(r.data);
      minutesRef.current = r.data;
      if (!silent) toast({ title: "Minutes saved", description: "Draft saved successfully." });
    }
    setSaving(false);
  }

  function scheduleAutoSave() {
    if (!canEdit || locked) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveDraft(true), 2000);
  }

  async function submitForApproval() {
    const m = await ensureMinutes();
    if (!m) return;
    await saveDraft(true);
    const r = await apiRequest("POST", `/api/board/minutes/${m.id}/submit`, {});
    if (r.success) {
      setMinutes((prev: any) => ({ ...prev, status: "pending_approval" }));
      toast({ title: "Submitted", description: "Minutes submitted for board approval." });
    } else toast({ title: "Error", description: r.error, variant: "destructive" });
  }

  async function approve() {
    if (!minutes) return;
    const r = await apiRequest("POST", `/api/board/minutes/${minutes.id}/approve`, {});
    if (r.success) {
      setMinutes((prev: any) => ({ ...prev, status: "approved", approvedAt: new Date() }));
      toast({ title: "Approved", description: "Minutes have been officially approved and locked." });
    } else toast({ title: "Error", description: r.error, variant: "destructive" });
  }

  async function downloadPacket() {
    toast({ title: "Generating packet…", description: "Your PDF is being prepared." });
    const res = await fetch(`/api/board/meetings/${meeting.id}/packet`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      toast({ title: "Error", description: "Could not generate packet.", variant: "destructive" });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `board-packet-meeting-${meeting.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function addMotion(data: any) {
    const m = await ensureMinutes();
    if (!m) return;
    const r = await apiRequest("POST", `/api/board/minutes/${m.id}/motions`, data);
    if (r.success) {
      setMinutes((prev: any) => ({ ...prev, motions: [...(prev.motions ?? []), r.data] }));
      setAddingMotion(false);
    } else toast({ title: "Error", description: r.error, variant: "destructive" });
  }

  async function updateMotion(motionId: number, data: any) {
    if (!minutes) return;
    const r = await apiRequest("PATCH", `/api/board/minutes/${minutes.id}/motions/${motionId}`, data);
    if (r.success) {
      setMinutes((prev: any) => ({ ...prev, motions: prev.motions.map((m: any) => m.id === motionId ? r.data : m) }));
      setEditingMotion(null);
    }
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
    if (r.success) {
      setMinutes((prev: any) => ({ ...prev, actionItems: [...(prev.actionItems ?? []), r.data] }));
      setAddingAction(false);
    } else toast({ title: "Error", description: r.error, variant: "destructive" });
  }

  async function updateAction(itemId: number, data: any) {
    if (!minutes) return;
    const r = await apiRequest("PATCH", `/api/board/minutes/${minutes.id}/action-items/${itemId}`, data);
    if (r.success) {
      setMinutes((prev: any) => ({ ...prev, actionItems: prev.actionItems.map((a: any) => a.id === itemId ? r.data : a) }));
      setEditingAction(null);
    }
  }

  async function deleteAction(itemId: number) {
    if (!minutes || !confirm("Delete this action item?")) return;
    await apiRequest("DELETE", `/api/board/minutes/${minutes.id}/action-items/${itemId}`);
    setMinutes((prev: any) => ({ ...prev, actionItems: prev.actionItems.filter((a: any) => a.id !== itemId) }));
  }

  function addReport() { setReports(r => [...r, { title: "", presenter: "", content: "" }]); }
  function removeReport(i: number) { setReports(r => r.filter((_, idx) => idx !== i)); }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  const meetingDate = new Date(meeting.scheduledAt).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div>
      {showHistory && minutes && <HistoryDrawer minutesId={minutes.id} onClose={() => setShowHistory(false)} />}

      {/* Back + title bar */}
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
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            onClick={downloadPacket}
            data-testid="button-download-packet"
          >
            <Download className="w-3.5 h-3.5" /> Download Packet
          </Button>
        </div>
      </div>

      {/* Legal governance guidance banner */}
      <div className="flex items-start gap-2.5 p-3 mb-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800" data-testid="governance-banner">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
        <div>
          <strong>Governance &amp; Legal Notice:</strong> These minutes constitute the official legal record of all board decisions and must accurately reflect the proceedings. All directors have the right to inspect and correct the minutes prior to approval. Record all motions with mover, seconder, and vote counts — including abstentions. Directors with a conflict of interest must declare and recuse from the vote. <strong>Sensitive discussions should be paraphrased rather than attributed verbatim</strong> — minutes must reflect the substance of decisions, not a verbatim transcript of debate. Once approved, minutes may only be amended by a subsequent board vote. Approved minutes are locked in this system.
        </div>
      </div>

      <div className="space-y-4">

        {/* ── Meeting Information ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Meeting Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 pb-4">
            <div><p className="text-xs text-slate-400">Type</p><p className="text-sm text-slate-700 capitalize">{meeting.meetingType || "Regular"}</p></div>
            <div><p className="text-xs text-slate-400">Date &amp; Time</p><p className="text-sm text-slate-700">{meetingDate}</p></div>
            {meeting.location && <div><p className="text-xs text-slate-400">Location</p><p className="text-sm text-slate-700">{meeting.location}</p></div>}
            {meeting.platform && <div><p className="text-xs text-slate-400">Platform</p><p className="text-sm text-slate-700">{meeting.platform}</p></div>}
            <div><p className="text-xs text-slate-400">Quorum required</p><p className="text-sm text-slate-700">{meeting.quorumNumber ?? 3} members</p></div>
            {meeting.noticeMethod && <div><p className="text-xs text-slate-400">Notice sent</p><p className="text-sm text-slate-700">{meeting.noticeMethod}{meeting.noticeSentAt ? ` · ${new Date(meeting.noticeSentAt).toLocaleDateString()}` : ""}</p></div>}
          </CardContent>
        </Card>

        {/* ── Attendance & Quorum ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Attendance &amp; Quorum
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            {boardMembers.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_110px_120px_90px] gap-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Director</span><span>Attendance</span><span>Participation</span><span>Notice OK?</span>
                </div>
                {boardMembers.map(m => {
                  const a = attendance[m.id] ?? { attendance: "", participationMethod: "in_person", waivedNotice: false };
                  return (
                    <div key={m.id} className="grid grid-cols-[1fr_110px_120px_90px] gap-2 items-center p-2 bg-slate-50 rounded-lg" data-testid={`attendee-${m.id}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1A1F2B] truncate">{m.firstName} {m.lastName}</p>
                        {m.boardPosition && <p className="text-xs text-slate-400 truncate">{m.boardPosition}</p>}
                      </div>
                      <select
                        value={a.attendance}
                        onChange={e => {
                          setAttendance(prev => ({ ...prev, [m.id]: { ...a, attendance: e.target.value } }));
                          scheduleAutoSave();
                        }}
                        disabled={locked || !canEdit}
                        className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none disabled:opacity-60 w-full"
                        data-testid={`select-attendance-${m.id}`}
                      >
                        <option value="">—</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="excused">Excused</option>
                      </select>
                      <select
                        value={a.participationMethod}
                        onChange={e => {
                          setAttendance(prev => ({ ...prev, [m.id]: { ...a, participationMethod: e.target.value } }));
                          scheduleAutoSave();
                        }}
                        disabled={locked || !canEdit || a.attendance !== "present"}
                        className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none disabled:opacity-40 w-full"
                        data-testid={`select-participation-${m.id}`}
                      >
                        <option value="in_person">In Person</option>
                        <option value="remote">Remote</option>
                      </select>
                      <div className="flex items-center gap-1.5 justify-center">
                        <input
                          type="checkbox"
                          checked={a.waivedNotice}
                          onChange={e => {
                            setAttendance(prev => ({ ...prev, [m.id]: { ...a, waivedNotice: e.target.checked } }));
                            scheduleAutoSave();
                          }}
                          disabled={locked || !canEdit}
                          className="rounded disabled:opacity-60"
                          data-testid={`checkbox-notice-${m.id}`}
                          title="Director waived notice requirement"
                        />
                        <span className="text-xs text-slate-400">Waived</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No board members found.</p>
            )}

            {/* Quorum + Notice summary */}
            <div className="grid grid-cols-1 gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600 font-medium">Quorum present?</label>
                  <input type="checkbox" checked={!!content.quorumPresent}
                    onChange={e => { setContent(c => ({ ...c, quorumPresent: e.target.checked })); scheduleAutoSave(); }}
                    disabled={locked || !canEdit} className="rounded" data-testid="checkbox-quorum" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">Count:</label>
                  <input type="number" min={0} value={content.quorumCount ?? ""}
                    onChange={e => { setContent(c => ({ ...c, quorumCount: e.target.value })); scheduleAutoSave(); }}
                    disabled={locked || !canEdit}
                    className="w-16 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none disabled:opacity-60"
                    data-testid="input-quorum-count" />
                </div>
                {content.quorumPresent && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Quorum Met</Badge>
                )}
              </div>
              {/* Absent directors narrative + notice note */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Absent Directors — reason / notice note</label>
                <textarea
                  value={content.absentDirectorsNote ?? ""}
                  onChange={e => setContent(c => ({ ...c, absentDirectorsNote: e.target.value }))}
                  onBlur={scheduleAutoSave}
                  disabled={locked}
                  placeholder="e.g. Jane Doe — excused due to illness, notice waived. John Smith — absent without notice."
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none disabled:bg-slate-50 disabled:text-slate-400"
                  data-testid="textarea-absent-directors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Meeting Notice Summary</label>
                <input
                  value={content.noticeSummary ?? ""}
                  onChange={e => setContent(c => ({ ...c, noticeSummary: e.target.value }))}
                  onBlur={scheduleAutoSave}
                  disabled={locked}
                  placeholder="e.g. Notice provided by email 10 days in advance; all directors acknowledged."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50 disabled:text-slate-400"
                  data-testid="input-notice-summary"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Meeting Notes ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ScrollText className="w-3.5 h-3.5" /> Meeting Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Call to Order</label>
              <input
                value={content.callToOrder ?? ""}
                onChange={e => setContent(c => ({ ...c, callToOrder: e.target.value }))}
                onBlur={scheduleAutoSave}
                disabled={locked}
                placeholder="e.g. Meeting called to order at 7:00 PM by the Chair."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50 disabled:text-slate-400"
                data-testid="input-call-to-order"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Opening Remarks / Announcements</label>
              <textarea
                value={content.openingRemarks ?? ""}
                onChange={e => setContent(c => ({ ...c, openingRemarks: e.target.value }))}
                onBlur={scheduleAutoSave}
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
                {!locked && canEdit && (
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
                        onBlur={scheduleAutoSave}
                        disabled={locked}
                        placeholder="Report title (e.g. Executive Director Report)"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none disabled:bg-white"
                        data-testid={`input-report-title-${i}`}
                      />
                      {!locked && canEdit && (
                        <button onClick={() => removeReport(i)} className="text-slate-400 hover:text-red-500" data-testid={`button-remove-report-${i}`}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <input
                      value={report.presenter}
                      onChange={e => setReports(r => r.map((x, idx) => idx === i ? { ...x, presenter: e.target.value } : x))}
                      onBlur={scheduleAutoSave}
                      disabled={locked}
                      placeholder="Presenter (optional)"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none disabled:bg-white"
                      data-testid={`input-report-presenter-${i}`}
                    />
                    <textarea
                      value={report.content}
                      onChange={e => setReports(r => r.map((x, idx) => idx === i ? { ...x, content: e.target.value } : x))}
                      onBlur={scheduleAutoSave}
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

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">General Business / Other Notes</label>
              <textarea
                value={content.generalNotes ?? ""}
                onChange={e => setContent(c => ({ ...c, generalNotes: e.target.value }))}
                onBlur={scheduleAutoSave}
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
              {!locked && canEdit && (
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
                          {m.passed ? <><Check className="w-3 h-3 mr-0.5" />Passed</> : "Failed"}
                        </Badge>
                        {!locked && canEdit && (
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
                      {m.recusedDirectors && <span className="text-amber-600">Recused: {m.recusedDirectors}</span>}
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
              {!locked && canEdit && (
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
                    {!locked && canEdit && (
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
                onChange={e => { setContent(c => ({ ...c, adjournmentTime: e.target.value })); scheduleAutoSave(); }}
                disabled={locked}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50 disabled:text-slate-400"
                data-testid="input-adjournment-time"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Packet Documents ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Packet Documents ({packetDocs.length})
              </CardTitle>
              {canEdit && !locked && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddingDoc(v => !v)} data-testid="button-add-packet-doc">
                  <Plus className="w-3 h-3" /> Link Document
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-4 space-y-2">
            <p className="text-xs text-slate-400">Documents linked here will appear in the meeting packet PDF.</p>
            {addingDoc && canEdit && (
              <div className="flex gap-2 flex-wrap items-end bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex-1 min-w-48">
                  <label className="text-xs text-slate-500 font-medium mb-0.5 block">Select document</label>
                  <select value={selectedDocId} onChange={e => setSelectedDocId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" data-testid="select-packet-doc">
                    <option value="">— Select a document —</option>
                    {allDocs.filter((d: any) => !packetDocs.some((p: any) => p.document_id === d.id)).map((d: any) => (
                      <option key={d.id} value={d.id}>{d.title} ({d.category})</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-32">
                  <label className="text-xs text-slate-500 font-medium mb-0.5 block">Note (optional)</label>
                  <input value={docNote} onChange={e => setDocNote(e.target.value)} placeholder="e.g. For item 3 review"
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" data-testid="input-packet-doc-note" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white h-8" onClick={async () => {
                    if (!selectedDocId) return;
                    const r = await apiRequest("POST", `/api/board/meetings/${meeting.id}/packet-docs`, { documentId: selectedDocId, note: docNote });
                    if (r.success) { setPacketDocs(d => [...d, r.data]); setSelectedDocId(""); setDocNote(""); setAddingDoc(false); }
                    else toast({ title: "Error", description: r.error, variant: "destructive" });
                  }} data-testid="button-confirm-add-doc">Add</Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => { setAddingDoc(false); setSelectedDocId(""); setDocNote(""); }}>Cancel</Button>
                </div>
              </div>
            )}
            {packetDocs.length === 0 && !addingDoc ? (
              <p className="text-sm text-slate-400 italic text-center py-2">No documents linked yet. Link board documents to include them in the packet PDF.</p>
            ) : packetDocs.map((d: any) => (
              <div key={d.id} className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0 group" data-testid={`packet-doc-${d.id}`}>
                <FileText className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1F2B] truncate">{d.title}</p>
                  <p className="text-xs text-slate-400">{d.category} · {d.confidentiality === "board_only" ? "Board Only" : "Confidential"}</p>
                  {d.note && <p className="text-xs text-indigo-600 italic">{d.note}</p>}
                </div>
                {canEdit && !locked && (
                  <button onClick={async () => {
                    await apiRequest("DELETE", `/api/board/meetings/${meeting.id}/packet-docs/${d.id}`);
                    setPacketDocs(prev => prev.filter(p => p.id !== d.id));
                  }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" data-testid={`button-remove-doc-${d.id}`}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Save / Submit / Approve footer ── */}
        {canEdit && (
          <div className="flex items-center gap-3 pt-2 pb-6 flex-wrap">
            {!locked && (
              <Button onClick={() => saveDraft(false)} disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5" data-testid="button-save-draft">
                {saving
                  ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  : <FileText className="w-4 h-4" />}
                Save Draft
              </Button>
            )}
            {!locked && minutes?.status === "draft" && (
              <Button onClick={submitForApproval} variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50 gap-1.5" data-testid="button-submit-for-approval">
                <Send className="w-4 h-4" /> Submit for Approval
              </Button>
            )}
            {/* Approve is admin-only */}
            {isAdmin && !locked && minutes?.status === "pending_approval" && (
              <Button onClick={approve} className="bg-green-600 hover:bg-green-700 text-white gap-1.5" data-testid="button-approve-minutes">
                <Check className="w-4 h-4" /> Approve &amp; Lock Minutes
              </Button>
            )}
            {locked && (
              <div className="flex items-center gap-2 text-sm text-green-700 font-medium" data-testid="text-approved-status">
                <Lock className="w-4 h-4" />
                Minutes approved and locked on {minutes?.approvedAt ? new Date(minutes.approvedAt).toLocaleDateString() : "—"}
              </div>
            )}
            {saving && <span className="text-xs text-slate-400 animate-pulse">Saving…</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Meeting List ─────────────────────────────────────────────────────────────

function MinutesContent() {
  const search = useSearch();
  const urlMeetingId = useMemo(() => {
    const p = new URLSearchParams(search);
    const v = p.get("meetingId");
    return v ? parseInt(v) : null;
  }, [search]);

  const [meetings, setMeetings] = useState<any[]>([]);
  const [minutesMap, setMinutesMap] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [yearFilter, setYearFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    document.title = "Board Minutes | handləkraft.ai";
    Promise.all([
      apiRequest("GET", "/api/board/meetings"),
      apiRequest("GET", "/api/board/minutes"),
    ]).then(([mRes, minsRes]) => {
      if (mRes.success) {
        const all = mRes.data;
        const past = all
          .filter((m: any) => m.status === "held" || new Date(m.scheduledAt) <= new Date())
          .sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
        setMeetings(past);
        // Deep-link: if ?meetingId=N is in the URL, auto-select that meeting
        if (urlMeetingId) {
          const target = all.find((m: any) => m.id === urlMeetingId);
          if (target) setSelected(target);
        }
      }
      if (minsRes.success) {
        const map: Record<number, any> = {};
        for (const m of minsRes.data) map[m.meeting_id] = m;
        setMinutesMap(map);
      }
      setLoading(false);
    });
  }, [urlMeetingId]);

  if (selected) return <MinutesEditor meeting={selected} onBack={() => setSelected(null)} />;

  const years = Array.from(new Set(
    meetings.map(m => new Date(m.scheduledAt).getFullYear().toString())
  )).sort((a, b) => parseInt(b) - parseInt(a));

  const filtered = meetings.filter(m => {
    if (yearFilter && new Date(m.scheduledAt).getFullYear().toString() !== yearFilter) return false;
    if (statusFilter) {
      const mins = minutesMap[m.id];
      const s = mins?.status ?? "none";
      if (statusFilter === "none" && mins) return false;
      if (statusFilter !== "none" && s !== statusFilter) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">Meeting Minutes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Select a meeting to view or record minutes.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap" data-testid="minutes-filters">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" data-testid="select-year-filter">
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" data-testid="select-status-filter">
          <option value="">All Statuses</option>
          <option value="none">No Minutes</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
        </select>
        {(yearFilter || statusFilter) && (
          <button onClick={() => { setYearFilter(""); setStatusFilter(""); }}
            className="text-xs text-slate-400 hover:text-slate-600 underline" data-testid="button-clear-filters">
            Clear
          </button>
        )}
        <span className="text-xs text-slate-400 ml-1">{filtered.length} meeting{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse shadow-sm" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{meetings.length === 0 ? "No past meetings yet." : "No meetings match your filters."}</p>
          {meetings.length === 0 && <p className="text-sm mt-1">Hold or schedule meetings first, then record minutes here.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => {
            const mins = minutesMap[m.id];
            return (
              <Card key={m.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(m)} data-testid={`minutes-meeting-${m.id}`}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      mins?.status === "approved" ? "bg-green-100"
                        : mins?.status === "pending_approval" ? "bg-amber-100"
                        : mins ? "bg-indigo-100" : "bg-slate-100"
                    }`}>
                      <ScrollText className={`w-5 h-5 ${
                        mins?.status === "approved" ? "text-green-600"
                          : mins?.status === "pending_approval" ? "text-amber-600"
                          : mins ? "text-indigo-600" : "text-slate-400"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#1A1F2B] truncate">{m.title}</p>
                      <p className="text-xs text-slate-400">{new Date(m.scheduledAt).toLocaleDateString("en-US", {
                        weekday: "short", year: "numeric", month: "short", day: "numeric",
                      })}</p>
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
