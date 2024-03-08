import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
    preprocess: vitePreprocess(),

    // Disable accessibility warnings
    onwarn: (warning, handler) => {
        if (warning.code.toLowerCase().includes("a11y")) return;
        handler(warning);
    },
};
