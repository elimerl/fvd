import _ from "lodash-es";
import type { Forces } from "./Track";
export enum TransitionCurve {
    Linear = "linear",
    Quadratic = "quadratic",
    Cubic = "cubic",
    Plateau = "plateau",
    Sinusoidal = "sinusoidal",
    QuarticBump = "quartic-bump",
}

export const curveTypes = [
    TransitionCurve.Linear,
    TransitionCurve.Quadratic,
    TransitionCurve.Cubic,
    TransitionCurve.Plateau,
    TransitionCurve.Sinusoidal,
    TransitionCurve.QuarticBump,
];

export function fixAngleRange(angle: number) {
    const full = Math.floor(angle / 360);
    let v = angle - full * 360;
    if (v > 180) {
        v -= 360;
    } else if (v < -180) {
        v += 360;
    }
    return v;
}

export function evalTransition(transition: Transition, t: number) {
    return (
        evalCurve(
            transition.curve,
            timewarp(
                t / transition.length,
                transition.center,
                transition.tension
            )
        ) * transition.value
    );
}
export function evalCurve(curve: TransitionCurve, t: number) {
    t = _.clamp(t, 0, 1);

    switch (curve) {
        case TransitionCurve.Linear:
            return t;
        case TransitionCurve.Cubic:
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        case TransitionCurve.Quadratic:
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        case TransitionCurve.Plateau:
            return 1 - Math.exp(-15 * Math.pow(1 - Math.abs(2 * t - 1), 3));
        case TransitionCurve.Sinusoidal:
            return 0.5 * (1 - Math.cos(Math.PI * t));
        case TransitionCurve.QuarticBump:
            return t * t * (16 + t * (-32 + t * 16));
    }
}
// export function evalCurveDerivative(curve: TransitionCurve, t: number) {
//     t = _.clamp(t, 0, 1);

//     switch (curve) {
//         case TransitionCurve.Linear:
//             return t;
//         case TransitionCurve.Cubic:
//             return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
//         case TransitionCurve.Quadratic:
//             return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
//         case TransitionCurve.Plateau:
//             return (-90* Math.exp(15* (-1 + Math.abs(1 - 2 *t))^3)*(-1 + 2 *t)* (-1 + Math.abs(1 - 2 *t))^2)/Math.abs(1 - 2* t);
//     }
// }

export function timewarp(t: number, center: number, tension: number) {
    return timewarpTension(timewarpCenter(t, center), tension);
}

function timewarpCenter(t: number, center: number) {
    if (Math.abs(center) < 0.01) {
        return t;
    } else if (center > 0) {
        return Math.pow(t, Math.pow(2, center / 2));
    } else {
        return 1 - Math.pow(1 - t, Math.pow(2, -center / 2));
    }
}
function timewarpTension(t: number, tension: number) {
    if (Math.abs(tension) < 0.01) {
        return t;
    } else if (tension > 0) {
        return (
            0.5 * (Math.sinh(2 * tension * (t - 0.5)) / Math.sinh(tension) + 1)
        );
    } else {
        return (
            0.5 * (Math.asinh(2 * Math.sinh(tension) * (t - 0.5)) / tension + 1)
        );
    }
}

// Rewrite  all of this to use a sorted BTree, very good implementation in https://github.com/qwertie/btree-typescript

export function transitionsLength(transitions: Transition[]) {
    let length = 0;

    for (const transition of transitions) {
        length += transition.length;
    }
    return length;
}

export function transitionsEvaluate(
    transitions: Transition[],
    t: number,
    start: number
): number | undefined {
    if (t < 0 || t >= transitionsLength(transitions)) return undefined;
    let value = start;
    let timeAccum = 0;
    for (const transition of transitions) {
        if (timeAccum <= t && t <= timeAccum + transition.length) {
            value += evalTransition(transition, t - timeAccum);
            break;
        }

        value += evalCurve(transition.curve, 1) * transition.value;

        timeAccum += transition.length;
    }
    return value;
}
export function transitionsGetAtT(
    transitions: Transition[],
    t: number
): Transition | undefined {
    if (t < 0 || t >= transitionsLength(transitions)) return undefined;
    let timeAccum = 0;
    for (const transition of transitions) {
        if (timeAccum <= t && t <= timeAccum + transition.length) {
            return transition;
            break;
        }

        timeAccum += transition.length;
    }
    return undefined;
}

