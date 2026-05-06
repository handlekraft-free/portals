import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/portal/ClientLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { FolderOpen, MessageSquare, Ticket, Upload, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@shared/branding";

function ClientDashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ tickets: 0, unread: 0, files: 0 });
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `Client Portal | ${BRAND.fullName}`;
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [ticketsRes, filesRes, msgsRes] = await Promise.all([
      apiRequest("GET", "/api/client/tickets"),
      apiRequest("GET", "/api/client/files"),
      apiRequest("GET", "/api/client/messages"),
    ]);
    const tix = ticketsRes.success ? ticketsRes.data : [];
    const files = filesRes.success ? filesRes.data : [];
    const msgsData = msgsRes.success ? msgsRes.data : {};
    const inbox = Array.isArray(msgsData) ? msgsData : (msgsData.inbox || []);
    setTickets(tix.slice(0, 4));
    setStats({ tickets: tix.filter((t: any) => t.status !== "closed").length, unread: inbox.filter((m: any) => !m.readAt).length, files: files.length });
    setLoading(false);
  }

  const STATUS_COLORS: Record<string, string> = { open: "bg-green-100 text-green-700", in_progress: "bg-blue-100 text-blue-700", waiting: "bg-yellow-100 text-yellow-700", resolved: "bg-slate-100 text-slate-600", closed: "bg-slate-100 text-slate-400" };

  return (
    <div>
      {/* Welcome */}
      <div className="bg-gradient-to-r from-[#1A1F2B] to-[#0D7377] rounded-2xl p-6 mb-6 text-white">
        <p className="text-white/60 text-sm">Welcome back</p>
        <h1 className="text-2xl font-display mt-1">Hello, {user?.firstName}! 👋</h1>
        <p className="text-white/70 text-sm mt-1">Your project portal — everything you need in one place.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: <Ticket className="w-5 h-5 text-[#0D7377]" />, label: "Open Tickets", value: loading ? "—" : stats.tickets, bg: "bg-teal-50" },
          { icon: <MessageSquare className="w-5 h-5 text-[#D4A843]" />, label: "Unread Messages", value: loading ? "—" : stats.unread, bg: "bg-amber-50" },
          { icon: <FolderOpen className="w-5 h-5 text-purple-500" />, label: "Shared Files", value: loading ? "—" : stats.files, bg: "bg-purple-50" },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>{s.icon}</div>
              <p className="text-2xl font-bold text-[#1A1F2B]" data-testid={`stat-${i}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <a href="/portal/client/files" className="bg-[#0D7377] text-white rounded-xl p-4 flex flex-col items-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity text-center" data-testid="link-upload">
          <Upload className="w-5 h-5" /> Upload File
        </a>
        <a href="/portal/client/messages" className="bg-[#1A1F2B] text-white rounded-xl p-4 flex flex-col items-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity text-center" data-testid="link-message">
          <MessageSquare className="w-5 h-5" /> Send Message
        </a>
        <a href="/portal/client/tickets" className="bg-[#D4A843] text-[#1A1F2B] rounded-xl p-4 flex flex-col items-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity text-center" data-testid="link-ticket">
          <Plus className="w-5 h-5" /> New Ticket
        </a>
      </div>

      {/* Recent Tickets */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1A1F2B]">Recent Support Tickets</h3>
            <a href="/portal/client/tickets" className="text-xs text-[#0D7377] hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></a>
          </div>
          {loading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}</div> :
            tickets.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No tickets yet.</p> :
              tickets.map((t: any) => (
                <a key={t.id} href="/portal/client/tickets" className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors" data-testid={`ticket-row-${t.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F2B] truncate">{t.title}</p>
                    <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge className={`text-xs ${STATUS_COLORS[t.status] || ""}`}>{t.status.replace("_", " ")}</Badge>
                </a>
              ))
          }
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClientDashboard() {
  return (
    <PortalGuard allowedRoles={["client"]}>
      <ClientLayout><ClientDashboardContent /></ClientLayout>
    </PortalGuard>
  );
}
