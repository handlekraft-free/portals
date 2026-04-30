import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { Users, Scale, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function MembersContent() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Board Members | handləkraft.ai";
    apiRequest("GET", "/api/board/members").then(r => {
      if (r.success) setMembers(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display text-[#1A1F2B]">Board Members</h1>
        <p className="text-slate-500 text-sm mt-0.5">handləkraft Digital Board of Directors</p>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No board members found.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map(m => (
            <Card key={m.id} className="border-0 shadow-sm" data-testid={`member-${m.id}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 font-bold text-lg">{m.firstName?.[0]}{m.lastName?.[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[#1A1F2B]">{m.firstName} {m.lastName}</p>
                      {m.role === "admin" && <Badge className="bg-purple-100 text-purple-700 text-xs">Staff</Badge>}
                      {m.status === "inactive" && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    </div>
                    {m.boardPosition && (
                      <p className="text-sm text-indigo-600 flex items-center gap-1 mt-0.5">
                        <Scale className="w-3.5 h-3.5" />{m.boardPosition}
                      </p>
                    )}
                    <a href={`mailto:${m.email}`} className="text-xs text-slate-400 flex items-center gap-1 hover:text-indigo-600 mt-0.5 no-underline">
                      <Mail className="w-3 h-3" />{m.email}
                    </a>
                    {(m.termStart || m.termEnd) && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Term: {m.termStart ? new Date(m.termStart).getFullYear() : "?"} – {m.termEnd ? new Date(m.termEnd).getFullYear() : "Present"}
                      </p>
                    )}
                    {m.isInterestedDirector && <Badge className="bg-amber-100 text-amber-700 text-xs mt-1">Interested Director</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BoardMembers() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><MembersContent /></BoardLayout>
    </PortalGuard>
  );
}
