import * as _ from "lodash-es";
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

export function curveIntegral(
    curve: TransitionCurve,
    t: number,
    center = 0,
    tension = 0
) {
    const clampedT = _.clamp(t, 0, 1);
    if (clampedT <= 0) return 0;

    // Deterministic Simpson integration over normalized time [0, t].
    const n = 200; // even
    const h = clampedT / n;
    let sum = 0;

    const f = (x: number) => evalCurve(curve, timewarp(x, center, tension));

    for (let i = 0; i <= n; i++) {
        const x = i * h;
        const coeff = i === 0 || i === n ? 1 : i % 2 === 0 ? 2 : 4;
        sum += coeff * f(x);
    }

    return (h / 3) * sum;
}

export function evalTransitionIntegral(transition: Transition, t: number) {
    const clampedT = _.clamp(t, 0, transition.length);
    if (clampedT <= 0 || transition.length <= 0) return 0;

    const normalizedT = clampedT / transition.length;
    return (
        transition.value *
        transition.length *
        curveIntegral(
            transition.curve,
            normalizedT,
            transition.center,
            transition.tension
        )
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

export function rollStateAtTransitionStart(
    rollTransitions: Transition[],
    startRollRate: number,
    i: number
) {
    const idx = _.clamp(i, 0, rollTransitions.length);
    let rateStart = startRollRate;
    let angleStart = 0;

    for (let k = 0; k < idx; k++) {
        const tr = rollTransitions[k];
        angleStart +=
            rateStart * tr.length + evalTransitionIntegral(tr, tr.length);
        rateStart += evalCurve(tr.curve, 1) * tr.value;
    }

    return { rateStart, angleStart };
}

export function rollAngleAtTransitionEnd(
    rollTransitions: Transition[],
    startRollRate: number,
    i: number
) {
    if (i < 0 || i >= rollTransitions.length) return 0;
    const tr = rollTransitions[i];
    const { rateStart, angleStart } = rollStateAtTransitionStart(
        rollTransitions,
        startRollRate,
        i
    );
    return angleStart + rateStart * tr.length + evalTransitionIntegral(tr, tr.length);
}

export function rollAngleEvaluateAtT(
    rollTransitions: Transition[],
    startRollRate: number,
    t: number
): number | undefined {
    if (t < 0 || t >= transitionsLength(rollTransitions)) return undefined;

    let rate = startRollRate;
    let angle = 0;
    let timeAccum = 0;

    for (const tr of rollTransitions) {
        if (timeAccum <= t && t <= timeAccum + tr.length) {
            const localT = t - timeAccum;
            angle += rate * localT + evalTransitionIntegral(tr, localT);
            return angle;
        }

        angle += rate * tr.length + evalTransitionIntegral(tr, tr.length);
        rate += evalCurve(tr.curve, 1) * tr.value;
        timeAccum += tr.length;
    }

    return undefined;
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
                    _.sumBy(this.roll, (v: Transition) =>
                        v.dynamicLength ? Infinity : v.length
                    ),
                    _.sumBy(this.lat, (v: Transition) =>
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
                    _.sumBy(this.roll, (v: Transition) =>
                        v.dynamicLength ? Infinity : v.length
                    ),
                    _.sumBy(this.vert, (v: Transition) =>
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
                    _.sumBy(this.lat, (v: Transition) =>
                        v.dynamicLength ? Infinity : v.length
                    ),
                    _.sumBy(this.vert, (v: Transition) =>
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
