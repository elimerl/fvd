import type { ReactNode } from "react";
import type { TrackSpline } from "../lib/core/TrackSpline";
import { degDiff } from "../lib/core/constants";
import { euler, forces } from "../lib/core/Track";
import type { UnitSystem } from "../contexts/UnitContext";
import { getUnitLabel, toDisplay } from "../lib/unitConversions";
import { vlength, vsub } from "../lib/core/math";

interface Props {
    spline: TrackSpline;
    povPos: number;
    mode: "atEnd" | "pov";
    unitSystem?: UnitSystem;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="min-w-0 border-l border-neutral-700 pl-2 first:border-l-0 first:pl-0">
            <h3 className="mb-0.5 text-[9px] uppercase tracking-wide text-neutral-500">{title}</h3>
            <div className="grid grid-cols-1 gap-0 leading-tight">{children}</div>
        </section>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-1">
            <span className="text-neutral-400">{label}</span>
            <span className="font-mono text-neutral-100">{value}</span>
        </div>
    );
}

function fmt(value: number, unit: string, digits = 2) {
    return `${value.toFixed(digits)} ${unit}`;
}

export function PointInfo({ spline, povPos, mode, unitSystem = "metric" }: Props) {
    const pos = mode === "atEnd" ? spline.getLength() : povPos;
    const point = spline.evaluate(pos);

    if (!point) return null;

    const [yaw, pitch, roll] = euler(point);

    let yawPerS = 0;
    let pitchPerS = 0;
    let rollPerS = 0;
    const pair = spline.evaluateNoInterpolation(pos);
    if (pair) {
        const [p1, p2] = pair;
        const [lastYaw, lastPitch, lastRoll] = euler(p1);
        const [y2, p2e, r2] = euler(p2);
        const dp = vlength(vsub(p2.pos, p1.pos));
        yawPerS = (degDiff(lastYaw, y2) * point.velocity) / dp;
        pitchPerS = (degDiff(lastPitch, p2e) * point.velocity) / dp;
        rollPerS = (degDiff(lastRoll, r2) * point.velocity) / dp;
    }

    const force = forces(spline, pos) ?? { vert: 0, lat: 0, roll: 0 };
    const distUnit = getUnitLabel("m", unitSystem);
    const velUnit = getUnitLabel("m/s", unitSystem);

    return (
        <div className="border-t border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-300">
            <div className="mb-0.5 flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-200">Point Info</p>
                <span className="font-mono text-neutral-400">t {point.time.toFixed(2)} s</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-2 gap-y-0.5">
                <Group title="Path">
                    <Row label="Distance" value={fmt(toDisplay(pos, "m", unitSystem), distUnit)} />
                    <Row label="Velocity" value={fmt(toDisplay(point.velocity, "m/s", unitSystem), velUnit)} />
                </Group>

                <Group title="Position">
                    <Row label="X" value={fmt(toDisplay(point.pos[0], "m", unitSystem), distUnit)} />
                    <Row label="Y" value={fmt(toDisplay(point.pos[1], "m", unitSystem), distUnit)} />
                    <Row label="Z" value={fmt(toDisplay(point.pos[2], "m", unitSystem), distUnit)} />
                </Group>

                <Group title="Orientation">
                    <Row label="Yaw" value={fmt(yaw, "°")} />
                    <Row label="Pitch" value={fmt(pitch, "°")} />
                    <Row label="Roll" value={fmt(roll, "°")} />
                </Group>

                <Group title="Angular Rate">
                    <Row label="Yaw/s" value={fmt(yawPerS, "°/s", 1)} />
                    <Row label="Pitch/s" value={fmt(pitchPerS, "°/s", 1)} />
                    <Row label="Roll/s" value={fmt(rollPerS, "°/s", 1)} />
                </Group>

                <Group title="Forces">
                    <Row label="Vert" value={fmt(force.vert, "g")} />
                    <Row label="Lat" value={fmt(force.lat, "g")} />
                    <Row label="Roll" value={fmt(force.roll, "°/s")} />
                </Group>
            </div>
        </div>
    );
}
