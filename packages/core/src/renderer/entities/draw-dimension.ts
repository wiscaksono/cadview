import type { DxfDimensionEntity, DxfDocument, DxfEntity } from '../../parser/types.js';
import type { ViewTransform } from '../camera.js';
import type { Theme } from '../theme.js';
import type { RenderStats } from '../debug-overlay.js';
import { resolveEntityColor } from '../resolve-color.js';
import { drawEntity } from './draw-entity.js';

export function drawDimension(
  ctx: CanvasRenderingContext2D,
  entity: DxfDimensionEntity,
  doc: DxfDocument,
  vt: ViewTransform,
  theme: Theme,
  pixelSize: number,
  stats?: RenderStats,
): void {
  // Prefer rendering from the geometry block
  if (entity.blockName) {
    const block = doc.blocks.get(entity.blockName);
    if (block) {
      for (const blockEntity of block.entities) {
        const color = resolveEntityColor(blockEntity, doc.layers, theme);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = pixelSize;
        drawEntity(ctx, blockEntity as DxfEntity, doc, vt, theme, pixelSize, stats);
      }
      return;
    }
  }

  // Fallback: render from definition points (simplified)
  if (entity.defPoint2 && entity.defPoint3) {
    ctx.beginPath();
    ctx.moveTo(entity.defPoint2.x, entity.defPoint2.y);
    ctx.lineTo(entity.defPoint.x, entity.defPoint.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(entity.defPoint3.x, entity.defPoint3.y);
    ctx.lineTo(entity.defPoint.x, entity.defPoint.y);
    ctx.stroke();
  }
}
