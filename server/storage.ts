import { db } from "./db";
import { eq, desc, asc } from "drizzle-orm";
import {
  fellowshipApplications,
  clientApplications,
  adminUsers,
  type InsertFellowshipApplication,
  type FellowshipApplication,
  type InsertClientApplication,
  type ClientApplication,
  type AdminUser,
} from "@shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
  createFellowshipApplication(data: InsertFellowshipApplication): Promise<FellowshipApplication>;
  getFellowshipApplications(): Promise<FellowshipApplication[]>;
  getFellowshipApplication(id: number): Promise<FellowshipApplication | undefined>;
  updateFellowshipApplication(id: number, data: Partial<Pick<FellowshipApplication, "status" | "rating" | "priority" | "adminNotes">>): Promise<FellowshipApplication | undefined>;

  createClientApplication(data: InsertClientApplication): Promise<ClientApplication>;
  getClientApplications(): Promise<ClientApplication[]>;
  getClientApplication(id: number): Promise<ClientApplication | undefined>;
  updateClientApplication(id: number, data: Partial<Pick<ClientApplication, "status" | "rating" | "priority" | "adminNotes">>): Promise<ClientApplication | undefined>;

  getAdminByUsername(username: string): Promise<AdminUser | undefined>;
  createAdmin(username: string, password: string): Promise<AdminUser>;
}

export class DatabaseStorage implements IStorage {
  async createFellowshipApplication(data: InsertFellowshipApplication): Promise<FellowshipApplication> {
    const [app] = await db.insert(fellowshipApplications).values(data).returning();
    return app;
  }

  async getFellowshipApplications(): Promise<FellowshipApplication[]> {
    return db.select().from(fellowshipApplications).orderBy(desc(fellowshipApplications.priority), desc(fellowshipApplications.submittedAt));
  }

  async getFellowshipApplication(id: number): Promise<FellowshipApplication | undefined> {
    const [app] = await db.select().from(fellowshipApplications).where(eq(fellowshipApplications.id, id));
    return app;
  }

  async updateFellowshipApplication(id: number, data: Partial<Pick<FellowshipApplication, "status" | "rating" | "priority" | "adminNotes">>): Promise<FellowshipApplication | undefined> {
    const [app] = await db.update(fellowshipApplications).set(data).where(eq(fellowshipApplications.id, id)).returning();
    return app;
  }

  async createClientApplication(data: InsertClientApplication): Promise<ClientApplication> {
    const [app] = await db.insert(clientApplications).values(data).returning();
    return app;
  }

  async getClientApplications(): Promise<ClientApplication[]> {
    return db.select().from(clientApplications).orderBy(desc(clientApplications.priority), desc(clientApplications.submittedAt));
  }

  async getClientApplication(id: number): Promise<ClientApplication | undefined> {
    const [app] = await db.select().from(clientApplications).where(eq(clientApplications.id, id));
    return app;
  }

  async updateClientApplication(id: number, data: Partial<Pick<ClientApplication, "status" | "rating" | "priority" | "adminNotes">>): Promise<ClientApplication | undefined> {
    const [app] = await db.update(clientApplications).set(data).where(eq(clientApplications.id, id)).returning();
    return app;
  }

  async getAdminByUsername(username: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return user;
  }

  async createAdmin(username: string, password: string): Promise<AdminUser> {
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(adminUsers).values({ username, passwordHash }).returning();
    return user;
  }
}

export const storage = new DatabaseStorage();
