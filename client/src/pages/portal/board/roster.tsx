import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { Shield, Edit, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@shared/branding";

function RosterContent() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});

  const loadMembers = () => {
    apiRequest("GET", "/api/board/members").then(r => {
      if (r.success) setMembers(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { document.title = `Board Roster | ${BRAND.fullName}`; loadMembers(); }, []);

  async function saveEdit(id: number) {
    await apiRequest("PATCH", `/api/admin/portal-users/${id}`, {
      role: form.role,
      status: form.status,
      boardPosition: form.boardPosition,
      termStart: form.termStart || null,
      termEnd: form.termEnd || null,
      committees: form.committees ? form.committees.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    });
    setEditing(null);
    loadMembers();
  }

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display text-[#1A1F2B] flex items-center gap-2"><Shield className="w-6 h-6 text-indigo-500" /> Manage Board Roster</h1>
        <p className="text-slate-500 text-sm mt-0.5">Edit board member roles, positions, and terms (admin only).</p>
      </div>

      <div className="space-y-3">
        {members.map(m => (
          <Card key={m.id} className="border-0 shadow-sm" data-testid={`roster-member-${m.id}`}>
            <CardContent className="pt-4">
              {editing === m.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">{m.firstName?.[0]}{m.lastName?.[0]}</div>
                    <p className="font-semibold text-[#1A1F2B]">{m.firstName} {m.lastName}</p>
                    <p className="text-sm text-slate-400">{m.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Position</label>
                      <input value={form.boardPosition || ""} onChange={e => setForm((f: any) => ({ ...f, boardPosition: e.target.value }))} placeholder="e.g. Chair, Secretary" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-board-position" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Role</label>
                      <select value={form.role || ""} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-roster-role">
                        <option value="board">Board Member</option>
                        <option value="admin">Admin</option>
                        <option value="employee">Employee</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Term Start</label>
                      <input type="date" value={form.termStart || ""} onChange={e => setForm((f: any) => ({ ...f, termStart: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-term-start" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Term End</label>
                      <input type="date" value={form.termEnd || ""} onChange={e => setForm((f: any) => ({ ...f, termEnd: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-term-end" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Committees (comma-separated)</label>
                    <input value={Array.isArray(form.committees) ? form.committees.join(", ") : form.committees || ""} onChange={e => setForm((f: any) => ({ ...f, committees: e.target.value }))} placeholder="Finance, Governance, Audit…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-committees" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                    <select value={form.status || "active"} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-roster-status">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-indigo-500 text-white" onClick={() => saveEdit(m.id)} data-testid={`button-save-roster-${m.id}`}><Check className="w-3.5 h-3.5 mr-1" /> Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 font-bold">{m.firstName?.[0]}{m.lastName?.[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[#1A1F2B]">{m.firstName} {m.lastName}</p>
                      <Badge className="bg-indigo-100 text-indigo-700 text-xs">{m.role === "admin" ? "Admin" : "Board"}</Badge>
                      {m.status === "inactive" && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-slate-500">{m.boardPosition || <em className="text-slate-300">No position set</em>}</p>
                    <div className="flex gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
                      <span>{m.email}</span>
                      {m.termStart && <span>Term: {new Date(m.termStart).getFullYear()}–{m.termEnd ? new Date(m.termEnd).getFullYear() : "Present"}</span>}
                      {m.committees?.length > 0 && <span>{m.committees.join(", ")}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 h-8" onClick={() => {
                    setEditing(m.id);
                    setForm({
                      role: m.role, status: m.status, boardPosition: m.boardPosition || "",
                      termStart: m.termStart ? m.termStart.split("T")[0] : "",
                      termEnd: m.termEnd ? m.termEnd.split("T")[0] : "",
                      committees: m.committees || [],
                    });
                  }} data-testid={`button-edit-roster-${m.id}`}>
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function BoardRoster() {
  return (
    <PortalGuard allowedRoles={["admin"]}>
      <BoardLayout><RosterContent /></BoardLayout>
    </PortalGuard>
  );
}
