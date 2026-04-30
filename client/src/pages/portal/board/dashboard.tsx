import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { CalendarDays, FileText, CheckSquare, Users, ChevronRight, Scale, FileSignature } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

function BoardDashboardContent() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Board Dashboard | handləkraft.ai";
    Promise.all([
      apiRequest("GET", "/api/board/meetings"),
      apiRequest("GET", "/api/board/my-action-items"),
      apiRequest("GET", "/api/board/documents"),
      apiRequest("GET", "/api/board/consents"),
    ]).then(([m, a, d, c]) => {
      if (m.success) setMeetings(m.data.slice(0, 3));
      if (a.success) setActionItems(a.data.slice(0, 5));
      if (d.success) setDocuments(d.data.slice(0, 4));
      if (c.success) setConsents(c.data.filter((x: any) => x.status === "open").slice(0, 3));
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
    </div>
  );

  const upcomingMeetings = meetings.filter(m => m.status === "scheduled" && new Date(m.scheduledAt) > new Date());
  const openActions = actionItems.filter(a => a.status === "open");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display text-[#1A1F2B]">Welcome, {user?.firstName}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {user?.boardPosition ? `${user.boardPosition} · ` : ""}Board of Directors · handləkraft Digital
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Upcoming Meetings", value: upcomingMeetings.length, icon: <CalendarDays className="w-5 h-5 text-indigo-500" />, href: "/portal/board/meetings" },
          { label: "My Action Items", value: openActions.length, icon: <CheckSquare className="w-5 h-5 text-amber-500" />, href: "/portal/board/action-items" },
          { label: "Documents", value: documents.length, icon: <FileText className="w-5 h-5 text-teal-500" />, href: "/portal/board/documents" },
          { label: "Open Consents", value: consents.length, icon: <FileSignature className="w-5 h-5 text-purple-500" />, href: "/portal/board/consents" },
        ].map(card => (
          <Link key={card.label} href={card.href} className="no-underline">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">{card.icon}</div>
                <p className="text-2xl font-bold text-[#1A1F2B]">{card.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Meetings */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#1A1F2B] flex items-center gap-2"><CalendarDays className="w-4 h-4 text-indigo-500" /> Upcoming Meetings</h2>
              <Link href="/portal/board/meetings" className="text-xs text-indigo-600 hover:underline no-underline">View all</Link>
            </div>
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No upcoming meetings scheduled</p>
            ) : upcomingMeetings.map((m: any) => (
              <Link key={m.id} href="/portal/board/meetings" className="no-underline">
                <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg px-2 -mx-2 cursor-pointer transition-colors" data-testid={`meeting-${m.id}`}>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F2B] truncate">{m.title}</p>
                    <p className="text-xs text-slate-400">{new Date(m.scheduledAt).toLocaleDateString()} · {m.meetingType}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* My Action Items */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#1A1F2B] flex items-center gap-2"><CheckSquare className="w-4 h-4 text-amber-500" /> My Action Items</h2>
              <Link href="/portal/board/action-items" className="text-xs text-indigo-600 hover:underline no-underline">View all</Link>
            </div>
            {openActions.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No open action items — well done!</p>
            ) : openActions.map((item: any) => (
              <div key={item.id} className="flex items-start gap-2 py-2.5 border-b border-slate-100 last:border-0" data-testid={`action-item-${item.id}`}>
                <CheckSquare className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1A1F2B] line-clamp-1">{item.description}</p>
                  {item.dueDate && (
                    <p className={`text-xs mt-0.5 ${new Date(item.dueDate) < new Date() ? "text-red-500" : "text-slate-400"}`}>
                      Due {new Date(item.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#1A1F2B] flex items-center gap-2"><FileText className="w-4 h-4 text-teal-500" /> Recent Documents</h2>
              <Link href="/portal/board/documents" className="text-xs text-indigo-600 hover:underline no-underline">View all</Link>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No documents yet</p>
            ) : documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0" data-testid={`doc-${doc.id}`}>
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1F2B] truncate">{doc.title}</p>
                  <p className="text-xs text-slate-400">{doc.documentType} · {new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Open Consents */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-[#1A1F2B] flex items-center gap-2"><FileSignature className="w-4 h-4 text-purple-500" /> Pending Consents</h2>
              <Link href="/portal/board/consents" className="text-xs text-indigo-600 hover:underline no-underline">View all</Link>
            </div>
            {consents.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No pending written consents</p>
            ) : consents.map((c: any) => (
              <div key={c.id} className="flex items-start gap-2 py-2.5 border-b border-slate-100 last:border-0" data-testid={`consent-${c.id}`}>
                <FileSignature className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#1A1F2B]">{c.title}</p>
                  {c.deadline && <p className="text-xs text-slate-400">Deadline: {new Date(c.deadline).toLocaleDateString()}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
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
