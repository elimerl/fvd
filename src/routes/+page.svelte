<script lang="ts">
    import "@fontsource-variable/overpass-mono";
    import "@fontsource-variable/overpass";

    import {
        Transitions,
        type Transition,
        curveTypes,
    } from "../core/Transitions";
    import Graph from "../ui/components/Graph.svelte";
    import { testTransitions, time } from "../ui/util";
    import NumberScroll from "../ui/components/NumberScroll.svelte";
    import Renderer from "../ui/components/Renderer.svelte";
    import { keyState, keydownHandler, keyupHandler } from "../ui/input";

    import PointInfo from "../ui/components/PointInfo.svelte";
    import { UnitSystem, degToRad } from "../core/constants";
    import { onMount } from "svelte";

    import * as _ from "lodash-es";
    import { defaultSettings, type AppSettings } from "../ui/settings";
    import { Track, forces } from "../core/Track";
    import { loadModels, type TrackModelType } from "../models/model";
    import { qaxisangle } from "../core/math";

    let pov = { pos: 0 };

    function loadLocalStorage<T>(
        key: string,
        load: (v: any) => T,
        defaultValue: () => T,
    ) {
        let value = localStorage.getItem(key);
        if (value) {
            return load(JSON.parse(value));
        } else {
            let result = defaultValue();
            return result;
        }
    }

    function saveLocalStorage<T>(key: string, value: T) {
        localStorage.setItem(key, JSON.stringify(value));
    }

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

    const track = loadLocalStorage(
        "track",
        (v) => Track.fromJSON(v),
        () => {
            const track = new Track();
            track.anchor.pos = [0, 34, 0];
            track.sections.push({
                type: "force",
                fixedSpeed: undefined,
                transitions: testTransitions(),
            });
            return track;
        },
    );
    // track.sections.push({
    //     type: "force",
    //     fixedSpeed: undefined,
    //     transitions: testTransitions(),
    // });

    let selectedSectionIdx: number = 0;

    $: selectedSection = track.sections[selectedSectionIdx];

    $: transitions =
        selectedSection.type === "force"
            ? selectedSection.transitions
            : undefined;
    $: selectedTransition = transitions
        ? getSelected(transitions, selected)
        : undefined;

    $: ({ spline, sectionStartPos } = time(() => track.getSpline()));

    $: {
        saveLocalStorage("track", track);
    }

    let settings: AppSettings = loadLocalStorage(
        "settings",
        (v) => v as AppSettings,
        defaultSettings,
    );

    $: {
        saveLocalStorage("settings", settings);
    }

    onMount(() => {
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

    let models: Promise<Map<string, TrackModelType>> = loadModels();

    $: if (spline)
        console.log(
            sectionStartPos[selectedSectionIdx],
            forces(spline, sectionStartPos[selectedSectionIdx]),
        );
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

<div class="p-4 w-screen h-screen">
    <div class="flex flex-row w-full h-full">
        <div>track sections TODO</div>
        <div class="w-full h-full">
            <select bind:value={settings.unitSystem}>
                <option value={UnitSystem.Metric}>Metric (m, m/s)</option>
                <option value={UnitSystem.MetricKph}>Metric (m, km/h)</option>
                <option value={UnitSystem.Imperial}>Imperial (ft, mph)</option>
            </select>

            <button
                class="border p-1"
                on:click={() => {
                    var element = document.createElement("a");
                    element.setAttribute(
                        "href",
                        "data:text/plain;charset=utf-8," +
                            encodeURIComponent(spline.exportToNl2Elem()),
                    );
                    element.setAttribute("download", "fvd.nl2elem");

                    element.style.display = "none";
                    document.body.appendChild(element);

                    element.click();

                    document.body.removeChild(element);
                }}>Download nl2elem</button
            >

            <div class="w-full h-2/3">
                {#await models}
                    models loading...
                {:then models}
                    <Renderer {spline} {models} bind:pov />
                {/await}
            </div>
            <div class="flex gap-x-2">
                <PointInfo {spline} {pov} unitSystem={settings.unitSystem} />
            </div>
            <div class="h-1/3 w-full flex flex-row">
                {#if transitions && selected}
                    <div class="w-1/4 h-full grid grid-cols-2">
                        {#if selectedTransition && selected}
                            <label>Length:</label>
                            <NumberScroll
                                bind:value={selectedTransition.length}
                                min={0.1}
                            />
                            <!-- <button
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
                    class="px-1 py-0.5 rounded-md border border-gray-400 bg-gray-200"
                    >Set length to max</button
                > -->
                            <label
                                ><span class="mr-2">Value:</span><NumberScroll
                                    bind:value={selectedTransition.value}
                                    fractionalDigits={selected.arr === "roll"
                                        ? 0
                                        : 1}
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
                        {:else}
                            no transition selected{/if}
                    </div>
                    <Graph
                        bind:transitions
                        bind:selected
                        startForces={forces(
                            spline,
                            sectionStartPos[selectedSectionIdx],
                        )}
                    />
                {/if}
            </div>
        </div>
    </div>
</div>
