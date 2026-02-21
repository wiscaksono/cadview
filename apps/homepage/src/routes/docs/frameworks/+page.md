---
title: Frameworks Overview
description: Thin reactive bindings for React, Svelte 5, and Vue 3. All wrappers share the same CadViewer component architecture.
---

# Framework Wrappers

<p class="subtitle">// thin, reactive bindings for React, Svelte, and Vue</p>

All three framework wrappers follow the same architecture: a `<CadViewer>` component that manages the core `CadViewer` lifecycle and syncs reactive props.

## Comparison

| Feature         | React          | Svelte        | Vue            |
| --------------- | -------------- | ------------- | -------------- |
| Component       | `<CadViewer>`  | `<CadViewer>` | `<CadViewer>`  |
| Hook/Composable | `useCadViewer` | &mdash;       | `useCadViewer` |
| Peer deps       | React 18/19    | Svelte 5      | Vue 3.5+       |
| License         | MIT            | MIT           | MIT            |

## Common Props

All `<CadViewer>` components accept the same core props:

| Prop               | Type                                    | Default  | Description                   |
| ------------------ | --------------------------------------- | -------- | ----------------------------- |
| `file`             | `File \| ArrayBuffer \| string \| null` | `null`   | File to load (reactive)       |
| `theme`            | `'dark' \| 'light'`                     | `'dark'` | Color theme                   |
| `tool`             | `'pan' \| 'select' \| 'measure'`        | `'pan'`  | Active interaction tool       |
| `debug`            | `boolean \| DebugOptions`               | `false`  | Debug overlay                 |
| `worker`           | `boolean`                               | `false`  | Web Worker parsing            |
| `formatConverters` | `FormatConverter[]`                     | `[]`     | Format converters (e.g., DWG) |
| `options`          | `CadViewerOptions`                      | `{}`     | Additional viewer options     |

## Common Exposed Methods

All components expose these imperative methods:

| Method            | Signature                                  | Description                          |
| ----------------- | ------------------------------------------ | ------------------------------------ |
| `getViewer`       | `() => CadViewer \| null`                  | Access the core `CadViewer` instance |
| `fitToView`       | `() => void`                               | Fit camera to drawing extents        |
| `getLayers`       | `() => DxfLayer[]`                         | Get all layers                       |
| `setLayerVisible` | `(name: string, visible: boolean) => void` | Toggle layer visibility              |

## Re-exported Types

All wrappers re-export these types from `@cadview/core` for convenience:

```typescript
import type {
	FormatConverter,
	SelectEvent,
	MeasureEvent,
	ViewTransform,
	DxfLayer,
	DxfDocument,
	DxfEntity,
	Tool,
	Theme
} from '@cadview/react'; // or @cadview/svelte, @cadview/vue
```

## Choose Your Framework

- [React](/docs/frameworks/react) &mdash; `<CadViewer>` component + `useCadViewer` hook
- [Svelte](/docs/frameworks/svelte) &mdash; `<CadViewer>` Svelte 5 component
- [Vue](/docs/frameworks/vue) &mdash; `<CadViewer>` component + `useCadViewer` composable
