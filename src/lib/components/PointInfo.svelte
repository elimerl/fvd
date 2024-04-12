<script lang="ts">
    import type { TrackSpline } from "$lib/core/TrackSpline";
    import { degDiff } from "$lib/core/constants";
    import NumberDisplay from "./NumberDisplay.svelte";
    import UnitNumberDisplay from "./UnitNumberDisplay.svelte";
    import { euler, forces } from "$lib/core/Track";
    import type { UnitSystem } from "$lib/core/units";

    export let spline: TrackSpline;
    export let unitSystem: UnitSystem;
    export let pov: { pos: number } = { pos: 0 };

    export let mode: "atEnd" | "pov";

    $: pos = mode === "atEnd" ? spline.getLength() : pov.pos;

    $: point = spline.evaluate(pos);

    $: [yaw, pitch, roll] = point ? euler(point) : [0, 0, 0];

    let [yawPerS, pitchPerS, rollPerS] = [0, 0, 0];
    $: {
        if (point) {
            const DP = pos - 0.1 < 0 ? 0.1 : -0.1;
            const [lastYaw, lastPitch, lastRoll] = euler(
                spline.evaluate(pos + DP)!,
            );
            [yawPerS, pitchPerS, rollPerS] = [
                (degDiff(yaw, lastYaw) * point.velocity) / DP,
                (degDiff(pitch, lastPitch) * point.velocity) / DP,
                (degDiff(roll, lastRoll) * point.velocity) / DP,
            ];
        }
    }

    $: force = forces(spline, pos) ?? { vert: 0, lat: 0, roll: 0 };
</script>

{#if point}
    <div class="flex flex-col text-sm text-foreground">
        <p class="font-semibold text-lg">point info</p>
        <div class="flex gap-x-4">
            <NumberDisplay label="time" value={point.time} unit="s" />
            <UnitNumberDisplay
                label="pos"
                value={pos}
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
