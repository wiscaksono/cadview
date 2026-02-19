import type { DxfInsertEntity, DxfDocument, DxfEntity } from '../../parser/types.js';
import type { ViewTransform } from '../camera.js';
import type { Theme } from '../theme.js';
import type { RenderStats } from '../debug-overlay.js';
import { computeEntityBBox } from '../../utils/bbox.js';
import { resolveEntityColor } from '../resolve-color.js';
import { drawEntity } from './draw-entity.js';

const MAX_INSERT_DEPTH = 100;

/** Minimum screen-space extent (in pixels) for a block sub-entity to be rendered. */
const MIN_BLOCK_ENTITY_EXTENT = 0.5;

export function drawInsert(
  ctx: CanvasRenderingContext2D,
  entity: DxfInsertEntity,
  doc: DxfDocument,
  vt: ViewTransform,
  theme: Theme,
  pixelSize: number,
  depth: number = 0,
  stats?: RenderStats,
): void {
  if (depth > MAX_INSERT_DEPTH) return;

  const block = doc.blocks.get(entity.blockName);
  if (!block) return;

  // Handle MINSERT (grid of blocks)
  const cols = Math.max(1, entity.columnCount);
  const rows = Math.max(1, entity.rowCount);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.save();

      // Insertion point + grid offset
      const ox = entity.insertionPoint.x + col * entity.columnSpacing;
      const oy = entity.insertionPoint.y + row * entity.rowSpacing;
      ctx.translate(ox, oy);

      // Rotation (degrees -> radians)
      if (entity.rotation) {
        ctx.rotate(entity.rotation * Math.PI / 180);
      }

      // Scale
      ctx.scale(entity.scaleX, entity.scaleY);

      // Offset by block base point
      ctx.translate(-block.basePoint.x, -block.basePoint.y);

      // Adjust line width to compensate for scale
      const scaleCompensation = Math.max(Math.abs(entity.scaleX), Math.abs(entity.scaleY));
      const adjustedPixelSize = pixelSize / (scaleCompensation || 1);

      // Render block entities
      for (const blockEntity of block.entities) {
        // Sub-pixel culling: skip block entities that are too small to see.
        // adjustedPixelSize is the world-space size of 1 screen pixel in block-local space.
        // Only cull if extent is non-zero (zero-extent means INSERT without doc or POINT —
        // let those through so nested blocks expand normally and points render as dots).
        if (blockEntity.type !== 'INSERT') {
          const beBBox = computeEntityBBox(blockEntity);
          if (beBBox) {
            const extent = Math.max(beBBox.maxX - beBBox.minX, beBBox.maxY - beBBox.minY);
            if (extent > 0 && extent / adjustedPixelSize < MIN_BLOCK_ENTITY_EXTENT) {
              continue;
            }
          }
        }

        const color = resolveEntityColor(blockEntity, doc.layers, theme);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = adjustedPixelSize;

        if (blockEntity.type === 'INSERT') {
          drawInsert(ctx, blockEntity as DxfInsertEntity, doc, vt, theme, adjustedPixelSize, depth + 1, stats);
        } else {
          drawEntity(ctx, blockEntity as DxfEntity, doc, vt, theme, adjustedPixelSize, stats);
        }
      }

      ctx.restore();
    }
  }
}
