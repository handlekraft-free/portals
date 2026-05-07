import type { Router } from "express";
import { Router as createRouter } from "express";
import { db } from "./db";
import { courses, courseModules, courseLessons, courseEnrollments, studentFiles, announcements, users } from "@shared/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { requireEmployee } from "./auth-middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

const router: Router = createRouter();
router.use(requireEmployee as any);

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
fs.mkdirSync(path.join(UPLOAD_DIR, "lms-files"), { recursive: true });
const lmsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_DIR, "lms-files")),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});
const upload = multer({ storage: lmsStorage, limits: { fileSize: 100 * 1024 * 1024 } });

// ── Courses ───────────────────────────────────────────────────────────────────

router.get("/courses", async (req, res) => {
  const all = await db.select().from(courses).orderBy(desc(courses.createdAt));
  res.json({ success: true, data: all });
});

router.post("/courses", async (req, res) => {
  const instructorId = req.user!.userId;
  const { title, description, status } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Title required" });
  const [course] = await db.insert(courses).values({ title, description, instructorId, status: status || "draft" }).returning();
  res.status(201).json({ success: true, data: course });
});

router.get("/courses/:id", async (req, res) => {
  const courseId = parseInt(req.params.id);
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) return res.status(404).json({ success: false, error: "Course not found" });
  const modules = await db.select().from(courseModules).where(eq(courseModules.courseId, courseId)).orderBy(asc(courseModules.position));
  const allLessons = await db.select().from(courseLessons).where(sql`module_id IN (SELECT id FROM course_modules WHERE course_id = ${courseId})`).orderBy(asc(courseLessons.position));
  const enrollments = await db.select({ enrollment: courseEnrollments, student: users }).from(courseEnrollments).leftJoin(users, eq(courseEnrollments.studentId, users.id)).where(eq(courseEnrollments.courseId, courseId));
  const modulesWithLessons = modules.map(m => ({ ...m, lessons: allLessons.filter(l => l.moduleId === m.id) }));
  res.json({ success: true, data: { ...course, modules: modulesWithLessons, students: enrollments.map(e => ({ ...e.student, progress: e.enrollment.progressPct })) } });
});

router.patch("/courses/:id", async (req, res) => {
  const { title, description, status } = req.body;
  const [course] = await db.update(courses).set({ title, description, status }).where(eq(courses.id, parseInt(req.params.id))).returning();
  res.json({ success: true, data: course });
});

router.delete("/courses/:id", async (req, res) => {
  await db.update(courses).set({ status: "archived" }).where(eq(courses.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── Modules ───────────────────────────────────────────────────────────────────

router.post("/courses/:id/modules", async (req, res) => {
  const courseId = parseInt(req.params.id);
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Title required" });
  const existing = await db.select().from(courseModules).where(eq(courseModules.courseId, courseId));
  const [mod] = await db.insert(courseModules).values({ courseId, title, description, position: existing.length }).returning();
  res.status(201).json({ success: true, data: mod });
});

router.patch("/modules/:id", async (req, res) => {
  const { title, description, position } = req.body;
  const [mod] = await db.update(courseModules).set({ title, description, position }).where(eq(courseModules.id, parseInt(req.params.id))).returning();
  res.json({ success: true, data: mod });
});

router.delete("/modules/:id", async (req, res) => {
  await db.delete(courseModules).where(eq(courseModules.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── Lessons ───────────────────────────────────────────────────────────────────

router.post("/modules/:id/lessons", async (req, res) => {
  const moduleId = parseInt(req.params.id);
  const { title, contentType, content, fileUrl, durationMinutes, quizData } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Title required" });
  const existing = await db.select().from(courseLessons).where(eq(courseLessons.moduleId, moduleId));
  const [lesson] = await db.insert(courseLessons).values({ moduleId, title, contentType: contentType || "text", content: content || null, fileUrl: fileUrl || null, durationMinutes: durationMinutes || null, quizData: quizData || null, position: existing.length }).returning();
  res.status(201).json({ success: true, data: lesson });
});

router.patch("/lessons/:id", async (req, res) => {
  const { title, contentType, content, fileUrl, durationMinutes, position, quizData } = req.body;
  const [lesson] = await db.update(courseLessons).set({ title, contentType, content, fileUrl, durationMinutes, position, quizData }).where(eq(courseLessons.id, parseInt(req.params.id))).returning();
  res.json({ success: true, data: lesson });
});

router.delete("/lessons/:id", async (req, res) => {
  await db.delete(courseLessons).where(eq(courseLessons.id, parseInt(req.params.id)));
  res.json({ success: true, data: null });
});

// ── Enrollment ────────────────────────────────────────────────────────────────

router.post("/courses/:id/enroll", async (req, res) => {
  const courseId = parseInt(req.params.id);
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: "Student email required" });
  const [student] = await db.select().from(users).where(and(eq(users.email, email.toLowerCase()), eq(users.role, "student")));
  if (!student) return res.status(404).json({ success: false, error: "Student not found with that email" });
  const existing = await db.select().from(courseEnrollments).where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.studentId, student.id)));
  if (existing.length > 0) return res.status(400).json({ success: false, error: "Student already enrolled" });
  const [enrollment] = await db.insert(courseEnrollments).values({ courseId, studentId: student.id }).returning();
  res.status(201).json({ success: true, data: { enrollment, student } });
});

router.delete("/courses/:id/enroll/:studentId", async (req, res) => {
  await db.delete(courseEnrollments).where(and(eq(courseEnrollments.courseId, parseInt(req.params.id)), eq(courseEnrollments.studentId, parseInt(req.params.studentId as string))));
  res.json({ success: true, data: null });
});

// ── Announcements ─────────────────────────────────────────────────────────────

router.post("/courses/:id/announcements", async (req, res) => {
  const authorId = req.user!.userId;
  const courseId = parseInt(req.params.id);
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ success: false, error: "Title and content required" });
  const [announcement] = await db.insert(announcements).values({ courseId, authorId, title, content }).returning();
  res.status(201).json({ success: true, data: announcement });
});

// ── Student Files (instructor view) ──────────────────────────────────────────

router.post("/courses/:courseId/files/:studentId", upload.single("file"), async (req, res) => {
  const instructorId = req.user!.userId;
  const studentId = parseInt(req.params.studentId as string);
  const courseId = parseInt(req.params.courseId as string);
  if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });
  const [f] = await db.insert(studentFiles).values({
    studentId, uploadedBy: instructorId, filename: req.file.filename, filepath: req.file.path,
    fileSize: req.file.size, courseId, notes: req.body.notes || null, direction: "to_student",
  }).returning();
  res.status(201).json({ success: true, data: f });
});

