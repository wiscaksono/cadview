/**
 * WASM module loader with lazy initialization, error recovery, and retry support.
 *
 * The LibreDWG WASM binary (~6MB) is only loaded when first needed.
 * Call `initWasm()` proactively to preload before user opens a DWG file.
 *
 * ## How it works
 *
 * The Emscripten JS glue (~65KB) is **vendored** into `src/vendor/create-libredwg.js`
 * and statically imported. This means tsup bundles it into `dist/index.js`, eliminating
 * the need for `@vite-ignore` dynamic imports and `server.fs.allow` hacks.
 *
 * The WASM binary is loaded at runtime via `locateFile`. By default it fetches from
 * jsDelivr CDN (`https://cdn.jsdelivr.net/npm/@cadview/dwg@{version}/dist/libredwg.wasm`).
 * Users can override with `wasmUrl` for self-hosting.
 *
 * @module
 */

import createLibreDWG from './vendor/create-libredwg.js';
import type { LibreDWGModule, CreateModuleOptions } from './vendor/create-libredwg.js';

/**
 * Package version injected at build time by tsup (see tsup.config.ts `define`).
 * Falls back to 'latest' if not replaced (e.g. running raw source in tests).
 */
declare const __CDV_DWG_VERSION__: string;
const PACKAGE_VERSION: string =
  typeof __CDV_DWG_VERSION__ !== 'undefined' ? __CDV_DWG_VERSION__ : 'latest';

/**
 * Default CDN URL template for the WASM binary.
 * jsDelivr serves npm package files with correct MIME types and aggressive caching.
 */
const CDN_WASM_URL = `https://cdn.jsdelivr.net/npm/@cadview/dwg@${PACKAGE_VERSION}/dist/libredwg.wasm`;

/**
 * Options for WASM module loading.
 */
export interface WasmOptions {
  /**
   * Custom URL to load libredwg.wasm from.
   *
   * Use this when self-hosting the WASM binary instead of loading from CDN:
   * ```typescript
   * await initWasm({ wasmUrl: '/assets/libredwg.wasm' });
   * ```
   *
   * If not provided, the WASM binary is loaded from jsDelivr CDN.
   */
  wasmUrl?: string;
}

// Re-export the LibreDWGModule type so convert.ts (and others) don't need
// to import directly from the vendor directory.
export type { LibreDWGModule };

let wasmModule: LibreDWGModule | null = null;
let initPromise: Promise<LibreDWGModule> | null = null;

/**
 * Initialize the LibreDWG WASM module.
 *
 * Safe to call multiple times — the module is only loaded once.
 * If initialization previously failed, it will be retried on the next call.
 *
 * Call this proactively to preload the WASM binary (~6MB) before the
 * user opens a DWG file:
 *
 * ```typescript
 * import { initWasm } from '@cadview/dwg';
 *
 * // Preload on app startup (loads from CDN)
 * await initWasm();
 *
 * // Or self-host the WASM binary
 * await initWasm({ wasmUrl: '/assets/libredwg.wasm' });
 * ```
 *
 * @param options - Optional configuration for WASM loading
 * @throws Error if WebAssembly is not supported or the module fails to load
 */
export async function initWasm(options?: WasmOptions): Promise<void> {
  // Already initialized
  if (wasmModule) return;

  // Check WASM support
  if (typeof WebAssembly === 'undefined') {
    throw new Error(
      '@cadview/dwg: WebAssembly is not supported in this environment. ' +
      'DWG file support requires a browser with WebAssembly support.',
    );
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const wasmUrl = options?.wasmUrl ?? CDN_WASM_URL;

        const moduleOpts: CreateModuleOptions = {
          locateFile: (file: string, _scriptDirectory: string) => {
            if (file.endsWith('.wasm')) {
              return wasmUrl;
            }
            // Non-wasm files (shouldn't happen, but be safe)
            return _scriptDirectory + file;
          },
        };

        const module = await createLibreDWG(moduleOpts);

        // Validate that the required exports are available
        if (typeof module.ccall !== 'function') {
          throw new Error('WASM module loaded but ccall() is not available.');
        }
        if (!module.FS || typeof module.FS.writeFile !== 'function') {
          throw new Error('WASM module loaded but FS API is not available.');
        }

        wasmModule = module;
        return module;
      } catch (err) {
        // Reset initPromise so future calls can retry instead of
        // being stuck with a permanently rejected promise
        initPromise = null;

        const wasmUrl = options?.wasmUrl ?? CDN_WASM_URL;
        throw new Error(
          '@cadview/dwg: Failed to load LibreDWG WASM module. ' +
          `Check that the WASM file is accessible at: ${wasmUrl}`,
          { cause: err },
        );
      }
    })();
  }

  await initPromise;
}

/**
 * Get the initialized WASM module. Throws if not yet initialized.
 * @internal
 */
export function getModule(): LibreDWGModule {
  if (!wasmModule) {
    throw new Error(
      '@cadview/dwg: WASM module not initialized. ' +
      'Call initWasm() first, or use dwgConverter which handles this automatically.',
    );
  }
  return wasmModule;
}

/**
 * Check if the WASM module is currently loaded and ready.
 */
export function isWasmReady(): boolean {
  return wasmModule !== null;
}
