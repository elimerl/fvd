<script lang="ts">
    import type { TrackSpline } from "../../core/TrackSpline";
    import { type UnitSystem } from "../../core/constants";
    import NumberDisplay from "./NumberDisplay.svelte";
    import UnitNumberDisplay from "./UnitNumberDisplay.svelte";
    import { euler, forces } from "../../core/Track";

    export let spline: TrackSpline;
    export let unitSystem: UnitSystem;
    export let pov: { pos: number } = { pos: 0 };

    $: point = spline.evaluate(pov.pos);

    // fix thios

    // $: {
    //     if (point) {
    //         const dir = qrotate(FORWARD, point.rot);
    //         const yaw = radToDeg(Math.atan2(-dir[0], -dir[2]));
    //         const pitch = radToDeg(
    //             Math.atan2(
    //                 dir[1],
    //                 Math.sqrt(dir[0] * dir[0] + dir[2] * dir[2]),
    //             ),
    //         );
    //         const rightDir = qrotate(RIGHT, point.rot);

    //         const roll = radToDeg(Math.atan2(-rightDir[1], rightDir[0]));

    //         console.log(roll);
    //     }
    // }

    $: [yaw, pitch, roll] = point ? euler(point) : [0, 0, 0];

    let [yawPerS, pitchPerS, rollPerS] = [0, 0, 0];
    $: {
        if (point) {
            const DP = pov.pos - 0.1 < 0 ? 0 : -0.1;
            const [lastYaw, lastPitch, lastRoll] = euler(
                spline.evaluate(pov.pos + DP)!,
            );
            [yawPerS, pitchPerS, rollPerS] = [
                ((lastYaw - yaw) * point.velocity) / DP,
                ((lastPitch - pitch) * point.velocity) / DP,
                ((lastRoll - roll) * point.velocity) / DP,
            ];
        }
    }

    $: force = forces(spline, pov.pos) ?? { vert: 0, lat: 0, roll: 0 };
</script>

{#if point}
    <div class="flex flex-col text-sm">
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
        <div class="flex gap-x-4">
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
        </div>
        <div class="flex gap-x-4">
            <NumberDisplay label="y-accel" value={force.vert} unit="g" />
            <NumberDisplay label="x-accel" value={force.lat} unit="g" />
        </div>
    </div>
{/if}
