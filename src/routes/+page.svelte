<script lang="ts">
    export let data;
</script>

<svelte:body class="bg-background" />
<main>
    <div class="prose dark:prose-invert mx-auto px-4 mt-8">
        <h1>forcevector.app</h1>
        <a href="/login">Log in</a>
        {#if data.user}
            <p>
                Logged in as {data.user.username}
                <a href={`/profile/${data.user.username}`}>Profile</a>
            </p>
        {/if}

        <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas
            vel metus viverra diam finibus viverra a in leo. Praesent vel varius
            ante. Pellentesque vitae tellus vitae velit feugiat sagittis ac
            mattis ipsum. Ut nec condimentum orci, sed hendrerit nibh. Morbi
            tempus, justo non blandit viverra, ipsum urna placerat orci, sed
            pulvinar enim ante quis turpis. Donec sed arcu id diam ultricies
            vehicula. Ut pharetra, tortor a aliquet hendrerit, tortor eros
            auctor lorem, eu scelerisque orci mi a enim. Cras tempor tristique
            magna. Sed interdum finibus urna, sed maximus enim viverra a. Nunc
            consectetur urna vitae urna imperdiet faucibus. Vivamus tincidunt
            molestie rutrum. Proin consectetur nec nunc at vulputate. Nulla nec
            ex vel lorem tempor iaculis. Ut pharetra justo nec dapibus faucibus.
            Phasellus quis pulvinar ipsum. Donec pellentesque nisl tincidunt
            nunc facilisis maximus vel ac erat.
        </p>

        <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas
            vel metus viverra diam finibus viverra a in leo. Praesent vel varius
            ante. Pellentesque vitae tellus vitae velit feugiat sagittis ac
            mattis ipsum. Ut nec condimentum orci, sed hendrerit nibh. Morbi
            tempus, justo non blandit viverra, ipsum urna placerat orci, sed
            pulvinar enim ante quis turpis. Donec sed arcu id diam ultricies
            vehicula. Ut pharetra, tortor a aliquet hendrerit, tortor eros
            auctor lorem, eu scelerisque orci mi a enim. Cras tempor tristique
            magna. Sed interdum finibus urna, sed maximus enim viverra a. Nunc
            consectetur urna vitae urna imperdiet faucibus. Vivamus tincidunt
            molestie rutrum. Proin consectetur nec nunc at vulputate. Nulla nec
            ex vel lorem tempor iaculis. Ut pharetra justo nec dapibus faucibus.
            Phasellus quis pulvinar ipsum. Donec pellentesque nisl tincidunt
            nunc facilisis maximus vel ac erat.
        </p>

        <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas
            vel metus viverra diam finibus viverra a in leo. Praesent vel varius
            ante. Pellentesque vitae tellus vitae velit feugiat sagittis ac
            mattis ipsum. Ut nec condimentum orci, sed hendrerit nibh. Morbi
            tempus, justo non blandit viverra, ipsum urna placerat orci, sed
            pulvinar enim ante quis turpis. Donec sed arcu id diam ultricies
            vehicula. Ut pharetra, tortor a aliquet hendrerit, tortor eros
            auctor lorem, eu scelerisque orci mi a enim. Cras tempor tristique
            magna. Sed interdum finibus urna, sed maximus enim viverra a. Nunc
            consectetur urna vitae urna imperdiet faucibus. Vivamus tincidunt
            molestie rutrum. Proin consectetur nec nunc at vulputate. Nulla nec
            ex vel lorem tempor iaculis. Ut pharetra justo nec dapibus faucibus.
            Phasellus quis pulvinar ipsum. Donec pellentesque nisl tincidunt
            nunc facilisis maximus vel ac erat.
        </p>
    </div>
</main>
