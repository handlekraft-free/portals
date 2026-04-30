import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { CalendarDays, Plus, ChevronRight, Video, MapPin, Check, X, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  held: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const RSVP_LABELS: Record<string, { label: string; color: string }> = {
  yes: { label: "Attending", color: "text-green-600" },
  no: { label: "Declining", color: "text-red-500" },
  tentative: { label: "Tentative", color: "text-amber-500" },
};

function MeetingDetail({ meeting, onBack, onRefresh }: { meeting: any; onBack: () => void; onRefresh: () => void }) {
  const { user } = useAuth();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingAgenda, setAddingAgenda] = useState(false);
  const [agendaTitle, setAgendaTitle] = useState("");

  useEffect(() => {
    apiRequest("GET", `/api/board/meetings/${meeting.id}`).then(r => {
      if (r.success) setDetail(r.data);
      setLoading(false);
    });
  }, [meeting.id]);

  async function rsvp(response: string) {
    await apiRequest("POST", `/api/board/meetings/${meeting.id}/rsvp`, { response });
    apiRequest("GET", `/api/board/meetings/${meeting.id}`).then(r => { if (r.success) setDetail(r.data); });
    onRefresh();
  }

  async function addAgendaItem() {
    if (!agendaTitle.trim()) return;
    await apiRequest("POST", `/api/board/meetings/${meeting.id}/agenda`, { title: agendaTitle.trim() });
    setAgendaTitle(""); setAddingAgenda(false);
    apiRequest("GET", `/api/board/meetings/${meeting.id}`).then(r => { if (r.success) setDetail(r.data); });
  }

  if (loading || !detail) return <div className="h-64 bg-white rounded-xl animate-pulse" />;

  const myRsvp = detail.rsvps?.find((r: any) => r.userId === user?.id);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4" data-testid="button-back-meetings">
        <ArrowLeft className="w-4 h-4" /> Meetings
      </button>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">{detail.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{new Date(detail.scheduledAt).toLocaleDateString()} at {new Date(detail.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            {detail.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{detail.location}</span>}
            {detail.platform && <a href={detail.platform} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline"><Video className="w-3.5 h-3.5" />Join Video</a>}
          </div>
        </div>
        <Badge className={STATUS_COLORS[detail.status] || ""}>{detail.status}</Badge>
      </div>

      {/* RSVP */}
      {detail.status === "scheduled" && (
        <Card className="border-0 shadow-sm mb-5">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your RSVP</p>
            <div className="flex gap-2 flex-wrap">
              {["yes", "tentative", "no"].map(opt => (
                <Button key={opt} size="sm" variant={myRsvp?.response === opt ? "default" : "outline"} className={`capitalize ${myRsvp?.response === opt ? "bg-indigo-500 text-white" : ""}`} onClick={() => rsvp(opt)} data-testid={`rsvp-${opt}`}>
                  {opt === "yes" ? <Check className="w-3.5 h-3.5 mr-1" /> : opt === "no" ? <X className="w-3.5 h-3.5 mr-1" /> : <Clock className="w-3.5 h-3.5 mr-1" />}
                  {opt === "yes" ? "Attending" : opt === "no" ? "Declining" : "Tentative"}
                </Button>
              ))}
            </div>
            {myRsvp && <p className="text-xs text-slate-400 mt-2">Your response: <span className={RSVP_LABELS[myRsvp.response]?.color}>{RSVP_LABELS[myRsvp.response]?.label}</span></p>}
          </CardContent>
        </Card>
      )}

      {/* RSVPs summary */}
      {detail.rsvps?.length > 0 && (
        <Card className="border-0 shadow-sm mb-5">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Attendance ({detail.rsvps.length})</p>
            <div className="space-y-1.5">
              {detail.rsvps.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                    {r.firstName?.[0]}{r.lastName?.[0]}
                  </div>
                  <span className="text-[#1A1F2B]">{r.firstName} {r.lastName}</span>
                  <span className={`text-xs ml-auto ${RSVP_LABELS[r.response]?.color}`}>{RSVP_LABELS[r.response]?.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agenda */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Agenda</p>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddingAgenda(true)} data-testid="button-add-agenda"><Plus className="w-3 h-3" /> Add Item</Button>
          </div>
          {detail.agendaItems?.length === 0 && !addingAgenda && <p className="text-sm text-slate-400 py-4 text-center">No agenda items yet</p>}
          <div className="space-y-2">
            {detail.agendaItems?.map((item: any, idx: number) => (
              <div key={item.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0" data-testid={`agenda-${item.id}`}>
                <span className="text-xs text-slate-400 w-5 text-right shrink-0 mt-0.5">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1F2B]">{item.title}</p>
                  {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                  {item.duration && <p className="text-xs text-slate-400"><Clock className="w-3 h-3 inline mr-0.5" />{item.duration} min</p>}
                </div>
                {item.itemType && <Badge variant="secondary" className="text-xs capitalize shrink-0">{item.itemType}</Badge>}
              </div>
            ))}
          </div>
          {addingAgenda && (
            <div className="flex gap-2 mt-2">
              <input autoFocus value={agendaTitle} onChange={e => setAgendaTitle(e.target.value)} placeholder="Agenda item title…" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" onKeyDown={e => e.key === "Enter" && addAgendaItem()} data-testid="input-agenda-title" />
              <Button size="sm" className="bg-indigo-500 text-white" onClick={addAgendaItem}><Check className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => setAddingAgenda(false)}><X className="w-4 h-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MeetingsContent() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", scheduledAt: "", location: "", meetingType: "regular", platform: "" });

  const loadMeetings = () => {
    setLoading(true);
    apiRequest("GET", "/api/board/meetings").then(r => {
      if (r.success) setMeetings(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { document.title = "Board Meetings | handləkraft.ai"; loadMeetings(); }, []);

  async function createMeeting() {
    if (!form.title || !form.scheduledAt) return;
    const res = await apiRequest("POST", "/api/board/meetings", form);
    if (res.success) { setShowCreate(false); setForm({ title: "", scheduledAt: "", location: "", meetingType: "regular", platform: "" }); loadMeetings(); }
  }

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>;
  if (selected) return <MeetingDetail meeting={selected} onBack={() => setSelected(null)} onRefresh={loadMeetings} />;

  const upcoming = meetings.filter(m => m.status === "scheduled" && new Date(m.scheduledAt) > new Date());
  const past = meetings.filter(m => m.status !== "scheduled" || new Date(m.scheduledAt) <= new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">Board Meetings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Scheduled and past board meetings with RSVP and agendas.</p>
        </div>
        {user?.role === "admin" && <Button onClick={() => setShowCreate(true)} className="bg-indigo-500 text-white gap-2" data-testid="button-new-meeting"><Plus className="w-4 h-4" /> Schedule Meeting</Button>}
      </div>

      {showCreate && (
        <Card className="mb-5 border-indigo-200 shadow-sm">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-[#1A1F2B]">Schedule a Meeting</p>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Meeting title" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-meeting-title" />
            <div className="grid grid-cols-2 gap-2">
              <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-meeting-date" />
              <select value={form.meetingType} onChange={e => setForm(f => ({ ...f, meetingType: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-meeting-type">
                <option value="regular">Regular</option>
                <option value="special">Special</option>
                <option value="committee">Committee</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-meeting-location" />
            <input value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} placeholder="Video link (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-meeting-video" />
            <div className="flex gap-2">
              <Button className="bg-indigo-500 text-white" onClick={createMeeting} data-testid="button-save-meeting">Schedule</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No meetings scheduled yet.</p></div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Upcoming ({upcoming.length})</p>
              <div className="space-y-2">
                {upcoming.map(m => (
                  <Card key={m.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(m)} data-testid={`meeting-card-${m.id}`}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0"><CalendarDays className="w-5 h-5 text-indigo-600" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[#1A1F2B]">{m.title}</p>
                          <p className="text-xs text-slate-400">{new Date(m.scheduledAt).toLocaleDateString()} · {m.meetingType}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Past ({past.length})</p>
              <div className="space-y-2">
                {past.map(m => (
                  <Card key={m.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow opacity-75" onClick={() => setSelected(m)} data-testid={`meeting-card-${m.id}`}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><CalendarDays className="w-5 h-5 text-slate-400" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[#1A1F2B]">{m.title}</p>
                          <p className="text-xs text-slate-400">{new Date(m.scheduledAt).toLocaleDateString()}</p>
                        </div>
                        <Badge className={STATUS_COLORS[m.status] || ""}>{m.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BoardMeetings() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><MeetingsContent /></BoardLayout>
    </PortalGuard>
  );
}
