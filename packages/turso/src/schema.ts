import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userTable = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const sessionTable = sqliteTable("session", {
  id: text("id").notNull().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const keyTable = sqliteTable("key", {
  id: text("id").notNull().primaryKey(),
  password: text("password"),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const deckTable = sqliteTable(
  "deck",
  {
    id: text("id").notNull().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  // (table) => ({
  //   uniqueDeckName: unique("unique_deck_name").on(table.userId, table.name),
  // }),
);

export const cardTable = sqliteTable("card", {
  id: text("id").notNull().primaryKey(),
  deckId: text("deck_id")
    .notNull()
    .references(() => deckTable.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  frontAudio: text("front_audio"),
  backAudio: text("back_audio"),
  image: text("image"),
  createdAt: integer("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Deck = typeof deckTable.$inferSelect;
export type Card = typeof cardTable.$inferSelect;
