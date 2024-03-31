import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia } from "lucia";
import { getDB } from "./db";
import { sessionTable, userTable } from "./schema";
import { Google } from "arctic";
import { env } from "$env/dynamic/private";

const luciaAdapter =
    env.DATABASE_PROVIDER === "local"
        ? new DrizzleSQLiteAdapter(
              getDB({ env: { DATABASE: undefined } }),
              sessionTable,
              userTable
          )
        : undefined;

let lucia =
    env.DATABASE_PROVIDER === "local" ? makeLucia(luciaAdapter) : undefined;

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

function makeLucia(adapter: DrizzleSQLiteAdapter): Lucia {
    return new Lucia(adapter, {
        sessionCookie: {
            attributes: {
                secure: import.meta.env.PROD,
            },
        },
    });
}

export function getLucia(platform: App.Platform): Lucia {
    if (env.DATABASE_PROVIDER === "local") {
        return lucia;
    } else {
        const luciaAdapter = new DrizzleSQLiteAdapter(
            getDB({ env: { DATABASE: undefined } }),
            sessionTable,
            userTable
        );

        return makeLucia(luciaAdapter);
    }
}
