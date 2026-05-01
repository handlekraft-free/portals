import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarClock, Plus, Check, X, ChevronRight, Users, Clock, CheckCircle2,
  AlertCircle, MinusCircle, Pencil, Trash2, RefreshCw, ChevronDown, ChevronUp,
  CalendarDays, Lock,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMES = ["morning", "afternoon", "evening"] as const;
type TimeOfDay = typeof TIMES[number];
const TIME_LABELS: Record<TimeOfDay, string> = { morning: "Morning (9–12)", afternoon: "Afternoon (12–5)", evening: "Evening (5–8)" };
const TIME_COLORS: Record<TimeOfDay, string> = { morning: "bg-amber-100 text-amber-800 border-amber-300", afternoon: "bg-blue-100 text-blue-800 border-blue-300", evening: "bg-violet-100 text-violet-800 border-violet-300" };

interface AvailSlot { day: number; timeOfDay: TimeOfDay }
interface MemberAvail { userId: number; firstName: string; lastName: string; boardPosition?: string; slots: AvailSlot[]; notes?: string }
interface Poll { id: number; title: string; description?: string; status: string; slotCount: number; timezone: string; createdAt: string; creatorFirst?: string; creatorLast?: string }
interface PollSlot { id: number; pollId: number; proposedAt: string; durationMinutes: number; confirmed: boolean }
interface PollResponse { slotId: number; userId: number; availability: string; firstName?: string; lastName?: string; boardPosition?: string }
interface PollDetail extends Poll { slots: PollSlot[]; responses: PollResponse[]; members: { id: number; firstName: string; lastName: string; boardPosition?: string }[] }

// ── Helpers ──────────────────────────────────────────────────────────────────

const TZ_LABELS: Record<string, string> = {
  "America/Los_Angeles": "PST / PDT — Pacific",
  "America/Denver":      "MST / MDT — Mountain",
  "America/Phoenix":     "MST — Arizona (no DST)",
  "America/Chicago":     "CST / CDT — Central",
  "America/New_York":    "EST / EDT — Eastern",
  "America/Anchorage":   "AKST / AKDT — Alaska",
  "Pacific/Honolulu":    "HST — Hawaii",
  "UTC":                 "UTC",
};
const TZ_SHORT: Record<string, string> = {
  "America/Los_Angeles": "Pacific",
  "America/Denver":      "Mountain",
  "America/Phoenix":     "Arizona",
  "America/Chicago":     "Central",
  "America/New_York":    "Eastern",
  "America/Anchorage":   "Alaska",
  "Pacific/Honolulu":    "Hawaii",
  "UTC":                 "UTC",
};

function fmtDate(iso: string, tz?: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", ...(tz ? { timeZone: tz } : {}) });
}
function fmtTime(iso: string, tz?: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", ...(tz ? { timeZone: tz } : {}) });
}
function fmtDateTime(iso: string, tz?: string) { return `${fmtDate(iso, tz)} at ${fmtTime(iso, tz)}`; }

// Count members available per (day, timeOfDay) combination
function buildHeatmap(members: MemberAvail[]) {
  const map: Record<string, number[]> = {};
  DAYS.forEach((_, d) => TIMES.forEach(t => { map[`${d}-${t}`] = []; }));
  members.forEach(m => {
    m.slots.forEach(s => { map[`${s.day}-${s.timeOfDay}`]?.push(m.userId); });
  });
  return map;
}

// ── Availability Grid ─────────────────────────────────────────────────────────

