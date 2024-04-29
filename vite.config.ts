import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
    plugins: [sveltekit()],
    build: {
        rollupOptions: {
            external: [
                "better-sqlite3",
                "drizzle-orm/better-sqlite3",
                "bindings",
            ],
        },
    },
    optimizeDeps: { exclude: ["@elimerl/fvd-rs"] },
});
