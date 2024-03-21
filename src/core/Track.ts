import { TrackSpline, type TrackPoint } from "./TrackSpline";
import { Transitions } from "./Transitions";
import {
    FORWARD,
    G,
    RIGHT,
    UP,
    degDiff,
    degToRad,
    radToDeg,
} from "./constants";
import { fvd } from "./fvd";
import {
    qrotate,
    vadd,
    vmul,
    vsub,
    vlength,
    qidentity,
    vcross,
    vproject,
    qtwist,
    qangle,
    qinverse,
    qmul,
    vec,
    vdot,
    qtoaxisangle,
} from "./math";

export type TrackSection =
    | {
          type: "straight";
          length: number;
          fixedSpeed: number | undefined;
      }
    | {
          type: "force";
          fixedSpeed: number | undefined;
          transitions: Transitions;
      };

export interface Forces {
    vert: number;
    lat: number;
    roll: number;
}

export function forces(spline: TrackSpline, pos: number): Forces | undefined {
    const points = spline.evaluateNoInterpolation(pos);

    if (!points) return undefined;

    const [lastPoint, point] = points;

    const dist = vlength(vsub(point.pos, lastPoint.pos));

    const [lastYaw, lastPitch, lastRoll] = euler(lastPoint);

    const [yaw, pitch, roll] = euler(point);

    const pitchFromLast = degToRad(degDiff(lastPitch, pitch));
    const yawFromLast = degToRad(degDiff(lastYaw, yaw));

    const temp = Math.cos(degToRad(Math.abs(pitch)));

    const normalDAngle =
        -pitchFromLast * Math.cos(degToRad(-roll)) -
        temp * yawFromLast * Math.sin(degToRad(-roll));
    const lateralDAngle =
        pitchFromLast * Math.sin(degToRad(roll)) -
        temp * -yawFromLast * Math.cos(degToRad(roll));

    const forceVec = vadd(
        vec(0, 1, 0),
        vadd(
            vmul(
                qrotate(UP, point.rot),
                (point.velocity * point.velocity) / (dist / normalDAngle) / G
            ),
            vmul(
                qrotate(RIGHT, point.rot),
                (point.velocity * point.velocity) / (dist / lateralDAngle) / G
            )
        )
    );

    return {
        vert: vdot(forceVec, qrotate(UP, lastPoint.rot)),
        lat: vdot(forceVec, qrotate(RIGHT, lastPoint.rot)),
        roll: 0,
    };
}

export class Track {
    sections: TrackSection[] = [
        { type: "straight", length: 10, fixedSpeed: 5 },
    ];

    config: TrackConfig = defaultTrackConfig();

    static fromJSON(json: any): Track {
        const track = new Track();
        track.sections = json.sections;
        track.sections = track.sections.map((section) => {
            if (section.type === "straight") {
                return {
                    type: "straight",
                    length: section.length,
                    fixedSpeed: section.fixedSpeed,
                };
            } else if (section.type === "force") {
                return {
                    type: "force",
                    fixedSpeed: section.fixedSpeed,
                    transitions: Transitions.fromJSON(section.transitions),
                };
            } else {
                throw new Error("Invalid section type");
            }
        });
        track.config = json.config;
        track.anchor = json.anchor;
        return track;
    }

    constructor(
        public anchor: TrackPoint = {
            pos: [0, 10, 0],
            velocity: 10,
            rot: qidentity(),
            time: 0,
        }
    ) {}

    getSpline(): { spline: TrackSpline; sectionStartPos: number[] } {
        const splines = this.makeSplines();

        const sectionStartPos = [];
        let lenAccum = 0;
        splines.forEach((v) => {
            sectionStartPos.push(lenAccum);
            lenAccum += v.getLength();
        });
        sectionStartPos.push(lenAccum);

        const points = splines.map((v) => v.points).flat(); // there might be a duplicate points bug here, look into that

        const spline = new TrackSpline();
        spline.points = points;
        return { spline, sectionStartPos };
    }

    private makeSplines(): TrackSpline[] {
        const splines: TrackSpline[] = [];

        const initialPoint = this.anchor;

        let startForces: Forces = { vert: 1, lat: 0, roll: 0 };

        this.sections.forEach((section) => {
            if (splines.length === 0) {
                splines.push(
                    this.makeSpline(
                        section,
                        { ...initialPoint },
                        startForces,
                        this.config
                    )
                );
            } else {
                const point =
                    splines[splines.length - 1].points[
                        splines[splines.length - 1].points.length - 1
                    ];
                splines.push(
                    this.makeSpline(
                        section,
                        {
                            ...point,
                        },
                        startForces,
                        this.config
                    )
                );
            }
            startForces = forces(
                splines[splines.length - 1],
                splines[splines.length - 1].getLength() - 0.02
            )!;
        });

        return splines;
    }

    private makeSpline(
        section: TrackSection,
        start: TrackPoint,
        startForces: Forces,
        config: TrackConfig
    ): TrackSpline {
        let spline = new TrackSpline();

        if (section.type === "straight") {
            const dp = 0.01;
            let pos = start.pos;
            let velocity = section.fixedSpeed;
            if (!section.fixedSpeed)
                throw new Error("TODO friction on straight track");

            for (let d = 0; d <= section.length; d += dp) {
                pos = vadd(pos, qrotate(vmul(FORWARD, dp), start.rot));
                velocity = section.fixedSpeed;
                spline.points.push({
                    pos,
                    rot: start.rot,
                    velocity,
                    time: d / velocity + start.time,
                });
            }
        } else if (section.type === "force") {
            spline = fvd(
                section.transitions,
                { ...start },
                this.config,
                startForces
            );
        }

        return spline;
    }

    exportToNl2Elem(): string {
        return this.getSpline().spline.exportToNl2Elem();
    }
}

export type TrackConfig = {
    parameter: number;
    resistance: number;

    heartlineHeight: number;
};

export function defaultTrackConfig(): TrackConfig {
    return { parameter: 0.03, resistance: 1e-5, heartlineHeight: 1.1 };
}

export function euler(p: TrackPoint): [number, number, number] {
    const dir = qrotate(FORWARD, p.rot);
    const yaw = radToDeg(Math.atan2(-dir[0], -dir[2]));
    const pitch = radToDeg(
        Math.atan2(dir[1], Math.sqrt(dir[0] * dir[0] + dir[2] * dir[2]))
    );

    const upDir = qrotate(UP, p.rot);
    const rightDir = qrotate(RIGHT, p.rot);

    const roll = radToDeg(Math.atan2(rightDir[1], -upDir[1]));
    return [yaw, pitch, roll];
}
