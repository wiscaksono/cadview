import type { DxfArcEntity } from '../../parser/types.js';

export function drawArc(ctx: CanvasRenderingContext2D, entity: DxfArcEntity): void {
  if (entity.radius <= 0) return;

  const startRad = entity.startAngle * Math.PI / 180;
  const endRad = entity.endAngle * Math.PI / 180;

  ctx.beginPath();
  // Canvas arc with negative Y scale (setTransform d=-scale):
  // anticlockwise=false renders DXF CCW arcs correctly in flipped-Y space
  ctx.arc(
    entity.center.x,
    entity.center.y,
    entity.radius,
    startRad,
    endRad,
    false,
  );
  ctx.stroke();
}
