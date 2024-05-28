<script lang="ts">
    import { Dialog } from "bits-ui";
    import NumberScroll from "./NumberScroll.svelte";
    import NumberDisplay from "./NumberDisplay.svelte";
    import { G } from "$lib/core/constants";

    export let open = false;

    let launchVelocity = 10;
    let launchAccel = 1;

    $: launchTime = launchVelocity / (launchAccel * G);
    $: launchLength = 0.5 * (launchAccel * G) * (launchTime * launchTime);
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
                >Launch track calculator</Dialog.Title
            >
            <Dialog.Description class="text-sm text-foreground-alt">
                Calculates launch time, and launch track length given an
                acceleration and a desired velocity.
            </Dialog.Description>
            <div class="flex flex-col py-4">
                <label
                    ><span class="mr-2">Velocity: </span>
                    <div class="float-right">
                        <NumberScroll
                            bind:value={launchVelocity}
                            fractionalDigits={0}
                            min={0.1}
                        />
                    </div>
                </label>
                <label
                    ><span class="mr-2">Acceleration: </span>
                    <div class="float-right">
                        <NumberScroll bind:value={launchAccel} min={0.1} />
                    </div>
                </label>

                <NumberDisplay
                    unit="m"
                    value={Math.ceil(launchLength)}
                    label="Min Launch Length"
                />
                <NumberDisplay
                    unit="s"
                    value={launchTime}
                    label="Min Launch Time"
                />

                <Dialog.Close class="button w-min ml-auto">
                    <div>Close</div>
                </Dialog.Close>
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
