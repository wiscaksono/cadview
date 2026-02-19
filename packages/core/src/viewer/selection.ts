import RBush from 'rbush';
import type { DxfEntity, DxfDocument, Point3D } from '../parser/types.js';
import type { BBox } from '../utils/bbox.js';
import { computeEntityBBox, computeEntityBBoxWithDoc } from '../utils/bbox.js';

export interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  entityIndex: number;
}

const HIT_TOLERANCE_PX = 5;

export class SpatialIndex {
  private tree: RBush<SpatialItem> = new RBush();
  private items: SpatialItem[] = [];
  /** Pre-computed bboxes parallel to the entity array (null if no bbox). */
  private entityBBoxes: (BBox | null)[] = [];

  /**
   * Build the spatial index from entities.
   * When `doc` is provided, INSERT entities get proper transformed bounding boxes
   * (resolved from block contents) instead of degenerate zero-size points.
   */
  build(entities: DxfEntity[], doc?: DxfDocument): void {
    this.items = [];
    this.entityBBoxes = new Array(entities.length).fill(null);

    const cache = doc ? new Map<string, BBox | null>() : undefined;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]!;
      const bbox = doc && cache
        ? computeEntityBBoxWithDoc(entity, doc, cache)
        : computeEntityBBox(entity);
      this.entityBBoxes[i] = bbox;
      if (!bbox) continue;
      this.items.push({
        ...bbox,
        entityIndex: i,
      });
    }
    this.tree.clear();
    this.tree.load(this.items);
  }

  search(minX: number, minY: number, maxX: number, maxY: number): SpatialItem[] {
    return this.tree.search({ minX, minY, maxX, maxY });
  }

  /** Get pre-computed bbox for an entity by index. */
  getEntityBBox(index: number): BBox | null {
    return this.entityBBoxes[index] ?? null;
  }

  /** Get the full pre-computed bbox array (parallel to entity array). */
  getEntityBBoxes(): (BBox | null)[] {
    return this.entityBBoxes;
  }

  clear(): void {
    this.tree.clear();
    this.items = [];
    this.entityBBoxes = [];
  }
}

/**
 * Find the nearest entity to a world point.
 * Returns entity index, or -1 if nothing is within tolerance.
 */
export function hitTest(
  wx: number,
  wy: number,
  entities: DxfEntity[],
  spatialIndex: SpatialIndex,
  visibleLayers: Set<string>,
  scale: number,
): number {
  const tolerance = HIT_TOLERANCE_PX / scale;

  const candidates = spatialIndex.search(
    wx - tolerance, wy - tolerance,
    wx + tolerance, wy + tolerance,
  );

  let bestDist = tolerance;
  let bestIndex = -1;

  for (let i = candidates.length - 1; i >= 0; i--) {
    const item = candidates[i]!;
    const entity = entities[item.entityIndex];
    if (!entity) continue;

    if (!visibleLayers.has(entity.layer)) continue;
    if (!entity.visible) continue;

    const dist = distanceToEntity(wx, wy, entity);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = item.entityIndex;
    }
  }

  return bestIndex;
}

export function distanceToEntity(wx: number, wy: number, entity: DxfEntity): number {
  switch (entity.type) {
    case 'LINE':
      return distPointToSegment(wx, wy, entity.start.x, entity.start.y, entity.end.x, entity.end.y);

    case 'CIRCLE':
      return distPointToCircle(wx, wy, entity.center.x, entity.center.y, entity.radius);

    case 'ARC':
      return distPointToArc(
        wx, wy,
        entity.center.x, entity.center.y,
        entity.radius,
        entity.startAngle * Math.PI / 180,
        entity.endAngle * Math.PI / 180,
      );

    case 'LWPOLYLINE':
    case 'POLYLINE': {
      let minDist = Infinity;
      const verts = entity.vertices;
      const count = entity.closed ? verts.length : verts.length - 1;
      for (let i = 0; i < count; i++) {
        const a = verts[i]!;
        const b = verts[(i + 1) % verts.length]!;
        const d = distPointToSegment(wx, wy, a.x, a.y, b.x, b.y);
        minDist = Math.min(minDist, d);
      }
      return minDist;
    }

    case 'ELLIPSE':
      return distPointToEllipse(
        wx, wy,
        entity.center.x, entity.center.y,
        entity.majorAxis, entity.minorRatio,
      );

    case 'TEXT':
    case 'MTEXT': {
      const bbox = computeEntityBBox(entity);
      if (!bbox) return Infinity;
      return distPointToRect(wx, wy, bbox.minX, bbox.minY, bbox.maxX, bbox.maxY);
    }

    case 'POINT':
      return Math.hypot(wx - entity.position.x, wy - entity.position.y);

    case 'SPLINE': {
      let minDist = Infinity;
      const pts = entity.controlPoints;
      for (let i = 0; i < pts.length - 1; i++) {
        const d = distPointToSegment(wx, wy, pts[i]!.x, pts[i]!.y, pts[i + 1]!.x, pts[i + 1]!.y);
        minDist = Math.min(minDist, d);
      }
      return minDist;
    }

    default:
      return Infinity;
  }
}

// --- Primitive distance functions ---

export function distPointToSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return Math.hypot(px - x1, py - y1);

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function distPointToCircle(
  px: number, py: number,
  cx: number, cy: number,
  radius: number,
): number {
  return Math.abs(Math.hypot(px - cx, py - cy) - radius);
}

export function distPointToArc(
  px: number, py: number,
  cx: number, cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): number {
  const angle = Math.atan2(py - cy, px - cx);
  const normAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const normStart = ((startAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const normEnd = ((endAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  const inArc = normStart <= normEnd
    ? normAngle >= normStart && normAngle <= normEnd
    : normAngle >= normStart || normAngle <= normEnd;

  if (inArc) {
    return Math.abs(Math.hypot(px - cx, py - cy) - radius);
  }

  const d1 = Math.hypot(
    px - (cx + radius * Math.cos(startAngle)),
    py - (cy + radius * Math.sin(startAngle)),
  );
  const d2 = Math.hypot(
    px - (cx + radius * Math.cos(endAngle)),
    py - (cy + radius * Math.sin(endAngle)),
  );
  return Math.min(d1, d2);
}

export function distPointToRect(
  px: number, py: number,
  minX: number, minY: number,
  maxX: number, maxY: number,
): number {
  if (px >= minX && px <= maxX && py >= minY && py <= maxY) return 0;
  const dx = Math.max(minX - px, 0, px - maxX);
  const dy = Math.max(minY - py, 0, py - maxY);
  return Math.hypot(dx, dy);
}

export function distPointToEllipse(
  px: number, py: number,
  cx: number, cy: number,
  majorAxis: Point3D,
  minorRatio: number,
): number {
  const rotation = Math.atan2(majorAxis.y, majorAxis.x);
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const localX = (px - cx) * cos - (py - cy) * sin;
  const localY = (px - cx) * sin + (py - cy) * cos;

  const a = Math.sqrt(majorAxis.x ** 2 + majorAxis.y ** 2);
  const b = a * minorRatio;

  if (a < 1e-10) return Math.hypot(px - cx, py - cy);

  const scaledY = localY * (a / b);
  const dist = Math.hypot(localX, scaledY);
  if (dist < 1e-10) return a; // at center
  const onEllipseX = (localX / dist) * a;
  const onEllipseY = (localY / dist) * b;
  return Math.hypot(localX - onEllipseX, localY - onEllipseY);
}
