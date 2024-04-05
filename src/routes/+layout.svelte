<script lang="ts">
    import "@fontsource-variable/overpass";
    import "@fontsource-variable/overpass-mono";

    import "../app.css";

    export let data;

    const darkMode = data.settings ? data.settings.darkMode : false;
</script>

<svelte:body
    class={(darkMode ? "dark bg-background text-foreground" : "") +
        " overscroll-none overflow-x-clip subpixel-antialiased"}
/>

<svelte:head>
    <title>forcevector.app</title>
    <meta name="theme-color" content={darkMode ? "#000000" : "#ffffff"} />
</svelte:head>

<nav class="flex flex-row items-center justify-between px-4 py-2">
    <a href="/" class="text-xl font-bold">forcevector.app</a>
    <a href="/editor/new" class="px-2 py-1 border rounded dark:bg-green-800"
        >New Track</a
    >
    <a href="/settings" class="text-lg">Settings</a>
    {#if data.user}
        <div class="flex flex-row gap-x-4">
            <a href="/logout" class="my-auto">Logout</a>
            <a href={`/profile/${data.user.username}`} class="text-lg font-bold"
                >{data.user.username}</a
            >
        </div>
    {:else}
        <a href="/login" class="text-lg">Login</a>
    {/if}
</nav>

<slot />
