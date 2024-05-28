<script lang="ts">
    import { Dialog } from "bits-ui";
    import NumberScroll from "./NumberScroll.svelte";
    import NumberDisplay from "./NumberDisplay.svelte";
    import type { Track } from "$lib/core/Track";
    import type { TrackModelType } from "$lib/coaster_types/model";

    export let open = false;

    export let dataTrack: {
        id: number;
        name: string;
        userId: number;
        trackJson: string;
        description: string;
    };

    export let track: Track;
    export let models: Promise<Map<string, TrackModelType>>;
</script>

<Dialog.Root bind:open>
    <Dialog.Portal>
        <Dialog.Overlay
            transitionConfig={{ duration: 150 }}
            class="fixed inset-0 z-50 bg-black/80"
        />
        <Dialog.Content
            class="fixed left-[50%] top-[50%] z-50 w-full max-w-[94%] translate-x-[-50%] translate-y-[-50%] border bg-background p-5 shadow-popover outline-none sm:max-w-[490px] md:w-full"
        >
            <Dialog.Title
                class="flex w-full items-center justify-center text-lg font-semibold tracking-tight"
                >Track Settings</Dialog.Title
            >
            <Dialog.Description class="text-sm text-foreground-alt">
                Configuration for the current track.
            </Dialog.Description>
            <div class="flex flex-col py-4">
                <label
                    ><span class="mr-2">Name: </span>
                    <div class="float-right">
                        <input
                            type="text"
                            class="bg-background-alt text-foreground px-1 py-0.5 border w-full"
                            bind:value={dataTrack.name}
                        />
                    </div>
                </label>
                <label
                    ><span class="mr-2">Description: </span>
                    <textarea
                        class="bg-background-alt text-foreground p-1 border w-full"
                        bind:value={dataTrack.description}
                        placeholder="Optional: include a brief description of the track"
                    />
                </label>

                <label class="mb-1"
                    >Anchor Y
                    <div class="float-right">
                        <NumberScroll
                            bind:value={track.anchor.pos[1]}
                            unit="m"
                        />
                    </div></label
                >

                <label class="mb-1"
                    >Heartline Height
                    <div class="float-right">
                        <NumberScroll
                            bind:value={track.config.heartlineHeight}
                            unit="m"
                        />
                    </div></label
                >
                <label class="mb-1"
                    >Friction
                    <div class="float-right">
                        <NumberScroll
                            fractionalDigits={2}
                            bind:value={track.config.parameter}
                        />
                    </div></label
                >
                <label class="mb-1"
                    >Model
                    {#await models then models}
                        <select
                            class="px-1 py-0.5 rounded-md border border-gray-400 float-right dark:bg-slate-800 dark:text-white"
                            bind:value={track.config.modelId}
                        >
                            {#each models as model}
                                <option value={model[0]}>{model[1].name}</option
                                >
                            {/each}
                        </select>
                    {/await}
                </label>

                <Dialog.Close class="button w-min ml-auto">
                    <div>Close</div>
                </Dialog.Close>
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
