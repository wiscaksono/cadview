import type { DxfHatchEntity } from '../../parser/types.js';
import { drawBulgeArc } from '../../utils/math.js';

export function drawHatch(ctx: CanvasRenderingContext2D, entity: DxfHatchEntity): void {
  if (entity.boundaryPaths.length === 0) return;

  ctx.beginPath();

  for (const path of entity.boundaryPaths) {
    if (path.type === 'polyline' && path.vertices && path.vertices.length > 0) {
      const firstVert = path.vertices[0]!;
      ctx.moveTo(firstVert.x, firstVert.y);
      for (let i = 1; i < path.vertices.length; i++) {
        const prev = path.vertices[i - 1]!;
        const curr = path.vertices[i]!;
        const bulge = path.bulges?.[i - 1] ?? 0;

        if (Math.abs(bulge) < 1e-10) {
          ctx.lineTo(curr.x, curr.y);
        } else {
          drawBulgeArc(ctx, prev.x, prev.y, curr.x, curr.y, bulge);
        }
      }
      if (path.isClosed) ctx.closePath();
    } else if (path.type === 'edges' && path.edges) {
      for (let i = 0; i < path.edges.length; i++) {
        const edge = path.edges[i]!;
        if (edge.type === 'line') {
          if (i === 0) ctx.moveTo(edge.start.x, edge.start.y);
          ctx.lineTo(edge.end.x, edge.end.y);
        } else if (edge.type === 'arc') {
          if (i === 0) {
            const sx = edge.center.x + edge.radius * Math.cos(edge.startAngle * Math.PI / 180);
            const sy = edge.center.y + edge.radius * Math.sin(edge.startAngle * Math.PI / 180);
            ctx.moveTo(sx, sy);
          }
          ctx.arc(
            edge.center.x, edge.center.y, edge.radius,
            edge.startAngle * Math.PI / 180,
            edge.endAngle * Math.PI / 180,
            !edge.ccw,
          );
        }
        // ellipse and spline edges: skipped in v1
      }
    }
  }

  if (entity.solidFill) {
    ctx.globalAlpha = 0.3;
    ctx.fill('evenodd');
    ctx.globalAlpha = 1.0;
  }
  ctx.stroke();
}
