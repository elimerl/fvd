<script lang="ts">
    import "@fontsource-variable/overpass";
    import "@fontsource-variable/overpass-mono";

    import "$lib/app.css";

    import { Body } from "svelte-body";

    export let data;

    const darkMode = data.settings.darkMode;
</script>

<svelte:head>
    <title>forcevector.app</title>
    <meta name="theme-color" content={darkMode ? "#000000" : "#ffffff"} />
</svelte:head>
<Body
    class={(darkMode ? "dark bg-background text-foreground" : "") +
        " overscroll-none overflow-x-clip subpixel-antialiased"}
/>
<slot />
