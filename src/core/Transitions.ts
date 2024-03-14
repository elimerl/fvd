import _ from "lodash-es";
import type { Forces } from "./Track";
export enum TransitionCurve {
    Linear = "linear",
    Quadratic = "quadratic",
    Cubic = "cubic",
    Plateau = "plateau",
    QuarticBump = "quartic-bump",
}

export const curveTypes = [
    TransitionCurve.Linear,
    TransitionCurve.Quadratic,
    TransitionCurve.Cubic,
    TransitionCurve.Plateau,
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
            timewarp(t / transition.length, transition.tension)
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

export function timewarp(t: number, tension: number) {
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
    tension: number;
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
            tension: 0,
        },
    ];
    lat: Transition[] = [
        {
            curve: TransitionCurve.Cubic,
            value: 0,
            length: 1,
            tension: 0,
        },
    ];
    roll: Transition[] = [
        {
            curve: TransitionCurve.Plateau,
            value: 0,
            length: 1,
            tension: 0,
        },
    ];

    constructor() {}

    static fromJSON(parse: any): Transitions {
        return Object.assign(new Transitions(), parse);
    }

    length(): number {
        return Math.min(
            _.sumBy(this.vert, (v) => v.length),
            _.sumBy(this.lat, (v) => v.length),
            _.sumBy(this.roll, (v) => v.length)
        );
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
