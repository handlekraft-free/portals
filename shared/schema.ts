import { pgTable, text, serial, integer, timestamp, varchar, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Existing Public Application Tables ───────────────────────────────────────

export const fellowshipApplications = pgTable("fellowship_applications", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: text("location"),
  background: text("background").notNull(),
  motivation: text("motivation").notNull(),
  experience: text("experience"),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  rating: integer("rating").default(0),
  priority: integer("priority").default(0),
  adminNotes: text("admin_notes"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertFellowshipApplicationSchema = createInsertSchema(fellowshipApplications).omit({
  id: true, status: true, rating: true, priority: true, adminNotes: true, submittedAt: true,
});
export type InsertFellowshipApplication = z.infer<typeof insertFellowshipApplicationSchema>;
export type FellowshipApplication = typeof fellowshipApplications.$inferSelect;

export const clientApplications = pgTable("client_applications", {
  id: serial("id").primaryKey(),
  organizationName: text("organization_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  organizationType: text("organization_type").notNull(),
  location: text("location"),
  needs: text("needs").notNull(),
  currentTools: text("current_tools"),
  urgency: varchar("urgency", { length: 20 }).notNull().default("normal"),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  rating: integer("rating").default(0),
  priority: integer("priority").default(0),
  adminNotes: text("admin_notes"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertClientApplicationSchema = createInsertSchema(clientApplications).omit({
  id: true, status: true, rating: true, priority: true, adminNotes: true, submittedAt: true,
});
export type InsertClientApplication = z.infer<typeof insertClientApplicationSchema>;
export type ClientApplication = typeof clientApplications.$inferSelect;

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});
export type AdminUser = typeof adminUsers.$inferSelect;

// ─── Portal Users ──────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["admin", "employee", "client", "student"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "pending"]);

export const users = pgTable("portal_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default("employee"),
  status: userStatusEnum("status").notNull().default("active"),
  avatarUrl: text("avatar_url"),
  mustChangePassword: boolean("must_change_password").default(false),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  canApprove: boolean("can_approve").default(false),
  approverId: integer("approver_id"),
});
export type PortalUser = typeof users.$inferSelect;
export type InsertPortalUser = typeof users.$inferInsert;

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientId: integer("client_id"),
  color: varchar("color", { length: 20 }).default("#0D7377"),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }).default("0"),
  budgetHours: numeric("budget_hours", { precision: 10, scale: 2 }).default("0"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Project = typeof projects.$inferSelect;

// ─── Time Tracking ────────────────────────────────────────────────────────────

export const timeEntryStatusEnum = pgEnum("time_entry_status", ["draft", "submitted", "approved", "rejected"]);

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id"),
  taskDescription: text("task_description").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  billable: boolean("billable").default(false),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  notes: text("notes"),
  status: timeEntryStatusEnum("status").default("draft"),
  isRunning: boolean("is_running").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type TimeEntry = typeof timeEntries.$inferSelect;

export const timeReportStatusEnum = pgEnum("time_report_status", ["draft", "submitted", "approved", "rejected"]);

export const timeReports = pgTable("time_reports", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalHours: numeric("total_hours", { precision: 10, scale: 2 }).default("0"),
  totalBillable: numeric("total_billable", { precision: 10, scale: 2 }).default("0"),
  status: timeReportStatusEnum("status").default("draft"),
  mode: varchar("mode", { length: 20 }).default("simple"),
  simpleDayHours: text("simple_day_hours"),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectReason: text("reject_reason"),
});
export type TimeReport = typeof timeReports.$inferSelect;

// ─── Teams ────────────────────────────────────────────────────────────────────

export const teamMemberRoleEnum = pgEnum("team_member_role", ["lead", "member"]);

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Team = typeof teams.$inferSelect;

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  userId: integer("user_id").notNull(),
  role: teamMemberRoleEnum("role").default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});
export type TeamMember = typeof teamMembers.$inferSelect;

// ─── Kanban ───────────────────────────────────────────────────────────────────

export const cardPriorityEnum = pgEnum("card_priority", ["low", "medium", "high", "urgent"]);

export const kanbanBoards = pgTable("kanban_boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  teamId: integer("team_id"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  archived: boolean("archived").default(false),
});
export type KanbanBoard = typeof kanbanBoards.$inferSelect;

export const kanbanColumns = pgTable("kanban_columns", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").notNull(),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
  color: varchar("color", { length: 20 }).default("#0D7377"),
  wipLimit: integer("wip_limit"),
});
export type KanbanColumn = typeof kanbanColumns.$inferSelect;

