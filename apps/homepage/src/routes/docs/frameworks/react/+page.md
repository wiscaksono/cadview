---
title: React
description: React 18/19 component and hook for @cadview. Integrate the CAD/DXF viewer into React applications.
---

# React Integration

<p class="subtitle">// @cadview/react &mdash; React 18/19 component and hook</p>

## Installation

```bash
pnpm add @cadview/core @cadview/react
```

## CadViewer Component

The simplest way to embed a CAD viewer:

```tsx
import { CadViewer } from '@cadview/react';

function App() {
	const [file, setFile] = useState<File | null>(null);

	return (
		<CadViewer
			file={file}
			theme="dark"
			tool="pan"
			style={{ width: '100%', height: '600px' }}
			onSelect={(e) => console.log(e.entity)}
			onMeasure={(e) => console.log(e.distance)}
		/>
	);
}
```

### Props

| Prop               | Type                                    | Default  |
| ------------------ | --------------------------------------- | -------- |
| `file`             | `File \| ArrayBuffer \| string \| null` | &mdash;  |
| `theme`            | `Theme`                                 | `'dark'` |
| `tool`             | `Tool`                                  | `'pan'`  |
| `debug`            | `boolean \| DebugOptions`               | `false`  |
| `worker`           | `boolean`                               | `false`  |
| `className`        | `string`                                | &mdash;  |
| `style`            | `CSSProperties`                         | &mdash;  |
| `options`          | `CadViewerOptions`                      | `{}`     |
| `formatConverters` | `FormatConverter[]`                     | `[]`     |
| `onSelect`         | `(event: SelectEvent) => void`          | &mdash;  |
| `onMeasure`        | `(event: MeasureEvent) => void`         | &mdash;  |
| `onViewChange`     | `(transform: ViewTransform) => void`    | &mdash;  |
| `onLayersLoaded`   | `(layers: DxfLayer[]) => void`          | &mdash;  |

### Ref API

Use a ref to access imperative methods:

```tsx
import { useRef } from 'react';
import { CadViewer, type CadViewerRef } from '@cadview/react';

function App() {
	const viewerRef = useRef<CadViewerRef>(null);

	return (
		<>
			<CadViewer ref={viewerRef} file={file} />
			<button onClick={() => viewerRef.current?.fitToView()}>Fit to View</button>
		</>
	);
}
```

#### CadViewerRef Methods

| Method                           | Returns             | Description                     |
| -------------------------------- | ------------------- | ------------------------------- |
| `getViewer()`                    | `CadViewer \| null` | Access the core viewer instance |
| `fitToView()`                    | `void`              | Fit camera to drawing extents   |
| `getLayers()`                    | `DxfLayer[]`        | Get all layers                  |
| `setLayerVisible(name, visible)` | `void`              | Toggle layer visibility         |

## useCadViewer Hook

For more control, use the hook directly with your own canvas:

```tsx
import { useRef } from 'react';
import { useCadViewer } from '@cadview/react';

function CustomViewer() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const {
		viewer,
		layers,
		isLoaded,
		error,
		loadFile,
		fitToView,
		setTheme,
		setTool,
		setLayerVisible
	} = useCadViewer(canvasRef, { theme: 'dark' });

	return (
		<div>
			<canvas ref={canvasRef} style={{ width: '100%', height: '500px' }} />
			{error && <p>Error: {error.message}</p>}
			{isLoaded && (
				<div>
					<button onClick={fitToView}>Fit</button>
					<p>{layers.length} layers loaded</p>
				</div>
			)}
		</div>
	);
}
```

### Hook Return Values

| Property          | Type                                       | Description                  |
| ----------------- | ------------------------------------------ | ---------------------------- |
| `viewer`          | `CadViewer \| null`                        | Core viewer instance         |
| `layers`          | `DxfLayer[]`                               | Current layers (reactive)    |
| `isLoaded`        | `boolean`                                  | Whether a document is loaded |
| `error`           | `Error \| null`                            | Last loading error           |
| `loadFile`        | `(file: File) => Promise<void>`            | Load a File object           |
| `loadBuffer`      | `(buffer: ArrayBuffer) => Promise<void>`   | Load an ArrayBuffer          |
| `loadString`      | `(dxf: string) => void`                    | Load a DXF string            |
| `fitToView`       | `() => void`                               | Fit camera to drawing        |
| `setLayerVisible` | `(name: string, visible: boolean) => void` | Toggle layer                 |
| `setTheme`        | `(theme: Theme) => void`                   | Change theme                 |
| `setTool`         | `(tool: Tool) => void`                     | Change active tool           |

## Full Example

A complete example with file input, tool switching, and layer management:

```tsx
import { useState, useRef } from 'react';
import { CadViewer, type CadViewerRef, type DxfLayer } from '@cadview/react';
import { dwgConverter } from '@cadview/dwg';

export default function CadApp() {
	const ref = useRef<CadViewerRef>(null);
	const [file, setFile] = useState<File | null>(null);
	const [tool, setTool] = useState<'pan' | 'select' | 'measure'>('pan');
	const [layers, setLayers] = useState<DxfLayer[]>([]);

	return (
		<div>
			<header>
				<input
					type="file"
					accept=".dxf,.dwg"
					onChange={(e) => setFile(e.target.files?.[0] ?? null)}
				/>
				<select value={tool} onChange={(e) => setTool(e.target.value as any)}>
					<option value="pan">Pan</option>
					<option value="select">Select</option>
					<option value="measure">Measure</option>
				</select>
				<button onClick={() => ref.current?.fitToView()}>Fit</button>
			</header>

			<CadViewer
				ref={ref}
				file={file}
				tool={tool}
				theme="dark"
				formatConverters={[dwgConverter]}
				onLayersLoaded={setLayers}
				onSelect={(e) => console.log('Selected:', e.entity.type)}
				onMeasure={(e) => console.log('Distance:', e.distance)}
				style={{ width: '100%', height: '80vh' }}
			/>

			<aside>
				<h3>Layers</h3>
				{layers.map((layer) => (
					<label key={layer.name}>
						<input
							type="checkbox"
							checked={!layer.isOff}
							onChange={(e) => ref.current?.setLayerVisible(layer.name, e.target.checked)}
						/>
						{layer.name}
					</label>
				))}
			</aside>
		</div>
	);
}
```
