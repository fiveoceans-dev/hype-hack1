import { defineConfig } from "tsup"

export default defineConfig({
    entry: {
        index: "src/index.ts",
        "web/server": "src/web/server.ts",
    },
    splitting: false,
    sourcemap: true,
    clean: true,
    bundle: true,
    minify: true,
    platform: "node",
    tsconfig: "tsconfig.json",
    keepNames: true,
})
