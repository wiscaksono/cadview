# @cadview/svelte

Svelte 5 wrapper for `@cadview/core` — a CAD/DXF file viewer.

## Installation

```bash
npm install @cadview/core @cadview/svelte
```

## Usage

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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `file` | `File \| null` | — | DXF file to load |
| `theme` | `'dark' \| 'light'` | `'dark'` | Color theme |
| `tool` | `'pan' \| 'select' \| 'measure'` | `'pan'` | Active tool |
| `options` | `CadViewerOptions` | — | Additional viewer options |
| `onselect` | `(e: SelectEvent) => void` | — | Selection callback |
| `onmeasure` | `(e: MeasureEvent) => void` | — | Measurement callback |
| `onviewchange` | `(vt: ViewTransform) => void` | — | View change callback |
| `onlayersloaded` | `(layers: DxfLayer[]) => void` | — | Layers loaded callback |

Requires Svelte 5 (runes mode).

## License

MIT
