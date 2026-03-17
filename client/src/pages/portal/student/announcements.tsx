import { useEffect, useState } from "react";
import { StudentLayout } from "@/components/portal/StudentLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function AnnouncementsContent() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Announcements | handləkraft.ai"; load(); }, []);

  async function load() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/student/announcements");
    if (res.success) setAnnouncements(res.data);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-display text-[#1A1F2B] mb-1">Announcements</h1>
      <p className="text-slate-500 text-sm mb-5">Messages from your instructors and the handləkraft team.</p>
      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="text-center py-16 text-slate-400"><Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No announcements yet. Check back soon.</p></div>
          ) : announcements.map((a: any) => (
            <Card key={a.id} className="border-0 shadow-sm" data-testid={`ann-card-${a.id}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0"><Megaphone className="w-4 h-4 text-amber-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#1A1F2B] text-sm">{a.title}</h3>
                      {a.isPinned && <Badge className="text-xs bg-amber-100 text-amber-700">Pinned</Badge>}
                    </div>
                    <p className="text-sm text-slate-600">{a.content}</p>
                    <p className="text-xs text-slate-400 mt-2">{new Date(a.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
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

export default function StudentAnnouncements() {
  return (
    <PortalGuard allowedRoles={["student"]}>
      <StudentLayout><AnnouncementsContent /></StudentLayout>
    </PortalGuard>
  );
}
