---
title: CadViewer
description: CadViewer class API reference. Manages canvas setup, file loading, rendering, interaction, and cleanup.
---

# Core API &mdash; CadViewer

<p class="subtitle">// the main viewer class that orchestrates parsing, rendering, and interaction</p>

The `CadViewer` class is the central entry point. It manages the full lifecycle: canvas setup, file loading, rendering, user interaction, and resource cleanup.

## Constructor

```typescript
import { CadViewer } from '@cadview/core';

const viewer = new CadViewer(canvas: HTMLCanvasElement, options?: CadViewerOptions);
```

### CadViewerOptions

| Property           | Type                      | Default  | Description                     |
| ------------------ | ------------------------- | -------- | ------------------------------- |
| `theme`            | `'dark' \| 'light'`       | `'dark'` | Color theme                     |
| `backgroundColor`  | `string`                  | &mdash;  | Override theme background color |
| `antialias`        | `boolean`                 | `true`   | Enable canvas anti-aliasing     |
| `minZoom`          | `number`                  | `0.0001` | Minimum zoom scale              |
| `maxZoom`          | `number`                  | `100000` | Maximum zoom scale              |
| `zoomSpeed`        | `number`                  | `1.1`    | Zoom factor per scroll step     |
| `initialTool`      | `Tool`                    | `'pan'`  | Active tool on initialization   |
| `formatConverters` | `FormatConverter[]`       | `[]`     | Format converters (e.g., DWG)   |
| `debug`            | `boolean \| DebugOptions` | `false`  | Enable debug overlay            |
| `worker`           | `boolean`                 | `false`  | Parse DXF in a Web Worker       |

## Loading Files

Multiple methods for loading CAD data, from high-level to low-level:

### loadFile

```typescript
await viewer.loadFile(file: File): Promise<void>
```

Load from a browser `File` object. Automatically detects format via registered `formatConverters` (checks magic bytes, not file extension). Falls back to DXF parsing. Uses Web Worker if `worker: true`.

### loadBuffer

```typescript
await viewer.loadBuffer(buffer: ArrayBuffer): Promise<void>
```

Load from an `ArrayBuffer`. Same format detection and worker support as `loadFile`.

### loadString

```typescript
viewer.loadString(dxf: string): void
```

Load a DXF string directly. **Synchronous.** No format conversion, no worker support.

### loadArrayBuffer

```typescript
viewer.loadArrayBuffer(buffer: ArrayBuffer): void
```

Load a DXF file from an `ArrayBuffer`. **Synchronous.** No format conversion.

### loadDocument

```typescript
viewer.loadDocument(doc: DxfDocument): void
```

Load a pre-parsed `DxfDocument` directly. Useful if you parse the DXF yourself or receive it from another source.

### clearDocument

```typescript
viewer.clearDocument(): void
```

Clear the current document and reset all viewer state (selection, measurement, spatial index) without destroying the viewer instance.

## Camera Controls

### fitToView

```typescript
viewer.fitToView(): void
```

Fit the camera to the document extents with 5% padding. Call after loading a file to show the full drawing.

### zoomTo

```typescript
viewer.zoomTo(scale: number): void
```

Zoom to an absolute scale level, centered on the canvas.

### panTo

```typescript
viewer.panTo(worldX: number, worldY: number): void
```

Pan so that the given world coordinate is at the center of the canvas.

### getViewTransform

```typescript
viewer.getViewTransform(): ViewTransform
```

Get a copy of the current view transform. Returns `{ scale, offsetX, offsetY }`.

## Layer Management

### getLayers

```typescript
viewer.getLayers(): DxfLayer[]
```

Get all layers from the loaded document.

### setLayerVisible

```typescript
viewer.setLayerVisible(name: string, visible: boolean): void
```

Show or hide a layer by name. Triggers a re-render.

### setLayerColor

```typescript
viewer.setLayerColor(name: string, color: string): void
```

Override the display color of a layer. Pass a hex color string (e.g., `'#ff0000'`).

## Theme

### setTheme / getTheme

```typescript
viewer.setTheme(theme: 'dark' | 'light'): void
viewer.getTheme(): Theme
```

Switch between dark and light themes. See [Theming](/docs/theming) for details.

### setBackgroundColor

```typescript
viewer.setBackgroundColor(color: string): void
```

Override the theme background color with a custom hex color.

## Tools

### setTool / getTool

```typescript
viewer.setTool(tool: 'pan' | 'select' | 'measure'): void
viewer.getTool(): Tool
```

Switch the active interaction tool:

- **`pan`** &mdash; Click and drag to pan. Scroll to zoom. This is the default.
- **`select`** &mdash; Click an entity to select it. Fires the `select` event with entity data.
- **`measure`** &mdash; Click two points to measure distance. Snaps to entity endpoints, midpoints, and centers. Fires the `measure` event.

> **Tip:** Middle-click always pans, regardless of the active tool.

## Events

```typescript
viewer.on('select', (event: SelectEvent) => { ... });
viewer.on('measure', (event: MeasureEvent) => { ... });
viewer.on('viewchange', (transform: ViewTransform) => { ... });

viewer.off('select', callback);
```

See [Events](/docs/core-api/events) for full event reference.

## Document Access

### getDocument

```typescript
viewer.getDocument(): DxfDocument | null
```

Get the currently loaded document, or `null` if no document is loaded.

### getEntities

```typescript
viewer.getEntities(): DxfEntity[]
```

Get all entities from the loaded document. Returns an empty array if no document is loaded.

## Debug

### setDebug

```typescript
viewer.setDebug(debug: boolean | DebugOptions): void
```

Enable or disable the debug overlay. Pass `true` for defaults, `false` to disable, or a `DebugOptions` object for granular control:

```typescript
viewer.setDebug({
	showFps: true,
	showRenderStats: true,
	showDocumentInfo: true,
	showTimings: true,
	showCamera: true,
	position: 'top-left'
});
```

### getDebugStats

```typescript
viewer.getDebugStats(): DebugStats | null
```

Get the latest debug stats snapshot. Returns `null` if debug mode is off.

## Lifecycle

### resize

```typescript
viewer.resize(): void
```

Update the canvas size. Called automatically by an internal `ResizeObserver`, but you can call it manually if needed.

### destroy

```typescript
viewer.destroy(): void
```

Destroy the viewer and release all resources (canvas context, event listeners, resize observer, spatial index, Web Worker). **Always call this when the viewer is no longer needed.**
