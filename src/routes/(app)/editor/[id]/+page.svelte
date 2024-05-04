<script lang="ts">
    import {
        Transitions,
        type Transition,
        curveTypes,
    } from "$lib/core/Transitions";
    import Graph from "$lib/components/Graph.svelte";
    import { time } from "$lib/util";
    import NumberScroll from "$lib/components/NumberScroll.svelte";
    import Renderer from "$lib/components/Renderer.svelte";
    import { keyState, keydownHandler, keyupHandler } from "$lib/input";

    import PointInfo from "$lib/components/PointInfo.svelte";
    import { onMount } from "svelte";

    import * as _ from "lodash-es";
    import { Track, forces } from "$lib/core/Track";
    import { loadModels, type TrackModelType } from "$lib/coaster_types/model";

    import { CloudIcon, CloudOffIcon, Trash2Icon } from "svelte-feather-icons";

    import { Pane, PaneGroup, PaneResizer } from "paneforge";
    import { Menubar } from "bits-ui";
    import { beforeNavigate } from "$app/navigation";
    import { TrackSpline } from "$lib/core/TrackSpline.js";

    import { page } from "$app/stores";

    let pov = { pos: 0 };

    export let data;

    let mode: "fly" | "pov" = "pov";

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

    let track = Track.fromJSON(JSON.parse(data.track.trackJson));

    $: {
        data.track.trackJson = JSON.stringify(track);
    }
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

    let [spline, sectionStartPos] = time(() => {
        const r = track.getSpline();
        return [r.spline, r.sectionStartPos];
    }, "spline");
    $: if (track) asyncUpdateTrack(track);
    let currentIdleCallback = 0;
    function asyncUpdateTrack(track: Track) {
        cancelIdleCallback(currentIdleCallback);
        currentIdleCallback = requestIdleCallback(
            () => {
                const results = time(() => track.getSpline(), "spline");
                [spline, sectionStartPos] = [
                    results.spline,
                    results.sectionStartPos,
                ];
            },
            { timeout: 100 },
        );
    }
    let saveTimeout: any;
    let dirty = false;
    $: {
        if (track) dirty = true;
    }
    $: {
        if (dirty) {
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                requestIdleCallback(
                    async () => {
                        await save();
                        dirty = false;
                    },
                    { timeout: 2000 },
                );
            }, 500);
        }
    }

    beforeNavigate(({ from, to, cancel }) => {
        if (dirty) {
            cancel();
            alert("Please wait for changes to be saved.");
            save();
        }
    });

    onMount(() => {
        const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
            if (dirty) {
                const confirmationMessage =
                    "If you leave this page, your changes will be lost.";

                (e || window.event).returnValue = confirmationMessage;
                return confirmationMessage;
            }
        };
        window.addEventListener("beforeunload", beforeUnloadHandler);
        dirty = false;
        return () => {
            window.removeEventListener("beforeunload", beforeUnloadHandler);
        };
    });

    let models: Promise<Map<string, TrackModelType>> = loadModels();

    let handle: FileSystemFileHandle | undefined;

    // $: {
    //     transitions[selected.arr][selected.i] = selectedTransition;
    // }
    $: if (transitions) {
        transitions.updateDynamicLengths();
        selected = selected;
    }

    async function save() {
        await fetch("/api/save", {
            credentials: "include",
            method: "PUT",
            body: JSON.stringify(data.track),
            headers: {
                "Content-Type": "application/json",
            },
        });
        dirty = false;
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

<div class="w-screen h-screen overflow-clip bg-background text-foreground">
    <Menubar.Root
        class="flex h-12 items-center gap-1 rounded-10px border border-dark-10 bg-background-alt px-[3px] shadow-mini pl-2"
    >
        <Menubar.Menu>
            <a class="font-semibold" href="/">forcevector.app</a>

            <Menubar.Trigger
                class="inline-flex h-8 cursor-default items-center justify-center rounded-9px px-1 text-base font-medium !ring-0 !ring-transparent data-[highlighted]:bg-muted data-[state=open]:bg-muted"
                >File</Menubar.Trigger
            >
            <Menubar.Content
                class="z-50 w-full max-w-[220px]  border border-muted bg-background px-1 py-1.5 shadow-popover !ring-0 !ring-transparent text-foreground"
                align="start"
                sideOffset={3}
            >
                <a href="/editor/new" data-sveltekit-reload
                    ><Menubar.Item
                        class="flex h-8 select-none items-center py-0.5 pl-2 text-foreground text-base font-medium !ring-0 !ring-transparent data-[highlighted]:bg-muted"
                        >New</Menubar.Item
                    ></a
                >
                <Menubar.Item
                    class="flex h-8 select-none items-center py-1 pl-2 text-foreground text-base font-medium !ring-0 !ring-transparent data-[highlighted]:bg-muted"
                    on:click={async () => {
                        if ("showSaveFilePicker" in window) {
                            if (!handle)
                                handle = await window.showSaveFilePicker({
                                    types: [
                                        {
                                            description:
                                                "NoLimits 2 Element Files",
                                            accept: {
                                                "application/octet-stream":
                                                    ".nl2elem",
                                            },
                                        },
                                    ],
                                });
                            if (handle) {
                                const writable = await handle.createWritable();
                                await writable.write(spline.exportToNl2Elem());
                                await writable.close();
                            }
                        } else {
                            var element = document.createElement("a");
                            element.setAttribute(
                                "href",
                                "data:text/plain;charset=utf-8," +
                                    encodeURIComponent(
                                        spline.exportToNl2Elem(),
                                    ),
                            );
                            element.setAttribute(
                                "download",
                                data.track.name + ".nl2elem",
                            );

                            element.style.display = "none";
                            document.body.appendChild(element);

                            element.click();

                            document.body.removeChild(element);
                        }
                    }}
                    >Export {handle
                        ? `(${handle.name})`
                        : "nl2elem"}</Menubar.Item
                >
                <Menubar.Item
                    class="flex h-8 select-none items-center py-1 pl-2 text-foreground text-base font-medium !ring-0 !ring-transparent data-[highlighted]:bg-muted"
                    on:click={async () => {
                        var element = document.createElement("a");
                        element.setAttribute(
                            "href",
                            "data:text/plain;charset=utf-8," +
                                encodeURIComponent(JSON.stringify(track)),
                        );
                        element.setAttribute(
                            "download",
                            data.track.name + ".json",
                        );

                        element.style.display = "none";
                        document.body.appendChild(element);

                        element.click();

                        document.body.removeChild(element);
                    }}>Export track JSON (beta)</Menubar.Item
                >
                <Menubar.Item
                    class="flex h-8 select-none items-center py-1 pl-2 text-foreground text-base font-medium !ring-0 !ring-transparent data-[highlighted]:bg-muted"
                    on:click={async () => {
                        var element = document.createElement("input");
                        element.setAttribute("type", "file");
                        element.setAttribute("accept", "application/json");

                        element.style.display = "none";
                        document.body.appendChild(element);

                        element.click();
                        element.onchange = async () => {
                            const file = element.files[0];
                            const contents = await file.text();
                            const json = JSON.parse(contents);
                            if (
                                confirm(
                                    "Importing a track deletes the current track. Are you sure?",
                                )
                            ) {
                                track = Track.fromJSON(json);
                            }
                        };
                        document.body.removeChild(element);
                    }}>Import track JSON (beta)</Menubar.Item
                >
            </Menubar.Content>
        </Menubar.Menu>
        <Menubar.Menu>
            <Menubar.Trigger
                class="inline-flex h-8 cursor-default items-center justify-center rounded-[9px] px-1 text-base font-medium !ring-0 !ring-transparent data-[highlighted]:bg-muted data-[state=open]:bg-muted"
                >Edit</Menubar.Trigger
            >
            <Menubar.Content
                class="z-50 w-full max-w-[220px]  border border-muted bg-background px-1 py-1.5 shadow-popover"
                align="start"
                sideOffset={3}
            >
                <a
                    href={"/settings?redirect=" + $page.url.pathname}
                    data-sveltekit-reload
                    ><Menubar.Item
                        class="flex h-8 select-none items-center py-0.5 pl-2 text-foreground text-base font-medium !ring-0 !ring-transparent data-[highlighted]:bg-muted"
                        >Settings</Menubar.Item
                    ></a
                >
            </Menubar.Content>
        </Menubar.Menu>
        <p class="text-foreground-alt">
            <span>
                {#if data.user && data.user.id === data.track.userId}
                    {#if dirty}
                        <CloudOffIcon class="inline-block mr-1" size="1x" /> not
                        saved
                    {:else}
                        <CloudIcon class="inline-block mr-1" size="1x" /> saved
                    {/if}
                {:else}
                    not owned by you
                {/if}</span
            >
        </p>
    </Menubar.Root>
    <div class="flex flex-row w-full h-full">
        <div class="w-1/3 min-w-48 max-w-64 m-4 flex flex-col">
            <div>
                <details class="flex flex-col">
                    <summary>
                        <span class="mb-2 font-semibold text-lg">
                            Track properties
                        </span>
                    </summary>
                    <label
                        >Name <input
                            type="text"
                            class="bg-background-alt text-foreground px-1 py-0.5 border"
                            bind:value={data.track.name}
                        />
                    </label>
                    <label
                        >Description <textarea
                            class="bg-background-alt text-foreground p-1 border"
                            bind:value={data.track.description}
                            placeholder="Description goes here..."
                        />
                    </label>

                    <label class="mb-1"
                        >Anchor Y
                        <NumberScroll
                            bind:value={track.anchor.pos[1]}
                            unit="m"
                        /></label
                    >

                    <label class="mb-1"
                        >Heartline Height
                        <NumberScroll
                            bind:value={track.config.heartlineHeight}
                            unit="m"
                        /></label
                    >
                    <label class="mb-1"
                        >Friction
                        <NumberScroll
                            fractionalDigits={2}
                            bind:value={track.config.parameter}
                        /></label
                    >
                </details>
            </div>
            <div class="flex flex-col flex-grow">
                <p class="mb-2 font-semibold text-lg">Track sections</p>
                <div class="h-1/2">
                    <div
                        class="flex flex-col border border-gray-200 h-full overflow-y-scroll overflow-x-hidden"
                    >
                        {#each track.sections as section, i}
                            <button
                                class={"p-1 border text-left " +
                                    (i === selectedSectionIdx
                                        ? "bg-blue-500 text-white dark:bg-blue-500 dark:text-white"
                                        : "dark:bg-slate-800 dark:text-white")}
                                on:click={() => {
                                    selectedSectionIdx = i;
                                }}
                                tabindex="0"
                            >
                                {section.type}

                                <button
                                    class="my-auto inline align-middle float-right"
                                    on:click={() => {
                                        if (track.sections.length > 1) {
                                            track.sections.splice(i, 1);
                                            selectedSectionIdx = 0;
                                            track = track;
                                        }
                                    }}><Trash2Icon class="p-0.5" /></button
                                >
                            </button>
                        {/each}
                    </div>
                </div>
                <div>
                    <button
                        class="button"
                        on:click={() => {
                            track.sections.splice(selectedSectionIdx + 1, 0, {
                                type: "straight",
                                fixedSpeed: 10,
                                length: 10,
                            });
                            track = track;
                        }}>+ straight</button
                    >
                    <button
                        class="button"
                        on:click={() => {
                            track.sections.splice(selectedSectionIdx + 1, 0, {
                                type: "curved",
                                fixedSpeed: 10,
                                radius: 15,
                                angle: 45,
                                direction: 0,
                            });
                            track = track;
                        }}>+ curved</button
                    >
                    <button
                        class="button"
                        on:click={() => {
                            track.sections.splice(selectedSectionIdx + 1, 0, {
                                type: "force",
                                fixedSpeed: undefined,
                                transitions: new Transitions(),
                            });
                            track = track;
                        }}>+ force</button
                    >
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
                                            e.target.checked ? 10 : undefined;
                                        track = track;
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
                    {#if selectedSection.type === "curved"}
                        <div class="flex flex-col">
                            <label
                                >Radius: <div class="float-right">
                                    <NumberScroll
                                        bind:value={selectedSection.radius}
                                        min={0.1}
                                        fractionalDigits={0}
                                        unit="m"
                                    />
                                </div></label
                            >
                            <label
                                >Total angle: <div class="float-right">
                                    <NumberScroll
                                        bind:value={selectedSection.angle}
                                        min={0.1}
                                        fractionalDigits={0}
                                        unit="°"
                                    />
                                </div></label
                            >
                            <label
                                >Direction: <div class="float-right">
                                    <NumberScroll
                                        bind:value={selectedSection.direction}
                                        min={-180}
                                        max={180}
                                        fractionalDigits={0}
                                        unit="°"
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
                                            e.target.checked ? 10 : undefined;
                                        track = track;
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
                    {#if selectedSection.type === "force"}
                        <div class="flex flex-col">
                            <label
                                >Fixed speed:
                                <input
                                    type="checkbox"
                                    checked={selectedSection.fixedSpeed !==
                                        undefined}
                                    on:change={(e) => {
                                        selectedSection.fixedSpeed =
                                            //@ts-expect-error
                                            e.target.checked ? 10 : undefined;
                                        track = track;
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
        </div>
        <div class="w-full flex flex-col py-4">
            <PaneGroup class="h-full" direction="vertical">
                <Pane class="bg-background" minSize={20}>
                    <div class="flex flex-col overflow-clip h-full">
                        <div class="w-full flex-shrink flex-grow min-h-16">
                            {#await models}
                                <p
                                    class="text-xl text-center my-auto w-full h-full"
                                >
                                    models loading...
                                </p>
                            {:then models}
                                <Renderer
                                    {spline}
                                    {models}
                                    config={track.config}
                                    fov={70 ?? data.settings.fov}
                                    bind:mode
                                    bind:pov
                                />
                            {/await}
                        </div>
                        <div class="flex-shrink-0">
                            <PointInfo
                                {spline}
                                {pov}
                                unitSystem={data.settings.unitSystem}
                                mode={mode === "fly" ? "atEnd" : "pov"}
                            />
                        </div>
                    </div></Pane
                >
                <PaneResizer class="py-2"
                    ><div
                        class="h-1 border-t border-slate-300 dark:border-slate-500 p-0 mx-4"
                    ></div></PaneResizer
                >
                <Pane>
                    <div class="h-full flex-1 w-full flex flex-row">
                        {#if transitions}
                            <div class="w-1/3 flex flex-col p-2">
                                <h1 class="font-semibold my-2">
                                    Transition Editor
                                </h1>
                                {#if selectedTransition && selected}
                                    <label
                                        ><span class="mr-2"
                                            >Length: dynamic <input
                                                type="checkbox"
                                                bind:checked={selectedTransition.dynamicLength}
                                            /></span
                                        >
                                        {#if !selectedTransition.dynamicLength}
                                            <div class="float-right">
                                                <NumberScroll
                                                    bind:value={selectedTransition.length}
                                                    fractionalDigits={1}
                                                    min={0.1}
                                                    max={100}
                                                />
                                            </div>
                                        {/if}
                                    </label>

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
                                            class="px-1 py-0.5 m-0.5 rounded-md border border-gray-400 float-right dark:bg-slate-800 dark:text-white"
                                            bind:value={selectedTransition.curve}
                                        >
                                            {#each curveTypes as curve}
                                                <option value={curve}
                                                    >{curve}</option
                                                >
                                            {/each}
                                        </select>
                                    </label>
                                    <label
                                        ><span class="mr-2">Center:</span>
                                        <div class="float-right">
                                            <NumberScroll
                                                bind:value={selectedTransition.center}
                                            />
                                        </div></label
                                    >
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
                            <div class="w-full h-full pb-8">
                                <Graph
                                    bind:transitions
                                    bind:selected
                                    startForces={forces(
                                        spline,
                                        sectionStartPos[selectedSectionIdx],
                                    )}
                                    markerTime={spline.evaluate(pov.pos) &&
                                    spline.evaluate(
                                        sectionStartPos[selectedSectionIdx],
                                    )
                                        ? spline.evaluate(pov.pos).time -
                                          spline.evaluate(
                                              sectionStartPos[
                                                  selectedSectionIdx
                                              ],
                                          ).time
                                        : 0}
                                />
                            </div>
                        {:else}
                            <span class="text-center my-auto w-full"
                                >select a section with a graph</span
                            >
                        {/if}
                    </div></Pane
                ></PaneGroup
            >
        </div>
    </div>
</div>
