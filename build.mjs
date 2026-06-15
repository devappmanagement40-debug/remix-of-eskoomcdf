import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, writeFile } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve @workspace/* packages to their source
const workspaceAlias = {
  "@workspace/db": path.resolve(__dirname, "lib/db/src/index.ts"),
  "@workspace/api-zod": path.resolve(__dirname, "lib/api-zod/src/index.ts"),
};

/** esbuild plugin that resolves @workspace/* to local source paths */
const workspacePlugin = {
  name: "workspace-resolver",
  setup(build) {
    build.onResolve({ filter: /^@workspace\// }, (args) => {
      const resolved = workspaceAlias[args.path];
      if (resolved) return { path: resolved };
      return null;
    });
  },
};

async function buildServer() {
  const distDir = path.resolve(__dirname, "dist");
  // Remove old server bundle (keep public/ from vite build)
  await rm(path.join(distDir, "index.mjs"), { force: true });
  await rm(path.join(distDir, "index.mjs.map"), { force: true });
  await rm(path.join(distDir, "pino-worker.mjs"), { force: true });
  await rm(path.join(distDir, "pino-file.mjs"), { force: true });
  await rm(path.join(distDir, "pino-pretty.mjs"), { force: true });
  await rm(path.join(distDir, "thread-stream-worker.mjs"), { force: true });

  await esbuild({
    // Bundle from artifacts/api-server/src — the up-to-date backend code
    entryPoints: [path.resolve(__dirname, "artifacts/api-server/src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    nodePaths: [
      path.resolve(__dirname, "artifacts/api-server/node_modules"),
      path.resolve(__dirname, "node_modules"),
    ],
    external: [
      "*.node", "sharp", "better-sqlite3", "sqlite3", "canvas",
      "bcrypt", "argon2", "fsevents", "re2", "farmhash",
      "bufferutil", "utf-8-validate", "pg-native",
    ],
    sourcemap: "linked",
    plugins: [
      workspacePlugin,
      esbuildPluginPino({ transports: ["pino-pretty"] }),
    ],
    banner: {
      js: `import { createRequire as __crReq } from 'node:module';
import __path from 'node:path';
import __url from 'node:url';
globalThis.require = __crReq(import.meta.url);
globalThis.__filename = __url.fileURLToPath(import.meta.url);
globalThis.__dirname = __path.dirname(globalThis.__filename);`,
    },
  });

  // CJS shim for Plesk — startup file
  const cjsShim = `'use strict';
(async () => { await import('./index.mjs'); })()
  .catch((err) => { console.error('Startup error:', err); process.exit(1); });
`;
  await writeFile(path.join(distDir, "index.cjs"), cjsShim, "utf8");
  console.log("\n✅ dist/index.cjs ready for Plesk");
}

buildServer().catch((err) => { console.error(err); process.exit(1); });
