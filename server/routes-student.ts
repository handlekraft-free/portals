import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import { courses, courseModules, courseLessons, courseEnrollments, lessonCompletions, studentFiles, announcements, users } from "@shared/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { requireAuth, requireStudent } from "./auth-middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

const router: Router = createRouter();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
fs.mkdirSync(path.join(UPLOAD_DIR, "student-files"), { recursive: true });

const studentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_DIR, "student-files")),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});
const upload = multer({ storage: studentStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Student Courses ───────────────────────────────────────────────────────────

router.get("/courses", requireStudent as any, async (req, res) => {
  const studentId = req.user!.userId;
  const enrollments = await db.select({ enrollment: courseEnrollments, course: courses }).from(courseEnrollments).leftJoin(courses, eq(courseEnrollments.courseId, courses.id)).where(eq(courseEnrollments.studentId, studentId));
  res.json({ success: true, data: enrollments.map(e => ({ ...e.course, enrollment: e.enrollment })) });
});

router.get("/courses/:id", requireStudent as any, async (req, res) => {
  const studentId = req.user!.userId;
  const courseId = parseInt(req.params.id);
  const [enrollment] = await db.select().from(courseEnrollments).where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.studentId, studentId)));
  if (!enrollment) return res.status(403).json({ success: false, error: "Not enrolled in this course" });
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) return res.status(404).json({ success: false, error: "Course not found" });
  const modules = await db.select().from(courseModules).where(eq(courseModules.courseId, courseId)).orderBy(asc(courseModules.position));
  const allLessons = await db.select().from(courseLessons).where(sql`module_id IN (SELECT id FROM course_modules WHERE course_id = ${courseId})`).orderBy(asc(courseLessons.position));
  const completions = await db.select().from(lessonCompletions).where(eq(lessonCompletions.studentId, studentId));
  const completedIds = new Set(completions.map(c => c.lessonId));
  const modulesWithLessons = modules.map(m => ({ ...m, lessons: allLessons.filter(l => l.moduleId === m.id).map(l => ({ ...l, completed: completedIds.has(l.id) })) }));
  res.json({ success: true, data: { ...course, enrollment, modules: modulesWithLessons } });
});

router.post("/courses/:courseId/lessons/:lessonId/complete", requireStudent as any, async (req, res) => {
  const studentId = req.user!.userId;
  const lessonId = parseInt(req.params.lessonId);
  const courseId = parseInt(req.params.courseId);
  const existing = await db.select().from(lessonCompletions).where(and(eq(lessonCompletions.lessonId, lessonId), eq(lessonCompletions.studentId, studentId)));
  if (existing.length === 0) {
    await db.insert(lessonCompletions).values({ lessonId, studentId });
  }
  // Recalculate progress
  const allLessons = await db.select().from(courseLessons).where(sql`module_id IN (SELECT id FROM course_modules WHERE course_id = ${courseId})`);
  const completions = await db.select().from(lessonCompletions).where(and(eq(lessonCompletions.studentId, studentId), sql`lesson_id IN (SELECT id FROM course_lessons WHERE module_id IN (SELECT id FROM course_modules WHERE course_id = ${courseId}))`));
  const pct = allLessons.length > 0 ? ((completions.length / allLessons.length) * 100).toFixed(2) : "0";
  const completedAt = pct === "100.00" ? new Date() : null;
  await db.update(courseEnrollments).set({ progressPct: pct, ...(completedAt && { completedAt }) }).where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.studentId, studentId)));
  res.json({ success: true, data: { progressPct: pct } });
});

// ── Student Dashboard ─────────────────────────────────────────────────────────

router.get("/dashboard", requireStudent as any, async (req, res) => {
  const studentId = req.user!.userId;
  const enrollments = await db.select({ enrollment: courseEnrollments, course: courses }).from(courseEnrollments).leftJoin(courses, eq(courseEnrollments.courseId, courses.id)).where(eq(courseEnrollments.studentId, studentId));
  const recentAnnouncements = await db.select({ announcement: announcements, course: courses }).from(announcements).leftJoin(courses, eq(announcements.courseId, courses.id)).where(sql`course_id IN (SELECT course_id FROM course_enrollments WHERE student_id = ${studentId})`).orderBy(desc(announcements.createdAt)).limit(5);
  res.json({ success: true, data: { courses: enrollments.map(e => ({ ...e.course, enrollment: e.enrollment })), announcements: recentAnnouncements.map(a => ({ ...a.announcement, courseName: a.course?.title })) } });
});

// ── Student Files ─────────────────────────────────────────────────────────────

router.get("/files", requireStudent as any, async (req, res) => {
  const studentId = req.user!.userId;
  const files = await db.select().from(studentFiles).where(eq(studentFiles.studentId, studentId)).orderBy(desc(studentFiles.createdAt));
  res.json({ success: true, data: files });
});

router.post("/files", requireStudent as any, upload.single("file"), async (req, res) => {
  const studentId = req.user!.userId;
  if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });
  const [f] = await db.insert(studentFiles).values({
    studentId, uploadedBy: studentId, filename: req.file.filename, filepath: req.file.path,
    fileSize: req.file.size, courseId: req.body.courseId ? parseInt(req.body.courseId) : null,
    notes: req.body.notes || null, direction: "from_instructor",
  }).returning();
  res.status(201).json({ success: true, data: f });
});

router.get("/files/:id/download", requireAuth as any, async (req, res) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  const [file] = await db.select().from(studentFiles).where(eq(studentFiles.id, parseInt(req.params.id)));
  if (!file) return res.status(404).json({ success: false, error: "File not found" });
  if (role === "student" && file.studentId !== userId) return res.status(403).json({ success: false, error: "Access denied" });
  if (!fs.existsSync(file.filepath)) return res.status(404).json({ success: false, error: "File not found on disk" });
  res.download(file.filepath, file.filename);
});

// ── Announcements ─────────────────────────────────────────────────────────────

router.get("/announcements", requireStudent as any, async (req, res) => {
  const studentId = req.user!.userId;
  const all = await db.select({ announcement: announcements, course: courses, author: users }).from(announcements).leftJoin(courses, eq(announcements.courseId, courses.id)).leftJoin(users, eq(announcements.authorId, users.id)).where(sql`course_id IN (SELECT course_id FROM course_enrollments WHERE student_id = ${studentId})`).orderBy(desc(announcements.createdAt));
  res.json({ success: true, data: all.map(a => ({ ...a.announcement, courseName: a.course?.title, authorName: `${a.author?.firstName} ${a.author?.lastName}` })) });
});

export default router;