export interface Transition {
    curve: TransitionCurve;
    value: number;
    length: number;
    center: number;
    tension: number;
    dynamicLength: boolean;
}

export function isTransitionZero(transition: Transition) {
    return transition.value === 0;
}

export class Transitions {
    vert: Transition[] = [
        {
            curve: TransitionCurve.Cubic,
            value: 0,
            length: 1,
            center: 0,
            tension: 0,
            dynamicLength: false,
        },
    ];
    lat: Transition[] = [
        {
            curve: TransitionCurve.Cubic,
            value: 0,
            length: 1,
            center: 0,
            tension: 0,
            dynamicLength: true,
        },
    ];
    roll: Transition[] = [
        {
            curve: TransitionCurve.Plateau,
            value: 0,
            length: 1,
            center: 0,
            tension: 0,
            dynamicLength: false,
        },
    ];

    constructor() {}

    static fromJSON(parse: any): Transitions {
        const transitions: Transitions = Object.assign(
            new Transitions(),
            parse
        );

        // migrate from old files
        transitions.vert.forEach((t) => {
            if (!t.center) t.center = 0;
        });
        transitions.lat.forEach((t) => {
            if (!t.center) t.center = 0;
        });
        transitions.roll.forEach((t) => {
            if (!t.center) t.center = 0;
        });
        return transitions;
    }

    length(): number {
        return Math.min(
            _.sumBy(this.vert, (v) => v.length),
            _.sumBy(this.lat, (v) => v.length),
            _.sumBy(this.roll, (v) => v.length)
        );
    }

    updateDynamicLengths() {
        let alreadyDynamic = false;
        for (const transition of this.vert) {
            if (transition.dynamicLength && !alreadyDynamic) {
                transition.length = Math.min(
                    _.sumBy(this.roll, (v) =>
                        v.dynamicLength ? Infinity : v.length
                    ),
                    _.sumBy(this.lat, (v) =>
                        v.dynamicLength ? Infinity : v.length
                    )
                );
                alreadyDynamic = true;
            }
        }
        alreadyDynamic = false;
        for (const transition of this.lat) {
            if (transition.dynamicLength && !alreadyDynamic) {
                transition.length = Math.min(
                    _.sumBy(this.roll, (v) =>
                        v.dynamicLength ? Infinity : v.length
                    ),
                    _.sumBy(this.vert, (v) =>
                        v.dynamicLength ? Infinity : v.length
                    )
                );
                alreadyDynamic = true;
            }
        }
        alreadyDynamic = false;
        for (const transition of this.roll) {
            if (transition.dynamicLength && !alreadyDynamic) {
                transition.length = Math.min(
                    _.sumBy(this.lat, (v) =>
                        v.dynamicLength ? Infinity : v.length
                    ),
                    _.sumBy(this.vert, (v) =>
                        v.dynamicLength ? Infinity : v.length
                    )
                );
                alreadyDynamic = true;
            }
        }
    }

    evaluate(
        t: number,
        startForces: Forces
    ): { vert: number; lat: number; roll: number } | undefined {
        if (t < 0) {
            return undefined;
        }
        const vertValue = transitionsEvaluate(this.vert, t, startForces.vert);
        const latValue = transitionsEvaluate(this.lat, t, startForces.lat);
        const rollValue = transitionsEvaluate(this.roll, t, startForces.roll);
        if (
            vertValue === undefined ||
            latValue === undefined ||
            rollValue === undefined
        )
            return undefined;

        return { vert: vertValue, lat: latValue, roll: rollValue };
    }
}
