<script lang="ts">
    import { UnitSystem } from "$lib/core/units";

    export let data;

    let fov = data.settings.fov;
</script>

<main class="max-w-96 mx-auto px-4 my-8">
    <h1 class="font-semibold my-4 text-lg text-center">
        account settings for {data.user.username}
    </h1>
    <form method="post">
        <input name="redirect" type="hidden" value={data.redirectUrl} />
        <label class="flex gap-x-2"
            >Theme:<select name="darkMode" class="bg-background-alt p-1">
                <option selected={!data.settings.darkMode} value={false}
                    >Light</option
                >
                <option selected={data.settings.darkMode} value={true}
                    >Dark</option
                >
            </select>
        </label>
        <label class="flex gap-x-2"
            >Unit System:
            <select name="unitSystem" class="bg-background-alt p-1">
                <option
                    selected={data.settings.unitSystem === UnitSystem.Metric}
                    value={UnitSystem.Metric}>Metric (m, m/s)</option
                >
                <option
                    selected={data.settings.unitSystem === UnitSystem.MetricKph}
                    value={UnitSystem.MetricKph}>Metric (m, km/h)</option
                >
                <option
                    selected={data.settings.unitSystem === UnitSystem.Imperial}
                    value={UnitSystem.Imperial}>Imperial (ft, mph)</option
                >
            </select></label
        >
        <label class="flex gap-x-2"
            >FOV: <input
                type="range"
                min="50"
                max="120"
                step="5"
                name="fov"
                bind:value={fov}
            />
            {fov}</label
        >
        <button type="submit" class="button">submit</button>
    </form>
</main>
