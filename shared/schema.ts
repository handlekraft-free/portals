import { pgTable, text, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  id: true,
  status: true,
  rating: true,
  priority: true,
  adminNotes: true,
  submittedAt: true,
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
  id: true,
  status: true,
  rating: true,
  priority: true,
  adminNotes: true,
  submittedAt: true,
});

export type InsertClientApplication = z.infer<typeof insertClientApplicationSchema>;
export type ClientApplication = typeof clientApplications.$inferSelect;

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
