import {
    type quaternion,
    type vec3,
    qrotate,
    vsub,
    vlength,
    qslerp,
    vlerp,
    vmul,
    lerp,
} from "./math";

export interface TrackPoint {
    pos: vec3;
    rot: quaternion;
    velocity: number;
    time: number;
}

const EXPORT_INTERVAL = 2;

// Number of Hermite sub-samples per raw spline segment for the arc-length table.
// 100 samples per segment gives sub-millimeter precision at 1m spacing.
const ARC_SAMPLES_PER_SEGMENT = 100;

interface ArcTableEntry {
    arcLength: number;
    pos: vec3;
    rot: quaternion;
    velocity: number;
    time: number;
}

function hermitePos(
    p0: vec3,
    m0: vec3,
    p1: vec3,
    m1: vec3,
    t: number
): vec3 {
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return [
        h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0],
        h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1],
        h00 * p0[2] + h10 * m0[2] + h01 * p1[2] + h11 * m1[2],
    ];
}

export class TrackSpline {
    static fromJSON(v: any): TrackSpline {
        const spline = new TrackSpline();
        spline.points = v.points;
        return spline;
    }
    points: TrackPoint[] = [];
    private _arcTable: ArcTableEntry[] | null = null;

    private buildArcLengthTable(): ArcTableEntry[] {
        const table: ArcTableEntry[] = [];
        let totalArcLength = 0;

        const first = this.points[0];
        table.push({
            arcLength: 0,
            pos: first.pos,
            rot: first.rot,
            velocity: first.velocity,
            time: first.time,
        });

        const n = this.points.length;
        for (let i = 0; i < n - 1; i++) {
            const p0 = this.points[i];
            const p1 = this.points[i + 1];
            // Scale tangent by chord length — standard Hermite parameterization.
            // qrotate([0,0,1], rot) gives the track's local forward direction in world space.
            const chordDist = vlength(vsub(p1.pos, p0.pos));
            const m0 = vmul(qrotate([0, 0, 1], p0.rot), chordDist);
            const m1 = vmul(qrotate([0, 0, 1], p1.rot), chordDist);

            let prevPos = p0.pos;
            for (let s = 1; s <= ARC_SAMPLES_PER_SEGMENT; s++) {
                const t = s / ARC_SAMPLES_PER_SEGMENT;
                const pos = hermitePos(p0.pos, m0, p1.pos, m1, t);
                totalArcLength += vlength(vsub(pos, prevPos));
                prevPos = pos;

                table.push({
                    arcLength: totalArcLength,
                    pos,
                    rot: qslerp(p0.rot, p1.rot, t),
                    velocity: lerp(p0.velocity, p1.velocity, t),
                    time: lerp(p0.time, p1.time, t),
                });
            }
        }

        return table;
    }

    private getArcTable(): ArcTableEntry[] {
        if (!this._arcTable) {
            this._arcTable = this.buildArcLengthTable();
        }
        return this._arcTable;
    }

    getLength(): number {
        const table = this.getArcTable();
        return table[table.length - 1].arcLength;
    }

    evaluate(distance: number): TrackPoint | undefined {
        const table = this.getArcTable();
        const totalLength = table[table.length - 1].arcLength;

        if (distance <= 0) {
            const e = table[0];
            return { pos: e.pos, rot: e.rot, velocity: e.velocity, time: e.time };
        }
        if (distance >= totalLength) {
            const e = table[table.length - 1];
            return { pos: e.pos, rot: e.rot, velocity: e.velocity, time: e.time };
        }

        // Binary search for the bracketing entries
        let lo = 0,
            hi = table.length - 1;
        while (lo < hi - 1) {
            const mid = (lo + hi) >> 1;
            if (table[mid].arcLength <= distance) lo = mid;
            else hi = mid;
        }

        const e0 = table[lo];
        const e1 = table[hi];
        const alpha = (distance - e0.arcLength) / (e1.arcLength - e0.arcLength);

        return {
            pos: vlerp(e0.pos, e1.pos, alpha),
            rot: qslerp(e0.rot, e1.rot, alpha),
            velocity: lerp(e0.velocity, e1.velocity, alpha),
            time: lerp(e0.time, e1.time, alpha),
        };
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
        const totalLength = this.getLength();

        if (interval <= 0) {
            // Return start and end only for degenerate interval
            return startAndEnd
                ? [
                      { point: { ...this.points[0] }, dist: 0 },
                      {
                          point: { ...this.points[this.points.length - 1] },
                          dist: totalLength,
                      },
                  ]
                : [];
        }

        const result: { point: TrackPoint; dist: number }[] = [];

        if (startAndEnd) {
            result.push({ point: { ...this.points[0] }, dist: 0 });
        }

        for (let d = interval; d < totalLength; d += interval) {
            const p = this.evaluate(d);
            if (p) result.push({ point: p, dist: d });
        }

        if (startAndEnd) {
            result.push({
                point: { ...this.points[this.points.length - 1] },
                dist: totalLength,
            });
        }

        return result;
    }

    exportToNl2Elem(): string {
        const exportPoints = this.intervalPoints(EXPORT_INTERVAL);

        let output = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><root><element><description>forcevector.app exported spline</description>`;

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
