import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, CheckCircle2, Circle, Plus, ChevronDown, ChevronUp, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function OnboardingContent() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", linkUrl: "", position: 0 });
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "board";

  useEffect(() => {
    document.title = "Board Onboarding | handləkraft.ai";
    load();
  }, []);

  async function load() {
    setLoading(true);
    const r = await apiRequest("GET", "/api/board/onboarding");
    if (r.success) setItems(r.data || []);
    setLoading(false);
  }

  async function ack(id: number) {
    await apiRequest("POST", `/api/board/onboarding/${id}/ack`);
    setItems(prev => prev.map(it => it.id === id ? { ...it, acked: true } : it));
  }

  async function addItem() {
    if (!form.title.trim()) return;
    setSaving(true);
    let url = form.linkUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    await apiRequest("POST", "/api/board/onboarding/items", { ...form, linkUrl: url || undefined });
    setForm({ title: "", description: "", linkUrl: "", position: 0 });
    setAdding(false);
    await load();
    setSaving(false);
  }

  const completed = items.filter(it => it.acked).length;
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0;

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-500" /> Board Onboarding
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Required reading, policies, and orientation for board members.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAdding(true)} className="bg-indigo-500 text-white gap-2" data-testid="button-add-item">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        )}
      </div>

      {items.length > 0 && (
        <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Your progress</span>
            <span className="text-sm font-bold text-indigo-600" data-testid="text-onboarding-progress">{completed}/{items.length} completed</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div className="bg-indigo-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          {pct === 100 && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> All items acknowledged — onboarding complete!
            </p>
          )}
        </div>
      )}

      {adding && (
        <Card className="mb-5 border-indigo-200 shadow-sm">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-[#1A1F2B]">New Onboarding Item</p>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title (e.g. Read Bylaws)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              data-testid="input-onboarding-title"
            />
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description or instructions (optional)…"
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              data-testid="textarea-onboarding-desc"
            />
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-400" />
              <input
                value={form.linkUrl}
                onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))}
                placeholder="Web link URL (optional — e.g. https://drive.google.com/…)"
                className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                data-testid="input-onboarding-link"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addItem} disabled={saving} className="bg-indigo-500 text-white" data-testid="button-save-onboarding">Save</Button>
              <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-200" />
          <p className="text-slate-400 font-medium">No onboarding items yet</p>
          {isAdmin && <p className="text-slate-300 text-sm mt-1">Add orientation materials using the button above.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(it => (
            <Card key={it.id} className={`border-0 shadow-sm transition-all ${it.acked ? "opacity-70" : ""}`} data-testid={`onboarding-${it.id}`}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => !it.acked && ack(it.id)}
                    className={`mt-0.5 shrink-0 transition-colors ${it.acked ? "text-green-500" : "text-slate-300 hover:text-indigo-400"}`}
                    disabled={!!it.acked}
                    data-testid={`button-ack-${it.id}`}
                  >
                    {it.acked ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold text-sm ${it.acked ? "line-through text-slate-400" : "text-[#1A1F2B]"}`}>{it.title}</p>
                      {it.acked && <Badge className="bg-green-100 text-green-700 text-xs">Done</Badge>}
                      {it.link_url && (
                        <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs border px-1.5 py-0 flex items-center gap-0.5">
                          <Globe className="w-3 h-3" /> Web Link
                        </Badge>
                      )}
                    </div>
                    {it.description && (
                      <div>
                        <button
                          className="text-xs text-indigo-500 flex items-center gap-0.5 mt-1"
                          onClick={() => setExpanded(expanded === it.id ? null : it.id)}
                          data-testid={`button-expand-${it.id}`}
                        >
                          {expanded === it.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expanded === it.id ? "Hide" : "View details"}
                        </button>
                        {expanded === it.id && (
                          <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{it.description}</p>
                        )}
                      </div>
                    )}
                    {it.link_url && (
                      <a
                        href={it.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 mt-1 font-medium"
                        data-testid={`link-onboarding-${it.id}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open link
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {it.link_url && (
                      <a
                        href={it.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors"
                        title="Open link"
                        data-testid={`button-open-${it.id}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {!it.acked && (
                      <Button size="sm" variant="outline" className="text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => ack(it.id)} data-testid={`button-acknowledge-${it.id}`}>
                        Acknowledge
                      </Button>
                    )}
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

export default function BoardOnboarding() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><OnboardingContent /></BoardLayout>
    </PortalGuard>
  );
}
