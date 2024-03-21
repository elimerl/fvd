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
    import { loadModels, type TrackModelType } from "../coaster_types/model";

    import { IconTrash } from "@tabler/icons-svelte";

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

    let track = loadLocalStorage(
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

    $: ({ spline, sectionStartPos } = time(() => track.getSpline(), ""));

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

    // $: {
    //     transitions[selected.arr][selected.i] = selectedTransition;
    // }
    $: if (transitions) transitions.updateDynamicLengths();

    $: {
        if (settings.darkMode) {
            document.body.classList.add("dark");
        } else {
            document.body.classList.remove("dark");
        }
    }
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

<div class="w-screen h-screen dark:bg-slate-900 dark:text-white">
    <div class="flex flex-row w-full h-full">
        <div class="w-1/3 min-w-48 max-w-64 m-4 flex flex-col">
            <div class="h-2/3">
                <div class="flex flex-col border border-gray-200 h-full">
                    {#each track.sections as section, i}
                        <button
                            class={"p-1 border text-left dark:bg-slate-800 dark:text-white" +
                                (i === selectedSectionIdx
                                    ? " bg-blue-500 text-white dark:bg-blue-500 dark:text-white"
                                    : "")}
                            on:click={() => {
                                selectedSectionIdx = i;
                            }}
                            tabindex="0"
                        >
                            {section.type}

                            <button
                                class="my-auto inline align-middle float-right"
                                ><IconTrash /></button
                            >
                        </button>
                    {/each}
                </div>
            </div>
            <div>
                <button
                    class="border p-1"
                    on:click={() => {
                        track.sections.push({
                            type: "straight",
                            fixedSpeed: 10,
                            length: 10,
                        });
                        track = track;
                    }}>+ straight</button
                >
                <button class="border p-1">+ force</button>
            </div>
            <div class="flex-1 p-2">
                {#if selectedSection.type === "straight"}
                    <div class="flex flex-col">
                        <label
                            >Length: <div class="float-right">
                                <NumberScroll
                                    bind:value={selectedSection.length}
                                    min={0.1}
                                    fractionalDigits={0}
                                    unit="m"
                                />
                            </div></label
                        >
                        <label
                            >Fixed speed:
                            <input
                                type="checkbox"
                                checked={selectedSection.fixedSpeed !==
                                    undefined}
                                on:change={(e) => {
                                    selectedSection.fixedSpeed =
                                        //@ts-expect-error
                                        e.target.checked
                                            ? //@ts-expect-error
                                              selectedSection.length
                                            : undefined;
                                }}
                            />
                            <div class="float-right">
                                {#if selectedSection.fixedSpeed !== undefined}
                                    <NumberScroll
                                        bind:value={selectedSection.fixedSpeed}
                                        min={0.1}
                                        fractionalDigits={0}
                                        unit="m/s"
                                    />
                                {/if}
                            </div></label
                        >
                    </div>
                {/if}
            </div>
        </div>
        <div class="w-full h-full flex flex-col py-4">
            <div>
                <select
                    bind:value={settings.unitSystem}
                    class="dark:bg-slate-800 text-white"
                >
                    <option value={UnitSystem.Metric}>Metric (m, m/s)</option>
                    <option value={UnitSystem.MetricKph}
                        >Metric (m, km/h)</option
                    >
                    <option value={UnitSystem.Imperial}
                        >Imperial (ft, mph)</option
                    >
                </select>
                <select
                    bind:value={settings.darkMode}
                    class="dark:bg-slate-800 text-white"
                >
                    <option value={false}>Light</option>
                    <option value={true}>Dark</option>
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
            </div>

            <div class="w-full flex-initial h-2/3">
                {#await models}
                    models loading...
                {:then models}
                    <Renderer {spline} {models} bind:pov />
                {/await}
            </div>
            <div class="flex gap-x-2">
                <PointInfo {spline} {pov} unitSystem={settings.unitSystem} />
            </div>
            <div class="h-64 flex-auto w-full flex flex-row">
                {#if transitions}
                    <div class="w-1/4 h-full flex flex-col p-2">
                        <h1 class="font-semibold my-2">Transition Editor</h1>
                        {#if selectedTransition && selected}
                            <label
                                >Length: <div class="float-right">
                                    <NumberScroll
                                        bind:value={selectedTransition.length}
                                        min={0.1}
                                        unit="s"
                                    />
                                </div></label
                            >

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
                                ><span class="mr-2">Value:</span>
                                <div class="float-right">
                                    <NumberScroll
                                        bind:value={selectedTransition.value}
                                        fractionalDigits={selected.arr ===
                                        "roll"
                                            ? 0
                                            : 1}
                                    />
                                </div></label
                            >

                            <label
                                ><span class="mr-2">Curve:</span><select
                                    class="px-1 py-0.5 m-0.5 rounded-md border border-gray-400 float-right dark:bg-slate-800 text-white"
                                    bind:value={selectedTransition.curve}
                                >
                                    {#each curveTypes as curve}
                                        <option value={curve}>{curve}</option>
                                    {/each}
                                </select>
                            </label>

                            <label
                                ><span class="mr-2">Tension:</span>
                                <div class="float-right">
                                    <NumberScroll
                                        bind:value={selectedTransition.tension}
                                    />
                                </div></label
                            >
                        {:else}
                            <span class="text-center my-auto"
                                >no transition selected</span
                            >{/if}
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
