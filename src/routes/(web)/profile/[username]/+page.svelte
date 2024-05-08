<script lang="ts">
    import UnitNumberSpan from "$lib/components/UnitNumberSpan.svelte";
    import * as _ from "lodash-es";
    import { Temporal } from "temporal-polyfill";
    import { browser } from "$app/environment";
    import { Pagination } from "bits-ui";
    import { ChevronLeftIcon, ChevronRightIcon } from "svelte-feather-icons";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    export let data;

    const createdAt = data.tracks.map((t) =>
        Temporal.PlainDateTime.from(t.createdAt)
            .toZonedDateTime("UTC")
            .withTimeZone(browser ? Temporal.Now.timeZoneId() : "UTC"),
    );

    let pageNum = 1;

    $: if (pageNum && !import.meta.env.SSR) {
        let query = new URLSearchParams($page.url.searchParams.toString());

        query.set("page", pageNum.toString());

        goto(`?${query.toString()}`);
    }
</script>

<main class="mt-8 mx-auto px-4 max-w-xl">
    <h1 class="text-3xl font-bold my-4">
        {data.user.username}
    </h1>
    <ul>
        {#each data.tracks as track, i}
            <li class="my-8">
                <h2 class="text-2xl font-bold">
                    <a href={`/editor/${track.id}`}>{track.name}</a>
                </h2>
                <p class="mt-2">
                    {track.description}
                </p>
                <div class="ml-2 my-2">
                    <p>
                        created <time
                            title={createdAt[i].toString()}
                            datetime={createdAt[i].toString()}
                            >{createdAt[i].toLocaleString("en-US")}</time
                        >
                    </p>
                    <!-- <p>
                        length: <UnitNumberSpan
                            value={data.stats[i].length}
                            baseUnit="distance"
                            unitSystem={data.settings.unitSystem}
                            fractionalDigits={1}
                        />
                    </p>
                    <p>
                        height:
                        <UnitNumberSpan
                            value={data.stats[i].height}
                            baseUnit="distance"
                            unitSystem={data.settings.unitSystem}
                            fractionalDigits={1}
                        />
                    </p>
                    <p>
                        top speed: <UnitNumberSpan
                            value={data.stats[i].topSpeed}
                            baseUnit="velocity"
                            unitSystem={data.settings.unitSystem}
                            fractionalDigits={0}
                        />
                    </p> -->
                </div>
            </li>
        {/each}
        <div class="flex items-center justify-center">
            <div>
                <Pagination.Root
                    class="my-8"
                    count={data.count}
                    perPage={data.pageSize}
                    let:pages
                    let:range
                    bind:page={pageNum}
                >
                    <div class="flex my-2">
                        <Pagination.PrevButton
                            class="mr-4 inline-flex size-8 items-center justify-center bg-transparent hover:bg-dark-10 active:scale-98 disabled:cursor-not-allowed disabled:text-muted-foreground hover:disabled:bg-transparent"
                        >
                            <ChevronLeftIcon class="size-6" />
                        </Pagination.PrevButton>
                        <div class="flex items-center gap-1">
                            {#each pages as page (page.key)}
                                {#if page.type === "ellipsis"}
                                    <div
                                        class="text-[16px] font-medium text-foreground-alt"
                                    >
                                        ...
                                    </div>
                                {:else}
                                    <Pagination.Page
                                        {page}
                                        class="inline-flex size-8 items-center justify-center bg-transparent text-[16px] font-medium hover:bg-dark-10 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 hover:disabled:bg-transparent data-[selected]:bg-foreground data-[selected]:text-background"
                                    >
                                        {page.value}
                                    </Pagination.Page>
                                {/if}
                            {/each}
                        </div>
                        <Pagination.NextButton
                            class="ml-[17px] inline-flex size-8 items-center justify-center bg-transparent hover:bg-dark-10 active:scale-98 disabled:cursor-not-allowed disabled:text-muted-foreground hover:disabled:bg-transparent"
                        >
                            <ChevronRightIcon class="size-6" />
                        </Pagination.NextButton>
                    </div>
                    <p class="text-center text-muted-foreground">
                        Showing {range.start} - {range.end} (total {data.count})
                    </p>
                </Pagination.Root>
            </div>
        </div>
    </ul>
</main>
