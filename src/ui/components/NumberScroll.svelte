<script lang="ts">
    import { deltaY } from "../util";
    import * as _ from "lodash-es";

    export let value: number;
    export let fractionalDigits: number = 1;

    export let min: number = -Infinity;
    export let max: number = Infinity;

    value = _.clamp(value, min, max);

    $: step = Math.pow(10, -fractionalDigits);
    const inputOnWheel = (ev: WheelEvent) => {
        ev.preventDefault();
        const dy = Math.sign(ev.deltaY);
        value -= dy * step * (ev.ctrlKey ? 0.1 : 1) * (ev.shiftKey ? 10 : 1);
        value = _.round(value, fractionalDigits);
        value = _.clamp(value, min, max);
        // todo add shift and ctrl modifiers to change the step size
    };

    const inputOnChange = (ev: Event) => {
        if (!/^[0-9\.]*$/.test((ev.target as HTMLInputElement).value)) {
            (ev.target as HTMLInputElement).value =
                value.toFixed(fractionalDigits);
            ev.preventDefault();
            return;
        }

        value = parseFloat((ev.target as HTMLInputElement).value);
        if (isNaN(value)) {
            value = 0;
        }
        value = _.round(value, fractionalDigits);
        value = _.clamp(value, min, max);
    };
</script>

<input
    type="number"
    class="px-1 m-0.5 rounded-md border border-gray-400"
    {step}
    {min}
    {max}
    value={value.toFixed(fractionalDigits)}
    on:input={inputOnChange}
    on:wheel={inputOnWheel}
    alt=""
/>
