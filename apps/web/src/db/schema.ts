import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userTable = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const sessionTable = sqliteTable("session", {
  id: text("id").notNull().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const keyTable = sqliteTable("key", {
  id: text("id").notNull().primaryKey(),
  password: text("password"),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
