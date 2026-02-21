---
title: Theming
description: Built-in dark and light themes with full color customization. Color resolution follows the DXF specification.
---

# Theming

<p class="subtitle">// dark and light themes with full color customization</p>

@cadview ships with two built-in themes and a color resolution system that follows the DXF specification.

## Built-in Themes

### Dark Theme

```typescript
{
  backgroundColor: '#1a1a2e',
  defaultEntityColor: '#ffffff',
  selectionColor: '#00ff88',
  measureColor: '#ffaa00',
  gridColor: '#333333',
  crosshairColor: '#555555',
}
```

### Light Theme

```typescript
{
  backgroundColor: '#ffffff',
  defaultEntityColor: '#000000',
  selectionColor: '#0066ff',
  measureColor: '#ff6600',
  gridColor: '#dddddd',
  crosshairColor: '#cccccc',
}
```

## Switching Themes

```typescript
// Core API
viewer.setTheme('light');
viewer.getTheme(); // 'light'

// React
<CadViewer theme="light" />

// Svelte
<CadViewer theme="light" />

// Vue
<CadViewer theme="light" />
```

## Custom Background Color

Override the theme background without changing other colors:

```typescript
viewer.setBackgroundColor('#0a0a0a');
```

Or via the constructor:

```typescript
const viewer = new CadViewer(canvas, {
	theme: 'dark',
	backgroundColor: '#0a0a0a'
});
```

## ThemeConfig

Both themes implement the `ThemeConfig` interface:

```typescript
interface ThemeConfig {
	backgroundColor: string; // Canvas background
	defaultEntityColor: string; // Fallback entity color
	selectionColor: string; // Selected entity highlight
	measureColor: string; // Measurement overlay color
	gridColor: string; // Grid line color
	crosshairColor: string; // Crosshair cursor color
}
```

Access the theme configs directly:

```typescript
import { THEMES } from '@cadview/core';

console.log(THEMES.dark.backgroundColor); // '#1a1a2e'
console.log(THEMES.light.selectionColor); // '#0066ff'
```

## Color Resolution Chain

Entity colors are resolved following a specific precedence:

1. **Entity true color** (DXF code 420) &mdash; 24-bit RGB, highest priority
2. **Entity ACI color** (DXF code 62) &mdash; AutoCAD Color Index (1&ndash;255)
3. **Layer color** &mdash; Inherited from the entity's layer
4. **Theme default** &mdash; `defaultEntityColor` from the active theme

Special ACI values:

- **0 (BYBLOCK)** &mdash; Inherits color from the parent block INSERT
- **256 (BYLAYER)** &mdash; Inherits color from the entity's layer
- **7 (White/Black)** &mdash; Automatically swaps between `#ffffff` and `#000000` based on the active theme

## ACI Color Table

The AutoCAD Color Index (ACI) maps integers 1&ndash;255 to specific colors. @cadview includes the full standard ACI table.

```typescript
import { aciToHex, aciToDisplayColor, trueColorToHex } from '@cadview/core';

// Convert ACI index to hex color
aciToHex(1); // '#ff0000' (red)
aciToHex(3); // '#00ff00' (green)
aciToHex(5); // '#0000ff' (blue)
aciToHex(7); // '#ffffff' (white)

// Theme-aware conversion (color 7 swaps for light themes)
aciToDisplayColor(7, true); // '#ffffff' (dark theme)
aciToDisplayColor(7, false); // '#000000' (light theme)

// Convert DXF true color (24-bit packed integer) to hex
trueColorToHex(16711680); // '#ff0000'
```

## Layer Color Overrides

Override the display color of any layer at runtime:

```typescript
viewer.setLayerColor('Walls', '#ff6600');
viewer.setLayerColor('Dimensions', '#aaaaaa');
```

Layer color overrides take precedence over the layer's DXF-defined color, but entity-level colors (ACI or true color) still have higher priority.

## Entity Color Resolution Function

For custom rendering or data extraction, use the exported resolution function:

```typescript
import { resolveEntityColor } from '@cadview/core';

const color = resolveEntityColor(
	entity, // The entity
	document.layers, // Layer map from DxfDocument
	'dark', // Active theme
	'#ffffff' // Parent color (for BYBLOCK resolution)
);
// Returns a hex color string like '#ff0000'
```
