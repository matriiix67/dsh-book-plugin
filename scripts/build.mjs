import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await Promise.all([
  build({
    entryPoints: ["src/host/library.ts"],
    outfile: "dist/library.js",
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
  }),
  build({
    entryPoints: ["src/host/index.ts"],
    outfile: "dist/host.js",
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    banner: {
      js: 'import {createRequire as bookshelfCreateRequire} from "node:module";const require=bookshelfCreateRequire(import.meta.url);',
    },
    external: ["@deepseek-ai/*", "zod"],
    sourcemap: true,
  }),
  build({
    entryPoints: ["src/host/dictionary.ts"],
    outfile: "dist/dictionary.js",
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
  }),
  build({
    entryPoints: ["src/host/dict-worker.ts"],
    outfile: "dist/dict-worker.js",
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    sourcemap: true,
  }),
  build({
    entryPoints: ["src/host/parse-worker.ts"],
    outfile: "dist/parse-worker.js",
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    banner: {
      js: 'import {createRequire as bookshelfCreateRequire} from "node:module";const require=bookshelfCreateRequire(import.meta.url);',
    },
    sourcemap: true,
  }),
  build({
    entryPoints: ["src/typert.ts"],
    outfile: "dist/typert.js",
    bundle: true,
    format: "esm",
    platform: "node",
    external: ["@deepseek-ai/*", "zod"],
  }),
  build({
    entryPoints: ["src/client/index.tsx"],
    outfile: "dist/client.js",
    bundle: true,
    format: "cjs",
    platform: "browser",
    target: "es2022",
    external: ["react", "react/jsx-runtime", "zod"],
    loader: { ".css": "text" },
    banner: {
      js: 'window.__ModuleLoader__.load({id:"@matriiix67/dsh-book-plugin", factory(require) { var module={exports:{}}; var exports=module.exports;',
    },
    footer: { js: "return module.exports; }});" },
    sourcemap: true,
  }),
]);
