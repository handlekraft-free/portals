import { useEffect, useState } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Ticket, ArrowLeft, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@shared/branding";

const STATUS_COLORS: Record<string, string> = { open: "bg-green-100 text-green-700", in_progress: "bg-blue-100 text-blue-700", waiting: "bg-yellow-100 text-yellow-700", resolved: "bg-slate-100 text-slate-600", closed: "bg-slate-100 text-slate-500" };
const PRIORITY_COLORS: Record<string, string> = { urgent: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-blue-100 text-blue-700" };

function TicketsContent() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { document.title = `Client Tickets | ${BRAND.fullName}`; load(); }, []);

  async function load() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/employee/tickets");
    if (res.success) setTickets(res.data);
    setLoading(false);
  }

  async function loadTicket(id: number) {
    const res = await apiRequest("GET", `/api/employee/tickets/${id}`);
    if (res.success) setActiveTicket(res.data);
  }

  async function updateTicket(id: number, updates: any) {
    await apiRequest("PATCH", `/api/employee/tickets/${id}`, updates);
    load();
    if (activeTicket?.id === id) loadTicket(id);
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    await apiRequest("POST", `/api/employee/tickets/${activeTicket.id}/comments`, { content: comment, internal });
    setComment(""); loadTicket(activeTicket.id);
  }

  const slaHours = (t: any) => Math.round((Date.now() - new Date(t.createdAt).getTime()) / 3600000);

  const filtered = statusFilter === "all" ? tickets : tickets.filter(t => t.status === statusFilter);

  if (!activeTicket) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-display text-[#1A1F2B]">Client Tickets</h1><p className="text-slate-500 text-sm">Support requests from your clients.</p></div>
        <div className="flex gap-2 flex-wrap">
          {["all", "open", "in_progress", "waiting", "resolved"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${statusFilter === s ? "bg-[#0D7377] text-white border-[#0D7377]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`} data-testid={`filter-${s}`}>{s.replace("_", " ")}</button>
          ))}
        </div>
      </div>
      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-3">
          {filtered.length === 0 ? <div className="text-center py-16 text-slate-400"><Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No tickets found.</p></div> :
            filtered.map((t: any) => (
              <Card key={t.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadTicket(t.id)} data-testid={`card-ticket-${t.id}`}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F2B]">{t.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.clientFirstName ? `${t.clientFirstName} ${t.clientLastName}` : `Client #${t.clientId}`} · {t.category} · <span className={slaHours(t) > 24 ? "text-red-500" : ""}>{slaHours(t)}h open</span></p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge className={`text-xs ${PRIORITY_COLORS[t.priority] || ""}`}>{t.priority}</Badge>
                    <Badge className={`text-xs ${STATUS_COLORS[t.status] || ""}`}>{t.status.replace("_", " ")}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setActiveTicket(null)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm" data-testid="button-back-tickets"><ArrowLeft className="w-4 h-4" /> Tickets</button>
        <h1 className="text-lg font-display text-[#1A1F2B] flex-1">{activeTicket.title}</h1>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="pt-4">
              <p className="text-sm text-slate-600 mb-4">{activeTicket.description}</p>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {activeTicket.comments?.map((c: any) => (
                  <div key={c.id} className={`p-3 rounded-lg text-sm ${c.internal ? "bg-amber-50 border border-amber-200" : "bg-slate-50"}`} data-testid={`comment-${c.id}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-700">{c.firstName} {c.lastName}</span>
                      {c.internal && <Badge className="text-xs bg-amber-100 text-amber-700">Internal</Badge>}
                      <span className="text-xs text-slate-400 ml-auto">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600">{c.content}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={addComment} className="mt-4 space-y-2">
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-ticket-comment" />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} data-testid="checkbox-internal" />
                    Internal only (not visible to client)
                  </label>
                  <Button type="submit" size="sm" className="bg-[#0D7377] text-white" data-testid="button-submit-comment">Comment</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-3">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Ticket Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <select value={activeTicket.status} onChange={e => updateTicket(activeTicket.id, { status: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm" data-testid="select-ticket-status">
                  {["open", "in_progress", "waiting", "resolved", "closed"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Priority</p>
                <select value={activeTicket.priority} onChange={e => updateTicket(activeTicket.id, { priority: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm" data-testid="select-ticket-priority">
                  {["low", "medium", "high", "urgent"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <p>Category: <span className="text-slate-700">{activeTicket.category || "—"}</span></p>
                <p>Client: <span className="text-slate-700">{activeTicket.clientFirstName ? `${activeTicket.clientFirstName} ${activeTicket.clientLastName}` : `#${activeTicket.clientId}`}</span></p>
                <p>Opened: <span className="text-slate-700">{new Date(activeTicket.createdAt).toLocaleDateString()}</span></p>
                <p className={slaHours(activeTicket) > 24 ? "text-red-500" : "text-slate-700"}>SLA: {slaHours(activeTicket)}h open</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeTickets() {
  return (
    <PortalGuard allowedRoles={["admin", "employee"]}>
      <EmployeeLayout><TicketsContent /></EmployeeLayout>
    </PortalGuard>
  );
}
