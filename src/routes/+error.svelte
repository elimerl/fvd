<script>
    import { page } from "$app/stores";
    import { dev } from "$app/environment";
</script>

<main class="mt-8 mx-auto px-4 max-w-xl prose dark:prose-invert">
    <h1>
        {$page.status}
    </h1>
    <p>{$page.status === 404 ? "Not Found" : $page.error.message}</p>

    {#if dev && $page.error.stack}
        <pre>{$page.error.stack}</pre>
    {/if}
    <a href="/">Home</a>
</main>
