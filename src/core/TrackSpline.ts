import { RIGHT, UP, metersToFeet } from "./constants";
import {
    type quaternion,
    type vec3,
    qrotate,
    vsub,
    vlength,
    qslerp,
    vlerp,
    lerp,
} from "./math";

export interface TrackPoint {
    pos: vec3;
    rot: quaternion;
    velocity: number;
    time: number;
}

// export point interval in meters
const EXPORT_INTERVAL = 2;
export class TrackSpline {
    points: TrackPoint[] = [];

    getLength(): number {
        let length = 0;
        let lastPoint = this.points[0];

        this.points.slice(1).forEach((v) => {
            length += vlength(vsub(v.pos, lastPoint.pos));
            lastPoint = v;
        });

        return length;
    }

    evaluate(distance: number): TrackPoint | undefined {
        let totalDistance = 0;

        for (let i = 1; i < this.points.length; i++) {
            const prevPoint = this.points[i - 1];
            const currPoint = this.points[i];
            const segmentLength = vlength(vsub(currPoint.pos, prevPoint.pos));
            if (totalDistance + segmentLength >= distance) {
                const t = (distance - totalDistance) / segmentLength;
                const interpolatedPos = vlerp(prevPoint.pos, currPoint.pos, t);
                const interpolatedRot = qslerp(prevPoint.rot, currPoint.rot, t);
                return {
                    pos: interpolatedPos,
                    rot: interpolatedRot,
                    velocity: lerp(prevPoint.velocity, currPoint.velocity, t),
                    time: lerp(prevPoint.time, currPoint.time, t),
                };
            }

            totalDistance += segmentLength;
        }

        return undefined;
    }

    evaluateNoInterpolation(
        distance: number
    ): [TrackPoint, TrackPoint] | undefined {
        let totalDistance = 0;

        for (let i = 1; i < this.points.length; i++) {
            const prevPoint = this.points[i - 1];
            const currPoint = this.points[i];
            const segmentLength = vlength(vsub(currPoint.pos, prevPoint.pos));
            if (totalDistance + segmentLength >= distance) {
                return [prevPoint, currPoint];
            }

            totalDistance += segmentLength;
        }

        return undefined;
    }

    intervalPoints(interval: number): TrackPoint[] {
        const points: TrackPoint[] = [];
        let intervalAccum = Infinity;
        let lastPoint = this.points[0];

        this.points.forEach((p) => {
            const distance = vlength(vsub(p.pos, lastPoint.pos));
            intervalAccum += distance;

            if (intervalAccum > interval) {
                intervalAccum = 0;
                points.push({
                    ...p,
                });
            }

            lastPoint = p;
        });

        return points;
    }

    exportToNl2Elem(): string {
        const exportPoints = this.intervalPoints(EXPORT_INTERVAL);

        let output = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><root><element><description>fvd.elidavies.com exported data</description>`;

        exportPoints.forEach((p, i) => {
            const isStrict = i === 0 || i === exportPoints.length - 1;
            output += `<vertex><x>${p.pos[0].toFixed(
                3
            )}</x><y>${p.pos[1].toFixed(3)}</y><z>${p.pos[2].toFixed(
                3
            )}</z><strict>${isStrict}</strict></vertex>`;
        });

        let totalLength = 0;

        {
            let lastPoint = this.points[0];

            exportPoints.slice(1).forEach((v) => {
                totalLength += vlength(vsub(v.pos, lastPoint.pos));
                lastPoint = v;
            });
        }

        let lastPoint = exportPoints[0];
        let currentLength = 0;

        exportPoints.forEach((p) => {
            currentLength += vlength(vsub(p.pos, lastPoint.pos));

            lastPoint = p;
            const up = qrotate(UP, p.rot);
            const right = qrotate(RIGHT, p.rot);

            output += `<roll><ux>${up[0].toFixed(5)}</ux><uy>${up[1].toFixed(
                5
            )}</uy><uz>${up[2].toFixed(5)}</uz><rx>${right[0].toFixed(
                5
            )}</rx><ry>${right[1].toFixed(5)}</ry><rz>${right[2].toFixed(
                5
            )}</rz><coord>${(currentLength / totalLength).toFixed(
                6
            )}</coord></roll>`;
        });

        output += "</element></root>";
        return output;
    }
}
