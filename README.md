# @cadview

A framework-agnostic CAD/DXF file viewer for the web.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178c6.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-339933.svg)](https://nodejs.org/)

## Features

- **Fast DXF parser** supporting 13 entity types
- **Canvas 2D renderer** with DPR-aware rendering and dark/light themes
- **Interactive viewer** with pan, zoom (mouse wheel + pinch), and pointer capture
- **Entity selection** with R-tree spatial indexing and geometric hit-testing
- **Measurement tool** with snap-to-geometry (endpoint, midpoint, center)
- **Layer management** with visibility toggle and color overrides
- **ACI color table** (256 colors) with theme-aware color resolution
- **Block INSERT rendering** with nested block and MINSERT grid support
- **Framework wrappers** for React, Svelte 5, and Vue 3
- **Zero framework dependencies** in the core package
- **TypeScript-first** with full type definitions

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@cadview/core`](packages/core) | Core engine — DXF parser, Canvas 2D renderer, interactive viewer | [![npm](https://img.shields.io/npm/v/@cadview/core.svg)](https://www.npmjs.com/package/@cadview/core) |
| [`@cadview/react`](packages/react) | React component and hook | [![npm](https://img.shields.io/npm/v/@cadview/react.svg)](https://www.npmjs.com/package/@cadview/react) |
| [`@cadview/svelte`](packages/svelte) | Svelte 5 component | [![npm](https://img.shields.io/npm/v/@cadview/svelte.svg)](https://www.npmjs.com/package/@cadview/svelte) |
| [`@cadview/vue`](packages/vue) | Vue 3 component and composable | [![npm](https://img.shields.io/npm/v/@cadview/vue.svg)](https://www.npmjs.com/package/@cadview/vue) |

## Quick Start

### Vanilla JS

```bash
npm install @cadview/core
```

```ts
import { CadViewer } from '@cadview/core';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const viewer = new CadViewer(canvas, { theme: 'dark' });

// Load from File input
const input = document.querySelector('input[type="file"]')!;
input.addEventListener('change', async () => {
  const file = (input as HTMLInputElement).files?.[0];
  if (file) await viewer.loadFile(file);
  viewer.fitToView();
});

// Or load from URL
const response = await fetch('/drawing.dxf');
const buffer = await response.arrayBuffer();
viewer.loadArrayBuffer(buffer);
viewer.fitToView();

// Interact
viewer.setTheme('light');
viewer.setTool('select'); // 'pan' | 'select' | 'measure'

viewer.on('select', (e) => console.log('Selected:', e.entity.type));
viewer.on('measure', (e) => console.log('Distance:', e.distance));

// Cleanup
viewer.destroy();
```

### React

```bash
npm install @cadview/core @cadview/react
```

```tsx
import { useState } from 'react';
import { CadViewer } from '@cadview/react';

function App() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <input
        type="file"
        accept=".dxf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <CadViewer
        file={file}
        theme="dark"
        tool="pan"
        onSelect={(e) => console.log('Selected:', e.entity.type)}
        onMeasure={(e) => console.log('Distance:', e.distance)}
      />
    </div>
  );
}
```

### Svelte 5

```bash
npm install @cadview/core @cadview/svelte
```

```svelte
<script>
  import { CadViewer } from '@cadview/svelte';

  let file = $state(null);
</script>

<input type="file" accept=".dxf" onchange={(e) => file = e.target.files?.[0]} />

<div style="width: 100%; height: 100vh;">
  <CadViewer
    {file}
    theme="dark"
    tool="pan"
    onselect={(e) => console.log('Selected:', e.entity.type)}
    onmeasure={(e) => console.log('Distance:', e.distance)}
  />
</div>
```

### Vue 3

```bash
npm install @cadview/core @cadview/vue
```

```vue
<template>
  <input type="file" accept=".dxf" @change="onFileChange" />
  <CadViewer
    :file="file"
    theme="dark"
    tool="pan"
    @select="(e) => console.log('Selected:', e.entity.type)"
    @measure="(e) => console.log('Distance:', e.distance)"
  />
</template>

<script setup>
import { ref } from 'vue';
import { CadViewer } from '@cadview/vue';

const file = ref(null);

function onFileChange(e) {
  file.value = e.target.files?.[0] ?? null;
}
</script>
```

## Supported DXF Entities

| Entity | Description |
|--------|-------------|
| `LINE` | Line segments |
| `CIRCLE` | Full circles |
| `ARC` | Circular arcs |
| `LWPOLYLINE` | Lightweight polylines (with bulge arcs) |
| `POLYLINE` | Legacy polylines |
| `ELLIPSE` | Ellipses and elliptical arcs |
| `SPLINE` | B-splines (NURBS) |
| `TEXT` | Single-line text |
| `MTEXT` | Multi-line formatted text |
| `INSERT` | Block references (with MINSERT grid) |
| `DIMENSION` | Dimension annotations (via geometry blocks) |
| `HATCH` | Hatch fills (line, arc, and circle boundary edges) |
| `POINT` | Point markers |

## Development

```bash
# Clone the repo
git clone https://github.com/wiscaksono/cadview.git
cd cadview

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start the demo app (localhost:5173)
pnpm dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm dev` | Start all packages in watch mode + demo app |
| `pnpm test` | Run tests across all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm clean` | Remove all dist folders and caches |

## Project Structure

```
cadview/
├── packages/
│   ├── core/        # @cadview/core — parser, renderer, viewer
│   ├── react/       # @cadview/react — React wrapper
│   ├── svelte/      # @cadview/svelte — Svelte 5 wrapper
│   └── vue/         # @cadview/vue — Vue 3 wrapper
├── apps/
│   └── demo/        # Demo app (Vite)
└── specs/           # Design specifications
```

## License

[MIT](LICENSE)
