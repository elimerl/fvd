import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";

export default defineConfig({
    plugins: [sveltekit(), SvelteKitPWA()],
});
