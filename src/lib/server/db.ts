import { drizzle } from "drizzle-orm/libsql";

import { env } from "$env/dynamic/private";

import * as schema from "./schema";

import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";

const turso = createClient({
    url: env.DATABASE_URL!,
    authToken: env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(turso, { schema });
