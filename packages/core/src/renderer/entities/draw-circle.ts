import type { DxfCircleEntity } from '../../parser/types.js';

export function drawCircle(ctx: CanvasRenderingContext2D, entity: DxfCircleEntity): void {
  if (entity.radius <= 0) return;
  ctx.beginPath();
  ctx.arc(entity.center.x, entity.center.y, entity.radius, 0, Math.PI * 2);
  ctx.stroke();
}
