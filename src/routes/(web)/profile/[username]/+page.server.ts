import { db } from "$lib/server/db";
import { tracksTable, userTable } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";
import { desc, eq } from "drizzle-orm";

export async function load(event) {
    const profileUser = await db.query.userTable.findFirst({
        where: eq(userTable.username, event.params.username),
    });

    if (!profileUser) {
        error(404);
    }

    const tracks = await db.query.tracksTable.findMany({
        where: eq(tracksTable.userId, profileUser.id),
        orderBy: [desc(tracksTable.createdAt)],
    });
    return { user: profileUser, settings: event.locals.settings, tracks };
}
