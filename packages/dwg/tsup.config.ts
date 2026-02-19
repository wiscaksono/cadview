import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: false, // WASM files (libredwg.wasm) live in dist/ — don't wipe them
  treeshake: true,
  external: ['@cadview/core'],
  target: 'es2022',
  define: {
    __CDV_DWG_VERSION__: JSON.stringify(pkg.version),
  },
});
