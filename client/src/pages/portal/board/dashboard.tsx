import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { CalendarDays, FileText, CheckSquare, ChevronRight, FileSignature, Check, X, Clock, AlertCircle, Scale, ShieldAlert, BarChart2, MessageSquare, Bot } from "lucide-react";
import vikingProudImg from "@/assets/images/viking-proud.png";
import { VikingArsenal, RuneDivider } from "@/components/portal/VikingDecor";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TeamChat from "@/components/portal/TeamChat";
import ClaudeChat from "@/components/portal/ClaudeChat";

const TYPE_LABELS: Record<string, string> = {
  regular: "Regular",
  special: "Special",
  annual: "Annual",
  committee: "Committee",
};

const RSVP_LABELS: Record<string, { label: string; color: string }> = {
  yes: { label: "Attending", color: "text-green-600" },
  no: { label: "Declining", color: "text-red-500" },
  tentative: { label: "Tentative", color: "text-amber-500" },
};

function BoardDashboardContent() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rsvping, setRsvping] = useState<number | null>(null);

  const loadDashboard = () => {
    setLoading(true);
    apiRequest("GET", "/api/board/dashboard").then(r => {
      if (r.success) setData(r.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    document.title = "Board Dashboard | handləkraft.ai";
    loadDashboard();
  }, []);

  async function rsvp(meetingId: number, response: string) {
    setRsvping(meetingId);
    await apiRequest("POST", `/api/board/meetings/${meetingId}/rsvp`, { response });
    setRsvping(null);
    loadDashboard();
  }

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
    </div>
  );

  const meetings = data?.upcomingMeetings ?? [];
  const actions = data?.myActionItems ?? [];
  const documents = data?.recentDocuments ?? [];
  const consents = data?.openConsents ?? [];
  const needs = data?.needsAttention ?? {};
  const pendingPolls: any[] = needs.pendingPolls ?? [];
  const overdueActions = actions.filter((a: any) => a.dueDate && new Date(a.dueDate) < new Date());
  const needsRsvp = meetings.filter((m: any) => !m.myRsvp);
  const complianceAlerts = [
    !needs.coiFiled && { key: "coi", icon: Scale, color: "amber", text: `COI disclosure not filed for ${needs.coiYear}`, href: "/portal/board/conflicts" },
    ...(needs.unackedDocuments ?? []).map((d: any) => ({ key: `ack-${d.id}`, icon: ShieldAlert, color: "red", text: `Unacknowledged document: "${d.title}"`, href: "/portal/board/documents" })),
    ...(needs.pendingConsents ?? []).map((c: any) => ({ key: `consent-${c.id}`, icon: FileSignature, color: "purple", text: `Pending consent vote: "${c.title}"`, href: "/portal/board/consents" })),
    ...pendingPolls.map((p: any) => ({ key: `poll-${p.id}`, icon: BarChart2, color: "teal", text: `Availability poll needs your response: "${p.title}"`, href: "/portal/board/meetings" })),
    ...overdueActions.map((a: any) => ({ key: `action-${a.id}`, icon: AlertCircle, color: "red", text: `Overdue action item: "${a.title}"`, href: "/portal/board/action-items" })),
    ...needsRsvp.map((m: any) => ({ key: `rsvp-${m.id}`, icon: CalendarDays, color: "amber", text: `RSVP needed: "${m.title}"`, href: "/portal/board/meetings" })),
  ].filter(Boolean) as { key: string; icon: any; color: string; text: string; href: string }[];

  return (
    <div className="space-y-6">
      {/* Viking Welcome Banner */}
      <div className="bg-gradient-to-br from-[#1A1F2B] via-[#1e2035] to-indigo-950 rounded-2xl px-6 py-8 text-white relative overflow-hidden">
        {/* Decorative Viking */}
        <img
          src={vikingProudImg}
          alt=""
          aria-hidden="true"
          className="absolute right-0 bottom-0 h-36 sm:h-40 opacity-90 pointer-events-none select-none object-contain object-bottom"
        />
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none" aria-hidden="true"
          style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }} />

        {/* Centered headline */}
        <p className="text-center font-display text-4xl sm:text-5xl tracking-tight text-white mb-6 relative z-10" data-testid="banner-headline">
          Hold det hyggelig!
        </p>

        <div className="relative z-10">
          <p className="text-indigo-300/70 text-[11px] uppercase tracking-widest mb-1.5">
            Board of Directors · handləkraft Digital
          </p>
          <h1 className="text-2xl font-display flex items-center gap-2 flex-wrap">
            Heil, {user?.firstName}!
            <VikingArsenal className="text-white/25" />
          </h1>
          <p className="text-white/60 text-sm mt-1.5 max-w-xs leading-relaxed">
            {user?.boardPosition ? <span className="text-indigo-300 font-medium">{user.boardPosition} · </span> : ""}
            The council stands ready. Let's govern with purpose.
          </p>
          {(needsRsvp.length > 0 || overdueActions.length > 0) && (
            <div className="flex gap-2 flex-wrap mt-3">
              {needsRsvp.length > 0 && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 gap-1.5">
                  <AlertCircle className="w-3 h-3" /> {needsRsvp.length} RSVP{needsRsvp.length !== 1 ? "s" : ""} needed
                </Badge>
              )}
              {overdueActions.length > 0 && (
                <Badge className="bg-red-500/20 text-red-300 border-red-400/30 gap-1.5">
                  <AlertCircle className="w-3 h-3" /> {overdueActions.length} overdue action{overdueActions.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Upcoming Meetings", value: meetings.length, icon: <CalendarDays className="w-5 h-5 text-indigo-500" />, href: "/portal/board/meetings" },
          { label: "My Action Items", value: actions.length + pendingPolls.length, icon: <CheckSquare className="w-5 h-5 text-amber-500" />, href: "/portal/board/action-items", warn: overdueActions.length > 0 },
          { label: "Documents", value: documents.length, icon: <FileText className="w-5 h-5 text-teal-500" />, href: "/portal/board/documents" },
          { label: "Open Consents", value: consents.length, icon: <FileSignature className="w-5 h-5 text-purple-500" />, href: "/portal/board/consents" },
        ].map(card => (
          <Link key={card.label} href={card.href} className="no-underline">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  {card.icon}
                  {card.warn && <AlertCircle className="w-4 h-4 text-red-400" />}
                </div>
                <p className="text-2xl font-bold text-[#1A1F2B]">{card.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Compliance "Needs Attention" */}
      {complianceAlerts.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400 bg-amber-50/50" data-testid="card-compliance-alerts">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Governance — Needs Attention
            </p>
            <div className="space-y-2">
              {complianceAlerts.map(alert => {
                const Icon = alert.icon;
                const colorMap: Record<string, string> = {
                  amber: "text-amber-600 bg-amber-100",
                  red: "text-red-600 bg-red-100",
                  purple: "text-purple-600 bg-purple-100",
                  teal: "text-teal-600 bg-teal-100",
                };
                return (
                  <Link key={alert.key} href={alert.href} className="no-underline">
                    <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/60 transition-colors cursor-pointer" data-testid={`compliance-alert-${alert.key}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorMap[alert.color] || "text-slate-600 bg-slate-100"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-sm text-slate-700 flex-1">{alert.text}</p>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Meetings with RSVP */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#1A1F2B] flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" /> Upcoming Meetings
              </h2>
              <Link href="/portal/board/meetings" className="text-xs text-indigo-600 hover:underline no-underline">View all</Link>
            </div>
            {meetings.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No upcoming meetings scheduled</p>
            ) : meetings.map((m: any) => {
              const d = new Date(m.scheduledAt);
              return (
                <div key={m.id} className="py-3 border-b border-slate-100 last:border-0" data-testid={`dashboard-meeting-${m.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-indigo-500 uppercase leading-none">{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}</span>
                      <span className="text-sm font-bold text-indigo-700 leading-tight">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href="/portal/board/meetings" className="no-underline">
                        <p className="text-sm font-medium text-[#1A1F2B] hover:text-indigo-600 transition-colors truncate">{m.title}</p>
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {TYPE_LABELS[m.meetingType] || m.meetingType}
                      </p>
                      {/* RSVP buttons */}
                      {!m.myRsvp ? (
                        <div className="flex gap-1.5 mt-1.5">
                          <span className="text-xs text-amber-600 font-medium mr-1">RSVP:</span>
                          {["yes", "tentative", "no"].map(opt => (
                            <button
                              key={opt}
                              onClick={() => rsvp(m.id, opt)}
                              disabled={rsvping === m.id}
                              className={`text-xs px-2 py-0.5 rounded border transition-colors
                                ${opt === "yes" ? "border-green-300 text-green-600 hover:bg-green-50" :
                                  opt === "no" ? "border-red-300 text-red-500 hover:bg-red-50" :
                                  "border-amber-300 text-amber-600 hover:bg-amber-50"}
                                disabled:opacity-50`}
                              data-testid={`dash-rsvp-${opt}-${m.id}`}
                            >
                              {opt === "yes" ? "Attending" : opt === "no" ? "Declining" : "Tentative"}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-xs ${RSVP_LABELS[m.myRsvp]?.color}`}>
                            {m.myRsvp === "yes" ? <Check className="w-3 h-3 inline mr-0.5" /> : m.myRsvp === "no" ? <X className="w-3 h-3 inline mr-0.5" /> : null}
                            {RSVP_LABELS[m.myRsvp]?.label}
                          </span>
                          <button onClick={() => rsvp(m.id, "yes")} className="text-xs text-slate-400 hover:text-slate-600 underline" data-testid={`change-rsvp-${m.id}`}>Change</button>
                        </div>
                      )}
                    </div>
                    <Link href="/portal/board/meetings" className="no-underline">
                      <ChevronRight className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors mt-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* My Action Items */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#1A1F2B] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-500" /> My Action Items
              </h2>
              <Link href="/portal/board/action-items" className="text-xs text-indigo-600 hover:underline no-underline">View all</Link>
            </div>
            {/* Pending time polls shown as action items */}
            {pendingPolls.map((poll: any) => (
              <Link key={`poll-${poll.id}`} href="/portal/board/meetings" className="no-underline">
                <div className="flex items-start gap-2 py-2.5 border-b border-slate-100 hover:bg-teal-50/40 -mx-1 px-1 rounded transition-colors cursor-pointer" data-testid={`dashboard-poll-${poll.id}`}>
                  <BarChart2 className="w-4 h-4 mt-0.5 shrink-0 text-teal-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1A1F2B] line-clamp-1">{poll.title}</p>
                    <p className="text-xs text-teal-600 font-medium mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Availability poll — response needed
                    </p>
                  </div>
                  <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs shrink-0">Vote</Badge>
                </div>
              </Link>
            ))}
            {actions.length === 0 && pendingPolls.length === 0 ? (
              <div className="text-center py-6">
                <Check className="w-8 h-8 mx-auto text-green-400 mb-2" />
                <p className="text-sm text-slate-400">All caught up — great work!</p>
              </div>
            ) : actions.map((item: any) => {
              const overdue = item.dueDate && new Date(item.dueDate) < new Date();
              return (
                <div key={item.id} className={`flex items-start gap-2 py-2.5 border-b border-slate-100 last:border-0 ${overdue ? "bg-red-50/30 -mx-1 px-1 rounded" : ""}`} data-testid={`dashboard-action-${item.id}`}>
                  <CheckSquare className={`w-4 h-4 mt-0.5 shrink-0 ${overdue ? "text-red-400" : "text-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1A1F2B] line-clamp-1">{item.title}</p>
                    {item.dueDate && (
                      <p className={`text-xs mt-0.5 flex items-center gap-1 ${overdue ? "text-red-500 font-medium" : "text-slate-400"}`}>
                        <Clock className="w-3 h-3" />
                        {overdue ? "Overdue: " : "Due "}{new Date(item.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {actions.length > 0 && (
              <Link href="/portal/board/action-items" className="no-underline">
                <Button variant="outline" size="sm" className="w-full mt-3 h-8 text-xs">
                  View all action items
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#1A1F2B] flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-500" /> Recent Documents
              </h2>
              <Link href="/portal/board/documents" className="text-xs text-indigo-600 hover:underline no-underline">View all</Link>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No documents uploaded yet</p>
            ) : documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0" data-testid={`dashboard-doc-${doc.id}`}>
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1F2B] truncate">{doc.title}</p>
                  <p className="text-xs text-slate-400">{doc.category} · {new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Open Consents */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#1A1F2B] flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-purple-500" /> Pending Consents
              </h2>
              <Link href="/portal/board/consents" className="text-xs text-indigo-600 hover:underline no-underline">View all</Link>
            </div>
            {consents.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No pending written consents</p>
            ) : consents.map((c: any) => (
              <div key={c.id} className="flex items-start gap-2 py-2.5 border-b border-slate-100 last:border-0" data-testid={`dashboard-consent-${c.id}`}>
                <FileSignature className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1F2B] truncate">{c.title}</p>
                  <p className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <Link href="/portal/board/consents" className="no-underline">
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs shrink-0">Needs vote</Badge>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Communication Hub */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[#1A1F2B] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-500" /> Communication Hub
          </h2>
          <Link href="/portal/board/chat" className="text-xs text-indigo-600 hover:underline no-underline">Open full view</Link>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Board Chat
            </p>
            <TeamChat />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Bot className="w-3 h-3 text-slate-400" /> AI Assistant
            </p>
            <ClaudeChat variant="board" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BoardDashboard() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><BoardDashboardContent /></BoardLayout>
    </PortalGuard>
  );
}
