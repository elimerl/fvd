<script lang="ts">
    import {
        distanceUnit,
        metersPerSecondToUnit,
        metersToUnit,
        velocityUnit,
        type UnitSystem,
    } from "$lib/core/units";

    export let value: number;
    export let unitSystem: UnitSystem;
    export let baseUnit: "distance" | "velocity";
    export let fractionalDigits: number = 2;

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

{valueConverted.toFixed(fractionalDigits)}{unit}
