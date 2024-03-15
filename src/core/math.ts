import * as _ from "lodash-es";
import { degToRad } from "./constants";

export function lerp(v0: number, v1: number, t: number): number {
    return (1 - t) * v0 + t * v1;
}

// curvature crap

export function degPerMToRadius(degPerM: number): number {
    if (Math.abs(degPerM) < 0.001) return Infinity;
    return 1 / degToRad(degPerM);
}

export type vec3 = [number, number, number];

export function vec(x: number, y: number, z: number): vec3 {
    return [x, y, z];
}

export function vadd(a: vec3, b: vec3): vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vsub(a: vec3, b: vec3): vec3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vmul(a: vec3, scalar: number): vec3 {
    return [a[0] * scalar, a[1] * scalar, a[2] * scalar];
}

export function vdiv(a: vec3, scalar: number): vec3 {
    return [a[0] / scalar, a[1] / scalar, a[2] / scalar];
}

export function vdot(a: vec3, b: vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vcross(a: vec3, b: vec3): vec3 {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}

export function vlengthsquared(a: vec3): number {
    return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}

export function vlength(a: vec3): number {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

export function vlerp(v0: vec3, v1: vec3, t: number): vec3 {
    return [
        lerp(v0[0], v1[0], t),
        lerp(v0[1], v1[1], t),
        lerp(v0[2], v1[2], t),
    ];
}

export function vnormalize(a: vec3): vec3 {
    const magnitude = vlength(a);
    return vdiv(a, magnitude);
}

export function vproject(a: vec3, b: vec3): vec3 {
    const bNormalized = vnormalize(b);
    const scalar = vdot(a, bNormalized);
    return vmul(bNormalized, scalar);
}

export type quaternion = [number, number, number, number];
export const quatidentity: quaternion = [1, 0, 0, 0];

export function qmul(a: quaternion, b: quaternion): quaternion {
    const [a0, a1, a2, a3] = a;
    const [b0, b1, b2, b3] = b;
    return [
        a0 * b0 - a1 * b1 - a2 * b2 - a3 * b3,
        a0 * b1 + a1 * b0 + a2 * b3 - a3 * b2,
        a0 * b2 - a1 * b3 + a2 * b0 + a3 * b1,
        a0 * b3 + a1 * b2 - a2 * b1 + a3 * b0,
    ];
}

export function qconjugate(q: quaternion): quaternion {
    return [q[0], -q[1], -q[2], -q[3]];
}

export function qrotate(v: vec3, q: quaternion): vec3 {
    const [vx, vy, vz] = v;
    const rotated = qmul(q, [0, vx, vy, vz]);
    const conjugate = qconjugate(q);
    const final = qmul(rotated, conjugate);
    return [final[1], final[2], final[3]];
}

export function qaxisangle(axis: vec3, angle: number): quaternion {
    const halfAngle = angle / 2;
    const sinHalfAngle = Math.sin(halfAngle);
    return [
        Math.cos(halfAngle),
        axis[0] * sinHalfAngle,
        axis[1] * sinHalfAngle,
        axis[2] * sinHalfAngle,
    ];
}

export function qnormalize(a: quaternion): quaternion {
    const [w, x, y, z] = a;
    const magnitude = Math.sqrt(w * w + x * x + y * y + z * z);

    if (magnitude === 0) {
        return [0, 0, 0, 0]; // Edge case: avoid division by zero
    } else {
        const invMagnitude = 1 / magnitude;
        return [
            w * invMagnitude,
            x * invMagnitude,
            y * invMagnitude,
            z * invMagnitude,
        ];
    }
}

export function qslerp(q0: quaternion, q1: quaternion, t: number): quaternion {
    q0 = qnormalize(q0);
    q1 = qnormalize(q1);

    let cosHalfTheta =
        q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3];

    if (cosHalfTheta < 0) {
        q1 = [-q1[0], -q1[1], -q1[2], -q1[3]];
        cosHalfTheta = -cosHalfTheta;
    }

    if (Math.abs(cosHalfTheta) >= 1) {
        return q0;
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1 - cosHalfTheta * cosHalfTheta);

    if (Math.abs(sinHalfTheta) < 0.001) {
        return [
            q0[0] * 0.5 + q1[0] * 0.5,
            q0[1] * 0.5 + q1[1] * 0.5,
            q0[2] * 0.5 + q1[2] * 0.5,
            q0[3] * 0.5 + q1[3] * 0.5,
        ];
    }

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return [
        q0[0] * ratioA + q1[0] * ratioB,
        q0[1] * ratioA + q1[1] * ratioB,
        q0[2] * ratioA + q1[2] * ratioB,
        q0[3] * ratioA + q1[3] * ratioB,
    ];
}
