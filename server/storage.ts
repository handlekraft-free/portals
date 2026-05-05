import { db } from "./db";
import { eq, desc, asc, inArray } from "drizzle-orm";
import {
  fellowshipApplications,
  clientApplications,
  adminUsers,
  boardForumAttachments,
  type InsertFellowshipApplication,
  type FellowshipApplication,
  type InsertClientApplication,
  type ClientApplication,
  type AdminUser,
  type InsertBoardForumAttachment,
  type BoardForumAttachment,
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

  createBoardForumAttachment(data: InsertBoardForumAttachment): Promise<BoardForumAttachment>;
  getBoardForumAttachment(id: number): Promise<BoardForumAttachment | undefined>;
  listBoardForumAttachmentsByTopic(topicId: number): Promise<BoardForumAttachment[]>;
  listBoardForumAttachmentsByPost(postId: number): Promise<BoardForumAttachment[]>;
  listBoardForumAttachmentsByPostIds(postIds: number[]): Promise<BoardForumAttachment[]>;
  deleteBoardForumAttachment(id: number): Promise<BoardForumAttachment | undefined>;
  deleteBoardForumAttachmentsByTopic(topicId: number): Promise<BoardForumAttachment[]>;
  deleteBoardForumAttachmentsByPost(postId: number): Promise<BoardForumAttachment[]>;
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

  async createBoardForumAttachment(data: InsertBoardForumAttachment): Promise<BoardForumAttachment> {
    const [row] = await db.insert(boardForumAttachments).values(data).returning();
    return row;
  }

  async getBoardForumAttachment(id: number): Promise<BoardForumAttachment | undefined> {
    const [row] = await db.select().from(boardForumAttachments).where(eq(boardForumAttachments.id, id));
    return row;
  }

  async listBoardForumAttachmentsByTopic(topicId: number): Promise<BoardForumAttachment[]> {
    return db.select().from(boardForumAttachments)
      .where(eq(boardForumAttachments.topicId, topicId))
      .orderBy(asc(boardForumAttachments.id));
  }

  async listBoardForumAttachmentsByPost(postId: number): Promise<BoardForumAttachment[]> {
    return db.select().from(boardForumAttachments)
      .where(eq(boardForumAttachments.postId, postId))
      .orderBy(asc(boardForumAttachments.id));
  }

  async listBoardForumAttachmentsByPostIds(postIds: number[]): Promise<BoardForumAttachment[]> {
    if (postIds.length === 0) return [];
    return db.select().from(boardForumAttachments)
      .where(inArray(boardForumAttachments.postId, postIds))
      .orderBy(asc(boardForumAttachments.id));
  }

  async deleteBoardForumAttachment(id: number): Promise<BoardForumAttachment | undefined> {
    const [row] = await db.delete(boardForumAttachments).where(eq(boardForumAttachments.id, id)).returning();
    return row;
  }

  async deleteBoardForumAttachmentsByTopic(topicId: number): Promise<BoardForumAttachment[]> {
    return db.delete(boardForumAttachments).where(eq(boardForumAttachments.topicId, topicId)).returning();
  }

  async deleteBoardForumAttachmentsByPost(postId: number): Promise<BoardForumAttachment[]> {
    return db.delete(boardForumAttachments).where(eq(boardForumAttachments.postId, postId)).returning();
  }
}

export const storage = new DatabaseStorage();
