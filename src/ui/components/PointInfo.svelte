<script lang="ts">
    import { Euler, Quaternion } from "three";
    import type { TrackSpline } from "../../core/TrackSpline";
    import { radToDeg, type UnitSystem } from "../../core/constants";
    import { type quaternion } from "../../core/math";
    import { notNull } from "../util";
    import NumberDisplay from "./NumberDisplay.svelte";
    import UnitNumberDisplay from "./UnitNumberDisplay.svelte";
    import {
        transitionsEvaluate,
        type Transitions,
    } from "../../core/Transitions";

    export let spline: TrackSpline;
    export let transitions: Transitions;
    export let unitSystem: UnitSystem;
    export let pov: { pos: number } = { pos: 0 };

    $: point = spline.evaluate(pov.pos);

    // fix thios
    // function euler(quat: quaternion) {
    //     const euler = new Euler().setFromQuaternion(
    //         new Quaternion(quat[1], quat[2], quat[3], quat[0]),
    //     );

    //     return [-radToDeg(euler.x), -radToDeg(euler.y), -radToDeg(euler.z)];
    // }

    // $: [pitch, yaw, roll] = point ? euler(point.rot) : [0, 0, 0];

    // let [pitchPerS, yawPerS, rollPerS] = [0, 0, 0];
    // $: {
    //     if (point) {
    //         const DP = pov.pos - 0.01 < 0 ? 0 : -0.01;
    //         const [lastYaw, lastPitch, lastRoll] = euler(
    //             spline.evaluate(pov.pos + DP)!.rot,
    //         );

    //         [pitchPerS, yawPerS, rollPerS] = [
    //             -(pitch - lastYaw) * (point.velocity / DP),
    //             -(yaw - lastPitch) * (point.velocity / DP),
    //             -(roll - lastRoll) * (point.velocity / DP),
    //         ];
    //     }
    // }
</script>

{#if point}
    <div class="flex flex-col">
        <div class="flex gap-x-4">
            <NumberDisplay label="time" value={point.time} unit="s" />
            <UnitNumberDisplay
                label="pos"
                value={pov.pos}
                baseUnit="distance"
                {unitSystem}
            />
            <UnitNumberDisplay
                label="velocity"
                value={point.velocity}
                baseUnit="velocity"
                {unitSystem}
            />
            <UnitNumberDisplay
                label="x"
                value={point.pos[0]}
                baseUnit="distance"
                {unitSystem}
            />
            <UnitNumberDisplay
                label="y"
                value={point.pos[1]}
                baseUnit="distance"
                {unitSystem}
            />
            <UnitNumberDisplay
                label="z"
                value={point.pos[2]}
                baseUnit="distance"
                {unitSystem}
            />
        </div>
        <!-- <div class="flex gap-x-4">
            <NumberDisplay label="yaw" value={yaw} unit="°" />
            <NumberDisplay
                label="yaw/s"
                value={yawPerS}
                unit="°/s"
                fractionalDigits={1}
            />
            <NumberDisplay label="pitch" value={pitch} unit="°" />
            <NumberDisplay
                label="pitch/s"
                value={pitchPerS}
                unit="°/s"
                fractionalDigits={1}
            />
            <NumberDisplay label="roll" value={roll} unit="°" />
            <NumberDisplay
                label="roll/s"
                value={rollPerS}
                unit="°/s"
                fractionalDigits={1}
            />
        </div> -->
        <div class="flex gap-x-4">
            <NumberDisplay
                label="y-accel"
                value={transitionsEvaluate(
                    transitions.vert,
                    point.time,
                    transitions.vertStart,
                ) ?? NaN}
                unit="g"
            />
            <NumberDisplay
                label="x-accel"
                value={transitionsEvaluate(
                    transitions.lat,
                    point.time,
                    transitions.vertStart,
                ) ?? NaN}
                unit="g"
            />
        </div>
    </div>
{/if}
