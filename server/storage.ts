import { db } from "./db";
import { eq, desc, asc, inArray } from "drizzle-orm";
import {
  adminUsers,
  boardForumAttachments,
  type AdminUser,
  type InsertBoardForumAttachment,
  type BoardForumAttachment,
} from "@shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
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
