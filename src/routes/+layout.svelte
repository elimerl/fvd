<script lang="ts">
    import "@fontsource-variable/overpass";
    import "@fontsource-variable/overpass-mono";

    import "../app.css";

    import { SettingsIcon } from "svelte-feather-icons";

    import { Body } from "svelte-body";

    export let data;

    const darkMode = data.settings ? data.settings.darkMode : false;
</script>

<Body
    class={(darkMode ? "dark bg-background text-foreground" : "") +
        " overscroll-none overflow-x-clip subpixel-antialiased"}
/>

<svelte:head>
    <title>forcevector.app</title>
    <meta name="theme-color" content={darkMode ? "#000000" : "#ffffff"} />
</svelte:head>

<nav class="flex flex-row items-center gap-x-8 px-4 py-2">
    <a href="/" class="text-xl font-bold">forcevector.app</a>
    <a
        href="/editor/new"
        class="px-2 py-1 border rounded bg-green-600 text-white dark:bg-green-800"
        >New Track</a
    >
    <div class="ml-auto">
        {#if data.user}
            <div class="flex flex-row gap-x-4 fl">
                <a href="/settings" class="text-lg my-auto"
                    ><SettingsIcon size="20" /></a
                >
                <a href="/logout" class="my-auto">Logout</a>

                <a
                    href={`/profile/${data.user.username}`}
                    class="text-lg font-bold">{data.user.username}</a
                >
            </div>
        {:else}
            <a href="/login" class="text-lg">Login</a>
        {/if}
    </div>
</nav>

<slot />
