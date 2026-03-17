import { useEffect, useState } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { Users, Plus, Search, Download, Edit, UserX, Key, Check, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const ROLE_COLORS: Record<string, string> = { admin: "bg-red-100 text-red-700", employee: "bg-teal-100 text-teal-700", client: "bg-amber-100 text-amber-700", student: "bg-purple-100 text-purple-700" };
const STATUS_COLORS: Record<string, string> = { active: "bg-green-100 text-green-700", inactive: "bg-slate-100 text-slate-500", suspended: "bg-red-100 text-red-600" };

interface UserForm { firstName: string; lastName: string; email: string; role: string; password: string; }

function AdminUsersContent() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState<UserForm>({ firstName: "", lastName: "", email: "", role: "employee", password: "" });
  const [editForm, setEditForm] = useState<{ role: string; status: string; canApprove: boolean; approverId: string }>({ role: "", status: "", canApprove: false, approverId: "" });
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => { document.title = "Portal Users | handləkraft.ai"; load(); }, []);

  async function load() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/admin/portal-users");
    if (res.success) {
      setUsers(Array.isArray(res.data) ? res.data : []);
      if ((res as any).stats) setStats((res as any).stats);
    }
    setLoading(false);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiRequest("POST", "/api/admin/portal-users", form);
    if (res.success) { setUsers(prev => [res.data, ...prev]); setShowCreate(false); setForm({ firstName: "", lastName: "", email: "", role: "employee", password: "" }); load(); }
    else alert(res.error || "Failed to create user");
  }

  async function updateUser(id: number) {
    const payload: any = { role: editForm.role, status: editForm.status, canApprove: editForm.canApprove };
    if (editForm.approverId !== "") payload.approverId = editForm.approverId === "none" ? null : parseInt(editForm.approverId);
    const res = await apiRequest("PATCH", `/api/admin/portal-users/${id}`, payload);
    if (res.success) { setEditUser(null); load(); }
  }

  async function resetPassword(id: number) {
    const pwd = prompt("Enter new temporary password:");
    if (!pwd) return;
    await apiRequest("POST", `/api/admin/portal-users/${id}/reset-password`, { newPassword: pwd });
    alert("Password reset successfully.");
  }

  async function deactivateUser(id: number) {
    if (!confirm("Deactivate this user?")) return;
    await apiRequest("DELETE", `/api/admin/portal-users/${id}`);
    load();
  }

  async function bulkAction(action: string) {
    if (selected.size === 0) return;
    await apiRequest("POST", "/api/admin/portal-users/bulk", { ids: Array.from(selected), action });
    setSelected(new Set());
    load();
  }

  const filtered = users.filter(u => {
    const matchSearch = search === "" || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const toggleSelect = (id: number) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-display text-[#1A1F2B]">Portal Users</h1><p className="text-slate-500 text-sm">Manage employees, clients, students, and admins.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open("/api/admin/portal-users/export/csv")} className="gap-2" data-testid="button-export-csv"><Download className="w-4 h-4" /> Export</Button>
          <Button onClick={() => setShowCreate(true)} className="bg-[#0D7377] text-white gap-2" data-testid="button-create-user"><Plus className="w-4 h-4" /> New User</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[{ role: "employee", label: "Employees", color: "text-[#0D7377]" }, { role: "client", label: "Clients", color: "text-[#D4A843]" }, { role: "student", label: "Students", color: "text-purple-600" }, { role: "admin", label: "Admins", color: "text-red-600" }].map(s => (
          <Card key={s.role} className="border-0 shadow-sm">
            <CardContent className="pt-3 pb-3">
              <p className={`text-xl font-bold ${s.color}`} data-testid={`stat-${s.role}`}>{stats[s.role] || 0}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Card className="mb-4 border-[#0D7377]/20 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Create New User</CardTitle>
            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </CardHeader>
          <CardContent>
            <form onSubmit={createUser} className="grid grid-cols-2 gap-3">
              <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name *" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-first-name" />
              <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name *" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-last-name" />
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email *" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-user-email" />
              <input required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Temp password *" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-user-password" />
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none col-span-2" data-testid="select-user-role">
                <option value="employee">Employee</option>
                <option value="client">Client</option>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
              <div className="col-span-2 flex gap-2">
                <Button type="submit" className="bg-[#0D7377] text-white gap-1" data-testid="button-save-user"><Check className="w-4 h-4" /> Create User</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 text-sm" data-testid="input-search-users" />
        </div>
        <div className="flex gap-1.5">
          {["all", "admin", "employee", "client", "student"].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${roleFilter === r ? "bg-[#0D7377] text-white border-[#0D7377]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`} data-testid={`filter-${r}`}>{r}</button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-teal-50 rounded-lg border border-teal-200 text-sm">
          <span className="text-teal-700 font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkAction("activate")} className="text-xs h-7" data-testid="button-bulk-activate">Activate</Button>
          <Button size="sm" variant="outline" onClick={() => bulkAction("deactivate")} className="text-xs h-7" data-testid="button-bulk-deactivate">Deactivate</Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-teal-500 hover:text-teal-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Table */}
      {loading ? <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div> : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-3 pl-4"><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(u => u.id)) : new Set())} /></th>
                  <th className="text-left p-3 text-slate-500 font-medium">Name</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Email</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Role</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Status</th>
                  <th className="text-left p-3 text-slate-500 font-medium">Last Login</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No users found.</p></td></tr>
                ) : filtered.map((u: any) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors" data-testid={`user-row-${u.id}`}>
                    <td className="p-3 pl-4"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} /></td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                        <span className="font-medium text-[#1A1F2B]">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-500">{u.email}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-xs ${ROLE_COLORS[u.role] || ""}`}>{u.role}</Badge>
                        {u.canApprove && <span title="Can approve timesheets"><ShieldCheck className="w-3.5 h-3.5 text-[#0D7377]" /></span>}
                      </div>
                    </td>
                    <td className="p-3"><Badge className={`text-xs ${STATUS_COLORS[u.status] || ""}`}>{u.status}</Badge></td>
                    <td className="p-3 text-slate-400 text-xs">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {editUser?.id === u.id ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className="border border-slate-200 rounded px-1.5 py-1 text-xs" data-testid={`select-edit-role-${u.id}`}>
                              <option value="employee">employee</option><option value="client">client</option><option value="student">student</option><option value="admin">admin</option>
                            </select>
                            <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="border border-slate-200 rounded px-1.5 py-1 text-xs" data-testid={`select-edit-status-${u.id}`}>
                              <option value="active">active</option><option value="inactive">inactive</option>
                            </select>
                            {(editForm.role === "employee" || editForm.role === "admin") && (
                              <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer" title="Can approve timesheets">
                                <input type="checkbox" checked={editForm.canApprove} onChange={e => setEditForm(f => ({ ...f, canApprove: e.target.checked }))} data-testid={`checkbox-can-approve-${u.id}`} />
                                <ShieldCheck className="w-3 h-3 text-[#0D7377]" /> Approver
                              </label>
                            )}
                            <select value={editForm.approverId} onChange={e => setEditForm(f => ({ ...f, approverId: e.target.value }))} className="border border-slate-200 rounded px-1.5 py-1 text-xs" data-testid={`select-approver-${u.id}`} title="Assign approver">
                              <option value="">No approver</option>
                              <option value="none">— Remove approver</option>
                              {users.filter(a => (a.canApprove || a.role === "admin") && a.id !== u.id).map(a => (
                                <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                              ))}
                            </select>
                            <button onClick={() => updateUser(u.id)} className="p-1 rounded bg-[#0D7377] text-white" data-testid={`button-save-edit-${u.id}`}><Check className="w-3 h-3" /></button>
                            <button onClick={() => setEditUser(null)} className="p-1 rounded hover:bg-slate-100" data-testid={`button-cancel-edit-${u.id}`}><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => { setEditUser(u); setEditForm({ role: u.role, status: u.status, canApprove: u.canApprove || false, approverId: u.approverId ? String(u.approverId) : "" }); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Edit" data-testid={`button-edit-${u.id}`}><Edit className="w-3.5 h-3.5" /></button>
                            <button onClick={() => resetPassword(u.id)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-500" title="Reset password" data-testid={`button-reset-pwd-${u.id}`}><Key className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deactivateUser(u.id)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500" title="Deactivate" data-testid={`button-deactivate-${u.id}`}><UserX className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminUsers() {
  return (
    <PortalGuard allowedRoles={["admin"]}>
      <EmployeeLayout><AdminUsersContent /></EmployeeLayout>
    </PortalGuard>
  );
}
