import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/portal/ClientLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { Ticket, Plus, ArrowLeft, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@shared/branding";

const STATUS_COLORS: Record<string, string> = { open: "bg-green-100 text-green-700", in_progress: "bg-blue-100 text-blue-700", waiting: "bg-yellow-100 text-yellow-700", resolved: "bg-slate-100 text-slate-600", closed: "bg-slate-100 text-slate-400" };
const PRIORITY_COLORS: Record<string, string> = { low: "bg-blue-50 text-blue-600", medium: "bg-yellow-50 text-yellow-700", high: "bg-orange-50 text-orange-700", urgent: "bg-red-50 text-red-700" };

function ClientTicketsContent() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "general", priority: "medium" });
  const [comment, setComment] = useState("");

  useEffect(() => { document.title = `Support Tickets | ${BRAND.fullName}`; load(); }, []);

  async function load() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/client/tickets");
    if (res.success) setTickets(res.data);
    setLoading(false);
  }

  async function loadTicket(id: number) {
    const res = await apiRequest("GET", `/api/client/tickets/${id}`);
    if (res.success) setActiveTicket(res.data);
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiRequest("POST", "/api/client/tickets", form);
    if (res.success) { setTickets(prev => [res.data, ...prev]); setShowCreate(false); setForm({ title: "", description: "", category: "general", priority: "medium" }); }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    await apiRequest("POST", `/api/client/tickets/${activeTicket.id}/comments`, { content: comment, internal: false });
    setComment("");
    loadTicket(activeTicket.id);
  }

  if (activeTicket) return (
    <div>
      <button onClick={() => setActiveTicket(null)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4" data-testid="button-back-tickets"><ArrowLeft className="w-4 h-4" /> All Tickets</button>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-display text-[#1A1F2B] flex-1">{activeTicket.title}</h2>
        <Badge className={`text-xs ${STATUS_COLORS[activeTicket.status] || ""}`}>{activeTicket.status.replace("_", " ")}</Badge>
        <Badge className={`text-xs ${PRIORITY_COLORS[activeTicket.priority] || ""}`}>{activeTicket.priority}</Badge>
      </div>
      <Card className="border-0 shadow-sm mb-4">
        <CardContent className="pt-4">
          <p className="text-sm text-slate-600 mb-4 pb-4 border-b">{activeTicket.description}</p>
          <div className="space-y-3 max-h-[45vh] overflow-y-auto">
            {activeTicket.comments?.filter((c: any) => !c.internal).map((c: any) => (
              <div key={c.id} className={`p-3 rounded-xl text-sm ${c.authorRole !== "client" ? "bg-white shadow-sm border ml-0 mr-12" : "bg-[#0D7377]/10 border border-[#0D7377]/20 ml-12 mr-0"}`} data-testid={`comment-${c.id}`}>
                <p className="font-medium text-slate-700 mb-1">{c.authorRole === "client" ? "You" : `${BRAND.name} Team`}</p>
                <p className="text-slate-600">{c.content}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
          {activeTicket.status !== "closed" && (
            <form onSubmit={addComment} className="mt-4 flex gap-2">
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." rows={2} className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-comment" />
              <Button type="submit" className="bg-[#0D7377] text-white self-end gap-1" data-testid="button-comment"><Send className="w-4 h-4" /></Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-2xl font-display text-[#1A1F2B]">Support Tickets</h1><p className="text-slate-500 text-sm">Get help from the {BRAND.name} team.</p></div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#0D7377] text-white gap-2" data-testid="button-new-ticket"><Plus className="w-4 h-4" /> New Ticket</Button>
      </div>
      {showCreate && (
        <Card className="mb-4 border-[#0D7377]/20 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">New Support Request</CardTitle>
            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </CardHeader>
          <CardContent>
            <form onSubmit={createTicket} className="space-y-3">
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief description of the issue *" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-ticket-title" />
              <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed description..." rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-ticket-desc" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-category">
                  {["general", "bug", "feature_request", "billing", "access", "other"].map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                </select>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-priority">
                  {["low", "medium", "high", "urgent"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <Button type="submit" className="bg-[#0D7377] text-white" data-testid="button-submit-ticket">Submit Ticket</Button>
            </form>
          </CardContent>
        </Card>
      )}
      {loading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-2">
          {tickets.length === 0 ? <div className="text-center py-16 text-slate-400"><Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No tickets yet. Submit a request above.</p></div> :
            tickets.map((t: any) => (
              <Card key={t.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadTicket(t.id)} data-testid={`ticket-row-${t.id}`}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F2B] truncate">{t.title}</p>
                    <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()} · {t.category}</p>
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
}

export default function ClientTickets() {
  return (
    <PortalGuard allowedRoles={["client"]}>
      <ClientLayout><ClientTicketsContent /></ClientLayout>
    </PortalGuard>
  );
}
