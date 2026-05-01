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

export const userRoleEnum = pgEnum("user_role", ["admin", "employee", "client", "student", "board"]);
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
  // Board-specific fields
  termStart: timestamp("term_start"),
  termEnd: timestamp("term_end"),
  boardPosition: text("board_position"),
  committees: text("committees").array(),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  emergencyContact: text("emergency_contact"),
  isInterestedDirector: boolean("is_interested_director").default(false),
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

// ─── Charge Codes ─────────────────────────────────────────────────────────────

export const chargeCodes = pgTable("charge_codes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }).notNull().default("#64748b"),
  active: boolean("active").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ChargeCode = typeof chargeCodes.$inferSelect;
export type InsertChargeCode = typeof chargeCodes.$inferInsert;

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
  reviewerId: integer("reviewer_id"),
  interestRating: integer("interest_rating"),
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
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type KanbanCardComment = typeof kanbanCardComments.$inferSelect;

export const kanbanCardAttachments = pgTable("kanban_card_attachments", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type KanbanCardAttachment = typeof kanbanCardAttachments.$inferSelect;

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

// ─── Board Portal ──────────────────────────────────────────────────────────────

export const boardCommittees = pgTable("board_committees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type BoardCommittee = typeof boardCommittees.$inferSelect;

export const boardMeetingTypeEnum = pgEnum("board_meeting_type", ["regular", "special", "committee", "annual"]);
export const boardMeetingStatusEnum = pgEnum("board_meeting_status", ["scheduled", "held", "cancelled"]);

export const boardMeetings = pgTable("board_meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  meetingType: boardMeetingTypeEnum("meeting_type").default("regular"),
  status: boardMeetingStatusEnum("status").default("scheduled"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  endTime: timestamp("end_time"),
  location: text("location"),
  platform: text("platform"),
  quorumNumber: integer("quorum_number").default(3),
  committeeId: integer("committee_id"),
  noticeSentAt: timestamp("notice_sent_at"),
  noticeMethod: varchar("notice_method", { length: 50 }),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type BoardMeeting = typeof boardMeetings.$inferSelect;

export const boardMeetingRsvpEnum = pgEnum("board_meeting_rsvp", ["yes", "no", "tentative"]);

export const boardMeetingRsvps = pgTable("board_meeting_rsvps", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  userId: integer("user_id").notNull(),
  response: boardMeetingRsvpEnum("response").notNull(),
  respondedAt: timestamp("responded_at").defaultNow().notNull(),
});
export type BoardMeetingRsvp = typeof boardMeetingRsvps.$inferSelect;

export const boardMeetingAttendanceEnum = pgEnum("board_meeting_attendance", ["present", "absent", "excused"]);
export const boardParticipationMethodEnum = pgEnum("board_participation_method", ["in_person", "remote"]);

export const boardMeetingAttendees = pgTable("board_meeting_attendees", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  userId: integer("user_id").notNull(),
  attendance: boardMeetingAttendanceEnum("attendance").default("present"),
  participationMethod: boardParticipationMethodEnum("participation_method").default("in_person"),
  waivedNotice: boolean("waived_notice").default(false),
});
export type BoardMeetingAttendee = typeof boardMeetingAttendees.$inferSelect;

export const boardAgendaItems = pgTable("board_agenda_items", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").default(0),
  duration: integer("duration"),
  presenter: text("presenter"),
});
export type BoardAgendaItem = typeof boardAgendaItems.$inferSelect;

export const boardMinutesStatusEnum = pgEnum("board_minutes_status", ["draft", "pending_approval", "approved"]);

export const boardMinutes = pgTable("board_minutes", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  status: boardMinutesStatusEnum("status").default("draft"),
  content: text("content"),
  quorumPresent: boolean("quorum_present").default(false),
  quorumCount: integer("quorum_count"),
  adjournmentTime: timestamp("adjournment_time"),
  submittedAt: timestamp("submitted_at"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type BoardMinutes = typeof boardMinutes.$inferSelect;

export const boardMinutesMotions = pgTable("board_minutes_motions", {
  id: serial("id").primaryKey(),
  minutesId: integer("minutes_id").notNull(),
  motionText: text("motion_text").notNull(),
  moverId: integer("mover_id"),
  seconderId: integer("seconder_id"),
  votesFor: integer("votes_for").default(0),
  votesAgainst: integer("votes_against").default(0),
  votesAbstain: integer("votes_abstain").default(0),
  recusedDirectors: text("recused_directors"),
  passed: boolean("passed").default(false),
  position: integer("position").default(0),
});
export type BoardMinutesMotion = typeof boardMinutesMotions.$inferSelect;

export const boardActionItems = pgTable("board_action_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to"),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 20 }).default("open"),
  sourceMinutesId: integer("source_minutes_id"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
export type BoardActionItem = typeof boardActionItems.$inferSelect;

export const boardDocumentConfidentialityEnum = pgEnum("board_document_confidentiality", ["public", "board_only", "restricted"]);

export const boardDocuments = pgTable("board_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  confidentiality: boardDocumentConfidentialityEnum("confidentiality").default("board_only"),
  requireAck: boolean("require_ack").default(false),
  retentionPolicy: text("retention_policy"),
  uploadedBy: integer("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type BoardDocument = typeof boardDocuments.$inferSelect;

export const boardDocumentVersions = pgTable("board_document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  versionNumber: integer("version_number").default(1),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: integer("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  notes: text("notes"),
});
export type BoardDocumentVersion = typeof boardDocumentVersions.$inferSelect;

export const boardDocumentAcks = pgTable("board_document_acks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  userId: integer("user_id").notNull(),
  ackedAt: timestamp("acked_at").defaultNow().notNull(),
});
export type BoardDocumentAck = typeof boardDocumentAcks.$inferSelect;

export const boardAuditLog = pgTable("board_audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: integer("resource_id"),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type BoardAuditLog = typeof boardAuditLog.$inferSelect;

export const boardWrittenConsentStatusEnum = pgEnum("board_written_consent_status", ["pending", "valid", "failed"]);

export const boardWrittenConsents = pgTable("board_written_consents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  resolutionFilepath: text("resolution_filepath"),
  status: boardWrittenConsentStatusEnum("status").default("pending"),
  excludedDirectors: text("excluded_directors"),
  interestedDirectors: text("interested_directors"),
  deadline: timestamp("deadline"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});
export type BoardWrittenConsent = typeof boardWrittenConsents.$inferSelect;

export const boardWrittenConsentResponseEnum = pgEnum("board_written_consent_response", ["consent", "decline"]);

export const boardWrittenConsentResponses = pgTable("board_written_consent_responses", {
  id: serial("id").primaryKey(),
  consentId: integer("consent_id").notNull(),
  userId: integer("user_id").notNull(),
  response: boardWrittenConsentResponseEnum("response").notNull(),
  reason: text("reason"),
  respondedAt: timestamp("responded_at").defaultNow().notNull(),
});
export type BoardWrittenConsentResponse = typeof boardWrittenConsentResponses.$inferSelect;

export const boardCoiDisclosures = pgTable("board_coi_disclosures", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  disclosures: text("disclosures"),
  certified: boolean("certified").default(false),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  meetingId: integer("meeting_id"),
  agendaItemId: integer("agenda_item_id"),
  interestDescription: text("interest_description"),
});
export type BoardCoiDisclosure = typeof boardCoiDisclosures.$inferSelect;

export const boardForumTopics = pgTable("board_forum_topics", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull(),
  committeeId: integer("committee_id"),
  pinned: boolean("pinned").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
});
export type BoardForumTopic = typeof boardForumTopics.$inferSelect;

export const boardForumPosts = pgTable("board_forum_posts", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull(),
  authorId: integer("author_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"),
});
export type BoardForumPost = typeof boardForumPosts.$inferSelect;

export const boardFinancials = pgTable("board_financials", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  asOfDate: timestamp("as_of_date").notNull(),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: integer("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  parentId: integer("parent_id"),
  notes: text("notes"),
});
export type BoardFinancial = typeof boardFinancials.$inferSelect;

export const boardOnboardingItems = pgTable("board_onboarding_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  documentId: integer("document_id"),
  position: integer("position").default(0),
  required: boolean("required").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type BoardOnboardingItem = typeof boardOnboardingItems.$inferSelect;

export const boardOnboardingAcks = pgTable("board_onboarding_acks", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  userId: integer("user_id").notNull(),
  ackedAt: timestamp("acked_at").defaultNow().notNull(),
});
export type BoardOnboardingAck = typeof boardOnboardingAcks.$inferSelect;

export const boardNotificationPrefs = pgTable("board_notification_prefs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  meetingNoticesEmail: boolean("meeting_notices_email").default(true),
  meetingNoticesInApp: boolean("meeting_notices_in_app").default(true),
  documentUploadsEmail: boolean("document_uploads_email").default(false),
  documentUploadsInApp: boolean("document_uploads_in_app").default(true),
  actionItemsEmail: boolean("action_items_email").default(true),
  actionItemsInApp: boolean("action_items_in_app").default(true),
  forumActivityEmail: boolean("forum_activity_email").default(false),
  forumActivityInApp: boolean("forum_activity_in_app").default(true),
  coiPromptsEmail: boolean("coi_prompts_email").default(true),
  coiPromptsInApp: boolean("coi_prompts_in_app").default(true),
});
export type BoardNotificationPref = typeof boardNotificationPrefs.$inferSelect;

