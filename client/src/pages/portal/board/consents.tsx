import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { FileSignature, Plus, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ConsentsContent() {
  const { user } = useAuth();
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", deadline: "" });

  const loadConsents = () => {
    apiRequest("GET", "/api/board/consents").then(r => {
      if (r.success) setConsents(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { document.title = "Written Consents | handləkraft.ai"; loadConsents(); }, []);

  async function createConsent() {
    if (!form.title) return;
    const r = await apiRequest("POST", "/api/board/consents", form);
    if (r.success) { setShowCreate(false); setForm({ title: "", description: "", deadline: "" }); loadConsents(); }
  }

  async function respond(consentId: number, response: "consent" | "decline") {
    await apiRequest("POST", `/api/board/consents/${consentId}/respond`, { response });
    loadConsents();
  }

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">Written Consents</h1>
          <p className="text-slate-500 text-sm mt-0.5">Board votes and consent items outside of scheduled meetings.</p>
        </div>
        {user?.role === "admin" && <Button onClick={() => setShowCreate(true)} className="bg-indigo-500 text-white gap-2" data-testid="button-new-consent"><Plus className="w-4 h-4" /> New Consent</Button>}
      </div>

      {showCreate && (
        <Card className="mb-5 border-indigo-200 shadow-sm">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-[#1A1F2B]">New Written Consent</p>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Consent title" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-consent-title" />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description / motion text" rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" data-testid="textarea-consent-desc" />
            <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-consent-deadline" />
            <div className="flex gap-2">
              <Button className="bg-indigo-500 text-white" onClick={createConsent} data-testid="button-save-consent">Create</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {consents.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><FileSignature className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No written consents yet.</p></div>
      ) : (
        <div className="space-y-3">
          {consents.map(c => (
            <Card key={c.id} className="border-0 shadow-sm" data-testid={`consent-card-${c.id}`}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-[#1A1F2B]">{c.title}</p>
                      <Badge className={c.status === "valid" ? "bg-green-100 text-green-700" : c.status === "failed" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"} >{c.status}</Badge>
                    </div>
                    {c.description && <p className="text-sm text-slate-500 mb-2">{c.description}</p>}
                    {c.deadline && (
                      <p className={`text-xs flex items-center gap-1 ${new Date(c.deadline) < new Date() ? "text-red-500" : "text-slate-400"}`}>
                        <Clock className="w-3 h-3" /> Deadline: {new Date(c.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {c.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="bg-green-500 text-white h-8 gap-1" onClick={() => respond(c.id, "consent")} data-testid={`button-consent-${c.id}`}>
                        <Check className="w-3.5 h-3.5" /> Consent
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => respond(c.id, "decline")} data-testid={`button-decline-${c.id}`}>
                        <X className="w-3.5 h-3.5" /> Decline
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BoardConsents() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><ConsentsContent /></BoardLayout>
    </PortalGuard>
  );
}
