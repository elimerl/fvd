import { db } from "$lib/server/db";
import { tracksTable } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export async function load(event) {
    const track = await db.query.tracksTable.findFirst({
        where: eq(tracksTable.id, parseInt(event.params.id)),
    });

    if (!track) {
        return error(404);
    }

    return { track, user: event.locals.user, settings: event.locals.settings };
}
