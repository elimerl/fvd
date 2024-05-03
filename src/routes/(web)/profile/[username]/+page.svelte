<script lang="ts">
    import UnitNumberSpan from "$lib/components/UnitNumberSpan.svelte";
    import * as _ from "lodash-es";
    import { Temporal } from "temporal-polyfill";
    import { browser } from "$app/environment";

    export let data;

    const createdAt = data.tracks.map((t) =>
        Temporal.PlainDateTime.from(t.createdAt)
            .toZonedDateTime("UTC")
            .withTimeZone(browser ? Temporal.Now.timeZoneId() : "UTC"),
    );
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
                    <p>
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
                    </p>
                </div>
            </li>
        {/each}
    </ul>
</main>
