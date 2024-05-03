import { xxhash64 } from "hash-wasm";
import { db } from "./server/db";
import { eq } from "drizzle-orm";
import { trackStatsTable } from "./server/schema";
import { Track } from "./core/Track";
import * as _ from "lodash-es";

interface TrackStats {
    length: number;
    height: number;
    topSpeed: number;
}
export async function getTrackStats(
    trackId: number,
    trackJSON: string
): Promise<TrackStats> {
    const hash = await xxhash64(trackJSON);
    const dbStats = await db.query.trackStatsTable.findFirst({
        where: eq(trackStatsTable.trackId, trackId),
    });

    if (dbStats && dbStats.trackJsonHash === hash) {
        return {
            height: parseFloat(dbStats.height),
            length: parseFloat(dbStats.length),
            topSpeed: parseFloat(dbStats.topSpeed),
        };
    } else {
        const stats = await calculateTrackStats(trackJSON);

        if (dbStats) {
            await db
                .update(trackStatsTable)
                .set({
                    trackId,
                    trackJsonHash: hash,
                    length: stats.length.toString(),
                    height: stats.height.toString(),
                    topSpeed: stats.topSpeed.toString(),
                })
                .where(eq(trackStatsTable.trackId, trackId))
                .run();
            return stats;
        } else {
            await db
                .insert(trackStatsTable)
                .values({
                    trackId,
                    trackJsonHash: hash,
                    length: stats.length.toString(),
                    height: stats.height.toString(),
                    topSpeed: stats.topSpeed.toString(),
                })
                .run();
        }
    }
}

function calculateTrackStats(trackJSON: string): TrackStats {
    const { spline } = Track.fromJSON(JSON.parse(trackJSON)).getSpline();
    const pointsY = spline.points.map((v) => v.pos[1]);
    const height = _.max(pointsY) - _.min(pointsY);
    return {
        length: spline.getLength(),
        height,
        topSpeed: _.maxBy(spline.points, (v) => v.velocity)?.velocity || 0,
    };
}