function AvailabilityTab({ currentUserId, isAdmin }: { currentUserId: number; isAdmin: boolean }) {
  const { toast } = useToast();
  const [allMembers, setAllMembers] = useState<MemberAvail[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySlots, setMySlots] = useState<AvailSlot[]>([]);
  const [myNotes, setMyNotes] = useState("");
  const [editingMine, setEditingMine] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [allR, myR] = await Promise.all([
      apiRequest("GET", "/api/board/scheduling/availability"),
      apiRequest("GET", "/api/board/scheduling/availability/me"),
    ]);
    if (allR.success) {
      setAllMembers(allR.data.map((m: any) => ({ ...m, slots: JSON.parse(m.slots || "[]") })));
    }
    if (myR.success) {
      setMySlots(JSON.parse(myR.data.slots || "[]"));
      setMyNotes(myR.data.notes || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => { document.title = "Scheduling | handləkraft Board"; load(); }, [load]);

  function toggleSlot(day: number, time: TimeOfDay) {
    setMySlots(prev => {
      const exists = prev.some(s => s.day === day && s.timeOfDay === time);
      return exists ? prev.filter(s => !(s.day === day && s.timeOfDay === time)) : [...prev, { day, timeOfDay: time }];
    });
  }

  async function save() {
    setSaving(true);
    const r = await apiRequest("PUT", "/api/board/scheduling/availability/me", { slots: mySlots, notes: myNotes });
    if (r.success) {
      toast({ title: "Availability saved", description: "Your availability has been updated." });
      setEditingMine(false);
      load();
    } else {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
    setSaving(false);
  }

  const heatmap = buildHeatmap(allMembers);
  const totalMembers = allMembers.length;
  const myAvailEntry = allMembers.find(m => m.userId === currentUserId);

  // Best overlap slots (top 3 with most members)
  const sorted = Object.entries(heatmap)
    .map(([key, ids]) => ({ key, count: ids.length, day: parseInt(key.split("-")[0]), time: key.split("-")[1] as TimeOfDay }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Best overlap summary */}
      {sorted.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#0D7377]/5 to-transparent">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0D7377]" /> Best Overlap Windows
            </p>
            <div className="flex flex-wrap gap-2">
              {sorted.map(e => (
                <div key={e.key} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm shadow-sm">
                  <span className="font-medium text-[#1A1F2B]">{DAY_FULL[e.day]}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">{TIME_LABELS[e.time].split(" ")[0]}</span>
                  <Badge className="bg-[#0D7377]/10 text-[#0D7377] border-0 text-xs ml-1">{e.count}/{totalMembers}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heatmap grid */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="pt-4 pb-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Team Availability Heatmap</p>
          {totalMembers === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No members have set their availability yet. Be the first!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr>
                    <th className="w-28 text-left text-xs text-slate-400 font-normal pb-2" />
                    {DAYS.map(d => (
                      <th key={d} className="text-xs text-slate-500 font-semibold text-center pb-2">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMES.map(t => (
                    <tr key={t}>
                      <td className="text-xs text-slate-500 pr-3 py-1.5 font-medium">{TIME_LABELS[t]}</td>
                      {DAYS.map((_, d) => {
                        const key = `${d}-${t}`;
                        const ids = heatmap[key] || [];
                        const pct = totalMembers > 0 ? ids.length / totalMembers : 0;
                        const bg = pct === 0 ? "bg-slate-50" : pct < 0.33 ? "bg-[#0D7377]/15" : pct < 0.66 ? "bg-[#0D7377]/35" : "bg-[#0D7377]/65";
                        const isHovered = hovered === key;
                        return (
                          <td key={d} className="py-1 px-0.5">
                            <div
                              className={`h-10 rounded-lg flex items-center justify-center cursor-default transition-all ${bg} ${isHovered ? "ring-2 ring-[#0D7377]" : ""}`}
                              onMouseEnter={() => setHovered(key)}
                              onMouseLeave={() => setHovered(null)}
                              title={ids.length > 0 ? ids.map(id => { const m = allMembers.find(x => x.userId === id); return m ? `${m.firstName} ${m.lastName}` : ""; }).join(", ") : "No availability"}
                            >
                              {ids.length > 0 && (
                                <span className={`text-xs font-semibold ${pct >= 0.5 ? "text-white" : "text-[#0D7377]"}`}>{ids.length}</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 mt-2 pb-3">Hover a cell to see who's available. Numbers = member count.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My availability editor */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Standing Availability</p>
            {!editingMine && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditingMine(true)} data-testid="button-edit-availability">
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            )}
          </div>

          {editingMine ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Check the windows when you're generally free for a 90-minute board meeting:</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr>
                      <th className="w-36 text-left text-xs text-slate-400 font-normal pb-2" />
                      {DAYS.map(d => <th key={d} className="text-xs text-slate-500 font-semibold text-center pb-2">{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {TIMES.map(t => (
                      <tr key={t}>
                        <td className="text-xs text-slate-500 pr-3 py-1.5 font-medium">{TIME_LABELS[t]}</td>
                        {DAYS.map((_, d) => {
                          const checked = mySlots.some(s => s.day === d && s.timeOfDay === t);
                          return (
                            <td key={d} className="py-1 px-0.5">
                              <button
                                onClick={() => toggleSlot(d, t)}
                                className={`w-full h-10 rounded-lg border-2 transition-all flex items-center justify-center ${checked ? "border-[#0D7377] bg-[#0D7377]/15 text-[#0D7377]" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                                data-testid={`avail-${d}-${t}`}
                              >
                                {checked && <Check className="w-4 h-4" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Additional notes (e.g. timezone, blackout weeks, preferences)</label>
                <textarea
                  value={myNotes}
                  onChange={e => setMyNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. I'm in PST. Prefer Tuesday afternoons. Unavailable 3rd week of December."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 resize-none"
                  data-testid="input-avail-notes"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { setEditingMine(false); load(); }} variant="outline" className="h-8 text-sm" data-testid="button-cancel-avail">Cancel</Button>
                <Button onClick={save} disabled={saving} className="bg-[#0D7377] hover:bg-[#0a5c60] text-white h-8 text-sm" data-testid="button-save-avail">
                  {saving ? "Saving…" : "Save Availability"}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {mySlots.length === 0 ? (
                <p className="text-sm text-slate-400 italic">You haven't set your availability yet. Click Edit to get started.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((_, d) =>
                    TIMES.filter(t => mySlots.some(s => s.day === d && s.timeOfDay === t)).map(t => (
                      <span key={`${d}-${t}`} className={`text-xs px-2 py-1 rounded-md border ${TIME_COLORS[t]}`}>
                        {DAYS[d]} {TIME_LABELS[t].split(" ")[0]}
                      </span>
                    ))
                  )}
                </div>
              )}
              {myAvailEntry?.notes && (
                <p className="text-xs text-slate-500 mt-2 italic">"{myAvailEntry.notes}"</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All members' stated preferences */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> All Members
          </p>
          {allMembers.length === 0 ? (
            <p className="text-sm text-slate-400">No availability set by any member yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {allMembers.map(m => (
                <div key={m.userId} className="py-3 flex items-start gap-3" data-testid={`member-avail-${m.userId}`}>
                  <div className="w-8 h-8 rounded-full bg-[#0D7377]/10 text-[#0D7377] text-xs font-bold flex items-center justify-center shrink-0">
                    {m.firstName?.[0]}{m.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F2B]">{m.firstName} {m.lastName}
                      {m.boardPosition && <span className="ml-1.5 text-xs text-[#D4A843] font-normal">({m.boardPosition})</span>}
                    </p>
                    {m.slots.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Not set</p>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {DAYS.map((_, d) =>
                          TIMES.filter(t => m.slots.some(s => s.day === d && s.timeOfDay === t)).map(t => (
                            <span key={`${d}-${t}`} className={`text-xs px-1.5 py-0.5 rounded border ${TIME_COLORS[t]}`}>
                              {DAYS[d]} {TIME_LABELS[t].split(" ")[0]}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                    {m.notes && <p className="text-xs text-slate-400 mt-0.5 italic">"{m.notes}"</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Meeting Time Polls Tab ────────────────────────────────────────────────────

const AVAIL_COLORS: Record<string, string> = {
  yes: "bg-green-100 text-green-700 border-green-300",
  if_needed: "bg-amber-100 text-amber-700 border-amber-300",
  no: "bg-red-100 text-red-600 border-red-300",
};
const AVAIL_ICONS: Record<string, JSX.Element> = {
  yes: <CheckCircle2 className="w-3.5 h-3.5" />,
  if_needed: <AlertCircle className="w-3.5 h-3.5" />,
  no: <MinusCircle className="w-3.5 h-3.5" />,
};
const AVAIL_LABELS: Record<string, string> = { yes: "Works", if_needed: "If Needed", no: "Can't" };

function PollCard({ poll, currentUserId, isAdmin, onOpen, onDelete }: {
  poll: Poll; currentUserId: number; isAdmin: boolean;
  onOpen: (id: number) => void; onDelete: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group" onClick={() => onOpen(poll.id)} data-testid={`poll-card-${poll.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-[#1A1F2B] truncate">{poll.title}</p>
          <Badge className={poll.status === "open" ? "bg-green-100 text-green-700 border-green-300" : "bg-slate-100 text-slate-500 border-slate-200"}>
            {poll.status === "open" ? "Open" : <><Lock className="w-2.5 h-2.5 inline mr-0.5" />Closed</>}
          </Badge>
        </div>
        {poll.description && <p className="text-xs text-slate-400 truncate mb-1">{poll.description}</p>}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span><CalendarDays className="w-3 h-3 inline mr-0.5" />{poll.slotCount} time slot{poll.slotCount !== 1 ? "s" : ""}</span>
          <span>By {poll.creatorFirst} {poll.creatorLast}</span>
          <span>{new Date(poll.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isAdmin && (
          <button onClick={e => { e.stopPropagation(); onDelete(poll.id); }}
            className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" data-testid={`delete-poll-${poll.id}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>
    </div>
  );
}

function PollDetailView({ pollId, currentUserId, isAdmin, onBack, onRefresh }: {
  pollId: number; currentUserId: number; isAdmin: boolean;
  onBack: () => void; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<PollDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [myResponses, setMyResponses] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [createMtg, setCreateMtg] = useState(true);
  const [mtgTitle, setMtgTitle] = useState("");
  const [confirmSlotId, setConfirmSlotId] = useState<number | null>(null);
  const [addingSlot, setAddingSlot] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("10:00");
  const [newSlotDuration, setNewSlotDuration] = useState("90");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiRequest("GET", `/api/board/polls/${pollId}`);
    if (r.success) {
      setDetail(r.data);
      // Pre-fill my existing responses
      const mine: Record<number, string> = {};
      r.data.responses.forEach((resp: PollResponse) => {
        if (resp.userId === currentUserId) mine[resp.slotId] = resp.availability;
      });
      setMyResponses(mine);
      setMtgTitle(r.data.title);
    }
    setLoading(false);
  }, [pollId, currentUserId]);

  useEffect(() => { load(); }, [load]);

  async function submitResponses() {
    if (!detail) return;
    setSubmitting(true);
    const responses = detail.slots.map(s => ({ slotId: s.id, availability: myResponses[s.id] || "no" }));
    const r = await apiRequest("POST", `/api/board/polls/${pollId}/respond`, { responses });
    if (r.success) {
      toast({ title: "Responses saved", description: "Your availability has been recorded." });
      load();
    } else {
      toast({ title: "Error", description: "Failed to save responses.", variant: "destructive" });
    }
    setSubmitting(false);
  }

  async function confirmSlot(slotId: number) {
    const r = await apiRequest("POST", `/api/board/polls/${pollId}/confirm/${slotId}`, {
      createMeeting: createMtg,
      title: mtgTitle || detail?.title,
    });
    if (r.success) {
      toast({ title: "Slot confirmed!", description: createMtg ? "Meeting has been created on the calendar." : "Poll has been closed." });
      setConfirmSlotId(null);
      load(); onRefresh();
    } else {
      toast({ title: "Error", description: "Failed to confirm slot.", variant: "destructive" });
    }
  }

  async function addSlot() {
    if (!newSlotDate || !newSlotTime) return;
    const proposedAt = new Date(`${newSlotDate}T${newSlotTime}:00`).toISOString();
    const r = await apiRequest("POST", `/api/board/polls/${pollId}/slots`, { proposedAt, durationMinutes: parseInt(newSlotDuration) || 90 });
    if (r.success) { setAddingSlot(false); setNewSlotDate(""); load(); }
  }

  async function deleteSlot(slotId: number) {
    if (!confirm("Remove this time slot?")) return;
    await apiRequest("DELETE", `/api/board/polls/${pollId}/slots/${slotId}`);
    load();
  }

  if (loading || !detail) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>;

  // For each slot, tally responses
  function getSlotTally(slotId: number) {
    const slotResps = detail!.responses.filter(r => r.slotId === slotId);
    const yes = slotResps.filter(r => r.availability === "yes").length;
    const maybe = slotResps.filter(r => r.availability === "if_needed").length;
    const no = slotResps.filter(r => r.availability === "no").length;
    const total = detail!.members.length;
    const responded = slotResps.length;
    return { yes, maybe, no, total, responded };
  }

  const isClosed = detail.status === "closed";

  return (
    <div>
      <button onClick={onBack} className="text-sm text-[#0D7377] hover:underline mb-4 flex items-center gap-1">
        ← Back to polls
      </button>

      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-display text-[#1A1F2B]">{detail.title}</h2>
            <Badge className={isClosed ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-green-100 text-green-700 border-green-300"}>
              {isClosed ? <><Lock className="w-2.5 h-2.5 inline mr-0.5" />Closed</> : "Open"}
            </Badge>
          </div>
          {detail.description && <p className="text-sm text-slate-500">{detail.description}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-slate-400">Created by {detail.creatorFirst} {detail.creatorLast} · {new Date(detail.createdAt).toLocaleDateString()}</p>
            <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded px-2 py-0.5" data-testid="badge-poll-timezone">
              <Clock className="w-3 h-3" /> {TZ_SHORT[detail.timezone] || detail.timezone} time
            </span>
          </div>
        </div>
        {isAdmin && !isClosed && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1 shrink-0" onClick={async () => { await apiRequest("PATCH", `/api/board/polls/${pollId}`, { status: "closed" }); load(); onRefresh(); }}>
            <Lock className="w-3 h-3" /> Close Poll
          </Button>
        )}
      </div>

      {/* Time slots */}
      <div className="space-y-3 mb-5">
        {detail.slots.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">No time slots yet.{isAdmin || !isClosed ? " Add one below." : ""}</div>
        )}
        {detail.slots.map(slot => {
          const tally = getSlotTally(slot.id);
          const score = tally.yes + tally.maybe * 0.5;
          const maxScore = tally.total;
          const pctFill = maxScore > 0 ? (score / maxScore) * 100 : 0;
          const isConfirmed = slot.confirmed;
          const myChoice = myResponses[slot.id] || "";

          return (
            <Card key={slot.id} className={`border shadow-sm ${isConfirmed ? "border-green-400 bg-green-50" : "border-slate-200"}`} data-testid={`slot-${slot.id}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isConfirmed && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                      <p className="text-sm font-semibold text-[#1A1F2B]">{fmtDateTime(slot.proposedAt, detail.timezone)}</p>
                      <span className="text-xs text-slate-400">{slot.durationMinutes} min</span>
                      {isConfirmed && <Badge className="bg-green-100 text-green-700 border-green-300">Selected</Badge>}
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-[#0D7377] transition-all" style={{ width: `${pctFill}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">
                        <span className="text-green-600 font-medium">{tally.yes}</span>
                        {tally.maybe > 0 && <span className="text-amber-600 font-medium"> +{tally.maybe}</span>}
                        <span className="text-slate-400">/{tally.total}</span>
                      </span>
                    </div>

                    {/* Per-person breakdown */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {detail.members.map(m => {
                        const resp = detail.responses.find(r => r.slotId === slot.id && r.userId === m.id);
                        const avail = resp?.availability || "no";
                        const isMe = m.id === currentUserId;
                        return (
                          <span key={m.id} className={`text-xs px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${AVAIL_COLORS[avail]} ${isMe ? "ring-1 ring-offset-0 ring-[#0D7377]" : ""}`} title={`${m.firstName} ${m.lastName}: ${AVAIL_LABELS[avail]}`}>
                            {AVAIL_ICONS[avail]}
                            <span>{m.firstName[0]}{m.lastName[0]}</span>
                          </span>
                        );
                      })}
                      {tally.responded < tally.total && (
                        <span className="text-xs px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-400">{tally.total - tally.responded} pending</span>
                      )}
                    </div>

                    {/* My vote buttons (only if poll is open) */}
                    {!isClosed && (
                      <div className="flex gap-1.5">
                        {(["yes", "if_needed", "no"] as const).map(a => (
                          <button
                            key={a}
                            onClick={() => setMyResponses(prev => ({ ...prev, [slot.id]: a }))}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all ${myChoice === a ? AVAIL_COLORS[a] + " font-semibold" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                            data-testid={`vote-${slot.id}-${a}`}
                          >
                            {AVAIL_ICONS[a]} {AVAIL_LABELS[a]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Admin confirm / delete */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {isAdmin && !isClosed && !isConfirmed && (
                      <button onClick={() => setConfirmSlotId(confirmSlotId === slot.id ? null : slot.id)}
                        className="p-1.5 text-slate-400 hover:text-green-600 transition-colors" title="Confirm this slot" data-testid={`confirm-slot-${slot.id}`}>
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && !isConfirmed && (
                      <button onClick={() => deleteSlot(slot.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors" title="Remove slot" data-testid={`delete-slot-${slot.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Confirm slot panel */}
                {confirmSlotId === slot.id && isAdmin && (
                  <div className="mt-3 pt-3 border-t border-green-200 space-y-2">
                    <p className="text-xs font-semibold text-green-700">Confirm this time slot</p>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" checked={createMtg} onChange={e => setCreateMtg(e.target.checked)} className="rounded" />
                      Create a board meeting on the calendar
                    </label>
                    {createMtg && (
                      <input value={mtgTitle} onChange={e => setMtgTitle(e.target.value)} placeholder="Meeting title"
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" data-testid="input-mtg-title" />
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setConfirmSlotId(null)} variant="outline" className="h-7 text-xs">Cancel</Button>
                      <Button size="sm" onClick={() => confirmSlot(slot.id)} className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs gap-1" data-testid={`confirm-slot-submit-${slot.id}`}>
                        <Check className="w-3 h-3" /> Confirm & Close Poll
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit responses */}
      {!isClosed && detail.slots.length > 0 && (
        <Button onClick={submitResponses} disabled={submitting} className="w-full bg-[#0D7377] hover:bg-[#0a5c60] text-white mb-5" data-testid="button-submit-responses">
          {submitting ? "Saving…" : "Save My Availability"}
        </Button>
      )}

      {/* Add slot (any board member) */}
      {!isClosed && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            {!addingSlot ? (
              <button onClick={() => setAddingSlot(true)} className="flex items-center gap-2 text-sm text-[#0D7377] hover:underline" data-testid="button-add-slot">
                <Plus className="w-4 h-4" /> Propose another time slot
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-700">Add a Time Slot</p>
                <div className="flex gap-2 flex-wrap">
                  <input type="date" value={newSlotDate} onChange={e => setNewSlotDate(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-slot-date" />
                  <input type="time" value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-slot-time" />
                  <select value={newSlotDuration} onChange={e => setNewSlotDuration(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" data-testid="select-slot-duration">
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                    <option value="120">120 min</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setAddingSlot(false)} variant="outline" className="h-8 text-sm">Cancel</Button>
                  <Button size="sm" onClick={addSlot} disabled={!newSlotDate} className="bg-[#0D7377] hover:bg-[#0a5c60] text-white h-8 text-sm" data-testid="button-submit-slot">Add Slot</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PollsTab({ currentUserId, isAdmin }: { currentUserId: number; isAdmin: boolean }) {
  const { toast } = useToast();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewPollId, setViewPollId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [slots, setSlots] = useState<{ date: string; time: string; duration: string }[]>([{ date: "", time: "10:00", duration: "90" }]);
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState("America/Los_Angeles");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiRequest("GET", "/api/board/polls");
    if (r.success) setPolls(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createPoll() {
    if (!form.title) return;
    setSaving(true);
    const validSlots = slots
      .filter(s => s.date && s.time)
      .map(s => ({ proposedAt: new Date(`${s.date}T${s.time}:00`).toISOString(), durationMinutes: parseInt(s.duration) || 90 }));
    const r = await apiRequest("POST", "/api/board/polls", { title: form.title, description: form.description, timezone, slots: validSlots });
    if (r.success) {
      toast({ title: "Poll created", description: "Board members can now respond." });
      setCreating(false); setForm({ title: "", description: "" }); setTimezone("America/Los_Angeles"); setSlots([{ date: "", time: "10:00", duration: "90" }]);
      load();
    }
    setSaving(false);
  }

  async function deletePoll(id: number) {
    if (!confirm("Delete this poll and all responses?")) return;
    await apiRequest("DELETE", `/api/board/polls/${id}`);
    load();
  }

  if (viewPollId) return <PollDetailView pollId={viewPollId} currentUserId={currentUserId} isAdmin={isAdmin} onBack={() => setViewPollId(null)} onRefresh={load} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Create polls to find the best date for upcoming meetings.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white gap-2" data-testid="button-new-poll">
          <Plus className="w-4 h-4" /> New Poll
        </Button>
      </div>

      {/* Create poll form */}
      {creating && (
        <Card className="border-indigo-200 shadow-sm">
          <CardContent className="pt-4 space-y-4">
            <p className="text-sm font-semibold text-[#1A1F2B]">Create a Time Poll</p>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Poll title (e.g. Q3 Board Meeting)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-poll-title" />
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-poll-description" />

            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Time Zone</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                data-testid="select-poll-timezone"
              >
                {Object.entries(TZ_LABELS).map(([tz, label]) => (
                  <option key={tz} value={tz}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">Proposed time slots</p>
              <div className="space-y-2">
                {slots.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center flex-wrap">
                    <input type="date" value={s.date} onChange={e => { const n = [...slots]; n[i].date = e.target.value; setSlots(n); }}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid={`slot-date-${i}`} />
                    <input type="time" value={s.time} onChange={e => { const n = [...slots]; n[i].time = e.target.value; setSlots(n); }}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" data-testid={`slot-time-${i}`} />
                    <select value={s.duration} onChange={e => { const n = [...slots]; n[i].duration = e.target.value; setSlots(n); }}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                      <option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option>
                    </select>
                    {slots.length > 1 && (
                      <button onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setSlots([...slots, { date: "", time: "10:00", duration: "90" }])}
                className="mt-2 text-xs text-indigo-600 hover:underline flex items-center gap-1" data-testid="button-add-slot-form">
                <Plus className="w-3 h-3" /> Add another slot
              </button>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setCreating(false)} variant="outline">Cancel</Button>
              <Button onClick={createPoll} disabled={saving || !form.title} className="bg-indigo-500 hover:bg-indigo-600 text-white" data-testid="button-create-poll">
                {saving ? "Creating…" : "Create Poll"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Poll list */}
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : polls.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No polls yet. Create one to start coordinating.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {polls.map(p => <PollCard key={p.id} poll={p} currentUserId={currentUserId} isAdmin={isAdmin} onOpen={setViewPollId} onDelete={deletePoll} />)}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BoardSchedulingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"availability" | "polls">("polls");
  const isAdmin = user?.role === "admin" || user?.role === "board";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display text-[#1A1F2B]">Schedule Coordinator</h1>
        <p className="text-slate-500 text-sm mt-0.5">Find the best time for board meetings — no back-and-forth emails needed.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab("polls")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "polls" ? "bg-white text-[#1A1F2B] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          data-testid="tab-polls"
        >
          <CalendarDays className="w-3.5 h-3.5 inline mr-1.5" />Time Polls
        </button>
        <button
          onClick={() => setTab("availability")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === "availability" ? "bg-white text-[#1A1F2B] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          data-testid="tab-availability"
        >
          <Users className="w-3.5 h-3.5 inline mr-1.5" />Standing Availability
        </button>
      </div>

      {tab === "polls" && <PollsTab currentUserId={user?.id ?? 0} isAdmin={isAdmin} />}
      {tab === "availability" && <AvailabilityTab currentUserId={user?.id ?? 0} isAdmin={isAdmin} />}
    </div>
  );
}
