<script lang="ts">
    import {
        UnitSystem,
        distanceUnit,
        metersPerSecondToUnit,
        metersToUnit,
        velocityUnit,
    } from "$lib/core/units";
    import NumberDisplay from "./NumberDisplay.svelte";

    export let label: string;
    export let parentheses: boolean = false;
    export let plusPositive: boolean = false;
    export let fractionalDigits: number = 2;
    export let alignRight: boolean = false;

    export let value: number;
    export let baseUnit: "distance" | "velocity";
    export let unitSystem: UnitSystem;

    let valueConverted: number;
    let unit: string;

    $: {
        if (baseUnit === "distance") {
            valueConverted = metersToUnit(value, unitSystem);
            unit = distanceUnit(unitSystem);
        } else if (baseUnit === "velocity") {
            valueConverted = metersPerSecondToUnit(value, unitSystem);
            unit = velocityUnit(unitSystem);
        }
    }
</script>

<NumberDisplay
    {label}
    value={valueConverted}
    {unit}
    {fractionalDigits}
    {parentheses}
    {plusPositive}
/>
