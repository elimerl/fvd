<script>
    import { page } from "$app/stores";
</script>

<main class="mt-8 mx-auto px-4 max-w-xl prose dark:prose-invert">
    <h1>
        {$page.status}
    </h1>
    <p>{$page.status === 404 ? "Not Found" : $page.error.message}</p>
    <pre>{$page.error.stack}</pre>
    <a href="/">Home</a>
</main>
