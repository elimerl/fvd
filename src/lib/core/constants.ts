import { vec } from "./math";

export const G = 9.80665;
export const UP = vec(0, 1, 0);
export const DOWN = vec(0, -1, 0);

export const RIGHT = vec(-1, 0, 0); // NoLimits has backwards right for some reason?

export const FORWARD = vec(0, 0, 1);
export const GRAVITY = vec(0, -G, 0);

export function degToRad(deg: number) {
    return deg * (Math.PI / 180);
}

export function radToDeg(rad: number) {
    return rad * (180 / Math.PI);
}
export function degDiff(deg1: number, deg2: number) {
    let diff = deg2 - deg1;
    while (diff < -180) {
        diff += 360;
    }
    while (diff > 180) {
        diff -= 360;
    }
    return diff;
}
