import type { DxfDocument } from '../parser/types.js';
import type { ViewTransform } from './camera.js';
import type { Theme } from './theme.js';
import { THEMES } from './theme.js';
import { applyTransform } from './camera.js';
import { resolveEntityColor } from './resolve-color.js';
import { drawEntity } from './entities/index.js';

// Re-export for convenience
export { resolveEntityColor } from './resolve-color.js';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error(
        'Failed to get 2D rendering context. The canvas may already have a different context type, ' +
        'or canvas rendering is not available in this environment.'
      );
    }
    this.ctx = ctx;
    this.updateSize();
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  updateSize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    // DPR is baked into setTransform calls in render/applyTransform
  }

  render(
    doc: DxfDocument,
    vt: ViewTransform,
    theme: Theme,
    visibleLayers: Set<string>,
    selectedEntityIndex: number,
  ): void {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;

    // 1. Clear in screen space (reset transform then apply DPR scale)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = THEMES[theme].backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Apply world transform
    applyTransform(ctx, vt);

    // 3. Compute pixel size in world space for constant-screen-width lines
    const pixelSize = 1 / vt.scale;

    // 4. Set common rendering state
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 5. Render entities
    for (let i = 0; i < doc.entities.length; i++) {
      const entity = doc.entities[i]!;

      // Skip invisible entities
      if (!entity.visible) continue;

      // Skip entities on hidden/frozen/off layers
      if (!visibleLayers.has(entity.layer)) continue;

      // Resolve color
      const color = resolveEntityColor(entity, doc.layers, theme);

      // Set stroke/fill
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = pixelSize; // 1px constant screen width

      // Draw entity
      drawEntity(ctx, entity, doc, vt, theme, pixelSize);
    }

    // 6. Draw selection highlight
    if (selectedEntityIndex >= 0 && selectedEntityIndex < doc.entities.length) {
      const selEntity = doc.entities[selectedEntityIndex]!;
      // Re-apply transform (in case last entity changed it)
      applyTransform(ctx, vt);
      ctx.strokeStyle = THEMES[theme].selectionColor;
      ctx.fillStyle = THEMES[theme].selectionColor;
      ctx.lineWidth = pixelSize * 3; // 3px highlight
      drawEntity(ctx, selEntity, doc, vt, theme, pixelSize);
    }
  }

  renderEmpty(theme: Theme): void {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = THEMES[theme].backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  destroy(): void {
    // no-op — lifecycle cleanup hook for future use
  }
}
