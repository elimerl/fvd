<script lang="ts">
    export let data;
</script>

<svelte:body class="bg-background" />
<main>
    <div class="prose dark:prose-invert mx-auto px-4 mt-8">
        <h1>forcevector.app</h1>
        {#if data.user}
            <p>
                Logged in as {data.user.username}
                <a href={`/profile/${data.user.username}`}>Profile</a>
            </p>
        {:else}
            <p>Welcome to forcevector!</p>
            <a href="/login">Log in</a>
        {/if}
    </div>
</main>
