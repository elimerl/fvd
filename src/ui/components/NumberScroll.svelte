<script lang="ts">
    import { deltaY } from "../util";
    import * as _ from "lodash-es";

    export let value: number;
    export let fractionalDigits: number = 1;

    export let min: number = -Infinity;
    export let max: number = Infinity;

    $: step = Math.pow(10, -fractionalDigits);
    const inputOnWheel = (ev: WheelEvent) => {
        ev.preventDefault();
        const dy = Math.sign(ev.deltaY);
        value -= dy * step;
        value = _.round(value, fractionalDigits);
        value = _.clamp(value, min, max);
        // todo add shift and ctrl modifiers to change the step size
    };
</script>

<input
    type="number"
    class="px-1 m-0.5 rounded-md border border-gray-400"
    {step}
    {min}
    {max}
    bind:value
    on:wheel={inputOnWheel}
    alt=""
/>
