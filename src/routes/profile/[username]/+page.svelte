<script lang="ts">
    import UnitNumberDisplay from "$lib/components/UnitNumberDisplay.svelte";
    import UnitNumberSpan from "$lib/components/UnitNumberSpan.svelte";
    import { Track } from "$lib/core/Track";
    import dayjs from "dayjs";
    import utc from "dayjs/plugin/utc";
    dayjs.extend(utc);
    import * as _ from "lodash-es";

    export let data;

    const tracks = data.tracks.map((track) =>
        Track.fromJSON(JSON.parse(track.trackJson)),
    );
    const splines = tracks.map((track) => track.getSpline().spline);

    const heights = splines.map((spline) => {
        const y = spline.points.map((v) => v.pos[1]);
        return _.max(y) - _.min(y);
    });

    const topSpeeds = splines.map((spline) => {
        const v = spline.points.map((v) => v.velocity);
        return _.max(v);
    });
</script>

<main class="mt-8 mx-auto px-4 max-w-xl">
    <h1 class="text-3xl font-bold my-4">
        {data.user.username}
    </h1>
    <ul>
        {#each data.tracks as track, i}
            <li class="">
                <h2 class="text-2xl font-bold">
                    <a href={`/editor/${track.id}`}>{track.name}</a>
                </h2>
                <div class="ml-2 my-2">
                    <p>
                        created <time
                            title={dayjs(track.createdAt).toISOString()}
                            datetime={dayjs(track.createdAt).toISOString()}
                            >{dayjs(track.createdAt).format(
                                "YYYY-MM-DD hh:mm a",
                            )}</time
                        >
                    </p>
                    <p>
                        length <UnitNumberSpan
                            value={splines[i].getLength()}
                            baseUnit="distance"
                            unitSystem={data.settings.unitSystem}
                            fractionalDigits={1}
                        />
                    </p>
                    <p>
                        height (total elevation change) <UnitNumberSpan
                            value={heights[i]}
                            baseUnit="distance"
                            unitSystem={data.settings.unitSystem}
                            fractionalDigits={1}
                        />
                    </p>
                    <p>
                        top speed <UnitNumberSpan
                            value={topSpeeds[i]}
                            baseUnit="velocity"
                            unitSystem={data.settings.unitSystem}
                            fractionalDigits={0}
                        />
                    </p>
                </div>
                <p>{track.description}</p>
            </li>
        {/each}
    </ul>
</main>
