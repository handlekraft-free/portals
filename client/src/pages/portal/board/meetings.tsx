import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import {
  CalendarDays, Plus, ChevronRight, Video, MapPin, Check, X, Clock,
  ArrowLeft, Users, Bell, ShieldCheck, Pencil, Trash2, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  held: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};
const TYPE_COLORS: Record<string, string> = {
  regular: "bg-indigo-100 text-indigo-700",
  special: "bg-amber-100 text-amber-700",
  annual: "bg-teal-100 text-teal-700",
  committee: "bg-purple-100 text-purple-700",
};
const RSVP_LABELS: Record<string, { label: string; color: string }> = {
  yes: { label: "Attending", color: "text-green-600" },
  no: { label: "Declining", color: "text-red-500" },
  tentative: { label: "Tentative", color: "text-amber-500" },
};

// ── Meeting Detail ────────────────────────────────────────────────────────────

function MeetingDetail({ meeting, onBack, onRefresh, boardMembers }: {
  meeting: any; onBack: () => void; onRefresh: () => void; boardMembers: any[];
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingAgenda, setAddingAgenda] = useState(false);
  const [agendaTitle, setAgendaTitle] = useState("");
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [noticeMethod, setNoticeMethod] = useState("email");
  const [noticeNotes, setNoticeNotes] = useState("");
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendance, setAttendance] = useState<Record<number, { attendance: string; method: string }>>({});
  const [editAgenda, setEditAgenda] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const loadDetail = () => {
    apiRequest("GET", `/api/board/meetings/${meeting.id}`).then(r => {
      if (r.success) {
        setDetail(r.data);
        // Init attendance map from existing attendees
        const map: Record<number, { attendance: string; method: string }> = {};
        r.data.attendees?.forEach((a: any) => {
          map[a.userId] = { attendance: a.attendance, method: a.participationMethod };
        });
        setAttendance(map);
      }
      setLoading(false);
    });
  };

  useEffect(() => { loadDetail(); }, [meeting.id]);

  async function rsvp(response: string) {
    await apiRequest("POST", `/api/board/meetings/${meeting.id}/rsvp`, { response });
    loadDetail(); onRefresh();
  }

  async function addAgendaItem() {
    if (!agendaTitle.trim()) return;
    await apiRequest("POST", `/api/board/meetings/${meeting.id}/agenda`, { title: agendaTitle.trim() });
    setAgendaTitle(""); setAddingAgenda(false); loadDetail();
  }

  async function deleteAgendaItem(id: number) {
    await apiRequest("DELETE", `/api/board/agenda/${id}`);
    loadDetail();
  }

  async function saveEditAgenda(id: number) {
    if (!editTitle.trim()) return;
    await apiRequest("PATCH", `/api/board/agenda/${id}`, { title: editTitle });
    setEditAgenda(null); setEditTitle(""); loadDetail();
  }

  async function sendNotice() {
    if (!noticeMethod) return;
    await apiRequest("POST", `/api/board/meetings/${meeting.id}/notice`, { method: noticeMethod, notes: noticeNotes });
    setShowNoticeForm(false); setNoticeNotes(""); loadDetail();
  }

  async function saveAttendance() {
    const records = boardMembers.map(m => ({
      userId: m.id,
      attendance: attendance[m.id]?.attendance || "absent",
      participationMethod: attendance[m.id]?.method || "remote",
    }));
    await apiRequest("POST", `/api/board/meetings/${meeting.id}/attendance`, { records });
    setShowAttendance(false); loadDetail(); onRefresh();
  }

  if (loading || !detail) return <div className="h-64 bg-white rounded-xl animate-pulse" />;

  const myRsvp = detail.rsvps?.find((r: any) => r.user_id === user?.id || r.userId === user?.id);
  const quorum = detail.quorumNumber ?? 3;
  const yesCount = detail.rsvpYes ?? 0;
  const tentCount = detail.rsvpTentative ?? 0;
  const quorumPct = Math.min(100, Math.round((yesCount / quorum) * 100));
  const quorumStatus = detail.quorumStatus;
  const noticeSent = detail.notices?.length > 0 || detail.noticeSentAt;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors" data-testid="button-back-meetings">
        <ArrowLeft className="w-4 h-4" /> All Meetings
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">{detail.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {new Date(detail.scheduledAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at {new Date(detail.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {detail.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{detail.location}</span>}
            {detail.platform && (
              <a href={detail.platform} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:underline">
                <Video className="w-3.5 h-3.5" /> Join Video
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge className={TYPE_COLORS[detail.meetingType] || ""}>
            {detail.meetingType?.charAt(0).toUpperCase() + detail.meetingType?.slice(1)}
          </Badge>
          <Badge className={STATUS_COLORS[detail.status] || ""}>{detail.status}</Badge>
        </div>
      </div>

      {/* Quorum indicator */}
      <Card className="border-0 shadow-sm mb-4">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Quorum Status
            </p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              quorumStatus === "met" ? "bg-green-100 text-green-700" :
              quorumStatus === "possible" ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-600"
            }`}>
              {quorumStatus === "met" ? "Quorum Met" : quorumStatus === "possible" ? "Possibly Met" : "Quorum at Risk"}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-1.5">
            <div
              className={`h-2 rounded-full transition-all ${quorumStatus === "met" ? "bg-green-500" : quorumStatus === "possible" ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${quorumPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {yesCount} confirmed attending · {tentCount} tentative · {quorum} needed for quorum · {detail.totalBoardMembers} total members
          </p>
        </CardContent>
      </Card>

      {/* Notice tracking */}
      <Card className={`border-0 shadow-sm mb-4 ${noticeSent ? "border-l-4 border-l-green-400" : "border-l-4 border-l-amber-400"}`}>
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Bell className={`w-4 h-4 ${noticeSent ? "text-green-500" : "text-amber-500"}`} />
              <div>
                <p className="text-sm font-medium text-[#1A1F2B]">
                  {noticeSent ? "Notice Sent" : "Notice Not Yet Sent"}
                </p>
                {detail.notices?.length > 0 && (
                  <p className="text-xs text-slate-400">
                    Last sent {new Date(detail.notices[0].sent_at || detail.notices[0].sentAt).toLocaleDateString()} via {detail.notices[0].method} to {detail.notices[0].recipient_count ?? detail.notices[0].recipientCount} members
                  </p>
                )}
              </div>
            </div>
            {isAdmin && detail.status === "scheduled" && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowNoticeForm(!showNoticeForm)} data-testid="button-mark-notice">
                <Bell className="w-3 h-3" /> {noticeSent ? "Send Again" : "Mark Sent"}
              </Button>
            )}
          </div>
          {showNoticeForm && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
              <div className="flex gap-2">
                <select value={noticeMethod} onChange={e => setNoticeMethod(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 flex-1" data-testid="select-notice-method">
                  <option value="email">Email</option>
                  <option value="postal_mail">Postal Mail</option>
                  <option value="in_person">In Person</option>
                  <option value="certified_mail">Certified Mail</option>
                </select>
                <Button size="sm" className="bg-indigo-500 text-white h-8" onClick={sendNotice} data-testid="button-confirm-notice">Confirm</Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => setShowNoticeForm(false)}>Cancel</Button>
              </div>
              <input value={noticeNotes} onChange={e => setNoticeNotes(e.target.value)} placeholder="Notes (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-notice-notes" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* RSVP panel */}
      {detail.status === "scheduled" && (
        <Card className="border-0 shadow-sm mb-4">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your RSVP</p>
            <div className="flex gap-2 flex-wrap">
              {["yes", "tentative", "no"].map(opt => (
                <Button
                  key={opt}
                  size="sm"
                  variant={myRsvp?.response === opt ? "default" : "outline"}
                  className={`capitalize ${myRsvp?.response === opt ? "bg-indigo-500 text-white border-indigo-500" : ""}`}
                  onClick={() => rsvp(opt)}
                  data-testid={`rsvp-${opt}`}
                >
                  {opt === "yes" ? <Check className="w-3.5 h-3.5 mr-1" /> : opt === "no" ? <X className="w-3.5 h-3.5 mr-1" /> : <Clock className="w-3.5 h-3.5 mr-1" />}
                  {opt === "yes" ? "Attending" : opt === "no" ? "Declining" : "Tentative"}
                </Button>
              ))}
            </div>
            {myRsvp && <p className="text-xs text-slate-400 mt-2">Response recorded: <span className={RSVP_LABELS[myRsvp.response]?.color}>{RSVP_LABELS[myRsvp.response]?.label}</span></p>}
          </CardContent>
        </Card>
      )}

      {/* RSVP list */}
      {detail.rsvps?.length > 0 && (
        <Card className="border-0 shadow-sm mb-4">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5 inline mr-1" />RSVPs ({detail.rsvps.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {detail.rsvps.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 text-sm" data-testid={`rsvp-row-${r.user_id || r.userId}`}>
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                    {(r.first_name || r.firstName)?.[0]}{(r.last_name || r.lastName)?.[0]}
                  </div>
                  <span className="text-[#1A1F2B] flex-1 truncate">{r.first_name || r.firstName} {r.last_name || r.lastName}</span>
                  <span className={`text-xs ${RSVP_LABELS[r.response]?.color}`}>{RSVP_LABELS[r.response]?.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance recording (admin, after meeting) */}
      {isAdmin && (detail.status === "held" || detail.status === "scheduled") && (
        <Card className="border-0 shadow-sm mb-4">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <ClipboardList className="w-3.5 h-3.5 inline mr-1" />Attendance Record
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAttendance(!showAttendance)} data-testid="button-record-attendance">
                <ClipboardList className="w-3 h-3" /> {detail.attendees?.length > 0 ? "Update" : "Record"} Attendance
              </Button>
            </div>
            {detail.attendees?.length > 0 && !showAttendance && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {detail.attendees.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm" data-testid={`attendee-${a.userId}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${a.attendance === "present" ? "bg-green-500" : a.attendance === "excused" ? "bg-amber-400" : "bg-red-400"}`} />
                    <span className="text-[#1A1F2B] flex-1 truncate">{a.firstName} {a.lastName}</span>
                    <span className={`text-xs capitalize ${a.attendance === "present" ? "text-green-600" : a.attendance === "excused" ? "text-amber-600" : "text-red-500"}`}>
                      {a.attendance} ({a.participationMethod === "in_person" ? "in person" : "remote"})
                    </span>
                  </div>
                ))}
              </div>
            )}
            {showAttendance && (
              <div className="space-y-2">
                {boardMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-2 flex-wrap" data-testid={`attendance-row-${member.id}`}>
                    <span className="text-sm text-[#1A1F2B] w-32 shrink-0">{member.firstName} {member.lastName}</span>
                    <select
                      value={attendance[member.id]?.attendance || "absent"}
                      onChange={e => setAttendance(prev => ({ ...prev, [member.id]: { ...prev[member.id], attendance: e.target.value } }))}
                      className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      data-testid={`attendance-status-${member.id}`}
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="excused">Excused</option>
                    </select>
                    <select
                      value={attendance[member.id]?.method || "remote"}
                      onChange={e => setAttendance(prev => ({ ...prev, [member.id]: { ...prev[member.id], method: e.target.value } }))}
                      className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      data-testid={`attendance-method-${member.id}`}
                    >
                      <option value="in_person">In Person</option>
                      <option value="remote">Remote</option>
                    </select>
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="bg-indigo-500 text-white" onClick={saveAttendance} data-testid="button-save-attendance">Save Attendance</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAttendance(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agenda */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Agenda</p>
            {isAdmin && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddingAgenda(true)} data-testid="button-add-agenda">
                <Plus className="w-3 h-3" /> Add Item
              </Button>
            )}
          </div>
          {detail.agendaItems?.length === 0 && !addingAgenda && (
            <p className="text-sm text-slate-400 py-4 text-center">No agenda items yet</p>
          )}
          <div className="space-y-1">
            {detail.agendaItems?.map((item: any, idx: number) => (
              <div key={item.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0 group" data-testid={`agenda-item-${item.id}`}>
                <span className="text-xs text-slate-400 w-5 text-right shrink-0 mt-0.5">{idx + 1}.</span>
                {editAgenda === item.id ? (
                  <div className="flex gap-2 flex-1">
                    <input
                      autoFocus value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      onKeyDown={e => { if (e.key === "Enter") saveEditAgenda(item.id); if (e.key === "Escape") { setEditAgenda(null); } }}
                      data-testid="input-edit-agenda"
                    />
                    <Button size="sm" className="bg-indigo-500 text-white h-7" onClick={() => saveEditAgenda(item.id)}><Check className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => setEditAgenda(null)}><X className="w-3 h-3" /></Button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F2B]">{item.title}</p>
                    {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                    <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                      {item.duration && <span><Clock className="w-3 h-3 inline mr-0.5" />{item.duration} min</span>}
                      {item.presenter && <span>Presenter: {item.presenter}</span>}
                    </div>
                  </div>
                )}
                {isAdmin && editAgenda !== item.id && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => { setEditAgenda(item.id); setEditTitle(item.title); }} className="p-1 text-slate-400 hover:text-slate-600" data-testid={`edit-agenda-${item.id}`}><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => deleteAgendaItem(item.id)} className="p-1 text-slate-400 hover:text-red-500" data-testid={`delete-agenda-${item.id}`}><Trash2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {addingAgenda && (
            <div className="flex gap-2 mt-2">
              <input
                autoFocus value={agendaTitle}
                onChange={e => setAgendaTitle(e.target.value)}
                placeholder="Agenda item title…"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                onKeyDown={e => { if (e.key === "Enter") addAgendaItem(); if (e.key === "Escape") setAddingAgenda(false); }}
                data-testid="input-agenda-title"
              />
              <Button size="sm" className="bg-indigo-500 text-white" onClick={addAgendaItem}><Check className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => setAddingAgenda(false)}><X className="w-4 h-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Meeting List ──────────────────────────────────────────────────────────────

function MeetingsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [meetings, setMeetings] = useState<any[]>([]);
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", scheduledAt: "", endTime: "", location: "", meetingType: "regular", platform: "", quorumNumber: "3" });

  const loadMeetings = () => {
    setLoading(true);
    Promise.all([
      apiRequest("GET", "/api/board/meetings"),
      apiRequest("GET", "/api/board/members"),
    ]).then(([m, mb]) => {
      if (m.success) setMeetings(m.data);
      if (mb.success) setBoardMembers(mb.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    document.title = "Board Meetings | handləkraft.ai";
    loadMeetings();
  }, []);

  async function createMeeting() {
    if (!form.title || !form.scheduledAt) return;
    const res = await apiRequest("POST", "/api/board/meetings", {
      ...form,
      quorumNumber: parseInt(form.quorumNumber),
      endTime: form.endTime || undefined,
    });
    if (res.success) {
      setShowCreate(false);
      setForm({ title: "", scheduledAt: "", endTime: "", location: "", meetingType: "regular", platform: "", quorumNumber: "3" });
      loadMeetings();
    }
  }

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>;
  if (selected) return <MeetingDetail meeting={selected} onBack={() => setSelected(null)} onRefresh={loadMeetings} boardMembers={boardMembers} />;

  const now = new Date();
  const upcoming = meetings.filter(m => m.status === "scheduled" && new Date(m.scheduledAt) > now);
  const past = meetings.filter(m => m.status !== "scheduled" || new Date(m.scheduledAt) <= now);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">Board Meetings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Scheduled meetings, RSVPs, agendas, and attendance records.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)} className="bg-indigo-500 text-white gap-2" data-testid="button-new-meeting">
            <Plus className="w-4 h-4" /> Schedule Meeting
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="mb-5 border-indigo-200 shadow-sm">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-[#1A1F2B]">Schedule a New Meeting</p>
            <input
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Meeting title" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              data-testid="input-meeting-title"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Start Date & Time *</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-meeting-date" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">End Time</label>
                <input type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-meeting-endtime" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Meeting Type</label>
                <select value={form.meetingType} onChange={e => setForm(f => ({ ...f, meetingType: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-meeting-type">
                  <option value="regular">Regular</option>
                  <option value="special">Special</option>
                  <option value="committee">Committee</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Quorum Required</label>
                <input type="number" min="1" value={form.quorumNumber} onChange={e => setForm(f => ({ ...f, quorumNumber: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-quorum" />
              </div>
            </div>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-meeting-location" />
            <input value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} placeholder="Video conference link (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-meeting-video" />
            <div className="flex gap-2">
              <Button className="bg-indigo-500 text-white" onClick={createMeeting} data-testid="button-save-meeting">Schedule</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {upcoming.length === 0 && past.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No meetings scheduled yet.</p>
          {isAdmin && <p className="text-sm mt-1">Click "Schedule Meeting" to add the first one.</p>}
        </div>
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
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                          <CalendarDays className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-[#1A1F2B]">{m.title}</p>
                            {!m.myRsvp && <span className="text-xs text-amber-500 font-medium">RSVP needed</span>}
                            {m.myRsvp && <span className={`text-xs ${RSVP_LABELS[m.myRsvp]?.color}`}>{RSVP_LABELS[m.myRsvp]?.label}</span>}
                          </div>
                          <p className="text-xs text-slate-400">
                            {new Date(m.scheduledAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {m.meetingType} · {m.rsvpYes ?? 0} attending
                          </p>
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
                  <Card key={m.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow opacity-75" onClick={() => setSelected(m)} data-testid={`meeting-card-past-${m.id}`}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <CalendarDays className="w-5 h-5 text-slate-400" />
                        </div>
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
