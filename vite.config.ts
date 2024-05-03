import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
    plugins: [sveltekit()],
    build: {
        rollupOptions: {
            external: ["bindings"],
        },
    },
});
