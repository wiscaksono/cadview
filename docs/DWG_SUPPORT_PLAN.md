# DWG Support Plan — `@cadview/dwg`

> **Status:** Draft
> **Author:** Wisnu Wicaksono
> **Created:** 2026-02-19
> **Estimated effort:** 2-3 weeks

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Architecture](#2-architecture)
- [3. License Strategy](#3-license-strategy)
- [4. Package Structure](#4-package-structure)
- [5. Implementation Phases](#5-implementation-phases)
  - [Phase 1: FormatConverter Interface in Core](#phase-1-formatconverter-interface-in-core)
  - [Phase 2: @cadview/dwg Package + WASM Compilation](#phase-2-cadviewdwg-package--wasm-compilation)
  - [Phase 3: Framework Wrapper Updates](#phase-3-framework-wrapper-updates)
  - [Phase 4: Demo App Update](#phase-4-demo-app-update)
  - [Phase 5: Testing](#phase-5-testing)
  - [Phase 6: Documentation](#phase-6-documentation)
- [6. Edge Cases & Error Handling](#6-edge-cases--error-handling)
- [7. Required Fixes (Pre-existing + New)](#7-required-fixes-pre-existing--new)
- [8. Risks & Mitigations](#8-risks--mitigations)
- [9. Timeline](#9-timeline)
- [10. End-User API](#10-end-user-api)
- [11. Checklist](#11-checklist)

---

## 1. Overview

Add DWG file format support to cadview via LibreDWG compiled to WebAssembly (WASM).
The DWG binary is converted to a DXF string entirely in the browser, then parsed by
the existing `parseDxf()` pipeline. Zero changes needed to the renderer, viewer,
spatial index, layer manager, or measure tool.

### Why WASM?

- **DWG is a proprietary binary format** — bit-level parsing, compression, version-specific
  layouts. A native TypeScript parser would take 4-6+ months.
- **LibreDWG is battle-tested** — supports R13 through R2018+, actively maintained.
- **Client-side** — no backend server required. Runs entirely in the browser.
- **Effort** — 2-3 weeks vs 4-6 months for a native parser.

### What stays the same?

Everything downstream of `DxfDocument` is format-independent:

- `CanvasRenderer` + all draw functions
- `Camera` + `ViewTransform`
- `InputHandler` (pan/zoom/touch)
- `SpatialIndex` + `hitTest`
- `MeasureTool` + snap system
- `LayerManager`
- `EventEmitter` + all events
- All framework wrappers (React, Svelte, Vue)

---

## 2. Architecture

```
.dwg file (ArrayBuffer)
    |
    v
@cadview/core (MIT) --- FormatConverter interface
    |                    detects DWG via magic bytes ("AC10xx")
    v
@cadview/dwg (GPL-3.0) --- LibreDWG WASM
    |                       converts DWG -> DXF string in Emscripten MEMFS
    v
@cadview/core --- parseDxf() -> DxfDocument
    |
    v
Existing pipeline: renderer, camera, layers, spatial index, tools
```

The conversion pipeline:

1. User provides `.dwg` file via `loadFile()` or `loadBuffer()`
2. Core checks registered `FormatConverter[]` — `isDwg()` detects "AC10" magic bytes
3. Core calls `converter.convert(buffer)` which delegates to `@cadview/dwg`
4. WASM module is lazy-loaded on first use (~2-5MB)
5. DWG bytes written to Emscripten MEMFS virtual filesystem
6. LibreDWG's `dwg_read_file()` + `dxf_write_file()` run in WASM
7. DXF string read from MEMFS and returned to core
8. Core's `parseDxf()` parses the DXF string into `DxfDocument`
9. Existing viewer pipeline handles the rest

---

## 3. License Strategy

| Package | License | Dependency on `@cadview/dwg` |
|---|---|---|
| `@cadview/core` | MIT | **None** — zero imports from dwg package |
| `@cadview/react` | MIT | **None** |
| `@cadview/svelte` | MIT | **None** |
| `@cadview/vue` | MIT | **None** |
| **`@cadview/dwg`** | **GPL-3.0** | Peer-depends on `@cadview/core` (for `FormatConverter` type) |

Key points:

- `@cadview/core` defines a `FormatConverter` interface (MIT). It has zero knowledge of DWG or GPL code.
- `@cadview/dwg` implements that interface using LibreDWG (GPL-3.0). It peer-depends on core for the type.
- The GPL dependency direction is: `@cadview/dwg` (GPL) -> `@cadview/core` (MIT). This is legal — MIT is GPL-compatible.
- `@cadview/core` does NOT depend on `@cadview/dwg` in any direction. No import, no optional dependency, nothing.
- End-users who install BOTH packages must comply with GPL-3.0 for their combined application.
- End-users who only use `@cadview/core` (without dwg) are unaffected — pure MIT.

---

## 4. Package Structure

### New package: `packages/dwg/`

```
packages/dwg/
├── package.json            # GPL-3.0, peer-dep on @cadview/core
├── LICENSE                 # GPL-3.0 full text
├── README.md               # Usage + GPL license warning
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── index.ts            # Public API: dwgConverter, convertDwgToDxf, isDwg, initWasm
│   ├── detect.ts           # isDwg() — magic byte detection ("AC10" + digit validation)
│   ├── convert.ts          # convertDwgToDxf() — JS<->WASM bridge via Emscripten MEMFS
│   └── wasm-loader.ts      # Lazy WASM initialization, retry on failure, WASM support check
├── wasm/
│   ├── build.sh            # Emscripten compilation script
│   ├── wrapper.c           # Thin C wrapper around LibreDWG dwg_read_file + dxf_write_file
│   ├── CMakeLists.txt      # Build config for LibreDWG + wrapper
│   └── libredwg/           # Git submodule -> github.com/LibreDWG/libredwg
└── dist/                   # Build output
    ├── index.js
    ├── index.cjs
    ├── index.d.ts
    ├── index.d.cts
    └── libredwg.wasm       # Compiled WASM binary (~2-5MB)
```

### Changes to existing packages

```
packages/core/src/
├── viewer/
│   └── viewer.ts           # MODIFIED — FormatConverter interface, loadBuffer(), loadDocument(),
│                            #            destroyed guards, load generation counter
├── index.ts                # MODIFIED — export FormatConverter type
└── parser/
    └── index.ts            # MODIFIED — fix binary DXF error type inconsistency

packages/react/src/
└── CadViewer.tsx            # MODIFIED — formatConverters prop, async loadBuffer, error handling

packages/svelte/src/lib/
└── CadViewer.svelte         # MODIFIED — formatConverters prop, async loadBuffer, error handling

packages/vue/src/
├── CadViewer.tsx            # MODIFIED — formatConverters prop, async loadBuffer
└── useCadViewer.ts          # MODIFIED — formatConverters option
```

---

## 5. Implementation Phases

### Phase 1: FormatConverter Interface in Core

**Goal:** Add a lightweight plugin system so core can delegate foreign format conversion
without importing GPL code. Also fix pre-existing error handling issues that would be
amplified by async DWG conversion.

**Estimated effort: 1-2 days**

#### 1.1 Define `FormatConverter` interface

**File:** `packages/core/src/viewer/viewer.ts`

```typescript
export interface FormatConverter {
  /**
   * Return true if the buffer is in this format.
   * Implementations should check magic bytes, not file extensions.
   * Must not throw — return false on any error.
   */
  detect(buffer: ArrayBuffer): boolean;

  /**
   * Convert the buffer to a DXF string.
   * The returned string must be valid DXF parseable by parseDxf().
   */
  convert(buffer: ArrayBuffer): Promise<string>;
}
```

#### 1.2 Update `CadViewerOptions`

**File:** `packages/core/src/viewer/viewer.ts`

```typescript
export interface CadViewerOptions {
  theme?: Theme;
  backgroundColor?: string;
  antialias?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number;
  initialTool?: Tool;
  formatConverters?: FormatConverter[];  // NEW
}
```

Store in constructor:

```typescript
private formatConverters: FormatConverter[];
private loadGeneration = 0;  // NEW — for stale async result detection

constructor(canvas: HTMLCanvasElement, options?: CadViewerOptions) {
  // ...existing init
  this.formatConverters = options?.formatConverters ?? [];
}
```

#### 1.3 Add `destroyed` guard to all public methods

**File:** `packages/core/src/viewer/viewer.ts`

Currently only `requestRender()` checks `this.destroyed`. All public methods that
mutate state need this guard:

```typescript
private guardDestroyed(): void {
  if (this.destroyed) {
    throw new Error('CadViewer: cannot call methods on a destroyed instance.');
  }
}
```

Add `this.guardDestroyed()` as first line of:
- `loadFile()`, `loadString()`, `loadArrayBuffer()`, `loadBuffer()`, `loadDocument()`
- `clearDocument()`
- `fitToView()`, `zoomTo()`, `panTo()`
- `setTool()`, `setTheme()`, `setBackgroundColor()`
- `setLayerVisible()`, `setLayerColor()`

#### 1.4 Update `loadFile()` — add converter detection + load generation

**File:** `packages/core/src/viewer/viewer.ts` (replaces current lines ~92-95)

```typescript
async loadFile(file: File): Promise<void> {
  this.guardDestroyed();
  const generation = ++this.loadGeneration;
  const buffer = await file.arrayBuffer();

  // Stale check: another load started while we were reading the file
  if (this.destroyed || generation !== this.loadGeneration) return;

  // Check registered format converters
  for (const converter of this.formatConverters) {
    let detected = false;
    try {
      detected = converter.detect(buffer);
    } catch {
      // detect() should not throw, skip this converter
      continue;
    }

    if (detected) {
      const dxfString = await converter.convert(buffer);

      // Stale check after async conversion
      if (this.destroyed || generation !== this.loadGeneration) return;

      this.doc = parseDxf(dxfString);
      this.onDocumentLoaded();
      return;
    }
  }

  // Default: parse as DXF
  this.doc = parseDxf(buffer);
  this.onDocumentLoaded();
}
```

#### 1.5 New method: `loadBuffer()` — async with converter support

**File:** `packages/core/src/viewer/viewer.ts`

```typescript
/**
 * Load a CAD file from an ArrayBuffer. Supports format converters for non-DXF formats.
 * Unlike loadArrayBuffer() (which is sync and DXF-only), this method is async and
 * checks registered FormatConverters.
 */
async loadBuffer(buffer: ArrayBuffer): Promise<void> {
  this.guardDestroyed();
  const generation = ++this.loadGeneration;

  for (const converter of this.formatConverters) {
    let detected = false;
    try {
      detected = converter.detect(buffer);
    } catch {
      continue;
    }

    if (detected) {
      const dxfString = await converter.convert(buffer);
      if (this.destroyed || generation !== this.loadGeneration) return;

      this.doc = parseDxf(dxfString);
      this.onDocumentLoaded();
      return;
    }
  }

  // No converter matched — parse as DXF
  this.doc = parseDxf(buffer);
  this.onDocumentLoaded();
}
```

#### 1.6 New method: `loadDocument()` — direct document injection

**File:** `packages/core/src/viewer/viewer.ts`

```typescript
/**
 * Load a pre-parsed DxfDocument directly, bypassing the parser.
 * Useful for custom parsers or pre-processed documents.
 */
loadDocument(doc: DxfDocument): void {
  this.guardDestroyed();
  ++this.loadGeneration;

  // Minimal validation
  if (!doc || !Array.isArray(doc.entities) || !(doc.layers instanceof Map)) {
    throw new Error('CadViewer: invalid DxfDocument — expected entities array and layers Map.');
  }

  this.doc = doc;
  this.onDocumentLoaded();
}
```

#### 1.7 Keep `loadArrayBuffer` and `loadString` backward-compatible

No changes to their signatures. Only add `this.guardDestroyed()` and `++this.loadGeneration`:

```typescript
loadString(dxf: string): void {
  this.guardDestroyed();
  ++this.loadGeneration;
  this.doc = parseDxf(dxf);
  this.onDocumentLoaded();
}

loadArrayBuffer(buffer: ArrayBuffer): void {
  this.guardDestroyed();
  ++this.loadGeneration;
  this.doc = parseDxf(buffer);
  this.onDocumentLoaded();
}
```

#### 1.8 Export new types

**File:** `packages/core/src/index.ts`

Add to exports:

```typescript
export type { FormatConverter } from './viewer/viewer';
```

#### 1.9 Fix: binary DXF error type inconsistency

**File:** `packages/core/src/parser/index.ts` (~line 62)

Currently `decodeInput` throws a plain `Error` for binary DXF, but the `parseDxf`
JSDoc says `@throws {DxfParseError}`. Fix by wrapping:

```typescript
// Before (in decodeInput):
throw new Error('Binary DXF format is not supported. Please export as ASCII DXF.');

// After:
throw new DxfParseError('Binary DXF format is not supported. Please export as ASCII DXF.');
```

---

### Phase 2: @cadview/dwg Package + WASM Compilation

**Goal:** Compile LibreDWG to WASM and create JS bindings that implement the
`FormatConverter` interface.

**Estimated effort: 1-2 weeks**

**Prerequisites:** Emscripten SDK (`emsdk`) installed.

#### 2.1 Package configuration

**File:** `packages/dwg/package.json`

```json
{
  "name": "@cadview/dwg",
  "version": "0.1.0",
  "description": "DWG file format support for @cadview/core via LibreDWG WASM",
  "license": "GPL-3.0-only",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist", "LICENSE", "README.md"],
  "sideEffects": false,
  "peerDependencies": {
    "@cadview/core": ">=0.1.0"
  },
  "devDependencies": {
    "@cadview/core": "workspace:*",
    "tsup": "^8.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  },
  "scripts": {
    "build:wasm": "bash wasm/build.sh",
    "build": "pnpm build:wasm && tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["cad", "dwg", "dxf", "autocad", "wasm", "viewer"],
  "repository": {
    "type": "git",
    "url": "https://github.com/wiscaksono/cadview",
    "directory": "packages/dwg"
  }
}
```

**File:** `packages/dwg/tsup.config.ts`

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['@cadview/core'],
  target: 'es2022',
});
```

**File:** `packages/dwg/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "wasm", "**/*.test.*", "**/*.spec.*"]
}
```

#### 2.2 DWG format detection

**File:** `packages/dwg/src/detect.ts`

```typescript
/**
 * Detect DWG format by checking magic bytes.
 *
 * All DWG versions start with "AC10" followed by two digit characters:
 *   AC1012 = R13,   AC1014 = R14,   AC1015 = R2000,
 *   AC1018 = R2004, AC1021 = R2007, AC1024 = R2010,
 *   AC1027 = R2013, AC1032 = R2018
 *
 * We check for "AC10" (bytes 0-3) plus two ASCII digits (bytes 4-5).
 * This avoids false positives from text files that happen to start with "AC".
 */
export function isDwg(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 6) return false;

  const bytes = new Uint8Array(buffer, 0, 6);

  // Check "AC10" prefix (0x41='A', 0x43='C', 0x31='1', 0x30='0')
  if (bytes[0] !== 0x41 || bytes[1] !== 0x43 || bytes[2] !== 0x31 || bytes[3] !== 0x30) {
    return false;
  }

  // Check bytes 4-5 are ASCII digits (0x30='0' to 0x39='9')
  if (bytes[4] < 0x30 || bytes[4] > 0x39 || bytes[5] < 0x30 || bytes[5] > 0x39) {
    return false;
  }

  return true;
}

/**
 * Known DWG version strings and their AutoCAD release names.
 */
export const DWG_VERSIONS: Record<string, string> = {
  AC1012: 'R13',
  AC1014: 'R14',
  AC1015: 'R2000',
  AC1018: 'R2004',
  AC1021: 'R2007',
  AC1024: 'R2010',
  AC1027: 'R2013',
  AC1032: 'R2018',
};

/**
 * Extract the DWG version string from a buffer (e.g. "AC1032").
 * Returns null if the buffer is not a valid DWG file.
 */
export function getDwgVersion(buffer: ArrayBuffer): string | null {
  if (!isDwg(buffer)) return null;
  const bytes = new Uint8Array(buffer, 0, 6);
  return String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
}
```

#### 2.3 WASM loader with lazy initialization and error recovery

**File:** `packages/dwg/src/wasm-loader.ts`

```typescript
export interface WasmOptions {
  /** Custom URL to load libredwg.wasm from (e.g. CDN). */
  wasmUrl?: string;
}

interface LibreDWGModule {
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string, opts: { encoding: 'utf8' }): string;
    unlink(path: string): void;
  };
  ccall(
    ident: string,
    returnType: string,
    argTypes: string[],
    args: unknown[],
  ): number;
}

let wasmModule: LibreDWGModule | null = null;
let initPromise: Promise<LibreDWGModule> | null = null;

/**
 * Initialize the LibreDWG WASM module. Safe to call multiple times —
 * the module is only loaded once. If initialization previously failed,
 * it will be retried.
 *
 * Call this proactively to preload the WASM binary (~2-5MB) before the
 * user opens a DWG file. Otherwise, it's called lazily on first conversion.
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
        const createModule = (await import('../dist/libredwg.js')).default;
        const module: LibreDWGModule = await createModule({
          locateFile: (file: string) => {
            if (options?.wasmUrl && file.endsWith('.wasm')) return options.wasmUrl;
            return file;
          },
        });

        // Validate that the required function is exported
        if (typeof module.ccall !== 'function') {
          throw new Error('WASM module loaded but ccall is not available');
        }

        wasmModule = module;
        return module;
      } catch (err) {
        // Reset initPromise so future calls can retry
        initPromise = null;
        throw new Error(
          '@cadview/dwg: Failed to load LibreDWG WASM module. ' +
          (options?.wasmUrl
            ? `Check that the WASM file is accessible at: ${options.wasmUrl}`
            : 'Ensure the WASM file is served correctly.'),
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
```

#### 2.4 Conversion bridge with timeout, unique filenames, and cleanup

**File:** `packages/dwg/src/convert.ts`

```typescript
import { initWasm, getModule } from './wasm-loader';
import { getDwgVersion, DWG_VERSIONS } from './detect';
import type { WasmOptions } from './wasm-loader';

export interface ConvertOptions extends WasmOptions {
  /**
   * Timeout in milliseconds for the conversion.
   * Default: 30000 (30 seconds).
   * Set to 0 to disable timeout.
   */
  timeout?: number;
}

/** Counter for unique temp filenames to avoid MEMFS collisions */
let fileCounter = 0;

/**
 * Convert a DWG ArrayBuffer to a DXF string using LibreDWG WASM.
 *
 * The WASM module is lazily initialized on first call (~2-5MB download).
 * Subsequent calls reuse the loaded module.
 *
 * @param buffer - The DWG file content as an ArrayBuffer
 * @param options - Optional WASM and conversion configuration
 * @returns The converted DXF content as a string
 * @throws Error if conversion fails, times out, or WASM cannot be loaded
 */
export async function convertDwgToDxf(
  buffer: ArrayBuffer,
  options?: ConvertOptions,
): Promise<string> {
  if (buffer.byteLength === 0) {
    throw new Error('@cadview/dwg: Cannot convert empty buffer.');
  }

  // Check DWG version for helpful error messages
  const version = getDwgVersion(buffer);
  if (version && !(version in DWG_VERSIONS)) {
    throw new Error(
      `@cadview/dwg: Unrecognized DWG version "${version}". ` +
      `Supported versions: ${Object.entries(DWG_VERSIONS).map(([k, v]) => `${k} (${v})`).join(', ')}.`,
    );
  }

  await initWasm(options);
  const module = getModule();

  // Unique filenames to prevent collisions from concurrent conversions
  const id = `${Date.now()}_${++fileCounter}`;
  const inputPath = `/tmp/cadview_input_${id}.dwg`;
  const outputPath = `/tmp/cadview_output_${id}.dxf`;

  const timeoutMs = options?.timeout ?? 30_000;

  const doConvert = async (): Promise<string> => {
    try {
      // Write DWG bytes to Emscripten virtual filesystem
      module.FS.writeFile(inputPath, new Uint8Array(buffer));

      // Call LibreDWG conversion
      const exitCode = module.ccall(
        'convert',
        'number',
        ['string', 'string'],
        [inputPath, outputPath],
      );

      if (exitCode !== 0) {
        const versionInfo = version ? ` (DWG version: ${version} / ${DWG_VERSIONS[version] ?? 'unknown'})` : '';
        throw new Error(
          `@cadview/dwg: DWG to DXF conversion failed with error code ${exitCode}${versionInfo}. ` +
          'The file may be corrupted, password-protected, or in an unsupported format.',
        );
      }

      // Read converted DXF from virtual filesystem
      const dxfContent = module.FS.readFile(outputPath, { encoding: 'utf8' });

      if (!dxfContent || dxfContent.length === 0) {
        throw new Error(
          '@cadview/dwg: Conversion produced empty DXF output. ' +
          'The DWG file may be password-protected or contain no convertible data.',
        );
      }

      return dxfContent;
    } finally {
      // Always cleanup MEMFS, even on error
      try { module.FS.unlink(inputPath); } catch { /* file may not exist */ }
      try { module.FS.unlink(outputPath); } catch { /* file may not exist */ }
    }
  };

  // With timeout
  if (timeoutMs > 0) {
    return Promise.race([
      doConvert(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(
            `@cadview/dwg: DWG conversion timed out after ${timeoutMs}ms. ` +
            'The file may be too large or too complex. Try increasing the timeout option.',
          )),
          timeoutMs,
        ),
      ),
    ]);
  }

  return doConvert();
}
```

#### 2.5 Public API

**File:** `packages/dwg/src/index.ts`

```typescript
import type { FormatConverter } from '@cadview/core';
import { isDwg } from './detect';
import { convertDwgToDxf } from './convert';
import { initWasm } from './wasm-loader';
import type { WasmOptions } from './wasm-loader';
import type { ConvertOptions } from './convert';

/**
 * Format converter for DWG files. Register with CadViewer to automatically
 * handle .dwg files alongside .dxf files:
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
 * await viewer.loadFile(dwgFile);
 * ```
 *
 * **License:** GPL-3.0 — using this module makes your combined application
 * subject to GPL-3.0 license terms. See README for details.
 */
export const dwgConverter: FormatConverter = {
  detect: isDwg,
  convert: convertDwgToDxf,
};

export { convertDwgToDxf, isDwg, initWasm };
export { getDwgVersion, DWG_VERSIONS } from './detect';
export type { WasmOptions, ConvertOptions };
```

#### 2.6 C wrapper for Emscripten

**File:** `packages/dwg/wasm/wrapper.c`

```c
#include <dwg.h>
#include <dwg_api.h>
#include <emscripten.h>
#include <string.h>

/**
 * Convert a DWG file to DXF format using LibreDWG.
 * Both paths refer to files in the Emscripten MEMFS virtual filesystem.
 *
 * Returns 0 on success, or a LibreDWG error code on failure.
 * Error codes > DWG_ERR_CRITICAL indicate unrecoverable errors.
 */
EMSCRIPTEN_KEEPALIVE
int convert(const char* input_path, const char* output_path) {
    Dwg_Data dwg;
    memset(&dwg, 0, sizeof(Dwg_Data));

    /* Read the DWG file */
    int error = dwg_read_file(input_path, &dwg);
    if (error > DWG_ERR_CRITICAL) {
        dwg_free(&dwg);
        return error;
    }

    /* Write as DXF */
    error = dxf_write_file(output_path, &dwg);
    dwg_free(&dwg);
    return error;
}
```

#### 2.7 Emscripten build script

**File:** `packages/dwg/wasm/build.sh`

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
LIBREDWG_DIR="$SCRIPT_DIR/libredwg"
OUTPUT_DIR="$SCRIPT_DIR/../dist"

echo "=== @cadview/dwg WASM build ==="

# --- Preflight checks ---

if [ ! -f "$LIBREDWG_DIR/CMakeLists.txt" ]; then
    echo "Error: LibreDWG submodule not initialized."
    echo "Run: git submodule update --init --recursive"
    exit 1
fi

if ! command -v emcc &> /dev/null; then
    echo "Error: Emscripten (emcc) not found in PATH."
    echo "Install: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

# --- Build ---

mkdir -p "$BUILD_DIR" "$OUTPUT_DIR"

# Step 1: Build LibreDWG with Emscripten
echo "Building LibreDWG with Emscripten..."
cd "$BUILD_DIR"
emcmake cmake "$LIBREDWG_DIR" \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=OFF \
    -DENABLE_TESTING=OFF \
    -DDISABLE_WRITE=OFF

emmake make -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)" dwg

# Step 2: Compile C wrapper + link against LibreDWG -> WASM
echo "Compiling WASM module..."
emcc "$SCRIPT_DIR/wrapper.c" \
    -I"$LIBREDWG_DIR/include" \
    -I"$BUILD_DIR/src" \
    -L"$BUILD_DIR/src" \
    -ldwg \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_convert","_malloc","_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["FS","ccall"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='createLibreDWG' \
    -s FILESYSTEM=1 \
    -s INITIAL_MEMORY=33554432 \
    -O2 \
    -o "$OUTPUT_DIR/libredwg.js"

echo "=== Build complete ==="
echo "Output: $OUTPUT_DIR/libredwg.js + $OUTPUT_DIR/libredwg.wasm"
ls -lh "$OUTPUT_DIR/libredwg.js" "$OUTPUT_DIR/libredwg.wasm"
```

#### 2.8 Git submodule setup

```bash
# Run from project root
cd packages/dwg
git submodule add https://github.com/LibreDWG/libredwg.git wasm/libredwg
```

---

### Phase 3: Framework Wrapper Updates

**Goal:** Pass `formatConverters` through to core, use async `loadBuffer()` for
ArrayBuffer inputs, fix pre-existing error handling issues.

**Estimated effort: 1 day**

All three wrappers need identical changes:

#### 3.1 Add `formatConverters` prop

```typescript
// In props interface (React/Svelte/Vue)
formatConverters?: FormatConverter[];
```

Pass to CadViewer constructor:

```typescript
const viewer = new CoreCadViewer(canvas, {
  theme,
  // ...existing options
  formatConverters,
});
```

#### 3.2 Replace `loadArrayBuffer` with async `loadBuffer` in file loading

All three wrappers currently call `viewer.loadArrayBuffer(file)` synchronously for
`ArrayBuffer` inputs. Replace with async `viewer.loadBuffer(file)`:

**React** (`packages/react/src/CadViewer.tsx`):

```typescript
// Before:
} else if (file instanceof ArrayBuffer) {
  viewer.loadArrayBuffer(file);
  onLayersLoaded?.(viewer.getLayers());
}

// After:
} else if (file instanceof ArrayBuffer) {
  viewer.loadBuffer(file).then(
    () => onLayersLoaded?.(viewer.getLayers()),
    (err) => console.error('CadViewer: failed to load buffer', err),
  );
}
```

**Svelte** (`packages/svelte/src/lib/CadViewer.svelte`):

```typescript
// Before:
} else if (file instanceof ArrayBuffer) {
  v.loadArrayBuffer(file);
  untrack(() => onlayersloaded)?.(v.getLayers());
}

// After:
} else if (file instanceof ArrayBuffer) {
  v.loadBuffer(file).then(
    () => { untrack(() => onlayersloaded)?.(v.getLayers()); },
    (err: unknown) => { console.error('CadViewer: failed to load buffer', err); },
  );
}
```

**Vue** (`packages/vue/src/CadViewer.tsx`) — already uses async/await with try/catch:

```typescript
// Before:
} else if (newFile instanceof ArrayBuffer) {
  viewer.loadArrayBuffer(newFile);
}

// After:
} else if (newFile instanceof ArrayBuffer) {
  await viewer.loadBuffer(newFile);
}
```

#### 3.3 Fix: wrap sync `loadString` path in try/catch (React + Svelte)

**Pre-existing bug:** React and Svelte wrappers don't catch synchronous errors from
`loadString()`. Vue already wraps everything in try/catch.

**React:**

```typescript
// Before:
} else if (typeof file === 'string') {
  viewer.loadString(file);
  onLayersLoaded?.(viewer.getLayers());
}

// After:
} else if (typeof file === 'string') {
  try {
    viewer.loadString(file);
    onLayersLoaded?.(viewer.getLayers());
  } catch (err) {
    console.error('CadViewer: failed to load string', err);
  }
}
```

Same fix for Svelte.

#### 3.4 Fix: add stale closure guard for async operations

All three wrappers need a cancellation mechanism to prevent stale async results from
operating on a destroyed or re-used viewer.

**React pattern:**

```typescript
useEffect(() => {
  const viewer = viewerRef.current;
  if (!viewer || !file) return;
  let cancelled = false;

  const load = async () => {
    try {
      if (file instanceof File) {
        await viewer.loadFile(file);
      } else if (file instanceof ArrayBuffer) {
        await viewer.loadBuffer(file);
      } else if (typeof file === 'string') {
        viewer.loadString(file);
      }
      if (!cancelled) {
        onLayersLoaded?.(viewer.getLayers());
      }
    } catch (err) {
      if (!cancelled) {
        console.error('CadViewer: failed to load file', err);
      }
    }
  };

  load();

  return () => {
    cancelled = true;
  };
}, [file]);
```

Similar patterns for Svelte (`$effect` return cleanup) and Vue (use a `let cancelled`
flag with `onUnmounted`).

> **Note:** The core's `loadGeneration` counter provides a second layer of protection
> at the engine level. The wrapper's `cancelled` flag prevents stale callbacks in the
> UI layer. Both are needed.

---

### Phase 4: Demo App Update

**Goal:** Update the demo app to accept and display DWG files.

**Estimated effort: 0.5 day**

**File:** `apps/demo/src/main.ts`

Changes:

1. Import and register the DWG converter:
   ```typescript
   import { dwgConverter } from '@cadview/dwg';

   const viewer = new CadViewer(canvas, {
     formatConverters: [dwgConverter],
   });
   ```

2. Update file input accept attribute:
   ```typescript
   fileInput.accept = '.dxf,.dwg';
   ```

3. Add loading indicator during WASM init + conversion:
   ```typescript
   // Show loading state
   statusEl.textContent = 'Converting DWG file...';
   await viewer.loadFile(file);
   statusEl.textContent = '';
   ```

4. Add `@cadview/dwg` as a dependency in `apps/demo/package.json`.

---

### Phase 5: Testing

**Goal:** Comprehensive tests for the new FormatConverter system and DWG conversion.

**Estimated effort: 2-3 days**

#### 5.1 Core: FormatConverter tests

**File:** `packages/core/src/__tests__/format-converter.test.ts`

| Test case | Description |
|---|---|
| `converter registration` | `formatConverters` passed via options are stored and accessible |
| `loadFile with converter match` | `detect` returns true -> `convert` called -> `parseDxf` on result |
| `loadFile no match` | No converter matches -> falls back to `parseDxf(buffer)` |
| `loadBuffer with converter` | Same behavior as `loadFile` but for `ArrayBuffer` input |
| `loadBuffer no match` | Falls back to `parseDxf(buffer)` |
| `loadDocument valid` | Sets doc directly, triggers `onDocumentLoaded` |
| `loadDocument invalid` | Throws on null/missing entities/non-Map layers |
| `multiple converters` | First matching converter wins |
| `converter detect throws` | Skips to next converter, does not crash |
| `converter convert rejects` | Error propagates to caller with context |
| `converter returns invalid DXF` | `parseDxf` throws, error propagates |
| `converter returns empty string` | `parseDxf` throws "empty input" error |
| `destroyed guard` | All load methods throw after `destroy()` is called |
| `load generation (stale result)` | Second `loadFile` call supersedes first; first result discarded |
| `load generation (destroyed during async)` | `loadFile` result discarded if viewer destroyed during conversion |

#### 5.2 DWG: detection tests

**File:** `packages/dwg/src/__tests__/detect.test.ts`

| Test case | Description |
|---|---|
| `valid DWG R2000 header` | `isDwg` returns `true` for buffer starting with "AC1015" |
| `valid DWG R2004 header` | `isDwg` returns `true` for "AC1018" |
| `valid DWG R2018 header` | `isDwg` returns `true` for "AC1032" |
| `DXF file` | `isDwg` returns `false` for text starting with "0\nSECTION" |
| `empty buffer` | `isDwg` returns `false` |
| `buffer < 6 bytes` | `isDwg` returns `false` for 1-5 byte buffers |
| `starts with "AC" but not DWG` | `isDwg` returns `false` for "ACID" or "AC20" |
| `starts with "AC10" but non-digit suffix` | `isDwg` returns `false` for "AC10AB" |
| `binary DXF` | `isDwg` returns `false` (starts with "AutoCAD Binary DXF") |
| `getDwgVersion valid` | Returns correct version string |
| `getDwgVersion invalid` | Returns `null` for non-DWG buffers |

#### 5.3 DWG: WASM conversion tests

**File:** `packages/dwg/src/__tests__/convert.test.ts`

> Note: These tests require the WASM module to be built. They should be marked as
> integration tests and may be skipped in CI if WASM is not available.

| Test case | Description |
|---|---|
| `convert R2000 DWG` | Returns valid DXF string parseable by `parseDxf` |
| `convert R2004 DWG` | Same |
| `convert R2018 DWG` | Same |
| `invalid DWG content` | Throws with LibreDWG error code |
| `empty buffer` | Throws "Cannot convert empty buffer" |
| `conversion timeout` | Rejects with timeout error (use `timeout: 1`) |
| `concurrent conversions` | Two parallel conversions both succeed (unique filenames) |
| `WASM init failure retry` | After init failure, next call retries (not stuck) |
| `unknown DWG version` | Throws with version info |

#### 5.4 DWG: integration tests

**File:** `packages/dwg/src/__tests__/integration.test.ts`

| Test case | Description |
|---|---|
| `full pipeline: DWG -> DxfDocument` | Convert, parse, validate entities and layers exist |
| `dwgConverter.detect + convert` | Use the exported `dwgConverter` object through the full flow |
| `DWG with various entity types` | Verify LINE, CIRCLE, ARC, etc. survive the conversion |

**Sample files:** Collect 5-10 DWG test fixtures across versions. Store in
`packages/dwg/test-fixtures/`. Include:

- `simple-r2000.dwg` — basic lines and circles
- `complex-r2004.dwg` — multiple entity types, blocks, layers
- `text-r2007.dwg` — TEXT and MTEXT entities
- `modern-r2018.dwg` — latest format version
- `empty.dwg` — valid DWG with no model space entities
- `corrupted.dwg` — truncated/invalid file for error testing

---

### Phase 6: Documentation

**Goal:** Document the new DWG support, format converter API, and GPL license implications.

**Estimated effort: 1 day**

#### 6.1 `packages/dwg/README.md`

Contents:

- GPL-3.0 license warning (prominent, at top)
- What it does
- Installation (`pnpm add @cadview/dwg`)
- Usage examples for all frameworks (vanilla, React, Svelte, Vue)
- WASM loading options (preloading, custom URL)
- Supported DWG versions table
- Known limitations (XREFs, password-protected, 3D solids, OLE, proxy objects)
- Conversion options (timeout)
- Building from source (Emscripten setup)
- License explanation (impact on end-user applications)

#### 6.2 Update `packages/core/README.md`

Add section:

- Format Converter plugin API with code example
- DWG support via `@cadview/dwg` (with license note)
- How to write a custom `FormatConverter`

#### 6.3 Update root `README.md`

- Add `@cadview/dwg` to packages table
- Add GPL-3.0 license badge for the dwg package
- Add brief mention of DWG support in features list

---

## 6. Edge Cases & Error Handling

### 6.1 Format Detection

| # | Edge Case | Impact | Mitigation |
|---|---|---|---|
| 1 | Empty ArrayBuffer (0 bytes) | Falls to `parseDxf` which throws | `isDwg()` returns false (byteLength < 6). OK. |
| 2 | Buffer < 6 bytes | Same as above | Same guard. |
| 3 | Starts with "AC" but not DWG (e.g. "ACID...") | False positive -> WASM error | Check full "AC10" + 2 digit chars. |
| 4 | DXF file sent to converter | Wasted conversion, error | `isDwg()` prevents — DXF never starts with "AC10". |
| 5 | Binary DXF (sentinel "AutoCAD Binary DXF") | `isDwg()` false, `parseDxf` rejects | Correct behavior. Clear error message. |
| 6 | Wrong extension (.dwg containing DXF text) | Detection is by magic bytes, not name | Works correctly. |
| 7 | Right extension (.dxf containing DWG binary) | Detection catches it, routes to converter | Works correctly. |

### 6.2 WASM Lifecycle

| # | Edge Case | Impact | Mitigation |
|---|---|---|---|
| 1 | Network error loading WASM | `initWasm` rejects | Clear error message. `initPromise` reset for retry. |
| 2 | WASM binary corrupted/invalid | Module instantiation fails | Same as above. |
| 3 | Concurrent `initWasm()` calls | Double init | Singleton `initPromise` pattern prevents this. |
| 4 | `initWasm()` fails then retried | Promise stuck rejected | `initPromise = null` in catch block enables retry. |
| 5 | Browser without WASM support | `WebAssembly` undefined | Check before init. Clear error message. |
| 6 | Web Worker context | No DOM | Emscripten WASM works in Workers. Verify build flags. |
| 7 | Custom `wasmUrl` 404 | Fetch fails | Caught by init error path. URL shown in error message. |
| 8 | Module loaded but `convert` missing | `ccall` fails | Post-init validation checks for `ccall`. |

### 6.3 Conversion

| # | Edge Case | Impact | Mitigation |
|---|---|---|---|
| 1 | Corrupted DWG (valid header, broken data) | LibreDWG non-zero exit | Check code, throw with error code + version info. |
| 2 | DWG version too old (pre-R13) | May not be supported | Version check before conversion. Descriptive error. |
| 3 | DWG version too new (future) | May not be supported | Version check. "Unrecognized version" error. |
| 4 | Password-protected DWG | Conversion fails or empty output | Detect empty output. Suggest password protection as cause. |
| 5 | Very large DWG (100MB+) | WASM OOM or slow | `ALLOW_MEMORY_GROWTH=1`. Timeout. Document limits. |
| 6 | External references (XREF) | XREFs not available | Document: XREFs are not resolved. |
| 7 | Proxy/custom objects | Skipped by LibreDWG | Acceptable. Document limitation. |
| 8 | 3D solids (ACIS) | Not renderable in 2D | Convert what's possible. Document limitation. |
| 9 | OLE objects | Not convertible | Silently skipped. Document. |
| 10 | Conversion produces invalid DXF | `parseDxf` throws | Wrap: "Conversion produced invalid DXF output". |
| 11 | Conversion produces empty DXF | Valid but empty document | Viewer shows blank. Could warn user. |
| 12 | Concurrent conversions | MEMFS filename collision | Unique filenames: `cadview_input_${Date.now()}_${counter}`. |
| 13 | MEMFS cleanup failure | Stale temp files | `finally` block with ignored errors. |
| 14 | Conversion hangs | Promise never resolves | `Promise.race` with configurable timeout (default 30s). |

### 6.4 File Loading (Core)

| # | Edge Case | Pre-existing | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Method called after `destroy()` | YES | Writes to null'd state | `guardDestroyed()` check on all public methods. |
| 2 | Concurrent `loadFile()` calls | YES | Race condition, stale results | `loadGeneration` counter. Discard stale results. |
| 3 | `parseDxf` throws in sync paths | YES | Uncaught in React/Svelte | Fix wrappers (Vue already correct). |
| 4 | Detached/invalid `File` object | YES | `arrayBuffer()` rejects | Error propagates. |
| 5 | `detect()` throws | NEW | Loop short-circuits | Per-converter try/catch. Skip to next. |
| 6 | `convert()` rejects | NEW | Error propagates | OK. Add contextual wrapping. |
| 7 | Converter returns invalid DXF | NEW | `parseDxf` throws | Wrap with "Converter produced invalid output". |
| 8 | Multiple converters, first throws | NEW | Second never checked | Per-converter try/catch. Skip to next. |
| 9 | `loadDocument()` with bad input | NEW | `onDocumentLoaded` crashes | Validate entities/layers before accepting. |

### 6.5 Framework Wrappers

| # | Edge Case | Pre-existing | Wrapper | Impact | Mitigation |
|---|---|---|---|---|---|
| 1 | Unmount during async load | YES | All | Destroyed viewer operated on | `cancelled` flag + core `loadGeneration`. |
| 2 | File prop changes rapidly | YES | All | Multiple loads race | `cancelled` flag in effect cleanup. |
| 3 | Sync `loadString` throws | YES | React, Svelte | Uncaught crash | Wrap in try/catch (Vue already OK). |
| 4 | File becomes null during conversion | NEW | All | Stale async completes | `cancelled` flag + null check. |
| 5 | `formatConverters` prop changes | NEW | All | Viewer has stale converters | Watch and update or recreate. |
| 6 | Error not exposed to consumer | YES | React, Svelte | No error callback | Add `onerror` prop (future enhancement). |

### 6.6 DWG Content

| # | Edge Case | Impact | Mitigation |
|---|---|---|---|
| 1 | Unsupported entity types | Silently skipped | Existing `drawEntity` default behavior. Document. |
| 2 | Non-standard fonts | Fallback font used | Same as DXF. Document. |
| 3 | Very large coordinates | Float precision issues | Same as DXF. No change. |
| 4 | Non-AutoCAD DWG (BricsCAD etc.) | Format quirks | LibreDWG handles most. Test with samples. |
| 5 | Paper space only, no model space | Empty viewer | Document: model space only. |
| 6 | No entities in model space | Blank canvas | Valid. Could warn. |

### 6.7 Memory & Performance

| # | Edge Case | Impact | Mitigation |
|---|---|---|---|
| 1 | WASM binary size (~2-5MB) | Slow first load | Lazy load. `initWasm()` for preloading. |
| 2 | Double memory (DWG + DXF + DxfDocument) | High memory usage | Release DWG buffer and DXF string ASAP. MEMFS cleanup. |
| 3 | WASM memory never shrinks | Memory grows over time | WASM limitation. Document. Suggest page reload for extreme cases. |
| 4 | Conversion blocks main thread | UI freezes | Future: Web Worker for WASM. Document current limitation. |
| 5 | Tab backgrounded during conversion | May be throttled | WASM runs regardless. `rAF` delayed but OK. |
| 6 | Sequential DWG loads | Memory accumulates | Unique filenames + MEMFS cleanup in `finally`. |

---

## 7. Required Fixes (Pre-existing + New)

### Must fix (blocks DWG support or causes crashes)

| # | Fix | Where | Phase |
|---|---|---|---|
| F1 | Add `guardDestroyed()` to all public methods | `packages/core/src/viewer/viewer.ts` | 1 |
| F2 | Add `loadGeneration` counter for stale async detection | `packages/core/src/viewer/viewer.ts` | 1 |
| F3 | Wrap sync `loadArrayBuffer`/`loadString` in try/catch | React + Svelte wrappers | 3 |
| F4 | Add cleanup/cancellation (`cancelled` flag) in async effects | All 3 wrappers | 3 |
| F5 | Reset `initPromise` on WASM init failure for retry | `packages/dwg/src/wasm-loader.ts` | 2 |
| F6 | Use unique MEMFS filenames for concurrent conversions | `packages/dwg/src/convert.ts` | 2 |
| F7 | Add configurable conversion timeout (default 30s) | `packages/dwg/src/convert.ts` | 2 |
| F8 | Per-converter try/catch in `detect()` loop | `packages/core/src/viewer/viewer.ts` | 1 |
| F9 | Check `WebAssembly` availability before init | `packages/dwg/src/wasm-loader.ts` | 2 |
| F10 | Tighten `isDwg` to check "AC10" + 2 ASCII digits | `packages/dwg/src/detect.ts` | 2 |

### Should fix (improves robustness)

| # | Fix | Where | Phase |
|---|---|---|---|
| S1 | Add `onerror` callback prop to wrappers | React, Svelte, Vue wrappers | 3 (future) |
| S2 | DWG version detection + unsupported version error | `packages/dwg/src/detect.ts` + `convert.ts` | 2 |
| S3 | `formatConverters` prop reactivity (watch changes) | All 3 wrappers | 3 (future) |
| S4 | Web Worker for non-blocking WASM conversion | `@cadview/dwg` | Future |
| S5 | `loadDocument()` input validation | `packages/core/src/viewer/viewer.ts` | 1 |
| S6 | Fix binary DXF error type (`Error` -> `DxfParseError`) | `packages/core/src/parser/index.ts` | 1 |

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LibreDWG won't compile with Emscripten | Medium | Blocks Phase 2 | Try older stable tag. Patch missing POSIX calls. Fallback: partial native TS parser. |
| WASM binary too large (>5MB) | Medium | Poor UX on slow connections | Lazy load. CDN hosting. `initWasm({ wasmUrl })` for custom hosting. |
| LibreDWG fails on certain DWG versions | Low | Partial support | Document supported versions. Graceful error with version info. |
| Memory issues with large DWG files | Medium | Crash in WASM | `ALLOW_MEMORY_GROWTH=1`. Test with large files. Document limits. |
| GPL license confusion for end-users | High | Legal risk | Prominent warnings in README, package.json, JSDoc. Separate package. |
| Emscripten build breaks across platforms | Medium | CI/CD issues | Pin Emscripten version. Docker build option. Pre-built WASM in releases. |
| WASM conversion blocks main thread | High | UI freeze 1-3s | Document. Future: Web Worker. Show loading indicator. |

---

## 9. Timeline

| Phase | Task | Effort | Depends on |
|---|---|---|---|
| 1 | FormatConverter interface + core fixes | 1-2 days | -- |
| 2 | `@cadview/dwg` package + WASM compilation | 1-2 weeks | Phase 1 (types) |
| 3 | Framework wrapper updates + fixes | 1 day | Phase 1 |
| 4 | Demo app update | 0.5 day | Phase 1 + 2 |
| 5 | Testing | 2-3 days | Phase 1 + 2 |
| 6 | Documentation | 1 day | All phases |
| **Total** | | **~2-3 weeks** | |

**Critical path:** Phase 2 (WASM compilation) is the bottleneck and highest-risk item.

**Parallelizable:** Phase 1 and Phase 3 can proceed in parallel with Phase 2's WASM
build setup. Phase 5 tests for core (5.1) can be written alongside Phase 1.

---

## 10. End-User API

### Vanilla TypeScript

```typescript
import { CadViewer } from '@cadview/core';
import { dwgConverter } from '@cadview/dwg';

const viewer = new CadViewer(canvas, {
  formatConverters: [dwgConverter],
});

// Automatically handles both .dxf and .dwg
await viewer.loadFile(file);

// Or load from ArrayBuffer with format detection
await viewer.loadBuffer(arrayBuffer);

// Direct DXF loading still works (sync, no converter needed)
viewer.loadString(dxfString);
viewer.loadArrayBuffer(dxfBuffer);
```

### Pre-loading WASM for faster first conversion

```typescript
import { initWasm } from '@cadview/dwg';

// Preload WASM on app startup (optional)
await initWasm();

// Or from a CDN
await initWasm({ wasmUrl: 'https://cdn.example.com/libredwg.wasm' });
```

### React

```tsx
import { CadViewer } from '@cadview/react';
import { dwgConverter } from '@cadview/dwg';

function App() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <CadViewer
      file={file}
      formatConverters={[dwgConverter]}
      onLayersLoaded={(layers) => console.log(layers)}
    />
  );
}
```

### Svelte

```svelte
<script>
  import { CadViewer } from '@cadview/svelte';
  import { dwgConverter } from '@cadview/dwg';

  let file = $state(null);
</script>

<CadViewer {file} formatConverters={[dwgConverter]} />
```

### Vue

```vue
<template>
  <CadViewer :file="file" :format-converters="[dwgConverter]" />
</template>

<script setup>
import { CadViewer } from '@cadview/vue';
import { dwgConverter } from '@cadview/dwg';
import { ref } from 'vue';

const file = ref(null);
</script>
```

### Standalone conversion (without CadViewer)

```typescript
import { convertDwgToDxf, isDwg } from '@cadview/dwg';
import { parseDxf } from '@cadview/core';

// Check format
if (isDwg(buffer)) {
  const dxfString = await convertDwgToDxf(buffer, { timeout: 60000 });
  const doc = parseDxf(dxfString);
  console.log(`Entities: ${doc.entities.length}`);
}
```

---

## 11. Checklist

### Phase 1: FormatConverter Interface in Core

- [ ] Define `FormatConverter` interface in `viewer.ts`
- [ ] Add `formatConverters` to `CadViewerOptions`
- [ ] Store `formatConverters` in constructor
- [ ] Add `loadGeneration` counter field
- [ ] Add `guardDestroyed()` helper method
- [ ] Add `guardDestroyed()` to all public mutating methods
- [ ] Update `loadFile()` with converter detection + load generation guard
- [ ] Add `loadBuffer()` method with converter support
- [ ] Add `loadDocument()` method with input validation
- [ ] Add `guardDestroyed()` + `loadGeneration` to `loadString()`
- [ ] Add `guardDestroyed()` + `loadGeneration` to `loadArrayBuffer()`
- [ ] Export `FormatConverter` type from `index.ts`
- [ ] Fix binary DXF error type (`Error` -> `DxfParseError`) in parser
- [ ] Write unit tests for FormatConverter system

### Phase 2: @cadview/dwg Package

- [ ] Create `packages/dwg/` directory structure
- [ ] Write `package.json` (GPL-3.0)
- [ ] Write `tsconfig.json`
- [ ] Write `tsup.config.ts`
- [ ] Add GPL-3.0 `LICENSE` file
- [ ] Add LibreDWG as git submodule (`wasm/libredwg/`)
- [ ] Write C wrapper (`wasm/wrapper.c`)
- [ ] Write Emscripten build script (`wasm/build.sh`)
- [ ] Successfully compile LibreDWG to WASM
- [ ] Implement `isDwg()` with strict "AC10" + digit validation
- [ ] Implement `getDwgVersion()` and `DWG_VERSIONS` map
- [ ] Implement `wasm-loader.ts` with lazy init, retry on failure, WASM check
- [ ] Implement `convertDwgToDxf()` with timeout, unique filenames, cleanup
- [ ] Export `dwgConverter` as public API in `index.ts`
- [ ] Write detection unit tests
- [ ] Write WASM conversion integration tests

### Phase 3: Framework Wrapper Updates

- [ ] React: add `formatConverters` prop
- [ ] React: pass `formatConverters` to CadViewer constructor
- [ ] React: replace `loadArrayBuffer` with `loadBuffer` (async)
- [ ] React: wrap `loadString` in try/catch
- [ ] React: add `cancelled` flag for stale async guard
- [ ] Svelte: add `formatConverters` prop
- [ ] Svelte: pass `formatConverters` to CadViewer constructor
- [ ] Svelte: replace `loadArrayBuffer` with `loadBuffer` (async)
- [ ] Svelte: wrap `loadString` in try/catch
- [ ] Svelte: add cleanup for stale async guard
- [ ] Vue: add `formatConverters` prop
- [ ] Vue: pass `formatConverters` to CadViewer constructor
- [ ] Vue: replace `loadArrayBuffer` with `loadBuffer` (async)
- [ ] React/Vue: update `useCadViewer` hook with `formatConverters` option

### Phase 4: Demo App

- [ ] Add `@cadview/dwg` dependency
- [ ] Import and register `dwgConverter`
- [ ] Update file input accept to `.dxf,.dwg`
- [ ] Add loading state indicator for DWG conversion

### Phase 5: Testing

- [ ] Core: FormatConverter registration tests
- [ ] Core: `loadFile` with/without converter tests
- [ ] Core: `loadBuffer` with/without converter tests
- [ ] Core: `loadDocument` valid/invalid tests
- [ ] Core: `guardDestroyed` tests
- [ ] Core: `loadGeneration` stale result tests
- [ ] DWG: `isDwg` detection tests (valid, invalid, edge cases)
- [ ] DWG: `getDwgVersion` tests
- [ ] DWG: WASM conversion tests (multiple DWG versions)
- [ ] DWG: concurrent conversion test
- [ ] DWG: timeout test
- [ ] DWG: init failure + retry test
- [ ] DWG: full pipeline integration test
- [ ] Collect 5-10 DWG test fixture files

### Phase 6: Documentation

- [ ] Write `packages/dwg/README.md` with GPL warning
- [ ] Update `packages/core/README.md` with FormatConverter docs
- [ ] Update root `README.md` with DWG package info
