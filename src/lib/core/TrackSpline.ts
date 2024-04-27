import { RIGHT, UP } from "./constants";
import {
    type quaternion,
    type vec3,
    qrotate,
    vsub,
    vlength,
    qslerp,
    vlerp,
    lerp,
    vcross,
} from "./math";

export interface TrackPoint {
    pos: vec3;
    rot: quaternion;
    velocity: number;
    time: number;
}

// export point interval in meters
const EXPORT_INTERVAL = 1;
export class TrackSpline {
    static fromJSON(v: any): TrackSpline {
        const spline = new TrackSpline();
        spline.points = v.points;
        return spline;
    }
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

    intervalPoints(
        interval: number,
        startAndEnd: boolean = true
    ): { point: TrackPoint; dist: number }[] {
        const points: { point: TrackPoint; dist: number }[] = startAndEnd
            ? [{ point: { ...this.points[0] }, dist: 0 }]
            : [];
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
        if (startAndEnd)
            points.push({
                point: { ...this.points[this.points.length - 1] },
                dist: intervalAccum,
            });

        return points;
    }

    exportToNl2Elem(): string {
        const exportPoints = this.intervalPoints(EXPORT_INTERVAL);

        let output = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><root><element><description>forcevector.app exported spline</description>`;

        const maxHeight = exportPoints.reduce(
            (max, p) => Math.max(max, p.point.pos[1]),
            0
        );

        exportPoints.forEach((p, i) => {
            const isStrict = i === 0 || i === exportPoints.length - 1;
            output += `<vertex><x>${p.point.pos[0].toExponential()}</x><y>${p.point.pos[1].toExponential()}</y><z>${p.point.pos[2].toExponential()}</z><strict>${isStrict}</strict></vertex>`;
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
            currentLength += vlength(vsub(p.point.pos, lastPoint.point.pos));

            lastPoint = p;
            const up = qrotate([0, 1, 0], p.point.rot);
            const right = qrotate([-1, 0, 0], p.point.rot);

            output += `<roll><ux>${up[0].toExponential()}</ux><uy>${up[1].toExponential()}</uy><uz>${up[2].toExponential()}</uz><rx>${right[0].toExponential()}</rx><ry>${right[1].toExponential()}</ry><rz>${right[2].toExponential()}</rz><coord>${(
                currentLength / totalLength
            ).toExponential()}</coord><strict>false</strict></roll>`;
        });

        output += "</element></root>";
        return output;
    }
}
