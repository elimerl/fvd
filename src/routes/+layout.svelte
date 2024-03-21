<script>
    import "@fontsource-variable/overpass";
    import "@fontsource-variable/overpass-mono";

    import "../app.css";

    import { pwaInfo } from "virtual:pwa-info";

    $: webManifestLink = pwaInfo ? pwaInfo.webManifest.linkTag : "";
</script>

<svelte:head>
    {@html webManifestLink}
    <title>forcevector</title>
    <meta name="theme-color" content="#ffffff" />
</svelte:head>

<slot />
