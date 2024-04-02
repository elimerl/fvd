import { drizzle } from "drizzle-orm/libsql";

import { env } from "$env/dynamic/private";

import * as schema from "./schema";

import { createClient } from "@libsql/client";

const turso = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.AUTH_TOKEN,
});

export const db = drizzle(turso, { schema });
