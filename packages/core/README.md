# @cadview/core

Framework-agnostic CAD file viewer engine with DXF parser and Canvas 2D renderer.

## Features

- Fast DXF parser with support for 13 entity types (LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE, ELLIPSE, SPLINE, TEXT, MTEXT, INSERT, DIMENSION, HATCH, POINT)
- Canvas 2D renderer with DPR-aware rendering and dark/light themes
- Interactive viewer with pan, zoom (mouse wheel + pinch), and pointer capture
- Entity selection with spatial indexing (R-tree) and geometric hit-testing
- Measurement tool with snap-to-geometry (endpoint, midpoint, center)
- Layer management with visibility toggle and color overrides
- ACI color table (256 colors) with theme-aware color 7 swap
- Block INSERT rendering with nested block support
- Zero framework dependencies — works with any UI framework or vanilla JS

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

#### Methods

| Method | Description |
|--------|-------------|
| `loadFile(file: File)` | Load DXF from a File object |
| `loadString(dxf: string)` | Load DXF from a string |
| `loadArrayBuffer(buffer: ArrayBuffer)` | Load DXF from an ArrayBuffer |
| `fitToView()` | Fit drawing to canvas bounds |
| `setTheme(theme)` | Set color theme |
| `setTool(tool)` | Set active tool (`pan`, `select`, `measure`) |
| `getLayers()` | Get all layers |
| `setLayerVisible(name, visible)` | Toggle layer visibility |
| `on(event, callback)` | Subscribe to events |
| `off(event, callback)` | Unsubscribe from events |
| `destroy()` | Clean up all resources |

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
