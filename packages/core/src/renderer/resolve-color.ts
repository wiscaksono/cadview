import type { DxfEntityBase, DxfLayer } from '../parser/types.js';
import type { Theme } from './theme.js';
import { THEMES } from './theme.js';
import { aciToHex } from '../parser/colors.js';

/**
 * Get display color for an ACI color index, handling color 7 theme swap.
 */
export function getDisplayColor(aciColor: number, theme: Theme): string {
  if (aciColor === 7) {
    return theme === 'dark' ? '#ffffff' : '#000000';
  }
  return aciToHex(aciColor) ?? '#ffffff';
}

/**
 * Resolve the display color for an entity.
 *
 * Resolution order:
 * 1. Entity true color (code 420) - highest priority
 * 2. Entity ACI color (code 62):
 *    - 1-255: use ACI color table
 *    - 0 (BYBLOCK): use parent INSERT color, or default if no parent
 *    - 256 (BYLAYER): use layer color
 * 3. Layer color (from LAYER table)
 * 4. Default theme color (fallback)
 */
export function resolveEntityColor(
  entity: DxfEntityBase,
  layers: Map<string, DxfLayer>,
  theme: Theme,
  parentColor?: string,
): string {
  // 1. True color
  if (entity.trueColor !== undefined) {
    const r = (entity.trueColor >> 16) & 0xFF;
    const g = (entity.trueColor >> 8) & 0xFF;
    const b = entity.trueColor & 0xFF;
    return `rgb(${r},${g},${b})`;
  }

  // 2. ACI color
  if (entity.color === 0) {
    // BYBLOCK: use parent color or theme default
    return parentColor ?? THEMES[theme].defaultEntityColor;
  }

  if (entity.color !== 256) {
    // Explicit ACI color (1-255)
    return getDisplayColor(entity.color, theme);
  }

  // 3. BYLAYER (256): resolve from layer
  const layer = layers.get(entity.layer);
  if (layer) {
    if (layer.trueColor !== undefined) {
      const r = (layer.trueColor >> 16) & 0xFF;
      const g = (layer.trueColor >> 8) & 0xFF;
      const b = layer.trueColor & 0xFF;
      return `rgb(${r},${g},${b})`;
    }
    const layerAci = Math.abs(layer.color); // negative = off, use absolute
    return getDisplayColor(layerAci, theme);
  }

  // 4. Fallback
  return THEMES[theme].defaultEntityColor;
}
