import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const userTable = sqliteTable("user", {
    id: integer("id").notNull().primaryKey({ autoIncrement: true }),
    google_id: text("google_id").notNull().unique(),
    username: text("username").notNull().unique(),
});

export const sessionTable = sqliteTable("session", {
    id: text("id").notNull().primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => userTable.id),
    expiresAt: integer("expires_at").notNull(),
});

export const settingsTable = sqliteTable("settings", {
    id: integer("id").notNull().primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
        .notNull()
        .references(() => userTable.id),
    json: text("json").notNull(),
});

export const tracksTable = sqliteTable("tracks", {
    id: integer("id").notNull().primaryKey({ autoIncrement: true }),
    trackJson: text("track_json").notNull(),
    userId: integer("user_id")
        .notNull()
        .references(() => userTable.id),
    name: text("name").notNull(),
    description: text("description").notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const trackVideoTable = sqliteTable("track_video", {
    id: integer("id").notNull().primaryKey({ autoIncrement: true }),
    trackId: integer("track_id")
        .notNull()
        .references(() => tracksTable.id),
    youtubeId: text("youtube_id").notNull(),
});