export const boardMinutesActionItems = pgTable("board_minutes_action_items", {
  id: serial("id").primaryKey(),
  minutesId: integer("minutes_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to"),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 20 }).default("open"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
export type BoardMinutesActionItem = typeof boardMinutesActionItems.$inferSelect;

export const boardMeetingNotices = pgTable("board_meeting_notices", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  method: varchar("method", { length: 50 }).notNull(),
  recipientCount: integer("recipient_count").default(0),
  sentBy: integer("sent_by").notNull(),
  notes: text("notes"),
});
export type BoardMeetingNotice = typeof boardMeetingNotices.$inferSelect;

export const boardDocumentViews = pgTable("board_document_views", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  userId: integer("user_id").notNull(),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
});
export type BoardDocumentView = typeof boardDocumentViews.$inferSelect;

export const boardMinutesVersions = pgTable("board_minutes_versions", {
  id: serial("id").primaryKey(),
  minutesId: integer("minutes_id").notNull(),
  versionNumber: integer("version_number").notNull().default(1),
  contentSnapshot: text("content_snapshot"),
  motionsSnapshot: text("motions_snapshot"),
  savedBy: integer("saved_by").notNull(),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
  note: text("note"),
});
export type BoardMinutesVersion = typeof boardMinutesVersions.$inferSelect;

// Meeting Packet Documents — documents explicitly linked to a meeting packet
export const boardMeetingPacketDocs = pgTable("board_meeting_packet_docs", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  documentId: integer("document_id").notNull(),
  addedBy: integer("added_by").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  note: text("note"),
});
export type BoardMeetingPacketDoc = typeof boardMeetingPacketDocs.$inferSelect;
