import { db } from "$lib/server/db";
import { tracksTable } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export async function load(event) {
    const track = await db.query.tracksTable.findFirst({
        where: eq(tracksTable.id, parseInt(event.params.id)),
    });

    if (!track) {
        error(404, {
            message: "Not found",
        });
    }

    return { track, settings: event.locals.settings };
}