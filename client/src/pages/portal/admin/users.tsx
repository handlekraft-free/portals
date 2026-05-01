import { useEffect, useState } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import {
  Users, Plus, Search, Download, Edit, UserX, Key,
  Check, X, ShieldCheck, UserPlus, ChevronDown, Shield, Tag, ToggleLeft, ToggleRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_ROLES = ["admin", "employee", "client", "student", "board"] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  employee: "Employee",
  client: "Client",
  student: "Student",
  board: "Board Member",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  employee: "bg-teal-100 text-teal-700",
  client: "bg-amber-100 text-amber-700",
  student: "bg-purple-100 text-purple-700",
  board: "bg-indigo-100 text-indigo-700",
};

// ── Role Checkboxes ────────────────────────────────────────────────────────────

function AdditionalRolesEditor({
  primaryRole,
  additionalRoles,
  onChange,
}: {
  primaryRole: string;
  additionalRoles: string[];
  onChange: (roles: string[]) => void;
}) {
  const available = ALL_ROLES.filter(r => r !== primaryRole);
  if (available.length === 0) return null;
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 mb-2 block">Additional portal access</label>
      <div className="grid grid-cols-2 gap-2">
        {available.map(role => {
          const checked = additionalRoles.includes(role);
          return (
            <label
              key={role}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${checked ? "border-[#0D7377] bg-[#0D7377]/5 text-[#0D7377] font-medium" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
              data-testid={`checkbox-role-${role}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={e => {
                  if (e.target.checked) onChange([...additionalRoles, role]);
                  else onChange(additionalRoles.filter(r => r !== role));
                }}
                className="accent-[#0D7377]"
              />
              {ROLE_LABELS[role]}
            </label>
          );
        })}
      </div>
      {additionalRoles.length > 0 && (
        <p className="text-xs text-slate-400 mt-1.5">
          User will be prompted to choose a portal at login when they have multiple roles.
        </p>
      )}
    </div>
  );
}
const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-500",
};

function Avatar({ u }: { u: any }) {
  return (
    <div className="w-8 h-8 rounded-full bg-[#0D7377] flex items-center justify-center text-white text-xs font-bold shrink-0">
      {u.firstName?.[0]}{u.lastName?.[0]}
    </div>
  );
}

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: any) => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", role: "employee", password: "" });
  const [additionalRoles, setAdditionalRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const roles = [form.role, ...additionalRoles.filter(r => r !== form.role)];
    const res = await apiRequest("POST", "/api/admin/portal-users", { ...form, roles });
    setSaving(false);
    if (res.success) { onCreated(res.data); onClose(); }
    else setError(res.error || "Failed to create user");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0D7377]/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-[#0D7377]" />
            </div>
            <h2 className="text-lg font-semibold text-[#1A1F2B]">Add New User</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">First Name *</label>
              <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jordan" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-first-name" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Last Name *</label>
              <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Lee" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-last-name" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Email Address *</label>
            <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jordan@handlekraft.ai" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-user-email" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Primary Role *</label>
            <select
              value={form.role}
              onChange={e => {
                const newRole = e.target.value;
                setForm(f => ({ ...f, role: newRole }));
                setAdditionalRoles(prev => prev.filter(r => r !== newRole));
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
              data-testid="select-user-role"
            >
              <option value="employee">Employee — access internal tools</option>
              <option value="client">Client — access client portal</option>
              <option value="student">Student — access learning portal</option>
              <option value="board">Board Member — board portal access</option>
              <option value="admin">Admin — full access</option>
            </select>
          </div>
          <AdditionalRolesEditor
            primaryRole={form.role}
            additionalRoles={additionalRoles}
            onChange={setAdditionalRoles}
          />
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Temporary Password *</label>
            <input required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="They'll change this on first login" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-user-password" />
            <p className="text-xs text-slate-400 mt-1">User will be prompted to change their password on first sign-in.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1 bg-[#0D7377] text-white gap-2" disabled={saving} data-testid="button-save-user">
              {saving ? "Creating…" : <><UserPlus className="w-4 h-4" /> Create User</>}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────

function EditUserModal({ user, allUsers, onClose, onSaved }: { user: any; allUsers: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    role: user.role,
    status: user.status,
    canApprove: user.canApprove || false,
    approverId: user.approverId ? String(user.approverId) : "",
    boardPosition: user.boardPosition || "",
    termStart: user.termStart ? user.termStart.split("T")[0] : "",
    termEnd: user.termEnd ? user.termEnd.split("T")[0] : "",
    committees: user.committees ? (Array.isArray(user.committees) ? user.committees.join(", ") : user.committees) : "",
    isInterestedDirector: user.isInterestedDirector || false,
  });
  // Initialize additional roles from existing user.roles (all except primary)
  const [additionalRoles, setAdditionalRoles] = useState<string[]>(() => {
    const existing: string[] = Array.isArray(user.roles) ? user.roles : [];
    return existing.filter(r => r !== user.role);
  });
  const [saving, setSaving] = useState(false);
  const [resetPwd, setResetPwd] = useState("");
  const [resetting, setResetting] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const managers = allUsers.filter(u => (u.canApprove || u.role === "admin") && u.id !== user.id);

  async function save() {
    setSaving(true);
    const roles = [form.role, ...additionalRoles.filter(r => r !== form.role)];
    const payload: any = { role: form.role, roles, status: form.status, canApprove: form.canApprove };
    if (form.approverId === "") payload.approverId = null;
    else payload.approverId = parseInt(form.approverId);
    if (form.role === "board" || form.role === "admin") {
      payload.boardPosition = form.boardPosition || null;
      payload.termStart = form.termStart || null;
      payload.termEnd = form.termEnd || null;
      payload.committees = form.committees ? form.committees.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
      payload.isInterestedDirector = form.isInterestedDirector;
    }
    await apiRequest("PATCH", `/api/admin/portal-users/${user.id}`, payload);
    setSaving(false);
    onSaved();
    onClose();
  }

  async function doResetPwd() {
    if (!resetPwd.trim() || resetPwd.length < 6) return;
    setResetting(true);
    await apiRequest("POST", `/api/admin/portal-users/${user.id}/reset-password`, { password: resetPwd });
    setResetting(false);
    setPwdSuccess(true);
    setResetPwd("");
    setTimeout(() => setPwdSuccess(false), 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Avatar u={user} />
            <div>
              <h2 className="text-base font-semibold text-[#1A1F2B]">{user.firstName} {user.lastName}</h2>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Primary Role & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Primary Role</label>
              <select
                value={form.role}
                onChange={e => {
                  const newRole = e.target.value;
                  setForm(f => ({ ...f, role: newRole }));
                  setAdditionalRoles(prev => prev.filter(r => r !== newRole));
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
                data-testid={`select-edit-role-${user.id}`}
              >
                <option value="employee">Employee</option>
                <option value="client">Client</option>
                <option value="student">Student</option>
                <option value="board">Board Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid={`select-edit-status-${user.id}`}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Additional portal access */}
          <AdditionalRolesEditor
            primaryRole={form.role}
            additionalRoles={additionalRoles}
            onChange={setAdditionalRoles}
          />

          {/* Board Member Settings */}
          {(form.role === "board" || form.role === "admin") && (
            <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <p className="text-sm font-semibold text-[#1A1F2B]">Board Member Details</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Board Position / Title</label>
                <input value={form.boardPosition} onChange={e => setForm(f => ({ ...f, boardPosition: e.target.value }))} placeholder="e.g. Chair, Treasurer, Secretary" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid={`input-board-position-${user.id}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Term Start</label>
                  <input type="date" value={form.termStart} onChange={e => setForm(f => ({ ...f, termStart: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid={`input-term-start-${user.id}`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1.5 block">Term End</label>
                  <input type="date" value={form.termEnd} onChange={e => setForm(f => ({ ...f, termEnd: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid={`input-term-end-${user.id}`} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Committees (comma-separated)</label>
                <input value={form.committees} onChange={e => setForm(f => ({ ...f, committees: e.target.value }))} placeholder="Finance, Governance, Audit…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid={`input-committees-${user.id}`} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`checkbox-interested-director-${user.id}`}>
                <input type="checkbox" checked={form.isInterestedDirector} onChange={e => setForm(f => ({ ...f, isInterestedDirector: e.target.checked }))} className="rounded border-slate-300" />
                <span className="text-slate-600">Interested director (has potential conflicts of interest)</span>
              </label>
            </div>
          )}

          {/* Manager Settings */}
          {(form.role === "employee" || form.role === "admin") && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0D7377]" />
                <p className="text-sm font-semibold text-[#1A1F2B]">Manager Settings</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer" data-testid={`checkbox-can-approve-${user.id}`}>
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.canApprove ? "bg-[#0D7377]" : "bg-slate-300"}`} onClick={() => setForm(f => ({ ...f, canApprove: !f.canApprove }))}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.canApprove ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1A1F2B]">Timesheet Approver</p>
                  <p className="text-xs text-slate-400">This person can approve team timesheets</p>
                </div>
              </label>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Reports To (Manager)</label>
                <select value={form.approverId} onChange={e => setForm(f => ({ ...f, approverId: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 bg-white" data-testid={`select-approver-${user.id}`}>
                  <option value="">— No manager assigned —</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.role})</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Timesheets will be sent to this person for approval.</p>
              </div>
            </div>
          )}

          <Button onClick={save} className="w-full bg-[#0D7377] text-white gap-2" disabled={saving} data-testid={`button-save-edit-${user.id}`}>
            {saving ? "Saving…" : <><Check className="w-4 h-4" /> Save Changes</>}
          </Button>

          {/* Reset Password */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reset Password</p>
            {pwdSuccess ? (
              <div className="flex items-center gap-2 text-green-600 text-sm py-2"><Check className="w-4 h-4" /> Password reset successfully</div>
            ) : (
              <div className="flex gap-2">
                <input value={resetPwd} onChange={e => setResetPwd(e.target.value)} placeholder="New password (min 6 chars)" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" data-testid={`input-reset-pwd-${user.id}`} />
                <Button variant="outline" onClick={doResetPwd} disabled={resetting || resetPwd.length < 6} className="border-amber-300 text-amber-600 hover:bg-amber-50" data-testid={`button-reset-pwd-${user.id}`}>
                  <Key className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Managers Tab ──────────────────────────────────────────────────────────────

function ManagersTab({ users, onEdit }: { users: any[]; onEdit: (u: any) => void }) {
  const managers = users.filter(u => u.canApprove || u.role === "admin");
  const unassigned = users.filter(u => (u.role === "employee") && !u.approverId && !u.canApprove && u.role !== "admin");

  return (
    <div className="space-y-6">
      {managers.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No managers yet</p>
          <p className="text-xs mt-1">Open a user's settings and enable "Timesheet Approver" to make them a manager.</p>
        </div>
      ) : (
        <>
          {managers.map(mgr => {
            const reports = users.filter(u => u.approverId === mgr.id);
            return (
              <Card key={mgr.id} className="border-0 shadow-sm" data-testid={`manager-card-${mgr.id}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar u={mgr} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#1A1F2B]">{mgr.firstName} {mgr.lastName}</p>
                          <Badge className={`text-xs ${ROLE_COLORS[mgr.role] || ""}`}>{mgr.role}</Badge>
                          {mgr.canApprove && <span className="inline-flex items-center gap-1 text-xs text-[#0D7377] bg-teal-50 px-2 py-0.5 rounded-full"><ShieldCheck className="w-3 h-3" /> Approver</span>}
                        </div>
                        <p className="text-xs text-slate-400">{mgr.email}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onEdit(mgr)} className="text-xs gap-1" data-testid={`button-edit-manager-${mgr.id}`}>
                      <Edit className="w-3 h-3" /> Edit
                    </Button>
                  </div>
                  <div className="pl-11">
                    <p className="text-xs font-medium text-slate-500 mb-2">Direct Reports ({reports.length})</p>
                    {reports.length === 0 ? (
                      <p className="text-xs text-slate-300 italic">No one reports to this manager yet. Edit an employee and set their "Reports To" field.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {reports.map(r => (
                          <div key={r.id} className="flex items-center gap-1.5 bg-slate-50 rounded-full px-2.5 py-1 text-xs text-slate-600" data-testid={`report-${r.id}`}>
                            <div className="w-4 h-4 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-white" style={{ fontSize: "9px" }}>
                              {r.firstName?.[0]}{r.lastName?.[0]}
                            </div>
                            {r.firstName} {r.lastName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {unassigned.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-700 mb-2">⚠ {unassigned.length} employee{unassigned.length > 1 ? "s" : ""} without a manager</p>
              <div className="flex flex-wrap gap-2">
                {unassigned.map(u => (
                  <button key={u.id} onClick={() => onEdit(u)} className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-full px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-50 transition-colors" data-testid={`unassigned-${u.id}`}>
                    {u.firstName} {u.lastName} <Edit className="w-2.5 h-2.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Charge Codes Tab ──────────────────────────────────────────────────────────

function ChargeCodeModal({ code, onClose, onSaved }: { code: any | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!code;
  const [form, setForm] = useState({ name: code?.name || "", description: code?.description || "", color: code?.color || "#0D7377" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const PRESET_COLORS = ["#0D7377", "#6366f1", "#D4A843", "#ef4444", "#22c55e", "#f97316", "#64748b", "#ec4899"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = isEdit
      ? await apiRequest("PATCH", `/api/admin/charge-codes/${code.id}`, form)
      : await apiRequest("POST", "/api/admin/charge-codes", form);
    setSaving(false);
    if (res.success) { onSaved(); onClose(); }
    else setError(res.error || "Failed to save charge code");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: form.color + "20" }}>
              <Tag className="w-4 h-4" style={{ color: form.color }} />
            </div>
            <h2 className="text-base font-semibold text-[#1A1F2B]">{isEdit ? "Edit Charge Code" : "New Charge Code"}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Working and Available" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-cc-name" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description for team members…" rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 resize-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Color</label>
            <div className="flex items-center gap-3 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? "border-[#1A1F2B] scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} data-testid={`color-${c.replace("#", "")}`} />
              ))}
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-7 h-7 rounded-full cursor-pointer border border-slate-200" title="Custom color" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1 bg-[#0D7377] text-white gap-2" disabled={saving} data-testid="button-save-charge-code">
              <Check className="w-4 h-4" /> {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Code"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChargeCodesTab() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCode, setEditCode] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/admin/charge-codes");
    if (res.success) setCodes(res.data);
    setLoading(false);
  }

  async function toggleActive(code: any) {
    await apiRequest("PATCH", `/api/admin/charge-codes/${code.id}`, { active: !code.active });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-slate-500">Charge codes categorize how time is spent on timesheets. Employees select a charge code for each row when logging hours.</p>
        </div>
        <Button onClick={() => { setEditCode(null); setShowModal(true); }} className="bg-[#0D7377] text-white gap-2 shrink-0" data-testid="button-create-charge-code">
          <Plus className="w-4 h-4" /> New Code
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div>
      ) : codes.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No charge codes yet</p>
          <p className="text-xs mt-0.5">Create codes to categorize how your team logs time.</p>
        </div>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {codes.map((code: any) => (
              <div key={code.id} className={`flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors ${!code.active ? "opacity-50" : ""}`} data-testid={`charge-code-row-${code.id}`}>
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: code.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1F2B]">{code.name}</p>
                  {code.description && <p className="text-xs text-slate-400 truncate">{code.description}</p>}
                </div>
                <Badge className={`text-xs border-0 shrink-0 ${code.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {code.active ? "Active" : "Inactive"}
                </Badge>
                <span className="text-xs text-slate-400 shrink-0">#{code.position + 1}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditCode(code); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#0D7377] transition-colors" title="Edit" data-testid={`button-edit-cc-${code.id}`}>
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleActive(code)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition-colors" title={code.active ? "Deactivate" : "Activate"} data-testid={`button-toggle-cc-${code.id}`}>
                    {code.active ? <ToggleRight className="w-4 h-4 text-[#0D7377]" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showModal && <ChargeCodeModal code={editCode} onClose={() => { setShowModal(false); setEditCode(null); }} onSaved={load} />}
    </div>
  );
}

// ── Main Content ──────────────────────────────────────────────────────────────

function AdminUsersContent() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"users" | "managers" | "charge-codes">("users");

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

  async function deactivateUser(id: number) {
    if (!confirm("Deactivate this user? They won't be able to log in.")) return;
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

  const tabs = [
    { key: "users", label: "All Users", count: users.length },
    { key: "managers", label: "Managers & Reports", count: users.filter(u => u.canApprove || u.role === "admin").length },
    { key: "charge-codes", label: "Charge Codes", count: null },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">User Management</h1>
          <p className="text-slate-500 text-sm">Add employees, clients, students, and set up manager relationships.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open("/api/admin/portal-users/export/csv")} className="gap-2 hidden sm:flex" data-testid="button-export-csv">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-[#0D7377] text-white gap-2" data-testid="button-create-user">
            <UserPlus className="w-4 h-4" /> Add User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { role: "employee", label: "Employees", color: "text-[#0D7377]", bg: "bg-teal-50" },
          { role: "client", label: "Clients", color: "text-[#D4A843]", bg: "bg-amber-50" },
          { role: "student", label: "Students", color: "text-purple-600", bg: "bg-purple-50" },
          { role: "board", label: "Board Members", color: "text-indigo-600", bg: "bg-indigo-50" },
          { role: "admin", label: "Admins", color: "text-red-600", bg: "bg-red-50" },
        ].map(s => (
          <Card key={s.role} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setRoleFilter(s.role); setActiveTab("users"); }}>
            <CardContent className={`pt-3 pb-3 ${s.bg} rounded-xl`}>
              <p className={`text-2xl font-bold ${s.color}`} data-testid={`stat-${s.role}`}>{stats[s.role] || 0}</p>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${activeTab === t.key ? "border-[#0D7377] text-[#0D7377]" : "border-transparent text-slate-500 hover:text-slate-700"}`} data-testid={`tab-${t.key}`}>
            {t.label}
            {t.count != null && t.count > 0 && <span className={`text-xs rounded-full px-1.5 py-0.5 ${activeTab === t.key ? "bg-[#0D7377] text-white" : "bg-slate-200 text-slate-500"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Managers Tab ── */}
      {activeTab === "managers" && (
        <ManagersTab users={users} onEdit={setEditUser} />
      )}

      {/* ── Charge Codes Tab ── */}
      {activeTab === "charge-codes" && (
        <ChargeCodesTab />
      )}

      {/* ── Users Tab ── */}
      {activeTab === "users" && (
        <>
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9 text-sm" data-testid="input-search-users" />
            </div>
            <div className="flex gap-1">
              {["all", "admin", "employee", "client", "student", "board"].map(r => (
                <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1.5 rounded-full text-xs border transition-colors capitalize ${roleFilter === r ? "bg-[#0D7377] text-white border-[#0D7377]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`} data-testid={`filter-${r}`}>{r === "board" ? "Board" : r}</button>
              ))}
            </div>
          </div>

          {/* Bulk Actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 mb-3 p-2.5 bg-teal-50 rounded-lg border border-teal-200 text-sm">
              <span className="text-teal-700 font-medium">{selected.size} selected</span>
              <Button size="sm" variant="outline" onClick={() => bulkAction("activate")} className="text-xs h-7" data-testid="button-bulk-activate">Activate</Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("deactivate")} className="text-xs h-7 text-red-500 border-red-200 hover:bg-red-50" data-testid="button-bulk-deactivate">Deactivate</Button>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-teal-500"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div>
          ) : (
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-3 pl-4 w-10">
                        <input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(filtered.map(u => u.id)) : new Set())} className="rounded" />
                      </th>
                      <th className="text-left p-3 text-slate-500 font-medium">User</th>
                      <th className="text-left p-3 text-slate-500 font-medium">Role</th>
                      <th className="text-left p-3 text-slate-500 font-medium">Status</th>
                      <th className="text-left p-3 text-slate-500 font-medium hidden md:table-cell">Manager</th>
                      <th className="text-left p-3 text-slate-500 font-medium hidden lg:table-cell">Last Login</th>
                      <th className="p-3 w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-14 text-slate-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No users found</p>
                        <p className="text-xs mt-0.5">Try adjusting your filters or add a new user.</p>
                      </td></tr>
                    ) : filtered.map((u: any) => {
                      const manager = u.approverId ? users.find(m => m.id === u.approverId) : null;
                      return (
                        <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors" data-testid={`user-row-${u.id}`}>
                          <td className="p-3 pl-4"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="rounded" /></td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar u={u} />
                              <div>
                                <p className="font-medium text-[#1A1F2B]">{u.firstName} {u.lastName}</p>
                                <p className="text-xs text-slate-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role]).map((r: string) => (
                                <Badge key={r} className={`text-xs border-0 ${ROLE_COLORS[r] || ""}`}>{ROLE_LABELS[r] ?? r}</Badge>
                              ))}
                              {u.canApprove && <span title="Timesheet approver"><ShieldCheck className="w-3.5 h-3.5 text-[#0D7377]" /></span>}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={`text-xs border-0 ${STATUS_COLORS[u.status] || ""}`}>{u.status}</Badge>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            {manager ? (
                              <span className="text-xs text-slate-600">{manager.firstName} {manager.lastName}</span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="p-3 hidden lg:table-cell text-xs text-slate-400">
                            {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#0D7377] transition-colors" title="Edit user" data-testid={`button-edit-${u.id}`}>
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => deactivateUser(u.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors" title="Deactivate" data-testid={`button-deactivate-${u.id}`}>
                                <UserX className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modals */}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {editUser && <EditUserModal user={editUser} allUsers={users} onClose={() => setEditUser(null)} onSaved={load} />}
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
