import { useEffect, useState, useMemo } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, MapPin, Video, Check, X, Users, Bell, ClipboardList, FileText, Download, Plus, AlarmClock, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRAND } from "@shared/branding";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TYPE_COLORS: Record<string, string> = {
  regular: "bg-indigo-500",
  special: "bg-amber-500",
  annual: "bg-teal-600",
  committee: "bg-purple-500",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  held: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const EMPTY_MEETING_FORM = {
  title: "", scheduledAt: "", endTime: "", location: "",
  meetingType: "regular", platform: "", quorumNumber: "3",
  noticeSentAt: "", noticeMethod: "email",
};

const EMPTY_REMINDER_FORM = { title: "", note: "", reminderDate: "" };

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toLocalDatetimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CalendarContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  // Data
  const [meetings, setMeetings] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selected, setSelected] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);

  // Packet state
  const [packetDocs, setPacketDocs] = useState<any[]>([]);
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [addingDoc, setAddingDoc] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [docNote, setDocNote] = useState("");

  // Schedule Meeting modal
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ ...EMPTY_MEETING_FORM });
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);

  // Reminder modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderForm, setReminderForm] = useState({ ...EMPTY_REMINDER_FORM });
  const [reminderSubmitting, setReminderSubmitting] = useState(false);
  const [editReminder, setEditReminder] = useState<any>(null);

  useEffect(() => {
    document.title = `Board Calendar | ${BRAND.fullName}`;
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [mRes, rRes] = await Promise.all([
      apiRequest("GET", "/api/board/meetings"),
      apiRequest("GET", "/api/board/reminders"),
    ]);
    if (mRes.success) setMeetings(mRes.data);
    if (rRes.success) setReminders(rRes.data);
    setLoading(false);
  }

  const cells = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const meetingsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    meetings.forEach(m => {
      const d = new Date(m.scheduledAt);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(m);
      }
    });
    return map;
  }, [meetings, viewYear, viewMonth]);

  const remindersByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    reminders.forEach(r => {
      const d = new Date(r.reminderDate);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(r);
      }
    });
    return map;
  }, [reminders, viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  async function selectMeeting(m: any) {
    setSelectedDayNum(null);
    setSelected(m);
    setSelectedDetail(null);
    setPacketDocs([]);
    setAddingDoc(false);
    setSelectedDocId("");
    setDocNote("");
    setDetailLoading(true);
    const [detailRes, packetRes] = await Promise.all([
      apiRequest("GET", `/api/board/meetings/${m.id}`),
      apiRequest("GET", `/api/board/meetings/${m.id}/packet-docs`),
    ]);
    if (detailRes.success) setSelectedDetail(detailRes.data);
    if (packetRes.success) setPacketDocs(packetRes.data);
    setDetailLoading(false);
  }

  async function loadAllDocs() {
    if (allDocs.length > 0) return;
    const r = await apiRequest("GET", "/api/board/documents");
    if (r.success) setAllDocs(r.data);
  }

  async function downloadPacket(meetingId: number, title: string) {
    const res = await fetch(`/api/board/meetings/${meetingId}/packet`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_")}_packet.pdf`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function selectDay(day: number) {
    setSelectedDayNum(day);
    setSelected(null);
    setSelectedDetail(null);
  }

  async function rsvp(meetingId: number, response: string) {
    await apiRequest("POST", `/api/board/meetings/${meetingId}/rsvp`, { response });
    const r = await apiRequest("GET", "/api/board/meetings");
    if (r.success) setMeetings(r.data);
    if (selected?.id === meetingId) {
      setSelected((prev: any) => ({ ...prev, myRsvp: response }));
      const r2 = await apiRequest("GET", `/api/board/meetings/${meetingId}`);
      if (r2.success) setSelectedDetail(r2.data);
    }
  }

  // ── Schedule Meeting ──────────────────────────────────────────────────────

  function openMeetingModal(day?: number) {
    const base = day ? new Date(viewYear, viewMonth, day, 10, 0) : new Date();
    setMeetingForm({
      ...EMPTY_MEETING_FORM,
      scheduledAt: toLocalDatetimeValue(base),
    });
    setShowMeetingModal(true);
  }

  async function submitMeeting() {
    if (!meetingForm.title || !meetingForm.scheduledAt) return;
    setMeetingSubmitting(true);
    const res = await apiRequest("POST", "/api/board/meetings", {
      ...meetingForm,
      quorumNumber: parseInt(meetingForm.quorumNumber),
      endTime: meetingForm.endTime || undefined,
      noticeSentAt: meetingForm.noticeSentAt || undefined,
      noticeMethod: meetingForm.noticeMethod || undefined,
    });
    setMeetingSubmitting(false);
    if (res.success) {
      setShowMeetingModal(false);
      setMeetingForm({ ...EMPTY_MEETING_FORM });
      loadAll();
    }
  }

  // ── Reminders ─────────────────────────────────────────────────────────────

  function openReminderModal(day?: number) {
    let base = "";
    if (day) {
      const d = new Date(viewYear, viewMonth, day, 9, 0);
      base = toLocalDatetimeValue(d);
    }
    setEditReminder(null);
    setReminderForm({ ...EMPTY_REMINDER_FORM, reminderDate: base });
    setShowReminderModal(true);
  }

  function openEditReminder(r: any) {
    setEditReminder(r);
    setReminderForm({
      title: r.title,
      note: r.note || "",
      reminderDate: toLocalDatetimeValue(new Date(r.reminderDate)),
    });
    setShowReminderModal(true);
  }

  async function submitReminder() {
    if (!reminderForm.title || !reminderForm.reminderDate) return;
    setReminderSubmitting(true);
    const payload = {
      title: reminderForm.title,
      note: reminderForm.note || undefined,
      reminderDate: reminderForm.reminderDate,
    };
    const res = editReminder
      ? await apiRequest("PATCH", `/api/board/reminders/${editReminder.id}`, payload)
      : await apiRequest("POST", "/api/board/reminders", payload);
    setReminderSubmitting(false);
    if (res.success) {
      setShowReminderModal(false);
      setEditReminder(null);
      setReminderForm({ ...EMPTY_REMINDER_FORM });
      loadAll();
    }
  }

  async function deleteReminder(id: number) {
    if (!confirm("Delete this reminder?")) return;
    await apiRequest("DELETE", `/api/board/reminders/${id}`);
    setReminders(prev => prev.filter(r => r.id !== id));
  }

  const isToday = (day: number) => day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();

  const upcoming = meetings
    .filter(m => m.status === "scheduled" && new Date(m.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 4);

  const upcomingReminders = reminders
    .filter(r => new Date(r.reminderDate) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime())
    .slice(0, 5);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display text-[#0F172A]">Board Calendar</h1>
          <p className="text-slate-500 text-sm mt-0.5">Monthly view of all board meetings and reminders.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Button
              onClick={() => openMeetingModal()}
              className="bg-indigo-500 hover:bg-indigo-600 text-white gap-2 text-sm"
              data-testid="button-schedule-meeting"
            >
              <Plus className="w-4 h-4" /> Schedule Meeting
            </Button>
          )}
          <Button
            onClick={() => openReminderModal()}
            variant="outline"
            className="gap-2 text-sm border-amber-300 text-amber-700 hover:bg-amber-50"
            data-testid="button-add-reminder"
          >
            <AlarmClock className="w-4 h-4" /> Add Reminder
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month grid */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors" data-testid="button-prev-month">
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <h2 className="font-semibold text-[#0F172A]">{MONTHS[viewMonth]} {viewYear}</h2>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors" data-testid="button-next-month">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {cells.map((day, idx) => {
                  const dayMeetings = day ? (meetingsByDay[day] || []) : [];
                  const dayReminders = day ? (remindersByDay[day] || []) : [];
                  const today = day && isToday(day);
                  return (
                    <div
                      key={idx}
                      className={`min-h-[72px] border-t border-slate-100 p-1 ${day ? "cursor-pointer hover:bg-indigo-50/40" : ""} ${today ? "bg-indigo-50/60" : ""} ${selectedDayNum === day && day ? "ring-2 ring-inset ring-indigo-300 bg-indigo-50/50" : ""} transition-colors`}
                      data-testid={day ? `calendar-day-${day}` : undefined}
                      onClick={() => day && selectDay(day)}
                    >
                      {day && (
                        <>
                          <span className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full ${today ? "bg-indigo-500 text-white" : selectedDayNum === day ? "bg-indigo-200 text-indigo-700" : "text-slate-500"}`}>
                            {day}
                          </span>
                          <div className="mt-0.5 space-y-0.5">
                            {dayMeetings.map(m => (
                              <button
                                key={m.id}
                                onClick={e => { e.stopPropagation(); selectMeeting(m); }}
                                className={`w-full text-left text-white text-[9px] font-medium px-1 py-0.5 rounded truncate ${TYPE_COLORS[m.meetingType] || "bg-indigo-500"} hover:opacity-80 transition-opacity`}
                                data-testid={`calendar-meeting-dot-${m.id}`}
                              >
                                {m.title.split("—")[0].trim()}
                              </button>
                            ))}
                            {dayReminders.map(r => (
                              <div
                                key={`rem-${r.id}`}
                                className="w-full text-left text-amber-800 bg-amber-100 text-[9px] font-medium px-1 py-0.5 rounded truncate flex items-center gap-0.5"
                                onClick={e => { e.stopPropagation(); selectDay(day); }}
                                data-testid={`calendar-reminder-dot-${r.id}`}
                              >
                                <AlarmClock className="w-2 h-2 shrink-0" />
                                <span className="truncate">{r.title}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                {Object.entries(TYPE_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                    <span className="text-xs text-slate-500 capitalize">{type}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-200" />
                  <span className="text-xs text-slate-500">Reminder</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Day-scoped panel (clicking a date cell) */}
          {selectedDayNum && !selected && (
            <Card className="border-0 shadow-sm mt-4" data-testid="calendar-day-panel">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {MONTHS[viewMonth]} {selectedDayNum}, {viewYear}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <button
                        onClick={() => openMeetingModal(selectedDayNum)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50"
                        data-testid="button-day-schedule-meeting"
                      >
                        <Plus className="w-3 h-3" /> Meeting
                      </button>
                    )}
                    <button
                      onClick={() => openReminderModal(selectedDayNum)}
                      className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-amber-50"
                      data-testid="button-day-add-reminder"
                    >
                      <AlarmClock className="w-3 h-3" /> Reminder
                    </button>
                    <button onClick={() => setSelectedDayNum(null)} className="text-slate-400 hover:text-slate-600 ml-1" data-testid="button-close-day-panel">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Meetings on this day */}
                {(meetingsByDay[selectedDayNum] || []).length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Meetings</p>
                    <div className="space-y-1.5">
                      {(meetingsByDay[selectedDayNum] || []).map((m: any) => (
                        <button
                          key={m.id}
                          onClick={() => selectMeeting(m)}
                          className="w-full text-left flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                          data-testid={`day-panel-meeting-${m.id}`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${TYPE_COLORS[m.meetingType] || "bg-indigo-500"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0F172A] truncate">{m.title}</p>
                            <p className="text-xs text-slate-400">
                              {new Date(m.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {m.location ? ` · ${m.location}` : ""}
                            </p>
                          </div>
                          <Badge className={`text-xs capitalize ${STATUS_COLORS[m.status] || ""}`}>{m.status}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reminders on this day */}
                {(remindersByDay[selectedDayNum] || []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Reminders</p>
                    <div className="space-y-1.5">
                      {(remindersByDay[selectedDayNum] || []).map((r: any) => (
                        <div key={r.id} className="flex items-start gap-2 py-1.5 px-2 rounded-lg bg-amber-50 group" data-testid={`day-panel-reminder-${r.id}`}>
                          <AlarmClock className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-amber-800">{r.title}</p>
                            {r.note && <p className="text-xs text-amber-600 mt-0.5">{r.note}</p>}
                            <p className="text-xs text-amber-400 mt-0.5">
                              {new Date(r.reminderDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => openEditReminder(r)} className="text-amber-400 hover:text-amber-600" data-testid={`button-edit-reminder-${r.id}`}>
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => deleteReminder(r.id)} className="text-amber-400 hover:text-red-500" data-testid={`button-delete-reminder-${r.id}`}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(meetingsByDay[selectedDayNum] || []).length === 0 && (remindersByDay[selectedDayNum] || []).length === 0 && (
                  <p className="text-sm text-slate-400 py-2">Nothing scheduled for this date.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Selected meeting detail */}
          {selected && (
            <Card className="border-0 shadow-sm mt-4" data-testid="calendar-meeting-detail">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-[#0F172A]" data-testid="text-cal-meeting-title">{selected.title}</h3>
                    <div className="flex gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(selected.scheduledAt).toLocaleDateString()} at {new Date(selected.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {selected.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selected.location}</span>}
                      {selected.platform && (
                        <a href={selected.platform} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline">
                          <Video className="w-3 h-3" /> Join
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 items-center shrink-0">
                    <Badge className="text-xs capitalize bg-slate-100 text-slate-600 border-0">{selected.meetingType}</Badge>
                    <button onClick={() => { setSelected(null); setSelectedDetail(null); }} className="text-slate-400 hover:text-slate-600 ml-1" data-testid="button-close-cal-detail">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* RSVP row */}
                {selected.status === "scheduled" && (
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="text-xs text-slate-500">Your RSVP:</span>
                    {["yes", "tentative", "no"].map(opt => (
                      <Button
                        key={opt}
                        size="sm"
                        variant={selected.myRsvp === opt ? "default" : "outline"}
                        className={`h-7 text-xs capitalize ${selected.myRsvp === opt ? "bg-indigo-500 text-white border-indigo-500" : ""}`}
                        onClick={() => rsvp(selected.id, opt)}
                        data-testid={`cal-rsvp-${opt}`}
                      >
                        {opt === "yes" ? <Check className="w-3 h-3 mr-1" /> : opt === "no" ? <X className="w-3 h-3 mr-1" /> : null}
                        {opt === "yes" ? "Attending" : opt === "no" ? "Declining" : "Tentative"}
                      </Button>
                    ))}
                  </div>
                )}

                {detailLoading && <div className="h-16 bg-slate-50 rounded-lg animate-pulse mt-2" />}

                {selectedDetail && (
                  <div className="space-y-3 mt-1">
                    {/* Quorum indicator */}
                    <div className="bg-slate-50 rounded-lg p-3" data-testid="cal-quorum-panel">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-500" /> Quorum Status
                        </span>
                        <Badge className={
                          selectedDetail.quorumStatus === "met" ? "bg-green-100 text-green-700 text-xs" :
                          selectedDetail.quorumStatus === "possible" ? "bg-amber-100 text-amber-700 text-xs" :
                          "bg-red-100 text-red-600 text-xs"
                        } data-testid="badge-quorum-status">
                          {selectedDetail.quorumStatus === "met" ? "Quorum likely met" :
                           selectedDetail.quorumStatus === "possible" ? "Quorum possible" :
                           "Quorum at risk"}
                        </Badge>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${selectedDetail.quorumStatus === "met" ? "bg-green-500" : selectedDetail.quorumStatus === "possible" ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${Math.min(100, (selectedDetail.rsvpYes / (selectedDetail.quorumNumber || 3)) * 100)}%` }}
                        />
                      </div>
                      <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
                        <span className="text-green-600">{selectedDetail.rsvpYes} yes</span>
                        {selectedDetail.rsvpTentative > 0 && <span className="text-amber-500">{selectedDetail.rsvpTentative} tentative</span>}
                        {selectedDetail.rsvpNo > 0 && <span className="text-red-500">{selectedDetail.rsvpNo} declining</span>}
                        <span>· need {selectedDetail.quorumNumber || 3} for quorum</span>
                      </div>
                    </div>

                    {/* Notice tracking */}
                    {selectedDetail.notices?.length > 0 && (
                      <div className="bg-green-50 rounded-lg p-3" data-testid="cal-notice-panel">
                        <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5 mb-1.5">
                          <Bell className="w-3.5 h-3.5" /> Meeting Notice Sent
                        </p>
                        {selectedDetail.notices.map((n: any) => (
                          <div key={n.id} className="text-xs text-green-600">
                            {new Date(n.sentAt).toLocaleDateString()} via <span className="capitalize font-medium">{n.method}</span>
                            {n.notes && <span className="text-green-500"> · {n.notes}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedDetail.notices?.length === 0 && selected.status === "scheduled" && (user?.role === "admin" || user?.role === "board") && (
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <p className="text-xs text-amber-700 flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5" /> No notice sent yet — use Meetings page to send notice
                        </p>
                      </div>
                    )}

                    {/* Agenda */}
                    {selectedDetail.agendaItems?.length > 0 && (
                      <div data-testid="cal-agenda-panel">
                        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-2">
                          <ClipboardList className="w-3.5 h-3.5 text-indigo-500" /> Agenda ({selectedDetail.agendaItems.length} items)
                        </p>
                        <ol className="space-y-1">
                          {selectedDetail.agendaItems.map((item: any, idx: number) => (
                            <li key={item.id} className="flex items-start gap-2 text-xs text-slate-600">
                              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">{idx + 1}</span>
                              <span className={item.status === "complete" ? "line-through text-slate-400" : ""}>{item.title}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Meeting Packet */}
                    <div className="pt-1 border-t border-slate-100" data-testid="cal-packet-panel">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" /> Meeting Packet
                          {packetDocs.length > 0 && (
                            <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">
                              {packetDocs.length} doc{packetDocs.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <button
                              className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5"
                              onClick={() => { setAddingDoc(v => !v); loadAllDocs(); }}
                              data-testid="button-cal-link-doc"
                            >
                              <Download className="w-3 h-3 rotate-180" /> {addingDoc ? "Cancel" : "Link Doc"}
                            </button>
                          )}
                          <button
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                            onClick={() => selected && downloadPacket(selected.id, selected.title)}
                            data-testid="button-download-packet"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </button>
                        </div>
                      </div>

                      {addingDoc && isAdmin && (
                        <div className="mb-2 bg-indigo-50 border border-indigo-100 rounded-lg p-2 space-y-2" data-testid="cal-link-doc-form">
                          <select
                            value={selectedDocId}
                            onChange={e => setSelectedDocId(e.target.value)}
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                            data-testid="select-cal-packet-doc"
                          >
                            <option value="">— Select a document —</option>
                            {allDocs
                              .filter((d: any) => !packetDocs.some((p: any) => p.document_id === d.id))
                              .map((d: any) => (
                                <option key={d.id} value={d.id}>{d.title} ({d.category})</option>
                              ))}
                          </select>
                          <input
                            value={docNote}
                            onChange={e => setDocNote(e.target.value)}
                            placeholder="Note (optional)"
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                            data-testid="input-cal-doc-note"
                          />
                          <div className="flex gap-1">
                            <button
                              className="flex-1 bg-indigo-600 text-white text-xs rounded px-2 py-1 hover:bg-indigo-700 disabled:opacity-50"
                              disabled={!selectedDocId}
                              onClick={async () => {
                                if (!selectedDocId || !selected) return;
                                const r = await apiRequest("POST", `/api/board/meetings/${selected.id}/packet-docs`, {
                                  documentId: selectedDocId, note: docNote,
                                });
                                if (r.success) {
                                  setPacketDocs(d => [...d, r.data]);
                                  setSelectedDocId(""); setDocNote(""); setAddingDoc(false);
                                }
                              }}
                              data-testid="button-cal-confirm-link-doc"
                            >
                              Link
                            </button>
                            <button
                              className="text-xs border border-slate-200 rounded px-2 py-1 hover:bg-slate-50"
                              onClick={() => { setAddingDoc(false); setSelectedDocId(""); setDocNote(""); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {packetDocs.length === 0 && !addingDoc ? (
                        <p className="text-xs text-slate-400 italic">No documents linked to this packet yet.
                          {isAdmin && " Use 'Link Doc' above to add."}
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {packetDocs.map((d: any) => (
                            <li key={d.id} className="flex items-center gap-2 text-xs text-slate-600 group" data-testid={`cal-packet-doc-${d.id}`}>
                              <FileText className="w-3 h-3 text-indigo-300 shrink-0" />
                              <span className="truncate flex-1">{d.title}</span>
                              <span className="text-slate-400 capitalize shrink-0">{d.category}</span>
                              {isAdmin && (
                                <button
                                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={async () => {
                                    await apiRequest("DELETE", `/api/board/meetings/${selected.id}/packet-docs/${d.id}`);
                                    setPacketDocs(prev => prev.filter(p => p.id !== d.id));
                                  }}
                                  data-testid={`button-cal-remove-doc-${d.id}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {selected && (
                        <Link
                          href={`/portal/board/minutes?meetingId=${selected.id}`}
                          className="mt-2 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700"
                          data-testid="link-open-minutes"
                        >
                          <ClipboardList className="w-3 h-3" /> Open Minutes Editor →
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upcoming meetings */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Next Meetings</p>
            {loading && [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse mb-2" />)}
            {!loading && upcoming.length === 0 && (
              <div className="text-center py-6 text-slate-400 bg-white rounded-xl">
                <CalendarDays className="w-7 h-7 mx-auto mb-1.5 opacity-30" />
                <p className="text-sm">No upcoming meetings</p>
              </div>
            )}
            {upcoming.map(m => {
              const d = new Date(m.scheduledAt);
              return (
                <Card
                  key={m.id}
                  className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-2 ${selected?.id === m.id ? "ring-2 ring-indigo-400" : ""}`}
                  onClick={() => selectMeeting(m)}
                  data-testid={`sidebar-meeting-${m.id}`}
                >
                  <CardContent className="pt-3 pb-3">
                    <div className="flex gap-3 items-start">
                      <div className={`w-1 self-stretch rounded-full shrink-0 ${TYPE_COLORS[m.meetingType] || "bg-indigo-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A] truncate">{m.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {m.location && <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{m.location}</p>}
                        {!m.myRsvp && m.status === "scheduled" && (
                          <span className="text-[10px] text-amber-500 font-medium mt-0.5 block">RSVP needed</span>
                        )}
                        {m.myRsvp && (
                          <span className={`text-[10px] font-medium mt-0.5 block ${m.myRsvp === "yes" ? "text-green-500" : m.myRsvp === "no" ? "text-red-500" : "text-amber-500"}`}>
                            {m.myRsvp === "yes" ? "✓ Attending" : m.myRsvp === "no" ? "✗ Declining" : "? Tentative"}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Upcoming reminders */}
          {upcomingReminders.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Upcoming Reminders</p>
              <div className="space-y-2">
                {upcomingReminders.map(r => (
                  <div key={r.id} className="bg-white rounded-xl shadow-sm px-3 py-2.5 flex gap-2.5 items-start group" data-testid={`sidebar-reminder-${r.id}`}>
                    <AlarmClock className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{r.title}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(r.reminderDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(r.reminderDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {r.note && <p className="text-xs text-amber-500 mt-0.5 truncate">{r.note}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEditReminder(r)} className="text-slate-300 hover:text-amber-500" data-testid={`button-sidebar-edit-reminder-${r.id}`}>
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => deleteReminder(r.id)} className="text-slate-300 hover:text-red-500" data-testid={`button-sidebar-delete-reminder-${r.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Schedule Meeting Modal ─────────────────────────────────────────────── */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" data-testid="schedule-meeting-modal">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <h2 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" /> Schedule a New Meeting
              </h2>
              <button onClick={() => setShowMeetingModal(false)} className="text-slate-400 hover:text-slate-600" data-testid="button-close-meeting-modal">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Meeting Title *</label>
                <input
                  value={meetingForm.title}
                  onChange={e => setMeetingForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Regular Board Meeting — June 2026"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  data-testid="input-modal-meeting-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Start Date & Time *</label>
                  <input type="datetime-local" value={meetingForm.scheduledAt} onChange={e => setMeetingForm(f => ({ ...f, scheduledAt: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-modal-meeting-date" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">End Time</label>
                  <input type="datetime-local" value={meetingForm.endTime} onChange={e => setMeetingForm(f => ({ ...f, endTime: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-modal-meeting-endtime" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Meeting Type</label>
                  <select value={meetingForm.meetingType} onChange={e => setMeetingForm(f => ({ ...f, meetingType: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-modal-meeting-type">
                    <option value="regular">Regular</option>
                    <option value="special">Special</option>
                    <option value="committee">Committee</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Quorum Required</label>
                  <input type="number" min="1" value={meetingForm.quorumNumber} onChange={e => setMeetingForm(f => ({ ...f, quorumNumber: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-modal-quorum" />
                </div>
              </div>
              <input value={meetingForm.location} onChange={e => setMeetingForm(f => ({ ...f, location: e.target.value }))} placeholder="Location (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-modal-meeting-location" />
              <input value={meetingForm.platform} onChange={e => setMeetingForm(f => ({ ...f, platform: e.target.value }))} placeholder="Video conference link (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-modal-meeting-video" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Notice Sent Date (optional)</label>
                  <input type="date" value={meetingForm.noticeSentAt} onChange={e => setMeetingForm(f => ({ ...f, noticeSentAt: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-modal-notice-date" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Notice Method</label>
                  <select value={meetingForm.noticeMethod} onChange={e => setMeetingForm(f => ({ ...f, noticeMethod: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-modal-notice-method">
                    <option value="email">Email</option>
                    <option value="mail">Postal Mail</option>
                    <option value="in_person">In Person</option>
                    <option value="waived">Waived</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={submitMeeting}
                  disabled={!meetingForm.title || !meetingForm.scheduledAt || meetingSubmitting}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white flex-1"
                  data-testid="button-modal-save-meeting"
                >
                  {meetingSubmitting ? "Scheduling…" : "Schedule Meeting"}
                </Button>
                <Button variant="outline" onClick={() => setShowMeetingModal(false)} data-testid="button-modal-cancel-meeting">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Reminder Modal ─────────────────────────────────────────── */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" data-testid="reminder-modal">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <h2 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <AlarmClock className="w-4 h-4 text-amber-500" />
                {editReminder ? "Edit Reminder" : "Add Reminder"}
              </h2>
              <button onClick={() => { setShowReminderModal(false); setEditReminder(null); }} className="text-slate-400 hover:text-slate-600" data-testid="button-close-reminder-modal">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Title *</label>
                <input
                  value={reminderForm.title}
                  onChange={e => setReminderForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. File annual report"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  data-testid="input-reminder-title"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Date & Time *</label>
                <input
                  type="datetime-local"
                  value={reminderForm.reminderDate}
                  onChange={e => setReminderForm(f => ({ ...f, reminderDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  data-testid="input-reminder-date"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Note (optional)</label>
                <textarea
                  value={reminderForm.note}
                  onChange={e => setReminderForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Any details…"
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                  data-testid="input-reminder-note"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={submitReminder}
                  disabled={!reminderForm.title || !reminderForm.reminderDate || reminderSubmitting}
                  className="bg-amber-500 hover:bg-amber-600 text-white flex-1"
                  data-testid="button-save-reminder"
                >
                  {reminderSubmitting ? "Saving…" : editReminder ? "Save Changes" : "Add Reminder"}
                </Button>
                <Button variant="outline" onClick={() => { setShowReminderModal(false); setEditReminder(null); }} data-testid="button-cancel-reminder">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BoardCalendar() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><CalendarContent /></BoardLayout>
    </PortalGuard>
  );
}
