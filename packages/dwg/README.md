# @cadview/dwg

DWG file format support for [@cadview/core](../core) via [LibreDWG](https://github.com/LibreDWG/libredwg) compiled to WebAssembly.

Converts DWG files to DXF entirely in the browser — no server required.

## License

**GPL-3.0-only** — This package uses LibreDWG which is GPL-licensed. Using `@cadview/dwg` in your application makes the combined work subject to GPL-3.0 terms. If you cannot comply with the GPL, do not use this package.

`@cadview/core` and the framework wrappers (`@cadview/react`, `@cadview/svelte`, `@cadview/vue`) remain MIT-licensed and have zero dependency on this package.

## Installation

```bash
npm install @cadview/dwg @cadview/core
```

## Quick Start

Register the `dwgConverter` with `CadViewer` to automatically handle DWG files alongside DXF:

```ts
import { CadViewer } from '@cadview/core';
import { dwgConverter } from '@cadview/dwg';

const viewer = new CadViewer(canvas, {
  formatConverters: [dwgConverter],
});

// loadFile() and loadBuffer() now handle both DXF and DWG
await viewer.loadFile(file);
```

With framework wrappers:

```tsx
// React
import { CadViewer } from '@cadview/react';
import { dwgConverter } from '@cadview/dwg';

<CadViewer file={file} formatConverters={[dwgConverter]} />
```

```svelte
<!-- Svelte -->
<script>
  import { CadViewer } from '@cadview/svelte';
  import { dwgConverter } from '@cadview/dwg';
</script>

<CadViewer {file} formatConverters={[dwgConverter]} />
```

```vue
<!-- Vue -->
<script setup>
import { CadViewer } from '@cadview/vue';
import { dwgConverter } from '@cadview/dwg';
</script>

<CadViewer :file="file" :format-converters="[dwgConverter]" />
```

## Standalone Usage

You can use the conversion functions directly without `CadViewer`:

```ts
import { convertDwgToDxf, isDwg, getDwgVersion } from '@cadview/dwg';
import { parseDxf } from '@cadview/core';

// Check if a buffer is a DWG file
const buffer = await file.arrayBuffer();
if (isDwg(buffer)) {
  const version = getDwgVersion(buffer); // e.g. "AC1032"
  const dxfString = await convertDwgToDxf(buffer);
  const doc = parseDxf(dxfString);
}
```

## WASM Preloading

The LibreDWG WASM module (~2-5 MB) is lazy-loaded on the first DWG conversion. To avoid the delay when the user first opens a DWG file, preload it on app startup:

```ts
import { initWasm } from '@cadview/dwg';

// Preload on app startup
initWasm();

// Or from a CDN
initWasm({ wasmUrl: 'https://cdn.example.com/libredwg.wasm' });
```

## API

### `dwgConverter: FormatConverter`

Pre-configured format converter for use with `CadViewer`'s `formatConverters` option. Detects DWG files by magic bytes and converts via LibreDWG WASM.

### `isDwg(buffer: ArrayBuffer): boolean`

Detect DWG format by checking magic bytes (`AC10` prefix + two ASCII digits). Returns `false` on any error.

### `getDwgVersion(buffer: ArrayBuffer): string | null`

Extract the 6-character DWG version string (e.g. `"AC1032"`). Returns `null` for non-DWG buffers.

### `getDwgReleaseName(version: string): string | null`

Get the human-readable AutoCAD release name for a version string (e.g. `"AC1032"` → `"R2018"`).

### `convertDwgToDxf(buffer: ArrayBuffer, options?: ConvertOptions): Promise<string>`

Convert a DWG buffer to a DXF string. Lazily initializes the WASM module on first call.

Options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `30000` | Conversion timeout in ms (0 = no timeout) |
| `wasmUrl` | `string` | — | Custom URL for the `.wasm` file (e.g. CDN) |

### `initWasm(options?: WasmOptions): Promise<void>`

Pre-initialize the WASM module. Safe to call multiple times. Automatically retries on failure.

### `isWasmReady(): boolean`

Check if the WASM module is loaded and ready.

### `DWG_VERSIONS: Record<string, string>`

Map of known DWG version strings to AutoCAD release names:

| Version | Release |
|---------|---------|
| AC1009 | R11/R12 |
| AC1012 | R13 |
| AC1014 | R14 |
| AC1015 | R2000 |
| AC1018 | R2004 |
| AC1021 | R2007 |
| AC1024 | R2010 |
| AC1027 | R2013 |
| AC1032 | R2018 |

Minimum supported version: **AC1012 (R13)**.

## Building the WASM Module

The WASM module must be compiled from LibreDWG using Emscripten before DWG conversion will work at runtime.

Prerequisites:
- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) (`emsdk`)
- Git (for LibreDWG submodule)

```bash
# Add LibreDWG as a git submodule (one-time)
git submodule add https://github.com/LibreDWG/libredwg.git packages/dwg/wasm/libredwg/

# Build the WASM module
pnpm --filter @cadview/dwg build:wasm
```

This generates `dist/libredwg.js` and `dist/libredwg.wasm`.

## License

GPL-3.0-only. See [LICENSE](./LICENSE).
