import { db } from "$lib/server/db.js";
import { tracksTable } from "$lib/server/schema.js";
import { eq } from "drizzle-orm";

export async function PUT({ request, locals }) {
    const data = await request.json();
    const user = locals.user;
    if (!user) {
        return new Response(null, { status: 401 });
    }
    const currentTrack = await db.query.tracksTable.findFirst({
        where: eq(tracksTable.id, data.id),
    });
    if (currentTrack.userId === user.id) {
        await db
            .update(tracksTable)
            .set(data)
            .where(eq(tracksTable.id, data.id));
        return new Response(null, { status: 200 });
    } else {
        return new Response(null, { status: 401 });
    }
}
