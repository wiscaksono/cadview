import type { DxfEllipseEntity } from '../../parser/types.js';

export function drawEllipse(ctx: CanvasRenderingContext2D, entity: DxfEllipseEntity): void {
  const majorLength = Math.sqrt(
    entity.majorAxis.x ** 2 + entity.majorAxis.y ** 2 + entity.majorAxis.z ** 2
  );
  if (majorLength < 1e-10 || entity.minorRatio <= 0) return;

  const minorLength = majorLength * entity.minorRatio;
  const rotation = Math.atan2(entity.majorAxis.y, entity.majorAxis.x);

  ctx.beginPath();
  ctx.ellipse(
    entity.center.x,
    entity.center.y,
    majorLength,
    minorLength,
    rotation,
    entity.startParam,
    entity.endParam,
    false,
  );
  ctx.stroke();
}
