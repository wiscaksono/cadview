import type { DxfLineEntity } from '../../parser/types.js';

export function drawLine(ctx: CanvasRenderingContext2D, entity: DxfLineEntity): void {
  ctx.beginPath();
  ctx.moveTo(entity.start.x, entity.start.y);
  ctx.lineTo(entity.end.x, entity.end.y);
  ctx.stroke();
}
