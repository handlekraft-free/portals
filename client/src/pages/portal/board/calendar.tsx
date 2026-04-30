import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  held: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function CalendarContent() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Board Calendar | handləkraft.ai";
    apiRequest("GET", "/api/board/meetings").then(r => {
      if (r.success) setMeetings(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>;

  const upcoming = meetings.filter(m => new Date(m.scheduledAt) >= new Date()).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const past = meetings.filter(m => new Date(m.scheduledAt) < new Date()).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return (
    <div>
      <h1 className="text-2xl font-display text-[#1A1F2B] mb-1">Board Calendar</h1>
      <p className="text-slate-500 text-sm mb-6">Upcoming and past board meetings.</p>

      {upcoming.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Upcoming ({upcoming.length})</p>
          <div className="space-y-2">
            {upcoming.map(m => (
              <Card key={m.id} className="border-0 shadow-sm border-l-4 border-l-indigo-400" data-testid={`calendar-meeting-${m.id}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                      <CalendarDays className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-[#1A1F2B]">{m.title}</p>
                        <Badge className={`${STATUS_COLORS[m.status] || ""} text-xs capitalize`}>{m.status}</Badge>
                        <Badge className="bg-slate-100 text-slate-600 text-xs capitalize">{m.meetingType}</Badge>
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(m.scheduledAt).toLocaleDateString()} at {new Date(m.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {m.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.location}</span>}
                        {m.platform && <span>{m.platform}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Past ({past.length})</p>
          <div className="space-y-2">
            {past.map(m => (
              <Card key={m.id} className="border-0 shadow-sm opacity-70" data-testid={`calendar-past-${m.id}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-600 truncate">{m.title}</p>
                      <p className="text-xs text-slate-400">{new Date(m.scheduledAt).toLocaleDateString()}</p>
                    </div>
                    <Badge className={`${STATUS_COLORS[m.status] || ""} text-xs capitalize shrink-0`}>{m.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {meetings.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No meetings scheduled yet.</p>
        </div>
      )}
    </div>
  );
}

export default function BoardCalendar() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><CalendarContent /></BoardLayout>
    </PortalGuard>
  );
}
