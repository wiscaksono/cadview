import type { DxfLwPolylineEntity, DxfPolylineEntity } from '../../parser/types.js';
import { drawBulgeArc } from '../../utils/math.js';

export function drawLwPolyline(ctx: CanvasRenderingContext2D, entity: DxfLwPolylineEntity): void {
  const verts = entity.vertices;
  if (verts.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(verts[0]!.x, verts[0]!.y);

  const count = entity.closed ? verts.length : verts.length - 1;

  for (let i = 0; i < count; i++) {
    const current = verts[i]!;
    const next = verts[(i + 1) % verts.length]!;

    if (Math.abs(current.bulge) < 1e-10) {
      ctx.lineTo(next.x, next.y);
    } else {
      drawBulgeArc(ctx, current.x, current.y, next.x, next.y, current.bulge);
    }
  }

  ctx.stroke();
}

export function drawPolyline(ctx: CanvasRenderingContext2D, entity: DxfPolylineEntity): void {
  const verts = entity.vertices;
  if (verts.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(verts[0]!.x, verts[0]!.y);

  const count = entity.closed ? verts.length : verts.length - 1;

  for (let i = 0; i < count; i++) {
    const current = verts[i]!;
    const next = verts[(i + 1) % verts.length]!;
    const bulge = current.bulge ?? 0;

    if (Math.abs(bulge) < 1e-10) {
      ctx.lineTo(next.x, next.y);
    } else {
      drawBulgeArc(ctx, current.x, current.y, next.x, next.y, bulge);
    }
  }

  ctx.stroke();
}
