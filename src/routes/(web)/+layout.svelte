<script lang="ts">
    import { SettingsIcon } from "svelte-feather-icons";
    export let data;
</script>

<nav class="flex flex-row items-center gap-x-8 px-4 py-2">
    <a href="/" class="text-xl font-bold">forcevector.app</a>
    {#if data.user}
        <a
            href="/editor/new"
            data-sveltekit-reload
            class="px-2 py-1 border rounded bg-green-600 text-white dark:bg-green-800 md:block hidden"
            >New Track</a
        >
    {/if}

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
