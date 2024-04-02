import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia } from "lucia";
import { sessionTable, userTable } from "./schema";
import { Google } from "arctic";
import { env } from "$env/dynamic/private";
import { db } from "./db";

declare module "lucia" {
    interface Register {
        Lucia: typeof lucia;
        UserId: number;
    }
}

export const googleOauth = new Google(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.BASE_URL + "/login/google/callback"
);

const adapter = new DrizzleSQLiteAdapter(db, sessionTable, userTable);
export const lucia = new Lucia(adapter, {
    sessionCookie: {
        attributes: {
            secure: import.meta.env.PROD,
        },
    },
});
