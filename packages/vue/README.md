# @cadview/vue

Vue 3 wrapper for `@cadview/core` — a CAD/DXF file viewer.

## Installation

```bash
npm install @cadview/core @cadview/vue
```

## Usage

```vue
<template>
  <input type="file" accept=".dxf" @change="onFileChange" />
  <CadViewer
    :file="file"
    theme="dark"
    tool="pan"
    @select="onSelect"
    @measure="onMeasure"
  />
</template>

<script setup>
import { ref } from 'vue';
import { CadViewer } from '@cadview/vue';

const file = ref(null);

function onFileChange(e) {
  file.value = e.target.files?.[0] ?? null;
}

function onSelect(e) {
  console.log('Selected:', e.entity.type);
}

function onMeasure(e) {
  console.log('Distance:', e.distance);
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `file` | `File \| null` | — | DXF file to load |
| `theme` | `'dark' \| 'light'` | `'dark'` | Color theme |
| `tool` | `'pan' \| 'select' \| 'measure'` | `'pan'` | Active tool |
| `options` | `CadViewerOptions` | — | Additional viewer options |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `select` | `SelectEvent` | Entity selected |
| `measure` | `MeasureEvent` | Measurement completed |
| `viewchange` | `ViewTransform` | View panned/zoomed |
| `layersloaded` | `DxfLayer[]` | Layers loaded from DXF |

## Composable

```ts
import { useCadViewer } from '@cadview/vue';

const { canvasRef, viewer } = useCadViewer({ theme: 'dark' });
```

## License

MIT
