<script lang="ts">
    import { SettingsIcon } from "svelte-feather-icons";
    export let data;
</script>

<nav class="flex flex-row items-center gap-x-8 px-4 py-2 h-16">
    <a href="/" class="text-xl font-bold">forcevector.app</a>
    {#if data.user}
        <a
            href="/editor/new"
            data-sveltekit-reload
            class="px-2 py-1 border rounded bg-green-600 text-white dark:bg-green-800 md:block hidden no-underline"
            >New Track</a
        >
    {/if}

    <div class="ml-auto h-full">
        {#if data.user}
            <div class="flex flex-row gap-x-4 justify-center">
                <a href="/settings" class="text-lg my-auto"
                    ><SettingsIcon size="1x" /></a
                >
                <form action="/login/logout" method="post" class="my-auto">
                    <button type="submit"> Logout</button>
                </form>

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

<footer class="text-sm text-center mb-4 mt-8">
    &copy; 2024 Eli Davies. All rights reserved.
</footer>
