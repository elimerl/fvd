import { TrackSpline } from "$lib/core/TrackSpline.js";
import { db } from "$lib/server/db";
import { tracksTable, userTable } from "$lib/server/schema.js";
import { getTrackStats } from "$lib/stats.js";
import { error } from "@sveltejs/kit";
import { desc, eq, count } from "drizzle-orm";

const PAGE_SIZE = 25;

const get_spline =
    typeof process !== "undefined"
        ? (await import("@elimerl/fvd-rs")).get_spline
        : null;

export async function load(event) {
    const profileUser = await db.query.userTable.findFirst({
        where: eq(userTable.username, event.params.username),
    });

    if (!profileUser) {
        error(404);
    }

    const rowCount = await db
        .select({
            count: count(),
        })
        .from(tracksTable)
        .where(eq(tracksTable.userId, profileUser.id));

    const tracks = await db.query.tracksTable.findMany({
        where: eq(tracksTable.userId, profileUser.id),
        orderBy: [desc(tracksTable.createdAt)],
        limit: PAGE_SIZE,
        offset: event.url.searchParams.has("page")
            ? parseInt(event.url.searchParams.get("page")) * PAGE_SIZE
            : 0,
    });
    const stats = await Promise.all(
        tracks.map(
            async (track) =>
                await getTrackStats(track.id, track.trackJson, async (json) => {
                    if (event.platform.env.WASM_WORKER)
                        return TrackSpline.fromJSON(
                            await (
                                await event.platform.env.WASM_WORKER.fetch(
                                    "/",
                                    {
                                        method: "POST",
                                        body: json,
                                        headers: {
                                            "content-type": "application/json",
                                        },
                                    }
                                )
                            ).json()[0]
                        );
                    else
                        return TrackSpline.fromJSON(
                            JSON.parse(get_spline(json))[0]
                        );
                })
        )
    );

    return {
        count: rowCount[0].count,
        pageSize: PAGE_SIZE,
        user: profileUser,
        settings: event.locals.settings,
        tracks,
        stats,
    };
}
