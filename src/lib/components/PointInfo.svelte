<script lang="ts">
    import type { TrackSpline } from "$lib/core/TrackSpline";
    import { degDiff } from "$lib/core/constants";
    import NumberDisplay from "./NumberDisplay.svelte";
    import UnitNumberDisplay from "./UnitNumberDisplay.svelte";
    import { euler, forces } from "$lib/core/Track";
    import type { UnitSystem } from "$lib/core/units";
    import { vlength, vsub } from "$lib/core/math";

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
            const [p1, p2] = spline.evaluateNoInterpolation(pos)!;
            const [lastYaw, lastPitch, lastRoll] = euler(p1);
            const [yaw, pitch, roll] = euler(p2);
            const dp = vlength(vsub(p2.pos, p1.pos));
            [yawPerS, pitchPerS, rollPerS] = [
                (degDiff(lastYaw, yaw) * point.velocity) / dp,
                (degDiff(lastPitch, pitch) * point.velocity) / dp,
                (degDiff(lastRoll, roll) * point.velocity) / dp,
            ];
        }
    }

    $: force = forces(spline, pos) ?? { vert: 0, lat: 0, roll: 0 };
</script>

{#if point}
    <p class="font-semibold">point info</p>
    <table class="text-sm text-foreground">
        <tbody>
            <tr>
                <td class="pr-4"
                    ><NumberDisplay
                        label="time"
                        value={point.time}
                        unit="s"
                    /></td
                >
                <td class="pr-4">
                    <UnitNumberDisplay
                        label="pos"
                        value={pos}
                        baseUnit="distance"
                        {unitSystem}
                    /></td
                >
                <td class="pr-4">
                    <UnitNumberDisplay
                        label="velocity"
                        value={point.velocity}
                        baseUnit="velocity"
                        {unitSystem}
                    /></td
                >
                <td class="pr-4"
                    ><UnitNumberDisplay
                        label="x"
                        value={point.pos[0]}
                        baseUnit="distance"
                        {unitSystem}
                    /></td
                >
                <td class="pr-4"
                    ><UnitNumberDisplay
                        label="y"
                        value={point.pos[1]}
                        baseUnit="distance"
                        {unitSystem}
                    /></td
                >
                <td>
                    <UnitNumberDisplay
                        label="z"
                        value={point.pos[2]}
                        baseUnit="distance"
                        {unitSystem}
                    /></td
                >
            </tr>
            <tr>
                <td><NumberDisplay label="yaw" value={yaw} unit="°" /></td>
                <td
                    ><NumberDisplay
                        label="yaw/s"
                        value={yawPerS}
                        unit="°/s"
                        fractionalDigits={1}
                    /></td
                >
                <td><NumberDisplay label="pitch" value={pitch} unit="°" /></td>
                <td
                    ><NumberDisplay
                        label="pitch/s"
                        value={pitchPerS}
                        unit="°/s"
                        fractionalDigits={1}
                    /></td
                >
                <td><NumberDisplay label="roll" value={roll} unit="°" /></td>
                <td
                    ><NumberDisplay
                        label="roll/s"
                        value={rollPerS}
                        unit="°/s"
                        fractionalDigits={1}
                    /></td
                >
            </tr>
            <tr>
                <td>
                    <NumberDisplay
                        label="y-accel"
                        value={force.vert}
                        unit="g"
                    /></td
                >
                <td
                    ><NumberDisplay
                        label="x-accel"
                        value={force.lat}
                        unit="g"
                    /></td
                >
            </tr>
        </tbody>
    </table>
{/if}
