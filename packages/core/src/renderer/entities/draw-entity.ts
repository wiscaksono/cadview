import type { DxfEntity, DxfDocument } from '../../parser/types.js';
import type { ViewTransform } from '../camera.js';
import type { Theme } from '../theme.js';
import { drawLine } from './draw-line.js';
import { drawCircle } from './draw-circle.js';
import { drawArc } from './draw-arc.js';
import { drawLwPolyline, drawPolyline } from './draw-polyline.js';
import { drawEllipse } from './draw-ellipse.js';
import { drawSpline } from './draw-spline.js';
import { drawText, drawMText } from './draw-text.js';
import { drawInsert } from './draw-insert.js';
import { drawDimension } from './draw-dimension.js';
import { drawHatch } from './draw-hatch.js';
import { drawPoint } from './draw-point.js';

export function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: DxfEntity,
  doc: DxfDocument,
  vt: ViewTransform,
  theme: Theme,
  pixelSize: number,
): void {
  switch (entity.type) {
    case 'LINE':       drawLine(ctx, entity); break;
    case 'CIRCLE':     drawCircle(ctx, entity); break;
    case 'ARC':        drawArc(ctx, entity); break;
    case 'LWPOLYLINE': drawLwPolyline(ctx, entity); break;
    case 'POLYLINE':   drawPolyline(ctx, entity); break;
    case 'ELLIPSE':    drawEllipse(ctx, entity); break;
    case 'SPLINE':     drawSpline(ctx, entity, pixelSize); break;
    case 'TEXT':       drawText(ctx, entity, pixelSize); break;
    case 'MTEXT':      drawMText(ctx, entity, pixelSize); break;
    case 'INSERT':     drawInsert(ctx, entity, doc, vt, theme, pixelSize); break;
    case 'DIMENSION':  drawDimension(ctx, entity, doc, vt, theme, pixelSize); break;
    case 'HATCH':      drawHatch(ctx, entity); break;
    case 'POINT':      drawPoint(ctx, entity, pixelSize); break;
  }
}
