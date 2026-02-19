import type { DxfSplineEntity } from '../../parser/types.js';
import { evaluateSpline } from '../../utils/spline.js';

export function drawSpline(ctx: CanvasRenderingContext2D, entity: DxfSplineEntity, pixelSize: number): void {
  const points = evaluateSpline(entity, pixelSize);
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }

  if (entity.flags & 1) { // closed
    ctx.closePath();
  }
  ctx.stroke();
}
