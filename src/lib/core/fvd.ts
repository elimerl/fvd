import { G, UP, FORWARD, RIGHT, DOWN, degToRad } from "./constants";
import {
    type quaternion,
    type vec3,
    vproject as vproject,
    vadd,
    vmul,
    vsub,
    qrotate,
    vnormalize,
    vcross,
    vlengthsquared,
    vlength,
    qaxisangle,
    qmul,
    qnormalize,
    vec,
    vdot,
} from "./math";
import type { Forces, TrackConfig } from "./Track";
import { TrackSpline, type TrackPoint } from "./TrackSpline";
import { Transitions } from "./Transitions";

// const G = 9.80665;
// const UP = new THREE.Vector3(0, 1, 0);
// const RIGHT = new THREE.Vector3(-1, 0, 0);
// const FORWARD = new THREE.Vector3(0, 0, 1);
// const GRAVITY = new THREE.Vector3(0, -G, 0);

const EPSILON = 0.0001;
const DT = 0.001;

export function fvd(
    transitions: Transitions,
    start: TrackPoint,
    config: TrackConfig,
    startForces: Forces,
    fixedSpeed: number | undefined
): TrackSpline {
    const spline = new TrackSpline();
    let velocity = fixedSpeed ?? start.velocity;
    let pos = start.pos;
    let traveled = 0;
    let direction: quaternion = start.rot;
    let time = 0;

    while (time < transitions.length()) {
        const deltaLength = DT * velocity;
        const transition = transitions.evaluate(time, startForces);

        if (transition) {
            const { vert, lat, roll: rollSpeed } = transition;

            let new_dir = direction;

            if (Math.abs(rollSpeed) > 0.01) {
                new_dir = qmul(
                    qaxisangle(
                        qrotate(FORWARD, new_dir),
                        degToRad(rollSpeed) * DT
                    ),
                    new_dir
                );
            }
            const forceVec = vadd(
                vec(0, 1, 0),
                vadd(
                    vmul(vnormalize(qrotate(UP, new_dir)), -vert),
                    vmul(vnormalize(qrotate(RIGHT, new_dir)), -lat)
                )
            );

            const normalForce =
                -vdot(forceVec, vnormalize(qrotate(UP, new_dir))) * G;
            const lateralForce =
                -vdot(forceVec, vnormalize(qrotate(RIGHT, new_dir))) * G;

            const vel = velocity;

            new_dir = qmul(
                qmul(
                    qaxisangle(
                        qrotate(RIGHT, new_dir),
                        (normalForce / vel) * DT
                    ),
                    qaxisangle(qrotate(UP, new_dir), -(lateralForce / vel) * DT)
                ),
                new_dir
            );

            direction = qnormalize(new_dir);

            pos = vadd(pos, vmul(qrotate(FORWARD, direction), deltaLength));
        } else {
            break;
        }

        const trackPosFriction = vadd(
            pos,
            qrotate(vmul(DOWN, config.heartlineHeight * 0.9), direction)
        );

        const lastTrackPosFriction =
            spline.points.length === 0
                ? trackPosFriction
                : vadd(
                      spline.points[spline.points.length - 1].pos,
                      qrotate(
                          vmul(DOWN, config.heartlineHeight * 0.9),
                          spline.points[spline.points.length - 1].rot
                      )
                  );

        if (fixedSpeed === undefined) {
            let energy = 0.5 * velocity * velocity;

            energy -= velocity * velocity * velocity * DT * config.resistance;

            if (
                energy -
                    (trackPosFriction[1] -
                        lastTrackPosFriction[1] +
                        vlength(vsub(trackPosFriction, lastTrackPosFriction)) *
                            config.parameter) *
                        G <=
                0
            )
                break;

            velocity = Math.sqrt(
                2 *
                    (energy -
                        (trackPosFriction[1] -
                            lastTrackPosFriction[1] +
                            vlength(
                                vsub(trackPosFriction, lastTrackPosFriction)
                            ) *
                                config.parameter) *
                            G)
            );
        }

        spline.points.push({
            pos,
            rot: direction,
            velocity,
            time: time + start.time,
        });

        time += DT;
        traveled += deltaLength;
    }

    return spline;
}
