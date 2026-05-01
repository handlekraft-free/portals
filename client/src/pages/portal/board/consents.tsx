import { useCallback, useEffect, useRef, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import {
  FileSignature, Plus, Check, X, Clock, Users, ChevronDown,
  ChevronUp, AlertTriangle, Upload, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-blue-100 text-blue-700 border-blue-200",
  valid:   "bg-green-100 text-green-700 border-green-200",
  failed:  "bg-red-100 text-red-700 border-red-200",
};

function DeclineModal({ consent, onClose, onSubmit }: { consent: any; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <p className="font-semibold text-[#1A1F2B]">Decline Written Consent</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">⚠ Legal notice — Cal. Corp. Code §5211(b)</p>
            <p>A written consent is only valid if <strong>all eligible</strong> directors consent. If you decline, the motion cannot be approved by written consent and a meeting must be scheduled.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Reason for declining (optional)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Briefly explain your position…"
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              data-testid="textarea-decline-reason"
            />
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-red-500 text-white"
              onClick={() => onSubmit(reason)}
              data-testid="button-confirm-decline"
            >
              Confirm Decline
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentDetail({ consent, currentUserId, isAdmin, onRespond, onClose }: {
  consent: any;
  currentUserId: number;
  isAdmin: boolean;
  onRespond: (id: number, response: "consent" | "decline", reason?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);
  const [showResponded, setShowResponded] = useState(false);
  const [showPending, setShowPending] = useState(true);
  const [declining, setDeclining] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    apiRequest("GET", `/api/board/consents/${consent.id}`).then(r => {
      if (r.success) setDetail(r.data);
      setLoading(false);
    });
  }, [consent.id]);

  const eligible = detail ? [...(detail.responded || []), ...(detail.pending || [])] : [];
  const totalEligible = eligible.length;
  const consentedCount = (detail?.responded || []).filter((r: any) => r.response === "consent").length;
  const declinedCount = (detail?.responded || []).filter((r: any) => r.response === "decline").length;
  const pct = totalEligible > 0 ? Math.round((consentedCount / totalEligible) * 100) : 0;
  const myResponse = detail?.myResponse ?? null;
  const isOverdue = detail?.deadline && new Date(detail.deadline) < new Date();

  async function handleRespond(response: "consent" | "decline", reason?: string) {
    await onRespond(consent.id, response, reason);
    const r = await apiRequest("GET", `/api/board/consents/${consent.id}`);
    if (r.success) setDetail(r.data);
    setDeclining(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-semibold text-[#1A1F2B]">{consent.title}</p>
              <Badge className={`border text-xs ${STATUS_BADGE[consent.status]}`}>{consent.status}</Badge>
            </div>
            {consent.description && <p className="text-xs text-slate-500">{consent.description}</p>}
            {detail?.deadline && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
                <Clock className="w-3 h-3" /> Deadline: {fmtDate(detail.deadline)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0" data-testid="button-close-consent-detail">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}</div>
          ) : (
            <>
              {/* Unanimity progress */}
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-600">Consent Progress</span>
                  <span className="text-xs text-slate-400">{consentedCount}/{totalEligible} consented</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${declinedCount > 0 ? "bg-red-500" : "bg-green-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex gap-3 mt-2 text-xs text-slate-500">
                  {consentedCount > 0 && <span className="text-green-600 font-medium">{consentedCount} consented</span>}
                  {declinedCount > 0 && <span className="text-red-600 font-medium">{declinedCount} declined</span>}
                  {(detail?.pending || []).length > 0 && <span>{(detail.pending || []).length} pending</span>}
                </div>
              </div>

              {/* Cal law notice */}
              {consent.status === "pending" && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Under California law, written consent requires <strong>unanimous</strong> agreement from all eligible directors. Any decline will require a meeting to be scheduled.</span>
                </div>
              )}

              {/* Failed notice */}
              {consent.status === "failed" && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This written consent failed. A meeting must be scheduled to take this action.</span>
                </div>
              )}

              {consent.status === "valid" && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-700 flex gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Unanimous consent received. This resolution has been stored in the Written Consents document folder.</span>
                </div>
              )}

              {/* Responded list */}
              {(detail?.responded || []).length > 0 && (
                <div>
                  <button className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-2" onClick={() => setShowResponded(!showResponded)} data-testid="toggle-responded">
                    {showResponded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Responses ({(detail.responded || []).length})
                  </button>
                  {showResponded && (
                    <div className="space-y-1.5">
                      {(detail.responded || []).map((r: any) => (
                        <div key={r.user_id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${r.response === "consent" ? "bg-green-50" : "bg-red-50"}`} data-testid={`response-${r.user_id}`}>
                          <span className={r.response === "consent" ? "text-green-600" : "text-red-600"}>{r.response === "consent" ? "✓" : "✗"}</span>
                          <span className="font-medium">{r.first_name} {r.last_name}</span>
                          {r.board_position && <span className="text-slate-400">({r.board_position})</span>}
                          {r.reason && <span className="text-slate-500 ml-auto italic truncate max-w-32">{r.reason}</span>}
                          <span className="text-slate-400 ml-auto shrink-0">{fmtDate(r.responded_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pending list */}
              {(detail?.pending || []).length > 0 && (
                <div>
                  <button className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-2" onClick={() => setShowPending(!showPending)} data-testid="toggle-pending">
                    {showPending ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Awaiting response ({(detail.pending || []).length})
                  </button>
                  {showPending && (
                    <div className="space-y-1.5">
                      {(detail.pending || []).map((u: any) => (
                        <div key={u.user_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-xs" data-testid={`pending-${u.user_id}`}>
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="font-medium">{u.first_name} {u.last_name}</span>
                          {u.board_position && <span className="text-slate-400">({u.board_position})</span>}
                          {u.is_interested_director && <Badge className="bg-slate-200 text-slate-600 text-xs ml-auto">Interested</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Current user response actions */}
        {consent.status === "pending" && !myResponse && (
          <div className="p-5 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Your response is needed:</p>
            <div className="flex gap-2">
              <Button
                className="bg-green-500 text-white flex-1 gap-1.5"
                onClick={() => handleRespond("consent")}
                data-testid={`button-consent-detail-${consent.id}`}
              >
                <Check className="w-4 h-4" /> Give Consent
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                onClick={() => setDeclining(true)}
                data-testid={`button-decline-detail-${consent.id}`}
              >
                <X className="w-4 h-4" /> Decline
              </Button>
            </div>
          </div>
        )}
        {myResponse && (
          <div className="p-5 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              You <strong className={myResponse === "consent" ? "text-green-600" : "text-red-600"}>{myResponse === "consent" ? "consented" : "declined"}</strong> to this resolution.
            </p>
          </div>
        )}
      </div>

      {declining && (
        <DeclineModal
          consent={consent}
          onClose={() => setDeclining(false)}
          onSubmit={(reason) => handleRespond("decline", reason)}
        />
      )}
    </div>
  );
}

function NewConsentModal({ members, onClose, onCreated }: {
  members: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ title: "", description: "", deadline: "" });
  const [interested, setInterested] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function submit() {
    if (!form.title.trim()) return;
    setSaving(true);
    const r = await apiRequest("POST", "/api/board/consents", {
      ...form,
      deadline: form.deadline || undefined,
      interestedDirectors: interested,
    });
    if (r.success) {
      toast({ title: "Written consent created" });
      onCreated();
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
          <p className="font-semibold text-[#1A1F2B]">New Written Consent</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" data-testid="button-close-new-consent"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            <strong>California law:</strong> Written consents must be unanimous among all non-interested eligible directors (Cal. Corp. Code §5211(b)). Any decline triggers a meeting requirement.
          </div>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Resolution title *"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            data-testid="input-consent-title"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Resolution description / motion text…"
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            data-testid="textarea-consent-desc"
          />
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Consent deadline (optional)</label>
            <input
              type="date"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              data-testid="input-consent-deadline"
            />
          </div>

          {members.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">
                Interested directors (excluded from unanimity count)
              </label>
              <div className="space-y-1.5">
                {members.map(m => (
                  <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`checkbox-interested-${m.id}`}>
                    <input
                      type="checkbox"
                      checked={interested.includes(m.id)}
                      onChange={e => setInterested(prev =>
                        e.target.checked ? [...prev, m.id] : prev.filter(id => id !== m.id)
                      )}
                      className="accent-amber-500"
                    />
                    <span>{m.firstName} {m.lastName}</span>
                    {m.boardPosition && <span className="text-slate-400 text-xs">({m.boardPosition})</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button className="bg-indigo-500 text-white" onClick={submit} disabled={saving || !form.title.trim()} data-testid="button-save-consent">
              {saving ? "Creating…" : "Create Consent"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const [consents, setConsents] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailConsent, setDetailConsent] = useState<any | null>(null);

  const load = useCallback(() => {
    Promise.all([
      apiRequest("GET", "/api/board/consents"),
      apiRequest("GET", "/api/board/members"),
    ]).then(([c, m]) => {
      if (c.success) setConsents(c.data || []);
      if (m.success) setMembers(m.data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { document.title = "Written Consents | handləkraft.ai"; load(); }, [load]);

  async function respond(consentId: number, response: "consent" | "decline", reason?: string) {
    const r = await apiRequest("POST", `/api/board/consents/${consentId}/respond`, { response, reason });
    if (r.success) {
      const msg = r.data?.statusChanged === "valid"
        ? "Unanimous consent received! Resolution stored in Written Consents."
        : r.data?.statusChanged === "failed"
          ? "Consent declined. A meeting must be scheduled."
          : response === "consent" ? "Your consent has been recorded." : "Your decline has been recorded.";
      toast({ title: msg });
      load();
    }
  }

  const myPending = consents.filter(c => c.status === "pending" && !c.my_response);
  const pending = consents.filter(c => c.status === "pending");
  const closed = consents.filter(c => c.status !== "pending");

  if (loading) return (
    <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">Written Consents</h1>
          <p className="text-slate-500 text-sm mt-0.5">Board votes outside of scheduled meetings (Cal. Corp. Code §5211(b)).</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)} className="bg-indigo-500 text-white gap-2" data-testid="button-new-consent">
            <Plus className="w-4 h-4" /> New Consent
          </Button>
        )}
      </div>

      {/* Needs attention banner */}
      {myPending.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3" data-testid="banner-pending-consents">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Your response is needed</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {myPending.length} pending consent{myPending.length !== 1 ? "s" : ""} require your action.
            </p>
          </div>
        </div>
      )}

      {consents.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FileSignature className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No written consent workflows yet.</p>
          {isAdmin && <p className="text-xs mt-1">Create one using the button above.</p>}
        </div>
      ) : (
        <div className="space-y-5">
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Open ({pending.length})</p>
              <div className="space-y-2">
                {pending.map(c => <ConsentCard key={c.id} consent={c} currentUserId={user!.id} isAdmin={isAdmin} onRespond={respond} onOpenDetail={() => setDetailConsent(c)} />)}
              </div>
            </div>
          )}
          {closed.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Closed ({closed.length})</p>
              <div className="space-y-2">
                {closed.map(c => <ConsentCard key={c.id} consent={c} currentUserId={user!.id} isAdmin={isAdmin} onRespond={respond} onOpenDetail={() => setDetailConsent(c)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <NewConsentModal members={members} onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {detailConsent && (
        <ConsentDetail
          consent={detailConsent}
          currentUserId={user!.id}
          isAdmin={isAdmin}
          onRespond={respond}
          onClose={() => setDetailConsent(null)}
        />
      )}
    </div>
  );
}

function ConsentCard({ consent, currentUserId, isAdmin, onRespond, onOpenDetail }: {
  consent: any;
  currentUserId: number;
  isAdmin: boolean;
  onRespond: (id: number, response: "consent" | "decline", reason?: string) => Promise<void>;
  onOpenDetail: () => void;
}) {
  const [declining, setDeclining] = useState(false);
  const myResponse = consent.my_response;
  const consentCount = parseInt(consent.consent_count || "0");
  const declineCount = parseInt(consent.decline_count || "0");
  const pendingCount = parseInt(consent.pending_count || "0");
  const isOverdue = consent.deadline && new Date(consent.deadline) < new Date();

  return (
    <Card className={`border shadow-sm ${consent.status === "pending" && !myResponse ? "border-amber-200" : "border-slate-100"}`} data-testid={`consent-card-${consent.id}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${consent.status === "valid" ? "bg-green-100" : consent.status === "failed" ? "bg-red-100" : "bg-blue-100"}`}>
            <FileSignature className={`w-5 h-5 ${consent.status === "valid" ? "text-green-600" : consent.status === "failed" ? "text-red-500" : "text-blue-600"}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <button className="font-semibold text-sm text-[#1A1F2B] hover:text-indigo-600 text-left" onClick={onOpenDetail} data-testid={`button-open-consent-${consent.id}`}>
                {consent.title}
              </button>
              <Badge className={`border text-xs ${STATUS_BADGE[consent.status]}`}>{consent.status}</Badge>
              {myResponse && (
                <Badge className={`text-xs ${myResponse === "consent" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  You: {myResponse}
                </Badge>
              )}
            </div>
            {consent.description && <p className="text-xs text-slate-500 mb-1.5 truncate">{consent.description}</p>}
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{consentCount} consented · {declineCount} declined · {pendingCount} pending</span>
              {consent.deadline && (
                <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500" : ""}`}>
                  <Clock className="w-3 h-3" />{isOverdue ? "Overdue: " : "Deadline: "}{fmtDate(consent.deadline)}
                </span>
              )}
            </div>
          </div>

          {consent.status === "pending" && !myResponse && (
            <div className="flex gap-1.5 shrink-0">
              <Button size="sm" className="bg-green-500 text-white h-8 gap-1 text-xs" onClick={() => onRespond(consent.id, "consent")} data-testid={`button-consent-${consent.id}`}>
                <Check className="w-3.5 h-3.5" /> Consent
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => setDeclining(true)} data-testid={`button-decline-${consent.id}`}>
                <X className="w-3.5 h-3.5" /> Decline
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      {declining && (
        <DeclineModal
          consent={consent}
          onClose={() => setDeclining(false)}
          onSubmit={(reason) => { setDeclining(false); onRespond(consent.id, "decline", reason); }}
        />
      )}
    </Card>
  );
}

export default function BoardConsents() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><ConsentsContent /></BoardLayout>
    </PortalGuard>
  );
}
