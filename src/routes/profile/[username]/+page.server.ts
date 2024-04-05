import { db } from "$lib/server/db";
import { tracksTable, userTable } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";
import { desc, eq } from "drizzle-orm";

export async function load(event) {
    const user = await db.query.userTable.findFirst({
        where: eq(userTable.username, event.params.username),
    });

    if (!user) {
        error(404);
    }

    const tracks = await db.query.tracksTable.findMany({
        where: eq(tracksTable.userId, user.id),
        orderBy: [desc(tracksTable.createdAt)],
    });

    return { user, settings: event.locals.settings, tracks };
}
