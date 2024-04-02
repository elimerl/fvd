import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const userTable = sqliteTable("user", {
    id: integer("id").notNull().primaryKey({ autoIncrement: true }),
    google_id: text("google_id").notNull().unique(),
    username: text("username").notNull(),
});

export const sessionTable = sqliteTable("session", {
    id: text("id").notNull().primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => userTable.id),
    expiresAt: integer("expires_at").notNull(),
});
