---
title: Getting Started
description: Install @cadview and render your first DXF file. Setup guide for Node.js with npm, pnpm, or yarn.
---

# Getting Started

<p class="subtitle">// install, setup, and render your first DXF file</p>

## Prerequisites

- **Node.js** 18+ and a package manager (npm, pnpm, or yarn)
- A modern browser with Canvas 2D support (all major browsers)

## Installation

Install the core package plus the wrapper for your framework:

```bash
# Core only (vanilla JS/TS)
pnpm add @cadview/core

# React
pnpm add @cadview/core @cadview/react

# Svelte
pnpm add @cadview/core @cadview/svelte

# Vue
pnpm add @cadview/core @cadview/vue
```

If you need DWG file support, also install the optional converter:

```bash
pnpm add @cadview/dwg
```

> **Note:** `@cadview/dwg` is licensed under GPL-3.0 due to its dependency on LibreDWG. The rest of the library is MIT.

## Vanilla JS/TS

The most direct way to use @cadview. Create a `CadViewer` instance with a canvas element:

```typescript
import { CadViewer } from '@cadview/core';

const canvas = document.querySelector<HTMLCanvasElement>('#cad-canvas');
const viewer = new CadViewer(canvas, {
	theme: 'dark',
	initialTool: 'pan'
});

// Load a DXF file from a File input
const input = document.querySelector<HTMLInputElement>('#file-input');
input.addEventListener('change', async () => {
	const file = input.files?.[0];
	if (file) {
		await viewer.loadFile(file);
		viewer.fitToView();
	}
});
```

```html
<canvas id="cad-canvas" style="width: 100%; height: 500px;"></canvas>
<input id="file-input" type="file" accept=".dxf,.dwg" />
```

## React

Use the `<CadViewer>` component or the `useCadViewer` hook for more control:

```tsx
import { useState } from 'react';
import { CadViewer } from '@cadview/react';

export default function App() {
	const [file, setFile] = useState<File | null>(null);

	return (
		<div>
			<input type="file" accept=".dxf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
			<CadViewer file={file} theme="dark" tool="pan" style={{ width: '100%', height: '500px' }} />
		</div>
	);
}
```

## Svelte

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
<CadViewer {file} theme="dark" tool="pan" class="viewer" />

<style>
	.viewer {
		width: 100%;
		height: 500px;
	}
</style>
```

## Vue

```vue
<template>
	<input type="file" accept=".dxf" @change="onFileChange" />
	<CadViewer :file="file" theme="dark" tool="pan" class="viewer" />
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
	height: 500px;
}
</style>
```

## Enabling DWG Support

To load `.dwg` files, register the DWG converter:

```typescript
import { CadViewer } from '@cadview/core';
import { dwgConverter } from '@cadview/dwg';

const viewer = new CadViewer(canvas, {
	formatConverters: [dwgConverter]
});
```

For framework wrappers, pass it via the `formatConverters` prop:

```tsx
<CadViewer file={file} formatConverters={[dwgConverter]} />
```

See [DWG Support](/docs/dwg-support) for advanced configuration and WASM hosting options.

## Next Steps

- [Core API](/docs/core-api) &mdash; Full `CadViewer` class reference
- [Events](/docs/core-api/events) &mdash; Listen for select, measure, and view changes
- [Theming](/docs/theming) &mdash; Customize colors and themes
