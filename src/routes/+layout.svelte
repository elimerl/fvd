<script lang="ts">
    import "@fontsource-variable/overpass";
    import "@fontsource-variable/overpass-mono";

    import "../app.css";

    import { SettingsIcon } from "svelte-feather-icons";

    export let data;

    const darkMode = data.settings.darkMode;
</script>

<svelte:body
    class={(darkMode ? "dark bg-background text-foreground" : "") +
        " overscroll-none overflow-x-clip subpixel-antialiased"}
/>

<svelte:head>
    <title>forcevector.app</title>
    <meta name="theme-color" content={darkMode ? "#000000" : "#ffffff"} />
</svelte:head>

<slot />
