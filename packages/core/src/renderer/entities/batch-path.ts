/**
 * Path-append functions for stroke-only batchable entity types.
 *
 * These functions add path commands to the current canvas path WITHOUT calling
 * beginPath() or stroke(). This allows the render loop to batch multiple
 * same-color entities into a single beginPath()/stroke() pair, dramatically
 * reducing the number of GPU rasterization calls.
 *
 * Each function starts with an explicit moveTo() so that entities are
 * rendered as disconnected sub-paths within the same batch.
 */

import type {
  DxfLineEntity,
  DxfArcEntity,
  DxfCircleEntity,
  DxfLwPolylineEntity,
  DxfPolylineEntity,
  DxfEllipseEntity,
  DxfSplineEntity,
  DxfEntity,
} from '../../parser/types.js';
import { drawBulgeArc } from '../../utils/math.js';
import { evaluateSpline } from '../../utils/spline.js';

/**
 * Set of entity types that can be batched as stroke-only paths.
 * These types use only moveTo/lineTo/arc/ellipse path commands with
 * no canvas state changes (no save/restore, no font, no globalAlpha).
 */
const BATCHABLE_TYPES = new Set([
  'LINE', 'ARC', 'CIRCLE', 'LWPOLYLINE', 'POLYLINE', 'ELLIPSE', 'SPLINE',
]);

/** Returns true if the entity type can be batched into a shared stroke path. */
export function isBatchableStroke(type: string): boolean {
  return BATCHABLE_TYPES.has(type);
}

/** Append a LINE entity's path commands. */
export function appendLinePath(ctx: CanvasRenderingContext2D, entity: DxfLineEntity): void {
  ctx.moveTo(entity.start.x, entity.start.y);
  ctx.lineTo(entity.end.x, entity.end.y);
}

/**
 * Append an ARC entity's path commands.
 * Explicit moveTo to arc start prevents a connecting line from the previous sub-path.
 */
export function appendArcPath(ctx: CanvasRenderingContext2D, entity: DxfArcEntity): void {
  if (entity.radius <= 0) return;

  const startRad = entity.startAngle * Math.PI / 180;
  const endRad = entity.endAngle * Math.PI / 180;

  ctx.moveTo(
    entity.center.x + entity.radius * Math.cos(startRad),
    entity.center.y + entity.radius * Math.sin(startRad),
  );
  ctx.arc(entity.center.x, entity.center.y, entity.radius, startRad, endRad, false);
}

/** Append a CIRCLE entity's path commands. Circle starts at angle 0: (cx+r, cy). */
export function appendCirclePath(ctx: CanvasRenderingContext2D, entity: DxfCircleEntity): void {
  if (entity.radius <= 0) return;

  ctx.moveTo(entity.center.x + entity.radius, entity.center.y);
  ctx.arc(entity.center.x, entity.center.y, entity.radius, 0, Math.PI * 2);
}

/** Append a LWPOLYLINE entity's path commands. */
export function appendLwPolylinePath(ctx: CanvasRenderingContext2D, entity: DxfLwPolylineEntity): void {
  const verts = entity.vertices;
  if (verts.length < 2) return;

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
}

/** Append a POLYLINE entity's path commands. */
export function appendPolylinePath(ctx: CanvasRenderingContext2D, entity: DxfPolylineEntity): void {
  const verts = entity.vertices;
  if (verts.length < 2) return;

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
}

/**
 * Append an ELLIPSE entity's path commands.
 * Explicit moveTo to ellipse start point prevents a connecting line.
 */
export function appendEllipsePath(ctx: CanvasRenderingContext2D, entity: DxfEllipseEntity): void {
  const majorLength = Math.sqrt(
    entity.majorAxis.x ** 2 + entity.majorAxis.y ** 2 + entity.majorAxis.z ** 2,
  );
  if (majorLength < 1e-10 || entity.minorRatio <= 0) return;

  const minorLength = majorLength * entity.minorRatio;
  const rotation = Math.atan2(entity.majorAxis.y, entity.majorAxis.x);

  // Compute start point on the ellipse at startParam
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const cosS = Math.cos(entity.startParam);
  const sinS = Math.sin(entity.startParam);

  ctx.moveTo(
    entity.center.x + majorLength * cosR * cosS - minorLength * sinR * sinS,
    entity.center.y + majorLength * sinR * cosS + minorLength * cosR * sinS,
  );
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
}

/** Append a SPLINE entity's path commands. */
export function appendSplinePath(
  ctx: CanvasRenderingContext2D,
  entity: DxfSplineEntity,
  pixelSize: number,
): void {
  const points = evaluateSpline(entity, pixelSize);
  if (points.length < 2) return;

  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }

  if (entity.flags & 1) { // closed
    ctx.closePath();
  }
}

/**
 * Append the appropriate stroke path for a batchable entity.
 * Dispatches to the correct append function based on entity type.
 */
export function appendStrokePath(
  ctx: CanvasRenderingContext2D,
  entity: DxfEntity,
  pixelSize: number,
): void {
  switch (entity.type) {
    case 'LINE':       appendLinePath(ctx, entity); break;
    case 'ARC':        appendArcPath(ctx, entity); break;
    case 'CIRCLE':     appendCirclePath(ctx, entity); break;
    case 'LWPOLYLINE': appendLwPolylinePath(ctx, entity); break;
    case 'POLYLINE':   appendPolylinePath(ctx, entity); break;
    case 'ELLIPSE':    appendEllipsePath(ctx, entity); break;
    case 'SPLINE':     appendSplinePath(ctx, entity, pixelSize); break;
  }
}
