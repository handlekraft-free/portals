import { useEffect, useState, useMemo } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, MapPin, Video, Check, X, Users, Bell, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

const RSVP_LABELS: Record<string, { label: string; color: string }> = {
  yes: { label: "Attending", color: "text-green-600" },
  no: { label: "Declining", color: "text-red-500" },
  tentative: { label: "Tentative", color: "text-amber-500" },
};

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function CalendarContent() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    document.title = "Board Calendar | handləkraft.ai";
    apiRequest("GET", "/api/board/meetings").then(r => {
      if (r.success) setMeetings(r.data);
      setLoading(false);
    });
  }, []);

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
    setDetailLoading(true);
    const r = await apiRequest("GET", `/api/board/meetings/${m.id}`);
    if (r.success) setSelectedDetail(r.data);
    setDetailLoading(false);
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
      // Refresh detail
      const r2 = await apiRequest("GET", `/api/board/meetings/${meetingId}`);
      if (r2.success) setSelectedDetail(r2.data);
    }
  }

  const isToday = (day: number) => day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();

  const upcoming = meetings
    .filter(m => m.status === "scheduled" && new Date(m.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 4);

  return (
    <div>
      <h1 className="text-2xl font-display text-[#1A1F2B] mb-1">Board Calendar</h1>
      <p className="text-slate-500 text-sm mb-6">Monthly view of all board meetings and events.</p>

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
                <h2 className="font-semibold text-[#1A1F2B]">{MONTHS[viewMonth]} {viewYear}</h2>
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
              </div>
            </CardContent>
          </Card>

          {/* Day-scoped panel (clicking a date cell) */}
          {selectedDayNum && !selected && (
            <Card className="border-0 shadow-sm mt-4" data-testid="calendar-day-panel">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-[#1A1F2B]">
                    {MONTHS[viewMonth]} {selectedDayNum}, {viewYear}
                  </p>
                  <button onClick={() => setSelectedDayNum(null)} className="text-slate-400 hover:text-slate-600" data-testid="button-close-day-panel">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {(meetingsByDay[selectedDayNum] || []).length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">No meetings scheduled for this date.</p>
                ) : (
                  <div className="space-y-2">
                    {(meetingsByDay[selectedDayNum] || []).map((m: any) => (
                      <button
                        key={m.id}
                        onClick={() => selectMeeting(m)}
                        className="w-full text-left flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                        data-testid={`day-panel-meeting-${m.id}`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${TYPE_COLORS[m.meetingType] || "bg-indigo-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1F2B] truncate">{m.title}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(m.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {m.location ? ` · ${m.location}` : ""}
                          </p>
                        </div>
                        <Badge className={`text-xs capitalize ${STATUS_COLORS[m.status] || ""}`}>{m.status}</Badge>
                      </button>
                    ))}
                  </div>
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
                    <h3 className="font-semibold text-[#1A1F2B]" data-testid="text-cal-meeting-title">{selected.title}</h3>
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
                    {selectedDetail.notices?.length === 0 && selected.status === "scheduled" && user?.role === "admin" && (
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
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: upcoming meetings */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Meetings</p>
          {loading && [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
          {!loading && upcoming.length === 0 && (
            <div className="text-center py-8 text-slate-400 bg-white rounded-xl">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No upcoming meetings</p>
            </div>
          )}
          {upcoming.map(m => {
            const d = new Date(m.scheduledAt);
            return (
              <Card
                key={m.id}
                className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${selected?.id === m.id ? "ring-2 ring-indigo-400" : ""}`}
                onClick={() => selectMeeting(m)}
                data-testid={`upcoming-meeting-${m.id}`}
              >
                <CardContent className="pt-3 pb-3">
                  <div className="flex gap-3 items-start">
                    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 text-white ${TYPE_COLORS[m.meetingType] || "bg-indigo-500"}`}>
                      <span className="text-[10px] font-bold uppercase leading-none">{MONTHS[d.getMonth()].slice(0, 3)}</span>
                      <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A1F2B] truncate">{m.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {m.location && ` · ${m.location.substring(0, 20)}${m.location.length > 20 ? "…" : ""}`}
                      </p>
                      {m.myRsvp ? (
                        <span className={`text-xs ${RSVP_LABELS[m.myRsvp]?.color}`}>{RSVP_LABELS[m.myRsvp]?.label}</span>
                      ) : (
                        <span className="text-xs text-amber-500">RSVP needed</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Jump to month with meetings */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">All Meetings</p>
            {meetings
              .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
              .map(m => {
                const d = new Date(m.scheduledAt);
                const isPast = d < now;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setViewYear(d.getFullYear());
                      setViewMonth(d.getMonth());
                      selectMeeting(m);
                    }}
                    className={`w-full flex items-center gap-2 py-1.5 text-left hover:bg-slate-50 rounded px-1 -mx-1 transition-colors ${isPast ? "opacity-50" : ""}`}
                    data-testid={`all-meetings-${m.id}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_COLORS[m.meetingType] || "bg-indigo-500"}`} />
                    <span className="text-xs text-[#1A1F2B] truncate flex-1">{m.title.split("—")[0].trim()}</span>
                    <span className="text-xs text-slate-400 shrink-0">{d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
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
