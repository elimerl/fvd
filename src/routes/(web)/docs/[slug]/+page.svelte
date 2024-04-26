<script lang="ts">
    import { micromark } from "micromark";
    import { gfm, gfmHtml } from "micromark-extension-gfm";
    import {
        frontmatter,
        frontmatterHtml,
        toMatters,
    } from "micromark-extension-frontmatter";
    import { matter } from "vfile-matter";

    export let data;

    const html = micromark(data.content, {
        extensions: [gfm(), frontmatter()],
        htmlExtensions: [gfmHtml(), frontmatterHtml()],
    });
    console.log(data, matter(data.content)); // FIXME: use vfile as well so this doesn't error
</script>

<main class="prose dark:prose-invert mx-auto px-4 mt-8">
    {@html html}
</main>
