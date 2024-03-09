<script lang="ts">
    export let label: string;
    export let value: number;
    export let unit: string = "";

    export let parentheses: boolean = false;
    export let plusPositive: boolean = false;
    export let decimalPoints: number = 2;
</script>

<div class="inline-flex m-0 text-sm">
    {#if parentheses}({/if}
    <span>{label ? label + ": " : "\u00A0"}</span>

    <div class="min-w-24 text-right font-mono">
        {(!plusPositive || value <= 0 ? "" : "+") +
            value.toFixed(decimalPoints)}{unit}
    </div>
    {#if parentheses}){/if}
</div>
