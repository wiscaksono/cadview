/**
 * @cadview/dwg — DWG file format support for @cadview/core
 *
 * Converts DWG files to DXF using LibreDWG compiled to WebAssembly.
 * The conversion runs entirely in the browser — no server required.
 *
 * **License: GPL-3.0** — Using this module makes your combined application
 * subject to GPL-3.0 license terms. See README for details.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { CadViewer } from '@cadview/core';
 * import { dwgConverter } from '@cadview/dwg';
 *
 * const viewer = new CadViewer(canvas, {
 *   formatConverters: [dwgConverter],
 * });
 *
 * // Now loadFile() and loadBuffer() automatically handle DWG files
 * await viewer.loadFile(file); // works for both .dxf and .dwg
 * ```
 *
 * @module
 * @license GPL-3.0-only
 */

import type { FormatConverter } from '@cadview/core';
import { isDwg } from './detect.js';
import { convertDwgToDxf } from './convert.js';

/**
 * Format converter for DWG files.
 *
 * Register with `CadViewer` to automatically handle `.dwg` files
 * alongside `.dxf` files. The converter:
 *
 * 1. Detects DWG format by checking magic bytes ("AC10xx")
 * 2. Lazy-loads the LibreDWG WASM module (~2-5MB) on first use
 * 3. Converts DWG to DXF string via Emscripten MEMFS
 * 4. Returns the DXF string for parsing by `parseDxf()`
 *
 * ```typescript
 * import { CadViewer } from '@cadview/core';
 * import { dwgConverter } from '@cadview/dwg';
 *
 * const viewer = new CadViewer(canvas, {
 *   formatConverters: [dwgConverter],
 * });
 * ```
 *
 * @license GPL-3.0-only — using this converter makes your combined
 * application subject to GPL-3.0 license terms.
 */
export const dwgConverter: FormatConverter = {
  detect: isDwg,
  convert: convertDwgToDxf,
};

// Detection utilities
export { isDwg, getDwgVersion, getDwgReleaseName, DWG_VERSIONS, MIN_SUPPORTED_VERSION } from './detect.js';

// Conversion
export { convertDwgToDxf } from './convert.js';

// WASM lifecycle
export { initWasm, isWasmReady } from './wasm-loader.js';

// Types
export type { WasmOptions } from './wasm-loader.js';
export type { ConvertOptions } from './convert.js';