// ── Employee Onboarding ───────────────────────────────────────────────────────

router.get("/onboarding", async (req, res) => {
  const userId = req.user!.userId;
  const items = await db.execute(sql`
    SELECT i.*,
      (SELECT count(*) FROM employee_onboarding_acks a WHERE a.item_id = i.id AND a.user_id = ${userId}) > 0 AS acked
    FROM employee_onboarding_items i
    ORDER BY i.position
  `);
  res.json({ success: true, data: items.rows });
});

router.post("/onboarding/:id/ack", async (req, res) => {
  await db.execute(sql`
    INSERT INTO employee_onboarding_acks (item_id, user_id)
    VALUES (${parseInt(req.params.id)}, ${req.user!.userId})
    ON CONFLICT DO NOTHING
  `);
  res.status(201).json({ success: true, data: null });
});

function isOnboardingEditor(role: string | undefined): boolean {
  return role === "admin" || role === "manager";
}

router.post("/onboarding/items", async (req, res) => {
  if (!isOnboardingEditor(req.user?.role)) {
    return res.status(403).json({ success: false, error: "Only managers can edit onboarding content" });
  }
  const { title, description, linkUrl, section, estimatedTime, roleFilter, position } = req.body;
  if (!title) return res.status(400).json({ success: false, error: "Title required" });
  const result = await db.execute(sql`
    INSERT INTO employee_onboarding_items (title, description, link_url, section, estimated_time, role_filter, position)
    VALUES (${title}, ${description ?? null}, ${linkUrl ?? null}, ${section ?? null}, ${estimatedTime ?? null}, ${roleFilter ?? "all"}, ${position ?? 99})
    RETURNING id
  `);
  res.status(201).json({ success: true, data: { id: (result.rows[0] as any)?.id ?? null } });
});

router.patch("/onboarding/items/:id", async (req, res) => {
  if (!isOnboardingEditor(req.user?.role)) {
    return res.status(403).json({ success: false, error: "Only managers can edit onboarding content" });
  }
  const id = parseInt(req.params.id);
  const { title, description, linkUrl, section, estimatedTime, roleFilter, position } = req.body;
  const result = await db.execute(sql`
    UPDATE employee_onboarding_items SET
      title = COALESCE(${title ?? null}, title),
      description = ${description !== undefined ? description : sql`description`},
      link_url = ${linkUrl !== undefined ? linkUrl : sql`link_url`},
      section = ${section !== undefined ? section : sql`section`},
      estimated_time = ${estimatedTime !== undefined ? estimatedTime : sql`estimated_time`},
      role_filter = COALESCE(${roleFilter ?? null}, role_filter),
      position = COALESCE(${position ?? null}, position)
    WHERE id = ${id}
    RETURNING id
  `);
  if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Item not found" });
  res.json({ success: true, data: null });
});

router.delete("/onboarding/items/:id", async (req, res) => {
  if (!isOnboardingEditor(req.user?.role)) {
    return res.status(403).json({ success: false, error: "Only managers can edit onboarding content" });
  }
  const id = parseInt(req.params.id);
  await db.execute(sql`DELETE FROM employee_onboarding_acks WHERE item_id = ${id}`);
  const result = await db.execute(sql`DELETE FROM employee_onboarding_items WHERE id = ${id} RETURNING id`);
  if (result.rows.length === 0) return res.status(404).json({ success: false, error: "Item not found" });
  res.json({ success: true, data: null });
});

export default router;
