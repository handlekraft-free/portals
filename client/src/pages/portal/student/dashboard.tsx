import { useEffect, useState } from "react";
import { StudentLayout } from "@/components/portal/StudentLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, Megaphone, FolderOpen, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND } from "@shared/branding";

function StudentDashboardContent() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `Student Portal | ${BRAND.fullName}`;
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [coursesRes, annRes] = await Promise.all([
      apiRequest("GET", "/api/student/courses"),
      apiRequest("GET", "/api/student/announcements"),
    ]);
    if (coursesRes.success) setCourses(coursesRes.data);
    if (annRes.success) setAnnouncements(annRes.data.slice(0, 3));
    setLoading(false);
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-[#1A1F2B] to-purple-900 rounded-2xl p-6 mb-6 text-white">
        <p className="text-white/60 text-sm">Fellow Portal</p>
        <h1 className="text-2xl font-display mt-1">Welcome, {user?.firstName}! 🗡️</h1>
        <p className="text-white/70 text-sm mt-1">Your fellowship training dashboard.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: <BookOpen className="w-5 h-5 text-purple-500" />, label: "Enrolled Courses", value: loading ? "—" : courses.length, bg: "bg-purple-50" },
          { icon: <Megaphone className="w-5 h-5 text-[#D4A843]" />, label: "Announcements", value: loading ? "—" : announcements.length, bg: "bg-amber-50" },
          { icon: <FolderOpen className="w-5 h-5 text-[#0D7377]" />, label: "Files", value: "—", bg: "bg-teal-50" },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>{s.icon}</div>
              <p className="text-2xl font-bold text-[#1A1F2B]" data-testid={`stat-${i}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Courses */}
      <Card className="border-0 shadow-sm mb-4">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1A1F2B]">My Courses</h3>
            <a href="/portal/student/courses" className="text-xs text-[#0D7377] hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></a>
          </div>
          {loading ? <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div> :
            courses.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No courses enrolled yet.</p> :
              courses.slice(0, 3).map((c: any) => (
                <a key={c.id} href="/portal/student/courses" className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors" data-testid={`course-row-${c.id}`}>
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600"><BookOpen className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F2B] truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${c.progress || 0}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{c.progress || 0}%</span>
                    </div>
                  </div>
                </a>
              ))
          }
        </CardContent>
      </Card>

      {/* Announcements */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1A1F2B]">Recent Announcements</h3>
            <a href="/portal/student/announcements" className="text-xs text-[#0D7377] hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></a>
          </div>
          {loading ? <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div> :
            announcements.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No announcements yet.</p> :
              announcements.map((a: any) => (
                <div key={a.id} className="py-2 px-3 rounded-lg hover:bg-slate-50" data-testid={`ann-row-${a.id}`}>
                  <p className="text-sm font-medium text-[#1A1F2B]">{a.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              ))
          }
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <PortalGuard allowedRoles={["student"]}>
      <StudentLayout><StudentDashboardContent /></StudentLayout>
    </PortalGuard>
  );
}
