import { useEffect, useState } from "react";
import { StudentLayout } from "@/components/portal/StudentLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { BookOpen, ChevronRight, Check, ArrowLeft, Play, FileText, File, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BRAND } from "@shared/branding";

function CoursesContent() {
  const [courses, setCourses] = useState<any[]>([]);
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = `My Courses | ${BRAND.fullName}`; load(); }, []);

  async function load() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/student/courses");
    if (res.success) setCourses(res.data);
    setLoading(false);
  }

  async function loadCourse(id: number) {
    const res = await apiRequest("GET", `/api/student/courses/${id}`);
    if (res.success) setActiveCourse(res.data);
  }

  async function loadLesson(courseId: number, lessonId: number) {
    const res = await apiRequest("GET", `/api/student/courses/${courseId}/lessons/${lessonId}`);
    if (res.success) setActiveLesson(res.data);
  }

  async function markComplete(lessonId: number) {
    if (!activeCourse) return;
    await apiRequest("POST", `/api/student/courses/${activeCourse.id}/lessons/${lessonId}/complete`);
    loadCourse(activeCourse.id);
    setActiveLesson((prev: any) => prev ? { ...prev, completed: true } : prev);
  }

  const getLessonIcon = (type: string) => {
    if (type === "video") return <Play className="w-4 h-4 text-blue-500" />;
    if (type === "file") return <File className="w-4 h-4 text-slate-400" />;
    if (type === "quiz") return <HelpCircle className="w-4 h-4 text-purple-500" />;
    return <FileText className="w-4 h-4 text-[#0D7377]" />;
  };

  if (activeLesson && activeCourse) return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
        <button onClick={() => setActiveLesson(null)} className="hover:text-slate-700">Modules</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#1A1F2B] font-medium">{activeLesson.title}</span>
      </div>
      <Card className="border-0 shadow-sm mb-4">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display text-[#1A1F2B]">{activeLesson.title}</h2>
            <Badge variant="secondary" className="text-xs">{activeLesson.contentType}</Badge>
          </div>
          {activeLesson.contentType === "text" && (
            <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: activeLesson.content || "<p>No content provided yet.</p>" }} data-testid="lesson-content" />
          )}
          {activeLesson.contentType === "video" && activeLesson.content && (
            <div className="aspect-video rounded-lg overflow-hidden bg-slate-900">
              <iframe src={activeLesson.content} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen data-testid="lesson-video" />
            </div>
          )}
          {activeLesson.contentType === "file" && (
            <a href={activeLesson.content} className="flex items-center gap-2 text-[#0D7377] hover:underline" data-testid="lesson-file-link"><File className="w-4 h-4" /> Download File</a>
          )}
          {activeLesson.contentType === "quiz" && (
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600" data-testid="lesson-quiz">
              <p>Quiz content coming soon. Ask your instructor for details.</p>
            </div>
          )}
          <div className="mt-6 pt-4 border-t flex justify-between items-center">
            <span className={`text-sm ${activeLesson.completed ? "text-green-600 font-medium" : "text-slate-400"}`}>
              {activeLesson.completed ? "✓ Completed" : "Not yet completed"}
            </span>
            {!activeLesson.completed && (
              <Button onClick={() => markComplete(activeLesson.id)} className="bg-[#0D7377] text-white gap-2" data-testid="button-mark-complete">
                <Check className="w-4 h-4" /> Mark as Complete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (activeCourse) return (
    <div>
      <button onClick={() => setActiveCourse(null)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4" data-testid="button-back-courses"><ArrowLeft className="w-4 h-4" /> My Courses</button>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-display text-[#1A1F2B] flex-1">{activeCourse.title}</h1>
      </div>
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${activeCourse.progress || 0}%` }} data-testid="progress-bar" />
        </div>
        <span className="text-sm text-slate-500 shrink-0">{activeCourse.progress || 0}% complete</span>
      </div>
      <div className="space-y-4">
        {activeCourse.modules?.map((mod: any) => (
          <Card key={mod.id} className="border-0 shadow-sm" data-testid={`module-${mod.id}`}>
            <CardContent className="pt-4">
              <h3 className="font-semibold text-[#1A1F2B] mb-3">{mod.title}</h3>
              <div className="space-y-1.5">
                {mod.lessons?.map((l: any) => (
                  <button key={l.id} onClick={() => loadLesson(activeCourse.id, l.id)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left" data-testid={`lesson-item-${l.id}`}>
                    {l.completed ? <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></div> : <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0" />}
                    {getLessonIcon(l.contentType)}
                    <span className="text-sm text-slate-700 flex-1 truncate">{l.title}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>
                ))}
                {mod.lessons?.length === 0 && <p className="text-sm text-slate-400 px-3 py-1">No lessons in this module yet.</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {activeCourse.modules?.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No modules available yet. Check back soon.</p>}
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-display text-[#1A1F2B] mb-1">My Courses</h1>
      <p className="text-slate-500 text-sm mb-5">Your enrolled fellowship training courses.</p>
      {loading ? <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-3">
          {courses.length === 0 ? <div className="text-center py-16 text-slate-400"><BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No courses enrolled. Your instructor will enroll you soon.</p></div> :
            courses.map((c: any) => (
              <Card key={c.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadCourse(c.id)} data-testid={`course-card-${c.id}`}>
                <CardContent className="py-4 px-5">
                  <h3 className="font-semibold text-[#1A1F2B]">{c.title}</h3>
                  {c.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.description}</p>}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${c.progress || 0}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">{c.progress || 0}% complete</span>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>
      )}
    </div>
  );
}

export default function StudentCourses() {
  return (
    <PortalGuard allowedRoles={["student"]}>
      <StudentLayout><CoursesContent /></StudentLayout>
    </PortalGuard>
  );
}
