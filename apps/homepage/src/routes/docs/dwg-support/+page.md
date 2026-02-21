---
title: DWG Support
description: Add DWG file support via LibreDWG WASM. Converts DWG to DXF in the browser. GPL-3.0 licensed.
---

# DWG Support

<p class="subtitle">// optional DWG file loading via LibreDWG WASM</p>

The `@cadview/dwg` package adds DWG file support by converting DWG to DXF using [LibreDWG](https://www.gnu.org/software/libredwg/) compiled to WebAssembly.

> **License:** `@cadview/dwg` is licensed under **GPL-3.0** due to its dependency on LibreDWG. If GPL is not compatible with your project, you can still use the rest of @cadview (MIT) for DXF-only support.

## Installation

```bash
pnpm add @cadview/dwg
```

## Basic Usage

Register the `dwgConverter` with your viewer:

```typescript
import { CadViewer } from '@cadview/core';
import { dwgConverter } from '@cadview/dwg';

const viewer = new CadViewer(canvas, {
	formatConverters: [dwgConverter]
});

// Now loadFile() and loadBuffer() accept both .dxf and .dwg files
await viewer.loadFile(file);
```

For framework wrappers, pass it as a prop:

```tsx
import { dwgConverter } from '@cadview/dwg';

<CadViewer file={file} formatConverters={[dwgConverter]} />;
```

## How It Works

1. `dwgConverter.detect(buffer)` checks the file's magic bytes for the `"AC10"` signature
2. If detected as DWG, `dwgConverter.convert(buffer)` is called
3. The WASM module is lazily loaded (~6&nbsp;MB from jsDelivr CDN)
4. The DWG buffer is written to Emscripten's virtual filesystem (MEMFS)
5. LibreDWG converts DWG to DXF
6. The DXF string is returned and parsed by `@cadview/core`

## WASM Loading

By default, the WASM binary is loaded from **jsDelivr CDN** on first use. You can preload it or self-host it.

### Preloading

Preload the WASM binary before the user opens a file to avoid the initial load delay:

```typescript
import { initWasm } from '@cadview/dwg';

// Call early in your app initialization
await initWasm();
```

### Self-hosting

Host the WASM binary on your own server:

```typescript
import { initWasm } from '@cadview/dwg';

await initWasm({
	wasmUrl: '/assets/libredwg.wasm'
});
```

Or pass it through the converter options:

```typescript
import { convertDwgToDxf } from '@cadview/dwg';

const dxfString = await convertDwgToDxf(buffer, {
	wasmUrl: '/assets/libredwg.wasm',
	timeout: 60000 // 60 seconds
});
```

### Checking WASM Status

```typescript
import { isWasmReady } from '@cadview/dwg';

if (isWasmReady()) {
	console.log('WASM module is loaded and ready');
}
```

## Detection Utilities

Inspect DWG files without converting them:

```typescript
import { isDwg, getDwgVersion, getDwgReleaseName } from '@cadview/dwg';

// Check if a buffer is a DWG file
isDwg(buffer); // true or false

// Get the version string
getDwgVersion(buffer); // "AC1032"

// Get the human-readable release name
getDwgReleaseName('AC1032'); // "R2018"
```

## Supported Versions

| Version Code | AutoCAD Release | Supported    |
| ------------ | --------------- | ------------ |
| AC1009       | R11/R12         | No (too old) |
| AC1012       | R13             | Yes          |
| AC1014       | R14             | Yes          |
| AC1015       | R2000           | Yes          |
| AC1018       | R2004           | Yes          |
| AC1021       | R2007           | Yes          |
| AC1024       | R2010           | Yes          |
| AC1027       | R2013           | Yes          |
| AC1032       | R2018           | Yes          |

Minimum supported version is **AC1012 (R13)**.

## ConvertOptions

```typescript
interface ConvertOptions {
	wasmUrl?: string; // Custom URL for the WASM binary
	timeout?: number; // Timeout in ms (default: 30000, set 0 to disable)
}
```

## Conversion API

For advanced use cases, call the conversion function directly:

```typescript
import { convertDwgToDxf } from '@cadview/dwg';

const dxfString = await convertDwgToDxf(dwgBuffer, {
	timeout: 60000
});

// Parse the DXF string with the core parser
import { parseDxf } from '@cadview/core';
const doc = parseDxf(dxfString);
```

## FormatConverter Interface

`dwgConverter` implements the `FormatConverter` interface from `@cadview/core`:

```typescript
interface FormatConverter {
	detect(buffer: ArrayBuffer): boolean;
	convert(buffer: ArrayBuffer): Promise<string>;
}
```

You can create your own format converters following this interface to support additional file formats.

## Troubleshooting

If the WASM module won't load, it's almost always a CSP issue. Make sure `cdn.jsdelivr.net` is in your `script-src` and that `wasm-unsafe-eval` is allowed. Self-hosting the binary sidesteps this entirely.

Large or complex DWG files can exceed the default 30-second timeout. Bump it with the `timeout` option &mdash; some files genuinely need a minute or more.

Anything older than AC1012 (AutoCAD R12 and earlier) isn't supported. LibreDWG can't read those formats.
