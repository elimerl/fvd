// based on https://github.com/omnysecurity/vite-plugin-wasm-esm/blob/main/src/index.ts
import { basename, join } from "path";
import { type Plugin } from "vite";
import { createRequire } from "module";

const IDENTIFIER = "\0__vite-plugin-wasm-esm";
const require = createRequire(import.meta.url);

function wasmFileNameFromModule(module: string) {
    return basename(module).replace(/-/g, "_") + "_bg.wasm";
}

type ModuleResolution = {
    module: string;
    entryPath: string;
    wasmFileName: string;
    wasmPath: string;
};

export default function wasm(modules: string[]): Plugin {
    const moduleSet = new Set(modules);
    const resolutions: Map<string, ModuleResolution> = new Map();

    return {
        name: "vite-plugin-wasm-esm",
        enforce: "pre",

        async resolveId(source) {
            if (!moduleSet.has(source)) return null;
            const id = `${IDENTIFIER}?${source}`;
            if (!resolutions.has(id)) {
                // Manually resolve using require.resolve to bypass missing main field
                let entryPath: string;
                try {
                    entryPath = require.resolve(source + "/fvd_rs.js");
                } catch {
                    // fallback: find package dir and look for the js file
                    const pkgDir = join(
                        require.resolve(source + "/package.json"),
                        ".."
                    );
                    const wasmBaseName = wasmFileNameFromModule(source).replace(/_bg\.wasm$/, ".js");
                    entryPath = join(pkgDir, wasmBaseName);
                }

                const wasmFile = wasmFileNameFromModule(source);
                const wasmPath = join(entryPath, "..", wasmFile);

                resolutions.set(id, {
                    module: source,
                    entryPath,
                    wasmFileName: wasmFile,
                    wasmPath,
                });
            }

            return id;
        },

        async load(id) {
            const resolution = resolutions.get(id);
            if (!resolution) return null;

            return `
                import init from ${JSON.stringify(resolution.entryPath)};
                import url from ${JSON.stringify(resolution.wasmPath + "?url")};
                await init(url);
                export * from ${JSON.stringify(resolution.entryPath)};
                export default () => {};
            `;
        },
    };
}
