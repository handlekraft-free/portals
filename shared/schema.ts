import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We don't need a DB for this static site, but keeping a minimal schema for the template
export const dummy = pgTable("dummy", {
  id: serial("id").primaryKey(),
});