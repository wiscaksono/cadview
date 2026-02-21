---
title: Vue
description: Vue 3 component and composable for @cadview. Integrate the CAD/DXF viewer into Vue applications.
---

# Vue Integration

<p class="subtitle">// @cadview/vue &mdash; Vue 3 component and composable</p>

## Installation

```bash
pnpm add @cadview/core @cadview/vue
```

## CadViewer Component

```vue
<template>
	<input type="file" accept=".dxf" @change="onFileChange" />
	<CadViewer
		:file="file"
		theme="dark"
		tool="pan"
		@select="(e) => console.log(e.entity)"
		@measure="(e) => console.log(e.distance)"
		class="viewer"
	/>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CadViewer } from '@cadview/vue';

const file = ref<File | null>(null);

function onFileChange(e: Event) {
	const input = e.target as HTMLInputElement;
	file.value = input.files?.[0] ?? null;
}
</script>

<style scoped>
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
| `options`          | `CadViewerOptions`                      | `{}`     |
| `formatConverters` | `FormatConverter[]`                     | `[]`     |

### Events

| Event           | Payload         | Description                     |
| --------------- | --------------- | ------------------------------- |
| `select`        | `SelectEvent`   | Entity clicked with select tool |
| `measure`       | `MeasureEvent`  | Two-point measurement completed |
| `viewchange`    | `ViewTransform` | Camera position/zoom changed    |
| `layers-loaded` | `DxfLayer[]`    | Layers parsed from document     |

### Template Ref

Access imperative methods via template ref:

```vue
<template>
	<CadViewer ref="viewerRef" :file="file" />
	<button @click="viewerRef?.fitToView()">Fit to View</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CadViewer } from '@cadview/vue';

const viewerRef = ref<InstanceType<typeof CadViewer> | null>(null);
const file = ref<File | null>(null);
</script>
```

#### Exposed Methods

| Method                           | Returns             | Description                     |
| -------------------------------- | ------------------- | ------------------------------- |
| `getViewer()`                    | `CadViewer \| null` | Access the core viewer instance |
| `fitToView()`                    | `void`              | Fit camera to drawing extents   |
| `getLayers()`                    | `DxfLayer[]`        | Get all layers                  |
| `setLayerVisible(name, visible)` | `void`              | Toggle layer visibility         |

## useCadViewer Composable

For full control, use the composable with your own canvas:

```vue
<template>
	<canvas ref="canvasRef" class="cad-canvas" />
	<button @click="fitToView" :disabled="!isLoaded">Fit</button>
	<p v-if="isLoaded">{{ layers.length }} layers loaded</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCadViewer } from '@cadview/vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { viewer, layers, isLoaded, loadFile, fitToView, setTheme, setTool, setLayerVisible } =
	useCadViewer(canvasRef, { theme: 'dark' });
</script>

<style scoped>
.cad-canvas {
	width: 100%;
	height: 500px;
}
</style>
```

### Composable Return Values

| Property          | Type                                       | Description                  |
| ----------------- | ------------------------------------------ | ---------------------------- |
| `viewer`          | `Ref<CadViewer \| null>`                   | Core viewer instance         |
| `layers`          | `Ref<DxfLayer[]>`                          | Current layers (reactive)    |
| `isLoaded`        | `Ref<boolean>`                             | Whether a document is loaded |
| `loadFile`        | `(file: File) => Promise<void>`            | Load a File object           |
| `loadBuffer`      | `(buffer: ArrayBuffer) => Promise<void>`   | Load an ArrayBuffer          |
| `loadString`      | `(dxf: string) => void`                    | Load a DXF string            |
| `fitToView`       | `() => void`                               | Fit camera to drawing        |
| `setLayerVisible` | `(name: string, visible: boolean) => void` | Toggle layer                 |
| `setTheme`        | `(theme: Theme) => void`                   | Change theme                 |
| `setTool`         | `(tool: Tool) => void`                     | Change active tool           |

## Full Example

```vue
<template>
	<div class="app">
		<header>
			<input type="file" accept=".dxf,.dwg" @change="onFileChange" />

			<select v-model="tool" @change="onToolChange">
				<option value="pan">Pan</option>
				<option value="select">Select</option>
				<option value="measure">Measure</option>
			</select>

			<button @click="viewerRef?.fitToView()">Fit</button>
		</header>

		<CadViewer
			ref="viewerRef"
			:file="file"
			:tool="tool"
			theme="dark"
			:format-converters="[dwgConverter]"
			@select="onSelect"
			@measure="(e) => console.log('Distance:', e.distance)"
			@layers-loaded="(l) => (layers = l)"
			class="viewer"
		/>

		<p v-if="selected">Selected: {{ selected }}</p>

		<aside>
			<h3>Layers</h3>
			<label v-for="layer in layers" :key="layer.name">
				<input
					type="checkbox"
					:checked="!layer.isOff"
					@change="
						viewerRef?.setLayerVisible(layer.name, ($event.target as HTMLInputElement).checked)
					"
				/>
				{{ layer.name }}
			</label>
		</aside>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CadViewer, type DxfLayer, type SelectEvent } from '@cadview/vue';
import { dwgConverter } from '@cadview/dwg';

const viewerRef = ref<InstanceType<typeof CadViewer> | null>(null);
const file = ref<File | null>(null);
const tool = ref<'pan' | 'select' | 'measure'>('pan');
const layers = ref<DxfLayer[]>([]);
const selected = ref<string | null>(null);

function onFileChange(e: Event) {
	const input = e.target as HTMLInputElement;
	file.value = input.files?.[0] ?? null;
}

function onSelect(event: SelectEvent) {
	selected.value = `${event.entity.type} on layer "${event.entity.layer}"`;
}

function onToolChange() {
	// tool is reactive via v-model
}
</script>

<style scoped>
.viewer {
	width: 100%;
	height: 80vh;
}
</style>
```
