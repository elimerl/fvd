import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import wasm from "./wasm-plugin";

export default defineConfig({
    plugins: [react(), tailwindcss(), wasm(["@elimerl/fvd-rs"])],
    optimizeDeps: {
        exclude: ["@elimerl/fvd-rs"],
    },
    build: {
        target: ["chrome89", "safari15", "firefox89"],
    },
    worker: {
        format: "es",
    },
});
