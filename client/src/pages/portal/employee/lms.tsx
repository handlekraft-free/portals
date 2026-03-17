import { useEffect, useState } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { BookOpen, Plus, ArrowLeft, Users, Megaphone, Check, X, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = { draft: "bg-slate-100 text-slate-600", published: "bg-green-100 text-green-700", archived: "bg-slate-100 text-slate-400" };

function LMSContent() {
  const [courses, setCourses] = useState<any[]>([]);
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", status: "draft" });
  const [enrollEmail, setEnrollEmail] = useState("");
  const [newModule, setNewModule] = useState({ title: "", description: "" });
  const [showNewModule, setShowNewModule] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "" });
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [newLesson, setNewLesson] = useState<{ moduleId: number | null; title: string; contentType: string; content: string }>({ moduleId: null, title: "", contentType: "text", content: "" });

  useEffect(() => { document.title = "LMS Management | handləkraft.ai"; load(); }, []);

  async function load() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/lms/courses");
    if (res.success) setCourses(res.data);
    setLoading(false);
  }

  async function loadCourse(id: number) {
    const res = await apiRequest("GET", `/api/lms/courses/${id}`);
    if (res.success) setActiveCourse(res.data);
  }

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiRequest("POST", "/api/lms/courses", courseForm);
    if (res.success) { setCourses(prev => [res.data, ...prev]); setShowNewCourse(false); setCourseForm({ title: "", description: "", status: "draft" }); }
  }

  async function updateCourseStatus(id: number, status: string) {
    await apiRequest("PATCH", `/api/lms/courses/${id}`, { status });
    load();
    if (activeCourse?.id === id) loadCourse(id);
  }

  async function enrollStudent(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiRequest("POST", `/api/lms/courses/${activeCourse.id}/enroll`, { email: enrollEmail });
    if (res.success) { alert(`Enrolled ${res.data.student?.firstName}`); setEnrollEmail(""); loadCourse(activeCourse.id); }
    else alert(res.error);
  }

  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiRequest("POST", `/api/lms/courses/${activeCourse.id}/modules`, newModule);
    if (res.success) { setShowNewModule(false); setNewModule({ title: "", description: "" }); loadCourse(activeCourse.id); }
  }

  async function addLesson(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiRequest("POST", `/api/lms/modules/${newLesson.moduleId}/lessons`, { title: newLesson.title, contentType: newLesson.contentType, content: newLesson.content });
    if (res.success) { setNewLesson({ moduleId: null, title: "", contentType: "text", content: "" }); loadCourse(activeCourse.id); }
  }

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiRequest("POST", `/api/lms/courses/${activeCourse.id}/announcements`, announcementForm);
    if (res.success) { setShowAnnouncement(false); setAnnouncementForm({ title: "", content: "" }); alert("Announcement posted!"); }
  }

  if (!activeCourse) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-display text-[#1A1F2B]">Course Management</h1><p className="text-slate-500 text-sm">Create and manage courses for your fellows.</p></div>
        <Button onClick={() => setShowNewCourse(true)} className="bg-[#0D7377] text-white gap-2" data-testid="button-new-course"><Plus className="w-4 h-4" /> New Course</Button>
      </div>
      {showNewCourse && (
        <Card className="mb-4 border-[#0D7377]/20 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">New Course</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createCourse} className="space-y-3">
              <input required value={courseForm.title} onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))} placeholder="Course title *" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-course-title" />
              <textarea value={courseForm.description} onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" />
              <div className="flex gap-2">
                <Button type="submit" className="bg-[#0D7377] text-white gap-1" data-testid="button-create-course"><Check className="w-4 h-4" /> Create</Button>
                <Button type="button" variant="outline" onClick={() => setShowNewCourse(false)}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {loading ? <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-3">
          {courses.length === 0 ? <div className="text-center py-16 text-slate-400"><BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No courses yet.</p></div> :
            courses.map((c: any) => (
              <Card key={c.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadCourse(c.id)} data-testid={`card-course-${c.id}`}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F2B]">{c.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.description}</p>
                  </div>
                  <Badge className={`text-xs shrink-0 ${STATUS_COLORS[c.status] || ""}`}>{c.status}</Badge>
                </CardContent>
              </Card>
            ))
          }
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setActiveCourse(null)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm" data-testid="button-back-courses"><ArrowLeft className="w-4 h-4" /> Courses</button>
        <h1 className="text-lg font-display text-[#1A1F2B] flex-1">{activeCourse.title}</h1>
        <div className="flex gap-2">
          {activeCourse.status === "draft" && <Button size="sm" onClick={() => updateCourseStatus(activeCourse.id, "published")} className="bg-green-600 text-white" data-testid="button-publish">Publish</Button>}
          <Button size="sm" variant="outline" onClick={() => setShowAnnouncement(!showAnnouncement)} className="gap-1" data-testid="button-new-announcement"><Megaphone className="w-4 h-4" /> Announce</Button>
        </div>
      </div>
      {showAnnouncement && (
        <Card className="mb-4 border-amber-200 shadow-sm">
          <CardContent className="pt-4">
            <form onSubmit={postAnnouncement} className="space-y-2">
              <input required value={announcementForm.title} onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-announcement-title" />
              <textarea required value={announcementForm.content} onChange={e => setAnnouncementForm(f => ({ ...f, content: e.target.value }))} placeholder="Message to students..." rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="input-announcement-content" />
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="bg-amber-500 text-white" data-testid="button-post-announcement">Post</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAnnouncement(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Card className="border-0 shadow-sm mb-4">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Modules & Lessons</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowNewModule(!showNewModule)} className="gap-1" data-testid="button-add-module"><Plus className="w-3 h-3" /> Module</Button>
            </CardHeader>
            <CardContent>
              {showNewModule && (
                <form onSubmit={addModule} className="mb-4 space-y-2 p-3 bg-slate-50 rounded-lg">
                  <input required value={newModule.title} onChange={e => setNewModule(f => ({ ...f, title: e.target.value }))} placeholder="Module title" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" data-testid="input-module-title" />
                  <div className="flex gap-2"><Button type="submit" size="sm" className="bg-[#0D7377] text-white" data-testid="button-save-module">Add</Button><Button type="button" variant="outline" size="sm" onClick={() => setShowNewModule(false)}>Cancel</Button></div>
                </form>
              )}
              {activeCourse.modules?.map((mod: any) => (
                <div key={mod.id} className="mb-4">
                  <h3 className="text-sm font-semibold text-[#1A1F2B] mb-2">{mod.title}</h3>
                  {mod.lessons?.map((l: any) => (
                    <div key={l.id} className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 rounded-lg mb-1 text-sm" data-testid={`lesson-row-${l.id}`}>
                      <span className="flex-1 text-slate-600">{l.title}</span>
                      <Badge variant="secondary" className="text-xs">{l.contentType}</Badge>
                    </div>
                  ))}
                  {newLesson.moduleId === mod.id ? (
                    <form onSubmit={addLesson} className="mt-2 space-y-2 p-2 bg-teal-50 rounded-lg">
                      <input required value={newLesson.title} onChange={e => setNewLesson(f => ({ ...f, title: e.target.value }))} placeholder="Lesson title" className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm" data-testid="input-lesson-title" />
                      <select value={newLesson.contentType} onChange={e => setNewLesson(f => ({ ...f, contentType: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm" data-testid="select-lesson-type">
                        {["text", "video", "file", "quiz"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <textarea value={newLesson.content} onChange={e => setNewLesson(f => ({ ...f, content: e.target.value }))} placeholder="Content (HTML/URL/quiz JSON)" rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm" data-testid="input-lesson-content" />
                      <div className="flex gap-2"><Button type="submit" size="sm" className="bg-[#0D7377] text-white" data-testid="button-save-lesson">Add Lesson</Button><Button type="button" variant="outline" size="sm" onClick={() => setNewLesson({ moduleId: null, title: "", contentType: "text", content: "" })}>Cancel</Button></div>
                    </form>
                  ) : (
                    <button onClick={() => setNewLesson(f => ({ ...f, moduleId: mod.id }))} className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#0D7377] mt-1 px-3 py-1" data-testid={`button-add-lesson-${mod.id}`}><Plus className="w-3 h-3" /> Add Lesson</button>
                  )}
                </div>
              ))}
              {activeCourse.modules?.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No modules yet. Add your first module above.</p>}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Students ({activeCourse.students?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={enrollStudent} className="flex gap-2 mb-3">
                <input type="email" value={enrollEmail} onChange={e => setEnrollEmail(e.target.value)} placeholder="student@email.com" className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" data-testid="input-enroll-email" />
                <Button type="submit" size="sm" className="bg-[#0D7377] text-white shrink-0" data-testid="button-enroll">Enroll</Button>
              </form>
              <div className="space-y-2">
                {activeCourse.students?.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm" data-testid={`student-row-${s.id}`}>
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">{s.firstName?.[0]}</div>
                    <span className="flex-1 text-slate-600">{s.firstName} {s.lastName}</span>
                    <span className="text-xs text-slate-400">{s.progress}%</span>
                  </div>
                ))}
                {activeCourse.students?.length === 0 && <p className="text-sm text-slate-400">No students enrolled yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeLMS() {
  return (
    <PortalGuard allowedRoles={["admin", "employee"]}>
      <EmployeeLayout><LMSContent /></EmployeeLayout>
    </PortalGuard>
  );
}
