<script lang="ts">
    import "@fontsource-variable/overpass-mono";
    import "@fontsource-variable/overpass";

    import {
        Transitions,
        type Transition,
        TransitionCurve,
        curveTypes,
        transitionsLength,
    } from "./core/Transitions";
    import Graph from "./ui/components/Graph.svelte";
    import NumberDisplay from "./ui/components/NumberDisplay.svelte";
    import { deltaY, notNull, testTransitions } from "./ui/util";
    import NumberScroll from "./ui/components/NumberScroll.svelte";
    import Renderer from "./ui/components/Renderer.svelte";
    import { defaultFvdConfig, fvd } from "./core/fvd";
    import { vec } from "./core/math";
    import { keyState, keydownHandler, keyupHandler } from "./ui/input";

    import PointInfo from "./ui/components/PointInfo.svelte";
    import { UnitSystem } from "./core/constants";
    import MenuBar from "./ui/components/MenuBar.svelte";
    import { onMount } from "svelte";

    import * as _ from "lodash-es";
    import { defaultSettings, type AppSettings } from "./ui/settings";

    //@ts-expect-error
    if (!window.chrome) {
        alert(
            "Warning: elifvd only works fully in Chrome or Edge. You can try it in other browsers, but file access might not work.",
        );
    }

    let pov = { pos: 0 };

    let transitions = new Transitions(1, 0, 0);
    let selected: { i: number; arr: "vert" | "lat" | "roll" } | undefined =
        undefined;

    function getSelected(
        transitions: Transitions,
        selected: { i: number; arr: "vert" | "lat" | "roll" } | undefined,
    ): Transition | undefined {
        if (!selected) return undefined;
        const { i, arr } = selected;
        return transitions[arr][i];
    }
    $: selectedTransition = getSelected(transitions, selected);

    $: spline = fvd(transitions, vec(0, 67, 0), 2.5, defaultFvdConfig());

    let loaded = false;
    $: {
        if (loaded)
            localStorage.setItem("transitions", JSON.stringify(transitions));
    }

    $: {
        // REMOVE THIS LATER
        transitions.lat[0].length = Math.max(
            _.sumBy(transitions.vert, (v) => v.length),
            _.sumBy(transitions.roll, (v) => v.length),
        );
    }

    let settings: AppSettings = defaultSettings();

    $: {
        if (loaded) localStorage.setItem("settings", JSON.stringify(settings));
    }

    onMount(() => {
        const stored = localStorage.getItem("transitions");
        if (stored) {
            loaded = true;
            transitions = Transitions.fromJSON(stored);
        }

        settings = localStorage.getItem("settings")
            ? JSON.parse(localStorage.getItem("settings")!)
            : defaultSettings();

        const handler = (e: KeyboardEvent) => {
            // if (e.key === "z" && e.ctrlKey) {
            //     e.preventDefault();
            //     transitions = undo(transitions);
            //     console.log(transitions);
            // }
            // if (e.key === "y" && e.ctrlKey) {
            //     e.preventDefault();
            //     transitions = redo(transitions);
            //     console.log(transitions);
            // }
        };

        document.addEventListener("keydown", handler);

        return () => {
            document.removeEventListener("keydown", handler);
        };
    });
</script>

<svelte:window
    on:keydown={keydownHandler}
    on:keyup={keyupHandler}
    on:blur={() => {
        keyState.down.clear();
        keyState.ctrl = false;
        keyState.shift = false;
        keyState.alt = false;
    }}
/>
<div class="p-4 h-screen">
    <select bind:value={settings.unitSystem}>
        <option value={UnitSystem.Metric}>Metric (m, m/s)</option>
        <option value={UnitSystem.MetricKph}>Metric (m, km/h)</option>
        <option value={UnitSystem.Imperial}>Imperial (ft, mph)</option>
    </select>

    <button
        on:click={() => {
            if (confirm("This cannot be undone")) {
                transitions = new Transitions(1, 0, 0);
            }
        }}>Reset</button
    >

    <div class="w-full h-2/3">
        <Renderer {spline} bind:pov />
    </div>
    <div class="flex gap-x-2">
        <PointInfo
            {spline}
            {transitions}
            {pov}
            unitSystem={settings.unitSystem}
        />
    </div>
    <Graph bind:transitions bind:selected />
    {#if selectedTransition && selected}
        <div>
            <label
                ><span class="mr-2">Length:</span><NumberScroll
                    bind:value={selectedTransition.length}
                    min={0.1}
                /></label
            >
            <button
                on:click={() => {
                    if (selectedTransition && selected) {
                        const otherLength = Math.min(
                            selected.arr !== "vert"
                                ? _.sumBy(transitions.vert, (v) => v.length)
                                : Infinity,
                            selected.arr !== "lat"
                                ? _.sumBy(transitions.lat, (v) => v.length)
                                : Infinity,
                            selected.arr !== "roll"
                                ? _.sumBy(transitions.roll, (v) => v.length)
                                : Infinity,
                        );

                        selectedTransition.length = Math.max(
                            otherLength -
                                transitionsLength(
                                    transitions[selected.arr].slice(
                                        0,
                                        selected.i,
                                    ),
                                ),
                            0.1,
                        );
                        transitions = transitions;
                    }
                }}
                class="px-1 py-0.5 m-0.5 rounded-md border border-gray-400 bg-gray-200"
                >Set length to max</button
            >
            <label
                ><span class="mr-2">Value:</span><NumberScroll
                    bind:value={selectedTransition.value}
                    fractionalDigits={selected.arr === "roll" ? 0 : 1}
                /></label
            >
            <label
                ><span class="mr-2">Curve:</span><select
                    class="px-1 py-0.5 m-0.5 rounded-md border border-gray-400"
                    bind:value={selectedTransition.curve}
                >
                    {#each curveTypes as curve}
                        <option value={curve}>{curve}</option>
                    {/each}
                </select>
            </label>
            <label
                ><span class="mr-2">Tension:</span><NumberScroll
                    bind:value={selectedTransition.tension}
                /></label
            >
        </div>
    {/if}
</div>
