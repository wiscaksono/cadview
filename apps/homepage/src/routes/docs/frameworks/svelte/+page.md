---
title: Svelte
description: Svelte 5 component for @cadview. Integrate the CAD/DXF viewer into Svelte applications.
---

# Svelte Integration

<p class="subtitle">// @cadview/svelte &mdash; Svelte 5 component</p>

## Installation

```bash
pnpm add @cadview/core @cadview/svelte
```

## CadViewer Component

```svelte
<script lang="ts">
	import { CadViewer } from '@cadview/svelte';

	let file = $state<File | null>(null);

	function onFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		file = input.files?.[0] ?? null;
	}
</script>

<input type="file" accept=".dxf" onchange={onFileChange} />
<CadViewer
	{file}
	theme="dark"
	tool="pan"
	onselect={(e) => console.log(e.entity)}
	onmeasure={(e) => console.log(e.distance)}
	class="viewer"
/>

<style>
	.viewer {
		width: 100%;
		height: 600px;
	}
</style>
```

### Props

| Prop               | Type                                    | Default  |
| ------------------ | --------------------------------------- | -------- |
| `file`             | `File \| ArrayBuffer \| string \| null` | `null`   |
| `theme`            | `Theme`                                 | `'dark'` |
| `tool`             | `Tool`                                  | `'pan'`  |
| `debug`            | `boolean \| DebugOptions`               | `false`  |
| `worker`           | `boolean`                               | `false`  |
| `class`            | `string`                                | `''`     |
| `options`          | `CadViewerOptions`                      | `{}`     |
| `formatConverters` | `FormatConverter[]`                     | `[]`     |
| `onselect`         | `(event: SelectEvent) => void`          | &mdash;  |
| `onmeasure`        | `(event: MeasureEvent) => void`         | &mdash;  |
| `onviewchange`     | `(transform: ViewTransform) => void`    | &mdash;  |
| `onlayersloaded`   | `(layers: DxfLayer[]) => void`          | &mdash;  |

> **Note:** Svelte event callbacks use lowercase names (e.g., `onselect` not `onSelect`) following Svelte 5 conventions.

### Exposed Methods

Access imperative methods via `bind:this`:

```svelte
<script lang="ts">
	import { CadViewer } from '@cadview/svelte';

	let viewer: CadViewer;
</script>

<CadViewer bind:this={viewer} {file} />
<button onclick={() => viewer.fitToView()}>Fit to View</button>
```

| Method                           | Returns             | Description                     |
| -------------------------------- | ------------------- | ------------------------------- |
| `getViewer()`                    | `CadViewer \| null` | Access the core viewer instance |
| `fitToView()`                    | `void`              | Fit camera to drawing extents   |
| `getLayers()`                    | `DxfLayer[]`        | Get all layers                  |
| `setLayerVisible(name, visible)` | `void`              | Toggle layer visibility         |

## Full Example

```svelte
<script lang="ts">
	import { CadViewer, type DxfLayer, type SelectEvent } from '@cadview/svelte';
	import { dwgConverter } from '@cadview/dwg';

	let viewer: CadViewer;
	let file = $state<File | null>(null);
	let tool = $state<'pan' | 'select' | 'measure'>('pan');
	let layers = $state<DxfLayer[]>([]);
	let selected = $state<string | null>(null);

	function onFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		file = input.files?.[0] ?? null;
	}

	function onSelect(event: SelectEvent) {
		selected = `${event.entity.type} on layer "${event.entity.layer}"`;
	}

	function toggleLayer(name: string, visible: boolean) {
		viewer.setLayerVisible(name, visible);
	}
</script>

<div class="app">
	<header>
		<input type="file" accept=".dxf,.dwg" onchange={onFileChange} />

		<select bind:value={tool}>
			<option value="pan">Pan</option>
			<option value="select">Select</option>
			<option value="measure">Measure</option>
		</select>

		<button onclick={() => viewer.fitToView()}>Fit</button>
	</header>

	<CadViewer
		bind:this={viewer}
		{file}
		{tool}
		theme="dark"
		formatConverters={[dwgConverter]}
		onselect={onSelect}
		onmeasure={(e) => console.log('Distance:', e.distance)}
		onlayersloaded={(l) => (layers = l)}
		class="viewer"
	/>

	{#if selected}
		<p>Selected: {selected}</p>
	{/if}

	<aside>
		<h3>Layers</h3>
		{#each layers as layer}
			<label>
				<input
					type="checkbox"
					checked={!layer.isOff}
					onchange={(e) => toggleLayer(layer.name, e.currentTarget.checked)}
				/>
				{layer.name}
			</label>
		{/each}
	</aside>
</div>

<style>
	.viewer {
		width: 100%;
		height: 80vh;
	}
</style>
```
