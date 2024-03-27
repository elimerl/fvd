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

    intervalPoints(interval: number): { point: TrackPoint; dist: number }[] {
        const points: { point: TrackPoint; dist: number }[] = [
            { point: { ...this.points[0] }, dist: 0 },
        ];
        let intervalAccum = Infinity;
        let lastPoint = this.points[0];
        let distAccum = 0;

        this.points.forEach((p) => {
            const distance = vlength(vsub(p.pos, lastPoint.pos));
            intervalAccum += distance;
            distAccum += distance;

            if (intervalAccum > interval) {
                intervalAccum = 0;
                points.push({
                    point: {
                        ...p,
                    },
                    dist: distAccum,
                });
            }

            lastPoint = p;
        });

        points.push({
            point: { ...this.points[this.points.length - 1] },
            dist: intervalAccum,
        });

        return points;
    }

    exportToNl2Elem(): string {
        const exportPoints = this.intervalPoints(EXPORT_INTERVAL);

        let output = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><root><element><description>fvd.elidavies.com exported data</description>`;

        const maxHeight = exportPoints.reduce(
            (max, p) => Math.max(max, p.point.pos[1]),
            0
        );

        exportPoints.forEach((p, i) => {
            const isStrict = i === 0 || i === exportPoints.length - 1;
            output += `<vertex><x>${p.point.pos[0].toFixed(
                5
            )}</x><y>${p.point.pos[1].toFixed(
                5
            )}</y><z>${p.point.pos[2].toFixed(
                5
            )}</z><strict>${isStrict}</strict></vertex>`;
        });

        let totalLength = 0;

        {
            let lastPoint = this.points[0];

            exportPoints.slice(1).forEach((v) => {
                totalLength += vlength(vsub(v.point.pos, lastPoint.pos));
                lastPoint = v.point;
            });
        }

        let lastPoint = exportPoints[0];
        let currentLength = 0;

        exportPoints.forEach((p) => {
            currentLength += vlength(vsub(p.point.pos, p.point.pos));

            lastPoint = p;
            const up = qrotate(UP, p.point.rot);
            const right = qrotate(RIGHT, p.point.rot);

            output += `<roll><ux>${up[0].toFixed(7)}</ux><uy>${up[1].toFixed(
                7
            )}</uy><uz>${up[2].toFixed(7)}</uz><rx>${right[0].toFixed(
                7
            )}</rx><ry>${right[1].toFixed(7)}</ry><rz>${right[2].toFixed(
                7
            )}</rz><coord>${(currentLength / totalLength).toFixed(
                9
            )}</coord></roll>`;
        });

        output += "</element></root>";
        return output;
    }
}
