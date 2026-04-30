import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { Users, Mail, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

function DirectoryContent() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Board Directory | handləkraft.ai";
    apiRequest("GET", "/api/board/members").then(r => {
      if (r.success) setMembers(r.data);
      setLoading(false);
    });
  }, []);

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return !q || m.firstName?.toLowerCase().includes(q) || m.lastName?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.boardPosition?.toLowerCase().includes(q);
  });

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display text-[#1A1F2B] flex items-center gap-2"><Users className="w-6 h-6 text-indigo-500" /> Board Directory</h1>
        <p className="text-slate-500 text-sm mt-0.5">Contact information and committee assignments for all board members.</p>
      </div>

      <div className="mb-4">
        <Input placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" data-testid="input-directory-search" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(m => (
          <Card key={m.id} className="border-0 shadow-sm" data-testid={`directory-member-${m.id}`}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-base shrink-0">
                  {m.firstName?.[0]}{m.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#1A1F2B]">{m.firstName} {m.lastName}</p>
                    {m.role === "admin" && <Badge className="bg-red-100 text-red-700 text-xs">Admin</Badge>}
                    {m.status === "inactive" && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                  {m.boardPosition && (
                    <p className="text-sm text-indigo-600 font-medium flex items-center gap-1 mt-0.5"><Building2 className="w-3.5 h-3.5" />{m.boardPosition}</p>
                  )}
                  <a href={`mailto:${m.email}`} className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 mt-0.5 no-underline" data-testid={`link-email-${m.id}`}><Mail className="w-3 h-3" />{m.email}</a>
                  {m.termStart && (
                    <p className="text-xs text-slate-400 mt-0.5">Term: {new Date(m.termStart).getFullYear()}–{m.termEnd ? new Date(m.termEnd).getFullYear() : "Present"}</p>
                  )}
                  {m.committees?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {m.committees.map((c: string) => (
                        <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
