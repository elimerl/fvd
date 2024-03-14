import { G, UP, FORWARD, GRAVITY, RIGHT, DOWN } from "./constants";
import {
    type quaternion,
    type vec3,
    vproject as vproject,
    quatidentity,
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
const DT = 0.01; // Assuming a fixed time step, you can adjust this as needed

export function fvd(
    transitions: Transitions,
    start: TrackPoint,
    config: TrackConfig,
    startForces: Forces
): TrackSpline {
    const spline = new TrackSpline();
    const pointEnergies: number[] = [];
    let velocity = start.velocity;
    let pos = start.pos;
    let traveled = 0;
    let direction: quaternion = start.rot;
    let time = 0;

    while (time < transitions.length()) {
        const deltaLength = DT * velocity;
        const transition = transitions.evaluate(time, startForces);

        if (transition) {
            const { vert, lat, roll } = transition;

            // velocity = fixed_speed !== undefined ? fixed_speed : velocity;

            let new_dir = direction;

            const linear_accel = vadd(
                vmul(qrotate(UP, direction), -vert * G),
                vmul(qrotate(RIGHT, direction), -lat * G)
            );
            const remainder_accel = vsub(GRAVITY, linear_accel);
            const forward_accel = vproject(
                remainder_accel,
                qrotate(FORWARD, direction)
            );
            const centripetal_accel = vsub(remainder_accel, forward_accel);

            if (vlengthsquared(centripetal_accel) > EPSILON) {
                const axis = vnormalize(
                    vcross(qrotate(FORWARD, direction), centripetal_accel)
                );
                const radius =
                    (velocity * velocity) / vlength(centripetal_accel);
                const angle = deltaLength / radius;
                const rel_rot = qaxisangle(axis, angle);
                new_dir = qmul(rel_rot, new_dir);
            }

            const rel_rot = qaxisangle(
                vnormalize(qrotate(FORWARD, direction)),
                roll * (Math.PI / 180) * DT
            );
            new_dir = qmul(rel_rot, new_dir);

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
                        vlength(vsub(trackPosFriction, lastTrackPosFriction)) *
                            config.parameter) *
                        G)
        );

        spline.points.push({
            pos,
            rot: direction,
            velocity,
            time: time + start.time,
        });

        time += DT;
        traveled += deltaLength;

        pointEnergies.push(energy);
    }

    return spline;
}
