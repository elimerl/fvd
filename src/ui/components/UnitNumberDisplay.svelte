<script lang="ts">
    import {
        UnitSystem,
        metersPerSecondToKph,
        metersPerSecondToMph,
        metersToFeet,
    } from "../../core/constants";
    import NumberDisplay from "./NumberDisplay.svelte";

    export let label: string;
    export let parentheses: boolean = false;
    export let plusPositive: boolean = false;
    export let fractionalDigits: number = 2;

    export let value: number;
    export let baseUnit: "distance" | "velocity";
    export let unitSystem: UnitSystem;

    let valueConverted: number;
    let unit: string;

    $: {
        if (baseUnit === "distance") {
            switch (unitSystem) {
                case UnitSystem.Metric:
                case UnitSystem.MetricKph:
                    valueConverted = value;
                    unit = "m";
                    break;
                case UnitSystem.Imperial:
                    valueConverted = metersToFeet(value);
                    unit = "ft";
                    break;
            }
        } else if (baseUnit === "velocity") {
            switch (unitSystem) {
                case UnitSystem.Metric:
                    valueConverted = value;
                    unit = "m/s";
                    break;
                case UnitSystem.MetricKph:
                    valueConverted = metersPerSecondToKph(value);
                    unit = "km/h";
                    break;
                case UnitSystem.Imperial:
                    valueConverted = metersPerSecondToMph(value);
                    unit = "mph";
                    break;
            }
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
