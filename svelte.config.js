import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter(),
        csrf: {
            checkOrigin: true,
        },
    },
    preprocess: [vitePreprocess()],

    // Disable accessibility warnings
    onwarn: (warning, handler) => {
        if (warning.code.toLowerCase().includes("a11y")) return;
        handler(warning);
    },
};

export default config;