export const kanbanCards = pgTable("kanban_cards", {
  id: serial("id").primaryKey(),
  columnId: integer("column_id").notNull(),
  boardId: integer("board_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to"),
  dueDate: timestamp("due_date"),
  priority: cardPriorityEnum("priority").default("medium"),
  labels: text("labels").array(),
  position: integer("position").notNull().default(0),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  archived: boolean("archived").default(false),
});
export type KanbanCard = typeof kanbanCards.$inferSelect;

export const kanbanCardComments = pgTable("kanban_card_comments", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type KanbanCardComment = typeof kanbanCardComments.$inferSelect;

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const expenseReportStatusEnum = pgEnum("expense_report_status", ["draft", "submitted", "approved", "rejected", "exported"]);

export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  qbAccountCode: varchar("qb_account_code", { length: 20 }),
  qbAccountName: text("qb_account_name"),
  description: text("description"),
  active: boolean("active").default(true),
});
export type ExpenseCategory = typeof expenseCategories.$inferSelect;

export const expenseReports = pgTable("expense_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  status: expenseReportStatusEnum("status").default("draft"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).default("0"),
  submittedAt: timestamp("submitted_at"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  qbExportDate: timestamp("qb_export_date"),
  notes: text("notes"),
  rejectReason: text("reject_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ExpenseReport = typeof expenseReports.$inferSelect;

export const expenseItems = pgTable("expense_items", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  vendor: text("vendor").notNull(),
  description: text("description").notNull(),
  categoryId: integer("category_id"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  receiptUrl: text("receipt_url"),
  billable: boolean("billable").default(false),
  clientId: integer("client_id"),
  projectId: integer("project_id"),
  qbAccountCode: varchar("qb_account_code", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ExpenseItem = typeof expenseItems.$inferSelect;

// ─── Client Portal ────────────────────────────────────────────────────────────

export const fileDirectionEnum = pgEnum("file_direction", ["to_client", "from_client"]);

export const clientFiles = pgTable("client_files", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  filepath: text("filepath").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  direction: fileDirectionEnum("direction").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ClientFile = typeof clientFiles.$inferSelect;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  recipientId: integer("recipient_id").notNull(),
  clientId: integer("client_id"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Message = typeof messages.$inferSelect;

export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "waiting", "resolved", "closed"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high", "urgent"]);

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  createdBy: integer("created_by").notNull(),
  assignedTo: integer("assigned_to"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").default("open"),
  priority: ticketPriorityEnum("priority").default("medium"),
  category: varchar("category", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});
export type SupportTicket = typeof supportTickets.$inferSelect;

export const ticketComments = pgTable("ticket_comments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  internal: boolean("internal").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type TicketComment = typeof ticketComments.$inferSelect;

// ─── Student LMS ──────────────────────────────────────────────────────────────

export const courseStatusEnum = pgEnum("course_status", ["draft", "published", "archived"]);
export const lessonContentTypeEnum = pgEnum("lesson_content_type", ["text", "video", "file", "quiz"]);
export const studentFileDirectionEnum = pgEnum("student_file_direction", ["to_student", "from_instructor"]);

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  instructorId: integer("instructor_id").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  status: courseStatusEnum("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Course = typeof courses.$inferSelect;

export const courseModules = pgTable("course_modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type CourseModule = typeof courseModules.$inferSelect;

export const courseLessons = pgTable("course_lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  title: text("title").notNull(),
  contentType: lessonContentTypeEnum("content_type").default("text"),
  content: text("content"),
  fileUrl: text("file_url"),
  durationMinutes: integer("duration_minutes"),
  position: integer("position").notNull().default(0),
  quizData: text("quiz_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type CourseLesson = typeof courseLessons.$inferSelect;

export const courseEnrollments = pgTable("course_enrollments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  studentId: integer("student_id").notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  progressPct: numeric("progress_pct", { precision: 5, scale: 2 }).default("0"),
});
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;

export const lessonCompletions = pgTable("lesson_completions", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  studentId: integer("student_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});
export type LessonCompletion = typeof lessonCompletions.$inferSelect;

export const studentFiles = pgTable("student_files", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  fileSize: integer("file_size"),
  courseId: integer("course_id"),
  notes: text("notes"),
  direction: studentFileDirectionEnum("direction").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type StudentFile = typeof studentFiles.$inferSelect;

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  authorId: integer("author_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Announcement = typeof announcements.$inferSelect;
