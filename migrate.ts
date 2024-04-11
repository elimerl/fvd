import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import "dotenv/config";
import { readFile } from "fs/promises";

const info = process.argv[2];

if (!info) {
    console.error("Usage: migrate <db.json file>");
    process.exit(1);
}

async function main() {
    const { url, auth } = JSON.parse((await readFile(info)).toString());

    const db = drizzle(
        createClient({
            url,
            authToken: auth,
        })
    );

    console.log("Running migrations");

    await migrate(db, { migrationsFolder: "drizzle" });

    console.log("Migrated successfully");

    process.exit(0);
}

main().catch((e) => {
    console.error("Migration failed");
    console.error(e);
    process.exit(1);
});
