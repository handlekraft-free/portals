import { useCallback, useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Users, Mail, Building2, Edit3, X, Save, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function fmtYear(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).getFullYear();
}

function EditMemberModal({ member, onClose, onSaved }: { member: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    boardPosition: member.boardPosition || "",
    bio: member.bio || "",
    termStart: member.termStart ? new Date(member.termStart).toISOString().split("T")[0] : "",
    termEnd: member.termEnd ? new Date(member.termEnd).toISOString().split("T")[0] : "",
    committees: (member.committees || []).join(", "),
    emergencyContact: member.emergencyContact || "",
    isInterestedDirector: member.isInterestedDirector ?? false,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function save() {
    setSaving(true);
    const r = await apiRequest("PATCH", `/api/board/roster/${member.id}`, {
      boardPosition: form.boardPosition || null,
      bio: form.bio || null,
      termStart: form.termStart || null,
      termEnd: form.termEnd || null,
      committees: form.committees ? form.committees.split(",").map((c: string) => c.trim()).filter(Boolean) : [],
      emergencyContact: form.emergencyContact || null,
    });
    if (r.success) {
      toast({ title: "Profile updated" });
      onSaved();
      onClose();
    } else {
      toast({ title: "Update failed", description: r.error, variant: "destructive" });
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <div>
            <p className="font-semibold text-[#1A1F2B]">Edit Profile</p>
            <p className="text-xs text-slate-500">{member.firstName} {member.lastName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" data-testid="button-close-edit-member"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Board Position / Title</label>
            <input
              value={form.boardPosition}
              onChange={e => setForm(f => ({ ...f, boardPosition: e.target.value }))}
              placeholder="e.g. Chair, Treasurer, Secretary…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              data-testid="input-member-position"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Term Start</label>
              <input
                type="date"
                value={form.termStart}
                onChange={e => setForm(f => ({ ...f, termStart: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                data-testid="input-term-start"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Term End</label>
              <input
                type="date"
                value={form.termEnd}
                onChange={e => setForm(f => ({ ...f, termEnd: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                data-testid="input-term-end"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Committees (comma-separated)</label>
            <input
              value={form.committees}
              onChange={e => setForm(f => ({ ...f, committees: e.target.value }))}
              placeholder="Finance, Governance, Programs…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              data-testid="input-member-committees"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Bio</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Brief professional bio…"
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              data-testid="textarea-member-bio"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Emergency Contact</label>
            <input
              value={form.emergencyContact}
              onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))}
              placeholder="Name and phone…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              data-testid="input-emergency-contact"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button className="bg-indigo-500 text-white gap-1.5" onClick={save} disabled={saving} data-testid="button-save-member">
              <Save className="w-4 h-4" />{saving ? "Saving…" : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberCard({ member, isAdmin, onEdit }: { member: any; isAdmin: boolean; onEdit: () => void }) {
  const initials = `${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`;
  const termStart = fmtYear(member.termStart);
  const termEnd = fmtYear(member.termEnd);

  const termExpiringSoon = member.termEnd && (() => {
    const end = new Date(member.termEnd);
    const now = new Date();
    const daysUntilExpiry = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 90 ? daysUntilExpiry : null;
  })();

  const POSITION_COLORS: Record<string, string> = {
    "Chair": "bg-indigo-600",
    "Vice Chair": "bg-indigo-500",
    "Treasurer": "bg-emerald-600",
    "Secretary": "bg-violet-600",
  };
  const avatarColor = POSITION_COLORS[member.boardPosition] || "bg-indigo-400";

  return (
    <Card className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow" data-testid={`directory-member-${member.id}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl ${avatarColor} flex items-center justify-center text-white font-bold text-base shrink-0 uppercase`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[#1A1F2B]">{member.firstName} {member.lastName}</p>
                  {member.role === "admin" && <Badge className="bg-red-100 text-red-700 text-xs">Admin</Badge>}
                </div>
                {member.boardPosition && (
                  <p className="text-sm text-indigo-600 font-medium flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />{member.boardPosition}
                  </p>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={onEdit}
                  className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                  data-testid={`button-edit-member-${member.id}`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <a
              href={`mailto:${member.email}`}
              className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 mt-1 no-underline w-fit"
              data-testid={`link-email-${member.id}`}
            >
              <Mail className="w-3 h-3" />{member.email}
            </a>

            {(termStart || termEnd) && (
              <p className="text-xs text-slate-400 mt-0.5">
                Term: {termStart ?? "?"} – {termEnd ?? "Present"}
              </p>
            )}
            {isAdmin && termExpiringSoon !== null && (
              <p className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-0.5" data-testid={`warning-term-expiry-${member.id}`}>
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Term expires in {termExpiringSoon} day{termExpiringSoon !== 1 ? "s" : ""}
              </p>
            )}

            {member.bio && (
              <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{member.bio}</p>
            )}

            {member.committees?.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {member.committees.map((c: string) => (
                  <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DirectoryContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "board";
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editMember, setEditMember] = useState<any | null>(null);

  const load = useCallback(() => {
    apiRequest("GET", "/api/board/members").then(r => {
      if (r.success) setMembers(r.data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { document.title = "Board Directory | handləkraft.ai"; load(); }, [load]);

  const filtered = search.trim()
    ? members.filter(m => {
        const q = search.toLowerCase();
        return m.firstName?.toLowerCase().includes(q)
          || m.lastName?.toLowerCase().includes(q)
          || m.email?.toLowerCase().includes(q)
          || m.boardPosition?.toLowerCase().includes(q)
          || (m.committees || []).some((c: string) => c.toLowerCase().includes(q));
      })
    : members;

  // Sort: Chair first, then alphabetical
  const ORDER = ["Chair", "Vice Chair", "Treasurer", "Secretary"];
  const sorted = [...filtered].sort((a, b) => {
    const ai = ORDER.indexOf(a.boardPosition ?? "");
    const bi = ORDER.indexOf(b.boardPosition ?? "");
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return (a.firstName ?? "").localeCompare(b.firstName ?? "");
  });

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display text-[#1A1F2B] flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-500" /> Board Directory
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Contact info, positions, and committee assignments for all {members.length} board members.
        </p>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, role, committee…"
          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          data-testid="input-directory-search"
        />
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No members match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sorted.map(m => (
            <MemberCard key={m.id} member={m} isAdmin={isAdmin} onEdit={() => setEditMember(m)} />
          ))}
        </div>
      )}

      {editMember && isAdmin && (
        <EditMemberModal member={editMember} onClose={() => setEditMember(null)} onSaved={load} />
      )}
    </div>
  );
}

export default function BoardDirectory() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><DirectoryContent /></BoardLayout>
    </PortalGuard>
  );
}
