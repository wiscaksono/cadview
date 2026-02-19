# @cadview/react

React wrapper for `@cadview/core` — a CAD/DXF file viewer.

## Installation

```bash
npm install @cadview/core @cadview/react
```

## Usage

```tsx
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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `file` | `File \| null` | — | DXF file to load |
| `theme` | `'dark' \| 'light'` | `'dark'` | Color theme |
| `tool` | `'pan' \| 'select' \| 'measure'` | `'pan'` | Active tool |
| `options` | `CadViewerOptions` | — | Additional viewer options |
| `onSelect` | `(e: SelectEvent) => void` | — | Selection callback |
| `onMeasure` | `(e: MeasureEvent) => void` | — | Measurement callback |
| `onViewChange` | `(vt: ViewTransform) => void` | — | View change callback |
| `onLayersLoaded` | `(layers: DxfLayer[]) => void` | — | Layers loaded callback |

## Hook

```tsx
import { useCadViewer } from '@cadview/react';

function App() {
  const { ref, viewer } = useCadViewer({ theme: 'dark' });

  return <canvas ref={ref} style={{ width: '100%', height: '100%' }} />;
}
```

## License

MIT
