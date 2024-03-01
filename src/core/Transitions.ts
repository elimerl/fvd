import _ from "lodash-es";
export enum TransitionCurve {
    Linear = "linear",
    Quadratic = "quadratic",
    Cubic = "cubic",
    Plateau = "plateau",
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
    }
}

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
            value +=
                evalCurve(
                    transition.curve,
                    timewarp(
                        (t - timeAccum) / transition.length,
                        transition.tension
                    )
                ) * transition.value;
            break;
        }

        value += evalCurve(transition.curve, 1) * transition.value;

        timeAccum += transition.length;
    }
    return value;
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

    constructor(
        readonly vertStart: number,
        readonly latStart: number,
        readonly rollStart: number
    ) {}

    length(): number {
        return Math.min(
            _.sumBy(this.vert, (v) => v.length),
            _.sumBy(this.lat, (v) => v.length),
            _.sumBy(this.roll, (v) => v.length)
        );
    }

    evaluate(
        t: number
    ): { vert: number; lat: number; roll: number } | undefined {
        if (t < 0) {
            return undefined;
        }
        const vertValue = transitionsEvaluate(this.vert, t, this.vertStart);
        const latValue = transitionsEvaluate(this.lat, t, this.latStart);
        const rollValue = transitionsEvaluate(this.roll, t, this.rollStart);
        if (
            vertValue === undefined ||
            latValue === undefined ||
            rollValue === undefined
        )
            return undefined;

        return { vert: vertValue, lat: latValue, roll: rollValue };
    }
}
