import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/portal/ClientLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { MessageSquare, Send, Plus, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND } from "@shared/branding";

function MessagesContent() {
  const [messages, setMessages] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [reply, setReply] = useState("");
  const [compose, setCompose] = useState({ subject: "", body: "" });

  useEffect(() => { document.title = `Messages | ${BRAND.fullName}`; load(); }, []);

  async function load() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/client/messages");
    if (res.success) {
      const data = res.data;
      const msgs = Array.isArray(data) ? data : [...(data.inbox || []), ...(data.sent || [])];
      setMessages(msgs);
    }
    setLoading(false);
  }

  async function loadThread(id: number) {
    const res = await apiRequest("GET", `/api/client/messages/${id}`);
    if (res.success) setActiveThread(res.data);
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    await apiRequest("POST", `/api/client/messages/${activeThread.id}/reply`, { body: reply });
    setReply("");
    loadThread(activeThread.id);
  }

  async function sendCompose(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiRequest("POST", "/api/client/messages", compose);
    if (res.success) { setShowCompose(false); setCompose({ subject: "", body: "" }); load(); }
  }

  if (activeThread) return (
    <div>
      <button onClick={() => setActiveThread(null)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4" data-testid="button-back-messages"><ArrowLeft className="w-4 h-4" /> Back</button>
      <h2 className="text-lg font-display text-[#0F172A] mb-4">{activeThread.subject}</h2>
      <div className="space-y-3 mb-4 max-h-[55vh] overflow-y-auto">
        {activeThread.replies?.map((r: any, i: number) => (
          <div key={i} className={`p-3 rounded-xl text-sm ${r.senderRole !== "client" ? "bg-white shadow-sm border border-slate-100 ml-0 mr-12" : "bg-[#2563EB]/10 border border-[#2563EB]/20 ml-12 mr-0"}`} data-testid={`msg-bubble-${i}`}>
            <p className="font-medium text-slate-700 mb-1">{r.senderRole === "client" ? "You" : `${BRAND.name} Team`}</p>
            <p className="text-slate-600">{r.body}</p>
            <p className="text-xs text-slate-400 mt-1">{new Date(r.sentAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <form onSubmit={sendReply} className="flex gap-2">
        <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..." rows={2} className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30" data-testid="input-reply" />
        <Button type="submit" className="bg-[#2563EB] text-white self-end gap-1" data-testid="button-send-reply"><Send className="w-4 h-4" /> Send</Button>
      </form>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-2xl font-display text-[#0F172A]">Messages</h1><p className="text-slate-500 text-sm">Communicate with the {BRAND.name} team.</p></div>
        <Button onClick={() => setShowCompose(true)} className="bg-[#2563EB] text-white gap-2" data-testid="button-compose"><Plus className="w-4 h-4" /> New Message</Button>
      </div>
      {showCompose && (
        <Card className="mb-4 border-[#2563EB]/20 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm text-[#0F172A]">New Message</p>
              <button onClick={() => setShowCompose(false)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={sendCompose} className="space-y-3">
              <input required value={compose.subject} onChange={e => setCompose(f => ({ ...f, subject: e.target.value }))} placeholder="Subject" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30" data-testid="input-subject" />
              <textarea required value={compose.body} onChange={e => setCompose(f => ({ ...f, body: e.target.value }))} placeholder="Your message..." rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30" data-testid="input-message-body" />
              <Button type="submit" className="bg-[#2563EB] text-white gap-1" data-testid="button-send-message"><Send className="w-4 h-4" /> Send</Button>
            </form>
          </CardContent>
        </Card>
      )}
      {loading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-2">
          {messages.length === 0 ? <div className="text-center py-16 text-slate-400"><MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No messages yet. Send your first message above.</p></div> :
            messages.map((m: any) => (
              <Card key={m.id} className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${!m.readAt ? "border-l-4 border-l-[#2563EB]" : ""}`} onClick={() => loadThread(m.id)} data-testid={`msg-row-${m.id}`}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!m.readAt ? "font-semibold text-[#0F172A]" : "text-slate-700"}`}>{m.subject}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{m.body?.slice(0, 80)}</p>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">{new Date(m.sentAt).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))
          }
        </div>
      )}
    </div>
  );
}

export default function ClientMessages() {
  return (
    <PortalGuard allowedRoles={["client"]}>
      <ClientLayout><MessagesContent /></ClientLayout>
    </PortalGuard>
  );
}
