<script lang="ts">
    import { Button } from "bits-ui";
</script>

<Button.Root class="border p-1" on:click>
    <slot />
</Button.Root>
