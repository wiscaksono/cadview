import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['vue', '@cadview/core'],
  target: 'es2022',
  esbuildOptions(options) {
    options.jsx = 'preserve';
  },
});
