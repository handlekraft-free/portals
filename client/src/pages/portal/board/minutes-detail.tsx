import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useParams, useLocation } from "wouter";
import { ScrollText, ArrowLeft, Gavel, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
};

function MinutesDetailContent({ meetingId }: { meetingId: string }) {
  const [, navigate] = useLocation();
  const [meeting, setMeeting] = useState<any>(null);
  const [minutes, setMinutes] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Meeting Minutes | handləkraft.ai";
    Promise.all([
      apiRequest("GET", `/api/board/meetings/${meetingId}`),
      apiRequest("GET", `/api/board/meetings/${meetingId}/minutes`),
    ]).then(([mr, minr]) => {
      if (mr.success) setMeeting(mr.data);
      if (minr.success) setMinutes(minr.data);
      setLoading(false);
    });
  }, [meetingId]);

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>;
  if (!meeting) return <div className="text-center py-16 text-slate-400"><p>Meeting not found.</p></div>;

  return (
    <div>
      <button onClick={() => navigate("/portal/board/minutes")} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4" data-testid="button-back-to-minutes">
        <ArrowLeft className="w-4 h-4" /> All Minutes
      </button>
      <h1 className="text-2xl font-display text-[#1A1F2B] mb-0.5">{meeting.title}</h1>
      <p className="text-sm text-slate-400 mb-6">{new Date(meeting.scheduledAt).toLocaleDateString()} — Minutes</p>

      {!minutes ? (
        <div className="text-center py-16 text-slate-400"><ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No minutes recorded for this meeting yet.</p></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={`${STATUS_COLORS[minutes.status] || ""} text-xs capitalize`}>{minutes.status?.replace("_", " ")}</Badge>
            {minutes.quorumPresent && <Badge className="bg-green-100 text-green-700 text-xs">Quorum Present ({minutes.quorumCount})</Badge>}
          </div>

          {minutes.content && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Meeting Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{minutes.content}</p>
              </CardContent>
            </Card>
          )}

          {minutes.motions?.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1"><Gavel className="w-3.5 h-3.5" /> Motions ({minutes.motions.length})</p>
                <div className="space-y-2">
                  {minutes.motions.map((m: any) => (
                    <div key={m.id} className="p-3 bg-slate-50 rounded-lg" data-testid={`motion-${m.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-[#1A1F2B]">{m.motionText}</p>
                        <Badge className={m.passed ? "bg-green-100 text-green-700 text-xs" : "bg-red-100 text-red-700 text-xs"}>{m.passed ? "Passed" : "Not Passed"}</Badge>
                      </div>
                      {(m.votesFor > 0 || m.votesAgainst > 0) && (
                        <p className="text-xs text-slate-400 mt-1">Vote: {m.votesFor}–{m.votesAgainst}{m.votesAbstain > 0 ? `–${m.votesAbstain}` : ""}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {minutes.actionItems?.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Action Items ({minutes.actionItems.length})</p>
                <div className="space-y-2">
                  {minutes.actionItems.map((a: any) => (
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
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default function BoardMinutesDetail() {
  const params = useParams<{ id: string }>();
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><MinutesDetailContent meetingId={params.id} /></BoardLayout>
    </PortalGuard>
  );
}
