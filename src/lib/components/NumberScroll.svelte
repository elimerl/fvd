<script lang="ts">
    import * as _ from "lodash-es";

    export let value: number;
    export let fractionalDigits: number = 1;

    export let min: number = -100000;
    export let max: number = 100000;

    export let unit: string = "";

    export let disabled: boolean = false;

    value = _.clamp(value, min, max);

    $: digits = fractionalDigits + 1;
    $: step = Math.pow(10, -fractionalDigits);
    const inputOnWheel = (ev: WheelEvent) => {
        if (disabled) return;
        ev.preventDefault();
        const dy = Math.sign(ev.deltaY === 0 ? ev.deltaX : ev.deltaY);
        value -= dy * step * (ev.ctrlKey ? 0.1 : 1) * (ev.shiftKey ? 10 : 1);
        value = _.round(value, digits);
        value = _.clamp(value, min, max);
    };

    const inputOnChange = (ev: Event) => {
        if (disabled) return;

        if (!/^[-\+0-9\.]*$/.test((ev.target as HTMLInputElement).value)) {
            (ev.target as HTMLInputElement).value = value.toFixed(digits);
            ev.preventDefault();
            return;
        }

        value = parseFloat(
            (ev.target as HTMLInputElement).value.replace(unit, ""),
        );
        if (isNaN(value)) {
            value = 0;
        }
        value = _.round(value, digits);
        value = _.clamp(value, min, max);
    };
</script>

<input
    type="text"
    class={"px-1 m-0.5 rounded-md border border-gray-400 text-right w-24 dark:text-gray-100 dark:bg-gray-800" +
        (disabled
            ? " bg-gray-200 text-gray-500 dark:bg-gray-500 dark:text-gray-400"
            : "")}
    step={step / 10}
    min={-1000}
    {max}
    value={value.toFixed(digits) + unit}
    {disabled}
    readonly={disabled}
    on:input={inputOnChange}
    on:wheel={inputOnWheel}
    on:keydown={(ev) => {
        if (ev.key === "ArrowUp") {
            ev.preventDefault();
            value += step * (ev.ctrlKey ? 0.1 : 1) * (ev.shiftKey ? 10 : 1);
            value = _.round(value, digits);
            value = _.clamp(value, min, max);
        } else if (ev.key === "ArrowDown") {
            ev.preventDefault();
            value -= step * (ev.ctrlKey ? 0.1 : 1) * (ev.shiftKey ? 10 : 1);
            value = _.round(value, digits);
            value = _.clamp(value, min, max);
        }
    }}
    alt=""
/>
