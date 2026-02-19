import type { DxfPointEntity } from '../../parser/types.js';

export function drawPoint(ctx: CanvasRenderingContext2D, entity: DxfPointEntity, pixelSize: number): void {
  const size = pixelSize * 3; // 3px dot
  ctx.beginPath();
  ctx.arc(entity.position.x, entity.position.y, size, 0, Math.PI * 2);
  ctx.fill();
}
