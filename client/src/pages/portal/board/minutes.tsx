import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { ScrollText, Plus, ChevronRight, ArrowLeft, Check, X, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const RESULT_COLORS: Record<string, string> = {
  passed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  tabled: "bg-amber-100 text-amber-700",
  pending: "bg-slate-100 text-slate-700",
  withdrawn: "bg-slate-100 text-slate-500",
};

function MinutesContent() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [minutes, setMinutes] = useState<any>(null);
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [minutesText, setMinutesText] = useState("");
  const [addingMotion, setAddingMotion] = useState(false);
  const [motionForm, setMotionForm] = useState({ motionText: "", passed: false, votesFor: 0, votesAgainst: 0, votesAbstain: 0 });
  const [addingAction, setAddingAction] = useState(false);
  const [actionForm, setActionForm] = useState({ title: "", description: "", dueDate: "" });

  useEffect(() => {
    document.title = "Board Minutes | handləkraft.ai";
    apiRequest("GET", "/api/board/meetings").then(r => {
      if (r.success) setMeetings(r.data.filter((m: any) => m.status === "held" || new Date(m.scheduledAt) <= new Date()));
      setLoading(false);
    });
  }, []);

  async function loadMinutes(meeting: any) {
    setSelected(meeting);
    const r = await apiRequest("GET", `/api/board/meetings/${meeting.id}/minutes`);
    if (r.success) { setMinutes(r.data); setMinutesText(r.data?.content || ""); }
  }

  async function saveMinutes() {
    if (!selected) return;
    const r = await apiRequest("POST", `/api/board/meetings/${selected.id}/minutes`, { content: minutesText });
    if (r.success) { setMinutes(r.data); setEditingMinutes(false); }
  }

  async function addMotion() {
    if (!minutes || !motionForm.motionText.trim()) return;
    const r = await apiRequest("POST", `/api/board/minutes/${minutes.id}/motions`, motionForm);
    if (r.success) { setMinutes((m: any) => ({ ...m, motions: [...(m.motions || []), r.data] })); setMotionForm({ motionText: "", passed: false, votesFor: 0, votesAgainst: 0, votesAbstain: 0 }); setAddingMotion(false); }
  }

  async function addActionItem() {
    if (!minutes || !actionForm.title.trim()) return;
    const r = await apiRequest("POST", `/api/board/minutes/${minutes.id}/action-items`, actionForm);
    if (r.success) { setMinutes((m: any) => ({ ...m, actionItems: [...(m.actionItems || []), r.data] })); setActionForm({ title: "", description: "", dueDate: "" }); setAddingAction(false); }
  }

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>;

  if (selected) return (
    <div>
      <button onClick={() => { setSelected(null); setMinutes(null); }} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4" data-testid="button-back-minutes">
        <ArrowLeft className="w-4 h-4" /> All Meetings
      </button>
      <h1 className="text-2xl font-display text-[#1A1F2B] mb-1">{selected.title}</h1>
      <p className="text-sm text-slate-400 mb-6">{new Date(selected.scheduledAt).toLocaleDateString()} Minutes</p>

      {/* Minutes text */}
      <Card className="border-0 shadow-sm mb-5">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meeting Notes</p>
            {user?.role === "admin" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingMinutes(v => !v)} data-testid="button-edit-minutes">{editingMinutes ? "Cancel" : "Edit"}</Button>}
          </div>
          {editingMinutes ? (
            <div>
              <textarea value={minutesText} onChange={e => setMinutesText(e.target.value)} rows={8} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" placeholder="Enter meeting notes…" data-testid="textarea-minutes" />
              <Button className="bg-indigo-500 text-white mt-2" onClick={saveMinutes} data-testid="button-save-minutes">Save Notes</Button>
            </div>
          ) : (
            <p className={`text-sm ${minutes?.content ? "text-slate-600 whitespace-pre-wrap" : "text-slate-300 italic"}`}>{minutes?.content || "No notes recorded yet."}</p>
          )}
        </CardContent>
      </Card>

      {/* Motions */}
      {minutes && (
        <Card className="border-0 shadow-sm mb-5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Gavel className="w-3.5 h-3.5" /> Motions ({minutes.motions?.length || 0})</p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddingMotion(true)} data-testid="button-add-motion"><Plus className="w-3 h-3" /> Add</Button>
            </div>
            {minutes.motions?.length === 0 && !addingMotion && <p className="text-sm text-slate-400 py-2 text-center">No motions recorded</p>}
            <div className="space-y-3">
              {minutes.motions?.map((m: any) => (
                <div key={m.id} className="p-3 bg-slate-50 rounded-lg" data-testid={`motion-${m.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[#1A1F2B]">{m.motionText}</p>
                    <Badge className={`${m.passed ? RESULT_COLORS.passed : RESULT_COLORS.failed} text-xs capitalize shrink-0`}>{m.passed ? "Passed" : "Not Passed"}</Badge>
                  </div>
                  <div className="flex gap-4 mt-1.5 text-xs text-slate-400 flex-wrap">
                    {(m.votesFor > 0 || m.votesAgainst > 0) && <span>Vote: {m.votesFor}–{m.votesAgainst}{m.votesAbstain > 0 ? `–${m.votesAbstain}` : ""}</span>}
                    {m.recusedDirectors && <span>Recused: {m.recusedDirectors}</span>}
                  </div>
                </div>
              ))}
            </div>
            {addingMotion && (
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                <input value={motionForm.motionText} onChange={e => setMotionForm(f => ({ ...f, motionText: e.target.value }))} placeholder="Motion text…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-motion-text" />
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" min={0} value={motionForm.votesFor} onChange={e => setMotionForm(f => ({ ...f, votesFor: parseInt(e.target.value) || 0 }))} placeholder="Votes For" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-votes-for" />
                  <input type="number" min={0} value={motionForm.votesAgainst} onChange={e => setMotionForm(f => ({ ...f, votesAgainst: parseInt(e.target.value) || 0 }))} placeholder="Votes Against" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-votes-against" />
                  <input type="number" min={0} value={motionForm.votesAbstain} onChange={e => setMotionForm(f => ({ ...f, votesAbstain: parseInt(e.target.value) || 0 }))} placeholder="Abstain" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-votes-abstain" />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={motionForm.passed} onChange={e => setMotionForm(f => ({ ...f, passed: e.target.checked }))} className="rounded" data-testid="checkbox-motion-passed" />
                  Motion passed
                </label>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-indigo-500 text-white" onClick={addMotion} data-testid="button-save-motion">Add Motion</Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingMotion(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      {minutes && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Action Items ({minutes.actionItems?.length || 0})</p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddingAction(true)} data-testid="button-add-action"><Plus className="w-3 h-3" /> Add</Button>
            </div>
            {minutes.actionItems?.length === 0 && !addingAction && <p className="text-sm text-slate-400 py-2 text-center">No action items yet</p>}
            <div className="space-y-2">
              {minutes.actionItems?.map((a: any) => (
                <div key={a.id} className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0" data-testid={`action-${a.id}`}>
                  <Check className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#1A1F2B]">{a.title}</p>
                    {a.description && <p className="text-xs text-slate-500">{a.description}</p>}
                    {a.dueDate && <p className="text-xs text-slate-400">Due: {new Date(a.dueDate).toLocaleDateString()}</p>}
                  </div>
                </div>
              ))}
            </div>
            {addingAction && (
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                <input value={actionForm.title} onChange={e => setActionForm(f => ({ ...f, title: e.target.value }))} placeholder="Action item title (required)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-action-title" />
                <input value={actionForm.description} onChange={e => setActionForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-action-desc" />
                <input type="date" value={actionForm.dueDate} onChange={e => setActionForm(f => ({ ...f, dueDate: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-action-due" />
                <div className="flex gap-2">
                  <Button size="sm" className="bg-indigo-500 text-white" onClick={addActionItem} data-testid="button-save-action">Add Item</Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingAction(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">Meeting Minutes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Select a meeting to view or record minutes.</p>
        </div>
      </div>
      {meetings.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No past meetings yet.</p></div>
      ) : (
        <div className="space-y-2">
          {meetings.map(m => (
            <Card key={m.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadMinutes(m)} data-testid={`minutes-meeting-${m.id}`}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0"><ScrollText className="w-5 h-5 text-indigo-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#1A1F2B] truncate">{m.title}</p>
                    <p className="text-xs text-slate-400">{new Date(m.scheduledAt).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BoardMinutes() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><MinutesContent /></BoardLayout>
    </PortalGuard>
  );
}
