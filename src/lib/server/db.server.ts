import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { DrizzleD1Database, drizzle as drizzleD1 } from "drizzle-orm/d1";

import { env } from "$env/dynamic/private";

import * as schema from "./schema";

let db: BetterSQLite3Database<typeof schema>;

if (env.DATABASE_PROVIDER === "local") {
    const sqlite = (await import("better-sqlite3")).default("sqlite.db");
    db = (await import("drizzle-orm/better-sqlite3")).drizzle(sqlite, {
        schema,
    });
}

export function getDB(
    platform: App.Platform
): BetterSQLite3Database<typeof schema> | DrizzleD1Database<typeof schema> {
    if (env.DATABASE_PROVIDER === "local") {
        return db;
    } else {
        return drizzleD1(platform.env.DATABASE, { schema });
    }
}
