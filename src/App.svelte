<script lang="ts">
    import "@fontsource-variable/overpass-mono";
    import "@fontsource-variable/overpass";

    import { Transitions, type Transition } from "./core/Transitions";
    import Graph from "./ui/components/Graph.svelte";
    import NumberDisplay from "./ui/components/NumberDisplay.svelte";
    import { testTransitions } from "./ui/util";

    let transitions = testTransitions();
    let selected: Transition | undefined = undefined;
</script>

<Graph bind:transitions bind:selected />
{#if selected}
    <NumberDisplay label="length" value={selected.length} unit="s" />
{/if}
