import { useCallback, useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import {
  CheckSquare, Check, Plus, X, Clock, AlertTriangle,
  Filter, RefreshCw, User, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  open:        "bg-blue-50 border-l-blue-400",
  in_progress: "bg-amber-50 border-l-amber-400",
  complete:    "bg-green-50 border-l-green-300",
};
const STATUS_BADGE: Record<string, string> = {
  open:        "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  complete:    "bg-green-100 text-green-700",
};

function NewItemModal({ members, onClose, onCreated }: { members: any[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", assignedTo: "", dueDate: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!form.title.trim()) return;
    setSaving(true);
    const r = await apiRequest("POST", "/api/board/action-items", {
      ...form,
      assignedTo: form.assignedTo ? parseInt(form.assignedTo) : undefined,
    });
    if (r.success) {
      toast({ title: "Action item created" });
      onCreated();
      onClose();
    } else {
      toast({ title: "Error", description: r.error, variant: "destructive" });
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <p className="font-semibold text-[#1A1F2B]">New Action Item</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" data-testid="button-close-new-item"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Action item title *"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            data-testid="input-item-title"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)…"
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            data-testid="textarea-item-desc"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Assign to</label>
              <select
                value={form.assignedTo}
                onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                data-testid="select-item-assignee"
              >
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Due date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                data-testid="input-item-due"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button className="bg-indigo-500 text-white" onClick={submit} disabled={saving || !form.title.trim()} data-testid="button-save-item">
              {saving ? "Creating…" : "Create"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPicker({ item, currentUserId, isAdmin, onUpdate }: {
  item: any;
  currentUserId: number;
  isAdmin: boolean;
  onUpdate: (id: number, status: string) => void;
}) {
  const isAssigned = item.assigned_to === currentUserId;
  const canEdit = isAdmin || isAssigned;
  if (!canEdit) return null;

  const next: Record<string, string> = { open: "in_progress", in_progress: "complete", complete: "open" };
  const labels: Record<string, string> = { open: "Mark In Progress", in_progress: "Mark Complete", complete: "Reopen" };

  return (
    <button
      onClick={() => onUpdate(item.id, next[item.status] || "open")}
      className="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-50 transition-colors whitespace-nowrap"
      data-testid={`button-status-${item.id}`}
    >
      {labels[item.status] || "Update"}
    </button>
  );
}

function ActionItemsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "board";
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(""); // "" = not complete (default)
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (assigneeFilter) params.set("assignee", assigneeFilter);

    const [ai, mem] = await Promise.all([
      apiRequest("GET", `/api/board/action-items?${params}`),
      apiRequest("GET", "/api/board/members"),
    ]);
    if (ai.success) setItems(ai.data || []);
    if (mem.success) setMembers(mem.data || []);
    setLoading(false);
  }, [statusFilter, assigneeFilter, isAdmin]);

  useEffect(() => { document.title = "Action Items | handləkraft.ai"; }, []);
  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: number, status: string) {
    const r = await apiRequest("PATCH", `/api/board/action-items/${id}`, { status });
    if (r.success) {
      toast({ title: `Item marked ${status.replace("_", " ")}` });
      setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i).filter(i => {
        if (statusFilter === "all") return true;
        if (statusFilter) return i.status === statusFilter;
        return i.status !== "complete";
      }));
    }
  }

  const overdue = items.filter(i => i.status !== "complete" && i.due_date && new Date(i.due_date) < new Date());
  const active = items.filter(i => i.status !== "complete" && !(i.due_date && new Date(i.due_date) < new Date()));
  const completed = items.filter(i => i.status === "complete");

  const sections = [
    { label: "Overdue", items: overdue, color: "text-red-500" },
    { label: "Open", items: active, color: "text-slate-600" },
    { label: "Completed", items: completed, color: "text-green-600" },
  ].filter(s => s.items.length > 0);

  if (loading) return (
    <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">Action Items</h1>
          <p className="text-slate-500 text-sm mt-0.5">Board commitments and follow-ups from meetings and decisions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors" title="Refresh" data-testid="button-refresh-items">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button onClick={() => setShowNew(true)} className="bg-indigo-500 text-white gap-2" data-testid="button-new-item">
            <Plus className="w-4 h-4" /> New Item
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm text-slate-600 focus:outline-none bg-transparent"
            data-testid="select-status-filter"
          >
            <option value="">Open items</option>
            <option value="open">Open only</option>
            <option value="in_progress">In Progress only</option>
            <option value="complete">Completed</option>
            <option value="all">All statuses</option>
          </select>
        </div>
        {members.length > 0 && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="text-sm text-slate-600 focus:outline-none bg-transparent"
              data-testid="select-assignee-filter"
            >
              <option value="">All members</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">All caught up!</p>
          <p className="text-xs mt-1">No action items match the current filter.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Overdue ({overdue.length})
              </p>
              <div className="space-y-2">
                {overdue.map(item => (
                  <ActionItemRow key={item.id} item={item} currentUserId={user!.id} isAdmin={isAdmin} onUpdate={updateStatus} />
                ))}
              </div>
            </div>
          )}

          {active.length > 0 && (
            <div>
              {overdue.length > 0 && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Open ({active.length})</p>}
              <div className="space-y-2">
                {active.map(item => (
                  <ActionItemRow key={item.id} item={item} currentUserId={user!.id} isAdmin={isAdmin} onUpdate={updateStatus} />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Completed ({completed.length})
              </p>
              <div className="space-y-2">
                {completed.map(item => (
                  <ActionItemRow key={item.id} item={item} currentUserId={user!.id} isAdmin={isAdmin} onUpdate={updateStatus} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showNew && (
        <NewItemModal members={members} onClose={() => setShowNew(false)} onCreated={load} />
      )}
    </div>
  );
}

function ActionItemRow({ item, currentUserId, isAdmin, onUpdate }: {
  item: any;
  currentUserId: number;
  isAdmin: boolean;
  onUpdate: (id: number, status: string) => void;
}) {
  const isOverdue = item.status !== "complete" && item.due_date && new Date(item.due_date) < new Date();
  const accentClass = isOverdue ? "border-l-red-400" : STATUS_COLORS[item.status] || "border-l-slate-200";

  return (
    <Card className={`border-0 shadow-sm border-l-4 ${accentClass}`} data-testid={`action-${item.id}`}>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start gap-3">
          <CheckSquare className={`w-4 h-4 mt-0.5 shrink-0 ${isOverdue ? "text-red-400" : item.status === "complete" ? "text-green-500" : item.status === "in_progress" ? "text-amber-400" : "text-slate-400"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className={`text-sm font-medium ${item.status === "complete" ? "line-through text-slate-400" : "text-[#1A1F2B]"}`}>{item.title}</p>
              <Badge className={`text-xs ${STATUS_BADGE[item.status]}`}>{item.status?.replace("_", " ")}</Badge>
            </div>
            {item.description && <p className="text-xs text-slate-500 mb-1">{item.description}</p>}
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              {(item.first_name || item.last_name) && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />{item.first_name} {item.last_name}
                </span>
              )}
              {item.due_date && (
                <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
                  <Calendar className="w-3 h-3" />
                  {isOverdue ? "Overdue: " : "Due: "}{fmtDate(item.due_date)}
                </span>
              )}
              {item.minutes_id && <span className="text-slate-300">· From minutes</span>}
            </div>
          </div>
          <StatusPicker item={item} currentUserId={currentUserId} isAdmin={isAdmin} onUpdate={onUpdate} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function BoardActionItems() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><ActionItemsContent /></BoardLayout>
    </PortalGuard>
  );
}
