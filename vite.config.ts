import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import wasm from "./wasm-plugin";

export default defineConfig({
    plugins: [sveltekit(), wasm(["@elimerl/fvd-rs"])],
    build: {
        rollupOptions: {
            external: ["bindings"],
        },
        target: ["chrome89", "safari15", "firefox89"],
    },
    esbuild: {
        target: ["chrome89", "safari15", "firefox89"],
    },
    optimizeDeps: {
        exclude: ["@elimerl/fvd-rs"],
    },
});
