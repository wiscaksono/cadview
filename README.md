# @cadview

A framework-agnostic CAD/DXF/DWG file viewer for the web.

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
- **DWG file support** via `@cadview/dwg` — LibreDWG compiled to WebAssembly, zero-config CDN loading
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
| [`@cadview/dwg`](packages/dwg) | DWG file support via LibreDWG WASM (GPL-3.0) | [![npm](https://img.shields.io/npm/v/@cadview/dwg.svg)](https://www.npmjs.com/package/@cadview/dwg) |

## Quick Start

### Vanilla JS

```bash
npm install @cadview/core
npm install @cadview/dwg  # optional — adds DWG file support
```

```ts
import { CadViewer } from '@cadview/core';
import { dwgConverter } from '@cadview/dwg'; // optional

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const viewer = new CadViewer(canvas, {
  theme: 'dark',
  formatConverters: [dwgConverter], // enables .dwg file loading
});

// Load from File input (.dxf or .dwg)
const input = document.querySelector('input[type="file"]')!;
input.addEventListener('change', async () => {
  const file = (input as HTMLInputElement).files?.[0];
  if (file) await viewer.loadFile(file);
  viewer.fitToView();
});

// Or load from URL
const response = await fetch('/drawing.dxf');
const buffer = await response.arrayBuffer();
await viewer.loadBuffer(buffer);
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
npm install @cadview/core @cadview/react @cadview/dwg
```

```tsx
import { useState } from 'react';
import { CadViewer } from '@cadview/react';
import { dwgConverter } from '@cadview/dwg';

function App() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <input
        type="file"
        accept=".dxf,.dwg"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <CadViewer
        file={file}
        theme="dark"
        tool="pan"
        formatConverters={[dwgConverter]}
        onSelect={(e) => console.log('Selected:', e.entity.type)}
        onMeasure={(e) => console.log('Distance:', e.distance)}
      />
    </div>
  );
}
```

### Svelte 5

```bash
npm install @cadview/core @cadview/svelte @cadview/dwg
```

```svelte
<script>
  import { CadViewer } from '@cadview/svelte';
  import { dwgConverter } from '@cadview/dwg';

  let file = $state(null);
</script>

<input type="file" accept=".dxf,.dwg" onchange={(e) => file = e.target.files?.[0]} />

<div style="width: 100%; height: 100vh;">
  <CadViewer
    {file}
    theme="dark"
    tool="pan"
    formatConverters={[dwgConverter]}
    onselect={(e) => console.log('Selected:', e.entity.type)}
    onmeasure={(e) => console.log('Distance:', e.distance)}
  />
</div>
```

### Vue 3

```bash
npm install @cadview/core @cadview/vue @cadview/dwg
```

```vue
<template>
  <input type="file" accept=".dxf,.dwg" @change="onFileChange" />
  <CadViewer
    :file="file"
    theme="dark"
    tool="pan"
    :formatConverters="[dwgConverter]"
    @select="(e) => console.log('Selected:', e.entity.type)"
    @measure="(e) => console.log('Distance:', e.distance)"
  />
</template>

<script setup>
import { ref } from 'vue';
import { CadViewer } from '@cadview/vue';
import { dwgConverter } from '@cadview/dwg';

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
│   ├── core/        # @cadview/core — parser, renderer, viewer (MIT)
│   ├── react/       # @cadview/react — React wrapper (MIT)
│   ├── svelte/      # @cadview/svelte — Svelte 5 wrapper (MIT)
│   ├── vue/         # @cadview/vue — Vue 3 wrapper (MIT)
│   └── dwg/         # @cadview/dwg — DWG support via LibreDWG WASM (GPL-3.0)
├── apps/
│   └── homepage/    # Homepage & live demo (SvelteKit)
└── docs/            # Design documents & plans
```

## License

[MIT](LICENSE) — core, react, svelte, and vue packages.

[GPL-3.0](packages/dwg/LICENSE) — `@cadview/dwg` package (due to LibreDWG dependency). This package is fully optional — the core viewer works without it.
