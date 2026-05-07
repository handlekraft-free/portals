import { useCallback, useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Scale, Plus, Check, AlertCircle, X, Users, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@shared/branding";

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const CURRENT_YEAR = new Date().getFullYear();

function NewDisclosureModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    fiscalYear: CURRENT_YEAR,
    disclosures: "",
    interestDescription: "",
    certified: false,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!form.certified) return;
    setSaving(true);
    const r = await apiRequest("POST", "/api/board/coi", form);
    if (r.success) {
      toast({ title: `FY ${form.fiscalYear} COI disclosure filed.` });
      onSaved();
      onClose();
    } else {
      toast({ title: "Error", description: r.error, variant: "destructive" });
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <p className="font-semibold text-[#0F172A]">New COI Disclosure</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" data-testid="button-close-coi"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700">
            Annual COI disclosures are <strong>permanently retained</strong> as required by nonprofit governance best practices. This form cannot be edited after submission.
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Fiscal Year</label>
            <input
              type="number"
              value={form.fiscalYear}
              onChange={e => setForm(f => ({ ...f, fiscalYear: parseInt(e.target.value) }))}
              className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              data-testid="input-coi-year"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Disclosures
              <span className="font-normal text-slate-400 ml-1">(leave blank if no conflicts)</span>
            </label>
            <textarea
              value={form.disclosures}
              onChange={e => setForm(f => ({ ...f, disclosures: e.target.value }))}
              placeholder={`List any relationships, financial interests, board positions at other organizations, or business dealings that may create an actual or apparent conflict of interest with ${BRAND.name}…`}
              rows={5}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              data-testid="textarea-coi-disclosures"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Nature of Interest <span className="font-normal text-slate-400">(if applicable)</span>
            </label>
            <input
              value={form.interestDescription}
              onChange={e => setForm(f => ({ ...f, interestDescription: e.target.value }))}
              placeholder="Describe the nature of the interest or relationship…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              data-testid="input-coi-interest"
            />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <label className="flex items-start gap-2.5 cursor-pointer" data-testid="checkbox-coi-certified">
              <input
                type="checkbox"
                checked={form.certified}
                onChange={e => setForm(f => ({ ...f, certified: e.target.checked }))}
                className="accent-indigo-500 mt-0.5"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                I certify that the information provided above is accurate and complete to the best of my knowledge, and that I understand my obligation to recuse myself from any matter in which I have a material financial interest or other conflict. I understand this disclosure will be permanently retained.
              </span>
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              className="bg-indigo-500 text-white"
              onClick={submit}
              disabled={saving || !form.certified}
              data-testid="button-save-coi"
            >
              {saving ? "Filing…" : "Submit Disclosure"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConflictsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "board";
  const { toast } = useToast();
  const [disclosures, setDisclosures] = useState<any[]>([]);
  const [complianceGrid, setComplianceGrid] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "compliance">(isAdmin ? "compliance" : "my");

  const load = useCallback(async () => {
    setLoading(true);
    const [coi, grid, mem] = await Promise.all([
      apiRequest("GET", "/api/board/coi"),
      isAdmin ? apiRequest("GET", `/api/board/coi/${CURRENT_YEAR}`) : Promise.resolve({ success: true, data: [] }),
      isAdmin ? apiRequest("GET", "/api/board/members") : Promise.resolve({ success: true, data: [] }),
    ]);
    if (coi.success) {
      const mine = (coi.data || []).filter((d: any) => d.user_id === user!.id || isAdmin);
      setDisclosures(isAdmin ? (coi.data || []) : mine);
    }
    if (grid.success) setComplianceGrid(grid.data || []);
    if (mem.success) setMembers(mem.data || []);
    setLoading(false);
  }, [isAdmin, user]);

  useEffect(() => { document.title = `Conflicts of Interest | ${BRAND.fullName}`; load(); }, [load]);

  // Current-year disclosure filed by this user?
  const myCurrentYearCoi = disclosures.find((d: any) =>
    d.user_id === user!.id && parseInt(d.fiscal_year) === CURRENT_YEAR
  );

  // Admin: build compliance grid (members who haven't filed current year)
  const filedUserIds = new Set(complianceGrid.map((d: any) => d.user_id));
  const notFiled = isAdmin ? members.filter(m => !filedUserIds.has(m.id)) : [];

  if (loading) return (
    <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-display text-[#0F172A] flex items-center gap-2">
            <Scale className="w-6 h-6 text-indigo-500" /> Conflicts of Interest
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Annual COI disclosures required for board governance compliance.</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-indigo-500 text-white gap-2" data-testid="button-add-coi">
          <Plus className="w-4 h-4" /> New Disclosure
        </Button>
      </div>

      {/* COI not filed banner */}
      {!myCurrentYearCoi && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3" data-testid="banner-coi-due">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">FY {CURRENT_YEAR} disclosure required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              You have not yet filed your Conflict of Interest disclosure for the current fiscal year.
            </p>
          </div>
          <Button size="sm" className="bg-amber-500 text-white shrink-0 text-xs" onClick={() => setShowNew(true)} data-testid="button-file-coi-now">
            File Now
          </Button>
        </div>
      )}

      {/* Admin tabs */}
      {isAdmin && (
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setActiveTab("compliance")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === "compliance" ? "bg-indigo-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
            data-testid="tab-compliance"
          >
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Compliance Grid</span>
          </button>
          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === "my" ? "bg-indigo-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
            data-testid="tab-all-disclosures"
          >
            <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> All Disclosures</span>
          </button>
        </div>
      )}

      {/* Compliance Grid (admin only) */}
      {isAdmin && activeTab === "compliance" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500" /> FY {CURRENT_YEAR} Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {members.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No board members found.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {members.map(m => {
                    const filed = filedUserIds.has(m.id);
                    const d = complianceGrid.find((d: any) => d.user_id === m.id);
                    return (
                      <div key={m.id} className="py-3 flex items-center gap-3" data-testid={`compliance-row-${m.id}`}>
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-700 font-bold text-sm">
                          {m.firstName?.[0]}{m.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0F172A]">{m.firstName} {m.lastName}</p>
                          {m.boardPosition && <p className="text-xs text-slate-400">{m.boardPosition}</p>}
                        </div>
                        <div className="text-right">
                          {filed ? (
                            <div>
                              <Badge className="bg-green-100 text-green-700 border-green-200 border text-xs flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Filed
                              </Badge>
                              <p className="text-xs text-slate-400 mt-0.5">{fmtDate(d?.submitted_at)}</p>
                            </div>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3" /> Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {notFiled.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">{notFiled.length} member{notFiled.length !== 1 ? "s" : ""} have not filed FY {CURRENT_YEAR}</p>
              <p className="text-xs text-amber-600">{notFiled.map((m: any) => `${m.firstName} ${m.lastName}`).join(", ")}</p>
            </div>
          )}
        </div>
      )}

      {/* Disclosures list (my view or admin all) */}
      {(!isAdmin || activeTab === "my") && (
        disclosures.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No disclosures filed yet</p>
            <p className="text-xs mt-1">Submit your annual COI disclosure using the button above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {disclosures.map(d => (
              <Card key={d.id} className="border-0 shadow-sm" data-testid={`coi-${d.id}`}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                      <Scale className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-sm text-[#0F172A]">
                          FY {d.fiscal_year}
                          {isAdmin && d.first_name ? ` — ${d.first_name} ${d.last_name}` : ""}
                        </p>
                        <Badge className={`border text-xs ${d.certified ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                          {d.certified ? "Certified" : "Uncertified"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mb-1">{fmtDate(d.submitted_at)}</p>
                      {d.disclosures ? (
                        <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5 mt-1 whitespace-pre-wrap line-clamp-3">{d.disclosures}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No conflicts disclosed.</p>
                      )}
                    </div>
                    {d.certified && <Check className="w-4 h-4 text-green-500 shrink-0 mt-1" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {showNew && <NewDisclosureModal onClose={() => setShowNew(false)} onSaved={load} />}
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
