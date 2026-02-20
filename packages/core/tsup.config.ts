import { defineConfig } from 'tsup';
import { build } from 'esbuild';
import { readFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';

/**
 * Two-pass build:
 *
 * Pass 1 — Build `src/worker/parse-worker.ts` as a self-contained IIFE bundle.
 *          Output goes to a temp directory, then the IIFE source is read as a
 *          string to be inlined into the main bundle.
 *
 * Pass 2 — Build the main `src/index.ts` entry with `__WORKER_CODE__` replaced
 *          by the inlined worker IIFE string via esbuild `define`.
 */
export default defineConfig(async () => {
  const workerTmpDir = resolve(__dirname, 'dist/.worker-tmp');

  // Pass 1: Build worker as IIFE
  mkdirSync(workerTmpDir, { recursive: true });

  await build({
    entryPoints: [resolve(__dirname, 'src/worker/parse-worker.ts')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    minify: true,
    outfile: resolve(workerTmpDir, 'parse-worker.js'),
    // Worker is self-contained — no externals
  });

  const workerCode = readFileSync(resolve(workerTmpDir, 'parse-worker.js'), 'utf-8');

  // Clean up temp directory
  rmSync(workerTmpDir, { recursive: true, force: true });

  // Pass 2: Build main entry with inlined worker code
  return {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    splitting: false,
    minify: false,
    target: 'es2022',
    define: {
      __WORKER_CODE__: JSON.stringify(workerCode),
    },
  };
});
