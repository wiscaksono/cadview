# @cadview/core

Framework-agnostic CAD file viewer engine with DXF parser and Canvas 2D renderer.

## Features

- Parses 13 DXF entity types: LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE, ELLIPSE, SPLINE, TEXT, MTEXT, INSERT, DIMENSION, HATCH, POINT
- Canvas 2D renderer with DPR scaling and dark/light themes
- Pan, zoom (mouse wheel + pinch), pointer capture, and touch support
- R-tree spatial indexing (rbush) for entity selection and hit-testing
- Measurement tool that snaps to endpoints, midpoints, and centers
- Layer visibility toggle and color overrides
- Full ACI color table (256 colors), swaps color 7 for dark/light themes
- Block INSERT rendering, including nested blocks
- No framework dependencies, works with any UI framework or vanilla JS

## Installation

```bash
npm install @cadview/core
```

## Quick Start

```ts
import { CadViewer } from '@cadview/core';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const viewer = new CadViewer(canvas, { theme: 'dark' });

// Load a DXF file
const response = await fetch('/drawing.dxf');
const buffer = await response.arrayBuffer();
viewer.loadArrayBuffer(buffer);

// Or load from File input
const file = input.files[0];
await viewer.loadFile(file);

// Controls
viewer.fitToView();
viewer.setTheme('light');
viewer.setTool('select'); // 'pan' | 'select' | 'measure'

// Events
viewer.on('select', (e) => {
  console.log('Selected:', e.entity.type, 'on layer:', e.entity.layer);
});

viewer.on('measure', (e) => {
  console.log('Distance:', e.distance);
});

// Cleanup
viewer.destroy();
```

## API

### `CadViewer`

Main viewer class that orchestrates parsing, rendering, and interaction.

#### Constructor

```ts
new CadViewer(canvas: HTMLCanvasElement, options?: CadViewerOptions)
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `theme` | `'dark' \| 'light'` | `'dark'` | Color theme |
| `minZoom` | `number` | `0.0001` | Minimum zoom scale |
| `maxZoom` | `number` | `100000` | Maximum zoom scale |
| `zoomSpeed` | `number` | `1.1` | Zoom factor per wheel tick |
| `initialTool` | `Tool` | `'pan'` | Active tool on init |
| `formatConverters` | `FormatConverter[]` | `[]` | Format converters for non-DXF files (e.g. DWG) |

#### Methods

| Method | Description |
|--------|-------------|
| `loadFile(file: File)` | Load from a File object (async, runs format converters) |
| `loadBuffer(buffer: ArrayBuffer)` | Load from an ArrayBuffer (async, runs format converters) |
| `loadString(dxf: string)` | Load DXF from a string (sync, no conversion) |
| `loadArrayBuffer(buffer: ArrayBuffer)` | Load DXF from an ArrayBuffer (sync, no conversion) |
| `loadDocument(doc: DxfDocument)` | Load a pre-parsed DxfDocument directly |
| `clearDocument()` | Clear the current document without destroying the viewer |
| `fitToView()` | Fit drawing to canvas bounds |
| `setTheme(theme)` | Set color theme |
| `setTool(tool)` | Set active tool (`pan`, `select`, `measure`) |
| `getLayers()` | Get all layers |
| `setLayerVisible(name, visible)` | Toggle layer visibility |
| `on(event, callback)` | Subscribe to events |
| `off(event, callback)` | Unsubscribe from events |
| `destroy()` | Clean up all resources |

### `FormatConverter`

Interface for registering custom file format converters. Converters are checked in order during `loadFile()` and `loadBuffer()` — the first match wins.

```ts
interface FormatConverter {
  /** Return true if the buffer is in this format (check magic bytes, not extensions). */
  detect(buffer: ArrayBuffer): boolean;
  /** Convert the buffer to a DXF string. */
  convert(buffer: ArrayBuffer): Promise<string>;
}
```

**Example — DWG support via `@cadview/dwg`:**

```ts
import { CadViewer } from '@cadview/core';
import { dwgConverter } from '@cadview/dwg';

const viewer = new CadViewer(canvas, {
  formatConverters: [dwgConverter],
});

// loadFile and loadBuffer now handle both DXF and DWG
await viewer.loadFile(file);
```

> **Note:** `@cadview/dwg` is licensed under GPL-3.0 (due to LibreDWG). `@cadview/core` remains MIT. See the [@cadview/dwg README](../dwg/README.md) for details.

### `parseDxf`

Standalone DXF parser — use this if you only need parsing without the viewer.

```ts
import { parseDxf } from '@cadview/core';

const doc = parseDxf(dxfString);
console.log(doc.entities.length, 'entities');
console.log(doc.layers.size, 'layers');
```

## Supported DXF Entities

LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE, ELLIPSE, SPLINE, TEXT, MTEXT, INSERT (with MINSERT grid), DIMENSION (with geometry blocks), HATCH (line/arc/circle edges), POINT.

## License

MIT
