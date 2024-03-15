import { TrackSpline, type TrackPoint } from "./TrackSpline";
import type { Transitions } from "./Transitions";
import { FORWARD, RIGHT, UP, degToRad, radToDeg } from "./constants";
import { fvd } from "./fvd";
import {
    qrotate,
    quatidentity,
    vadd,
    vmul,
    type vec3,
    vsub,
    vlength,
    vec,
    degPerMToRadius,
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
    const point1 = spline.evaluate(pos);
    const point2 = spline.evaluate(pos + 0.01);

    if (!point1 || !point2) return undefined;

    const dist = vlength(vsub(point2.pos, point1.pos));

    const [yaw, pitch, roll] = euler(point1);
    const [yaw2, pitch2, roll2] = euler(point2);

    const pitchDelta = pitch2 - pitch;
    const yawDelta = yaw2 - yaw;

    const temp = Math.cos(radToDeg(Math.abs(pitch)));

    const normalDAngle = radToDeg(
        -pitchDelta * Math.cos(degToRad(roll)) -
            temp * yawDelta * Math.sin(degToRad(roll))
    );

    console.log(normalDAngle / dist);

    const lateralDAngle = radToDeg(
        pitchDelta * Math.sin(degToRad(roll)) -
            temp * yawDelta * Math.cos(degToRad(roll))
    );

    const lat = qrotate(RIGHT, point1.rot);
    const vert = qrotate(RIGHT, point1.rot);

    const normalDPerM = normalDAngle / dist;
    const lateralDPerM = normalDAngle / dist;

    const vel = point1.velocity;

    // console.log(normalDPerM, (vel * vel) / degPerMToRadius(normalDPerM));

    const forceVec = vadd(
        vec(0, 1, 0),
        vadd(
            vmul(vert, (vel * vel) / degPerMToRadius(normalDPerM)),
            vmul(lat, (vel * vel) / degPerMToRadius(lateralDPerM))
        )
    );

    return { vert: 1, lat: 0, roll: 0 };
}

export class Track {
    sections: TrackSection[] = [
        { type: "straight", length: 10, fixedSpeed: 5 },
    ];
    anchor: TrackPoint = {
        pos: [0, 10, 0],
        velocity: 10,
        rot: quatidentity,
        time: 0,
    };
    config: TrackConfig = defaultTrackConfig();

    constructor() {}

    getSpline(): TrackSpline {
        const splines = this.makeSplines();
        const points = splines.map((v) => v.points).flat(); // there might be a duplicate points bug here, look into that

        console.log(splines);
        const spline = new TrackSpline();
        spline.points = points;
        return spline;
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
