import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { Scale, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ConflictsContent() {
  const [disclosures, setDisclosures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ fiscalYear: new Date().getFullYear(), disclosures: "", interestDescription: "", certified: false });

  useEffect(() => {
    document.title = "Conflicts of Interest | handləkraft.ai";
    apiRequest("GET", "/api/board/coi").then(r => {
      if (r.success) setDisclosures(r.data);
      setLoading(false);
    });
  }, []);

  async function submit() {
    if (!form.fiscalYear) return;
    const r = await apiRequest("POST", "/api/board/coi", form);
    if (r.success) {
      setDisclosures(prev => [r.data, ...prev]);
      setAdding(false);
      setForm({ fiscalYear: new Date().getFullYear(), disclosures: "", interestDescription: "", certified: false });
    }
  }

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B] flex items-center gap-2"><Scale className="w-6 h-6 text-indigo-500" /> Conflicts of Interest</h1>
          <p className="text-slate-500 text-sm mt-0.5">Annual COI disclosures required for board governance compliance.</p>
        </div>
        <Button onClick={() => setAdding(true)} className="bg-indigo-500 text-white gap-2" data-testid="button-add-coi"><Plus className="w-4 h-4" /> New Disclosure</Button>
      </div>

      {adding && (
        <Card className="mb-5 border-indigo-200 shadow-sm">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-[#1A1F2B]">New COI Disclosure</p>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Fiscal Year</label>
              <input type="number" value={form.fiscalYear} onChange={e => setForm(f => ({ ...f, fiscalYear: parseInt(e.target.value) }))} className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-coi-year" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Disclosures</label>
              <textarea value={form.disclosures} onChange={e => setForm(f => ({ ...f, disclosures: e.target.value }))} placeholder="List any relationships, financial interests, or positions that may create a conflict…" rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" data-testid="textarea-coi-disclosures" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Interest Description (if applicable)</label>
              <input value={form.interestDescription} onChange={e => setForm(f => ({ ...f, interestDescription: e.target.value }))} placeholder="Describe the specific interest…" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-coi-interest" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer" data-testid="checkbox-coi-certified">
              <input type="checkbox" checked={form.certified} onChange={e => setForm(f => ({ ...f, certified: e.target.checked }))} className="rounded" />
              <span className="text-slate-600">I certify this disclosure is accurate and complete to the best of my knowledge.</span>
            </label>
            <div className="flex gap-2">
              <Button className="bg-indigo-500 text-white" onClick={submit} disabled={!form.certified} data-testid="button-save-coi">Submit Disclosure</Button>
              <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {disclosures.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><Scale className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">No disclosures filed yet</p><p className="text-xs mt-1">Submit your annual COI disclosure using the button above.</p></div>
      ) : (
        <div className="space-y-3">
          {disclosures.map(d => (
            <Card key={d.id} className="border-0 shadow-sm" data-testid={`coi-${d.id}`}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0"><Scale className="w-5 h-5 text-indigo-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-[#1A1F2B]">FY {d.fiscalYear}</p>
                      <Badge className={d.certified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"} data-testid={`coi-status-${d.id}`}>{d.certified ? "Certified" : "Uncertified"}</Badge>
                    </div>
                    <p className="text-xs text-slate-400">{new Date(d.submittedAt).toLocaleDateString()}</p>
                    {d.disclosures && <p className="text-xs text-slate-500 mt-0.5 truncate">{d.disclosures}</p>}
                  </div>
                  {d.certified && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BoardConflicts() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><ConflictsContent /></BoardLayout>
    </PortalGuard>
  );
}
