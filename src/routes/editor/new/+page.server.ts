import { Track } from "$lib/core/Track.js";
import { db } from "$lib/server/db.js";
import { tracksTable } from "$lib/server/schema.js";
import { redirect } from "@sveltejs/kit";

export async function load(event) {
    const user = event.locals.user;
    if (!user) {
        return redirect(302, "/");
    }

    const track = await db
        .insert(tracksTable)
        .values({
            name: "untitled track",
            description: "",
            trackJson: JSON.stringify(new Track()),
            userId: user.id,
        })
        .returning();

    return {};
}
