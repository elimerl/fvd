<script lang="ts">
    export let data;
    import markdownit from "markdown-it";

    const md = markdownit({
        html: true,
        linkify: true,
        typographer: true,
    });
</script>

<main
    class="mx-auto prose dark:prose-invert before:prose-p:content-none after:prose-p:content-none max-w-4xl"
>
    {@html md.render(data.content)}
</main>
