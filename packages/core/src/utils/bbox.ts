import type { DxfEntity, DxfDocument, DxfInsertEntity } from '../parser/types.js';

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const MAX_BLOCK_DEPTH = 100;

// ─── Block BBox cache ────────────────────────────────────────────────

/**
 * Compute the bounding box of a block's own entities (in block-local space).
 * Results are cached in `cache` keyed by block name.
 * Handles recursive INSERT references with a depth guard.
 */
export function computeBlockContentsBBox(
  blockName: string,
  doc: DxfDocument,
  cache: Map<string, BBox | null>,
  depth: number = 0,
): BBox | null {
  if (depth > MAX_BLOCK_DEPTH) return null;
  if (cache.has(blockName)) return cache.get(blockName)!;

  const block = doc.blocks.get(blockName);
  if (!block) {
    cache.set(blockName, null);
    return null;
  }

  // Temporarily mark as null to break circular references
  cache.set(blockName, null);

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  let hasAny = false;

  for (const entity of block.entities) {
    let bbox: BBox | null;
    if (entity.type === 'INSERT') {
      bbox = computeInsertBBox(entity as DxfInsertEntity, doc, cache, depth + 1);
    } else {
      bbox = computeEntityBBox(entity);
    }
    if (!bbox) continue;
    hasAny = true;
    minX = Math.min(minX, bbox.minX);
    minY = Math.min(minY, bbox.minY);
    maxX = Math.max(maxX, bbox.maxX);
    maxY = Math.max(maxY, bbox.maxY);
  }

  const result = hasAny ? { minX, minY, maxX, maxY } : null;
  cache.set(blockName, result);
  return result;
}

// ─── INSERT BBox ────────────────────────────────────────────────────

/**
 * Compute the axis-aligned bounding box of an INSERT entity by:
 * 1. Getting the block content bounds (cached)
 * 2. Offsetting by -basePoint
 * 3. Applying scale (scaleX, scaleY)
 * 4. Rotating the 4 corners and taking the AABB
 * 5. Translating to insertionPoint
 * 6. Expanding for MINSERT grid
 */
export function computeInsertBBox(
  entity: DxfInsertEntity,
  doc: DxfDocument,
  cache: Map<string, BBox | null>,
  depth: number = 0,
): BBox | null {
  const contentBBox = computeBlockContentsBBox(entity.blockName, doc, cache, depth);
  if (!contentBBox) return null;

  const block = doc.blocks.get(entity.blockName);
  if (!block) return null;

  // Offset by block base point
  const bpX = block.basePoint.x;
  const bpY = block.basePoint.y;
  let x0 = contentBBox.minX - bpX;
  let y0 = contentBBox.minY - bpY;
  let x1 = contentBBox.maxX - bpX;
  let y1 = contentBBox.maxY - bpY;

  // Apply scale
  const sx = entity.scaleX;
  const sy = entity.scaleY;
  // When scale is negative, min/max swap
  let sx0 = x0 * sx, sx1 = x1 * sx;
  let sy0 = y0 * sy, sy1 = y1 * sy;
  if (sx0 > sx1) { const t = sx0; sx0 = sx1; sx1 = t; }
  if (sy0 > sy1) { const t = sy0; sy0 = sy1; sy1 = t; }

  // Apply rotation — transform all 4 corners and take AABB
  const rad = (entity.rotation || 0) * Math.PI / 180;
  if (Math.abs(rad) < 1e-10) {
    // No rotation — fast path
    const ipx = entity.insertionPoint.x;
    const ipy = entity.insertionPoint.y;
    let rMinX = sx0 + ipx;
    let rMinY = sy0 + ipy;
    let rMaxX = sx1 + ipx;
    let rMaxY = sy1 + ipy;

    // Expand for MINSERT grid
    const cols = Math.max(1, entity.columnCount);
    const rows = Math.max(1, entity.rowCount);
    if (cols > 1 || rows > 1) {
      const gridExtentX = (cols - 1) * entity.columnSpacing;
      const gridExtentY = (rows - 1) * entity.rowSpacing;
      rMinX = Math.min(rMinX, rMinX + gridExtentX);
      rMaxX = Math.max(rMaxX, rMaxX + gridExtentX);
      rMinY = Math.min(rMinY, rMinY + gridExtentY);
      rMaxY = Math.max(rMaxY, rMaxY + gridExtentY);
    }

    return { minX: rMinX, minY: rMinY, maxX: rMaxX, maxY: rMaxY };
  }

  // Rotation case: transform 4 corners
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    { x: sx0, y: sy0 },
    { x: sx1, y: sy0 },
    { x: sx1, y: sy1 },
    { x: sx0, y: sy1 },
  ];

  const ipx = entity.insertionPoint.x;
  const ipy = entity.insertionPoint.y;
  let rMinX = Infinity, rMinY = Infinity;
  let rMaxX = -Infinity, rMaxY = -Infinity;

  for (const c of corners) {
    const rx = c.x * cos - c.y * sin + ipx;
    const ry = c.x * sin + c.y * cos + ipy;
    rMinX = Math.min(rMinX, rx);
    rMinY = Math.min(rMinY, ry);
    rMaxX = Math.max(rMaxX, rx);
    rMaxY = Math.max(rMaxY, ry);
  }

  // Expand for MINSERT grid (grid offsets are pre-rotation)
  const cols = Math.max(1, entity.columnCount);
  const rows = Math.max(1, entity.rowCount);
  if (cols > 1 || rows > 1) {
    const gridExtentX = (cols - 1) * entity.columnSpacing;
    const gridExtentY = (rows - 1) * entity.rowSpacing;
    // Grid offsets are in the INSERT's local space (applied before rotation)
    // Transform the grid extent corners through rotation
    const gridCorners = [
      { x: 0, y: 0 },
      { x: gridExtentX, y: 0 },
      { x: gridExtentX, y: gridExtentY },
      { x: 0, y: gridExtentY },
    ];
    for (const gc of gridCorners) {
      const grx = gc.x * cos - gc.y * sin;
      const gry = gc.x * sin + gc.y * cos;
      // Expand bounds: each grid corner shifts the entire block bbox
      rMinX = Math.min(rMinX, rMinX + grx);
      rMinY = Math.min(rMinY, rMinY + gry);
      rMaxX = Math.max(rMaxX, rMaxX + grx);
      rMaxY = Math.max(rMaxY, rMaxY + gry);
    }
  }

  return { minX: rMinX, minY: rMinY, maxX: rMaxX, maxY: rMaxY };
}

// ─── Entity BBox (with optional doc for INSERT resolution) ──────────

export function computeEntitiesBounds(entities: DxfEntity[], doc?: DxfDocument): BBox | null {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  let hasAny = false;

  const cache = doc ? new Map<string, BBox | null>() : undefined;

  for (const entity of entities) {
    const bbox = doc && cache
      ? computeEntityBBoxWithDoc(entity, doc, cache)
      : computeEntityBBox(entity);
    if (!bbox) continue;
    hasAny = true;
    minX = Math.min(minX, bbox.minX);
    minY = Math.min(minY, bbox.minY);
    maxX = Math.max(maxX, bbox.maxX);
    maxY = Math.max(maxY, bbox.maxY);
  }

  return hasAny ? { minX, minY, maxX, maxY } : null;
}

/**
 * Compute entity bbox with full INSERT resolution.
 * Use this when you have access to the DxfDocument.
 */
export function computeEntityBBoxWithDoc(
  entity: DxfEntity,
  doc: DxfDocument,
  cache: Map<string, BBox | null>,
): BBox | null {
  if (entity.type === 'INSERT') {
    return computeInsertBBox(entity as DxfInsertEntity, doc, cache);
  }
  // DIMENSION entities also reference blocks — use definition points for now
  // (block-based bbox would be more accurate but requires parsing dimension blocks)
  return computeEntityBBox(entity);
}

// ─── Block Entity BBox Cache ─────────────────────────────────────────
// Pre-computed bboxes for block sub-entities, keyed by block name.
// Eliminates per-frame recomputation in draw-insert.ts.

let _blockEntityBBoxCache: Map<string, (BBox | null)[]> | null = null;

/**
 * Build the block entity bbox cache for all blocks in the document.
 * Each block maps to a parallel array of bboxes matching block.entities indices.
 */
export function buildBlockEntityBBoxCache(doc: DxfDocument): Map<string, (BBox | null)[]> {
  const cache = new Map<string, (BBox | null)[]>();
  for (const [name, block] of doc.blocks) {
    const bboxes: (BBox | null)[] = new Array(block.entities.length);
    for (let i = 0; i < block.entities.length; i++) {
      bboxes[i] = computeEntityBBox(block.entities[i]!);
    }
    cache.set(name, bboxes);
  }
  return cache;
}

/** Set the module-level block entity bbox cache. Call once at document load. */
export function setBlockEntityBBoxCache(cache: Map<string, (BBox | null)[]>): void {
  _blockEntityBBoxCache = cache;
}

/** Clear the module-level block entity bbox cache. Call on document clear/destroy. */
export function clearBlockEntityBBoxCache(): void {
  _blockEntityBBoxCache = null;
}

/**
 * Look up a cached block entity bbox.
 * Returns the bbox if cached, or undefined if cache miss (caller should fallback).
 */
export function getBlockEntityBBox(blockName: string, index: number): BBox | null | undefined {
  if (!_blockEntityBBoxCache) return undefined;
  const arr = _blockEntityBBoxCache.get(blockName);
  if (!arr || index >= arr.length) return undefined;
  return arr[index];
}

/**
 * Compute entity bbox without document context.
 * INSERT entities return a zero-size bbox at their insertion point.
 * For proper INSERT bounds, use computeEntityBBoxWithDoc() instead.
 */
export function computeEntityBBox(entity: DxfEntity): BBox | null {
  switch (entity.type) {
    case 'LINE':
      return {
        minX: Math.min(entity.start.x, entity.end.x),
        minY: Math.min(entity.start.y, entity.end.y),
        maxX: Math.max(entity.start.x, entity.end.x),
        maxY: Math.max(entity.start.y, entity.end.y),
      };
    case 'CIRCLE':
      return {
        minX: entity.center.x - entity.radius,
        minY: entity.center.y - entity.radius,
        maxX: entity.center.x + entity.radius,
        maxY: entity.center.y + entity.radius,
      };
    case 'ARC': {
      // Conservative: use full circle bounds
      return {
        minX: entity.center.x - entity.radius,
        minY: entity.center.y - entity.radius,
        maxX: entity.center.x + entity.radius,
        maxY: entity.center.y + entity.radius,
      };
    }
    case 'LWPOLYLINE':
    case 'POLYLINE': {
      if (entity.vertices.length === 0) return null;
      let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
      for (const v of entity.vertices) {
        pMinX = Math.min(pMinX, v.x);
        pMinY = Math.min(pMinY, v.y);
        pMaxX = Math.max(pMaxX, v.x);
        pMaxY = Math.max(pMaxY, v.y);
      }
      return { minX: pMinX, minY: pMinY, maxX: pMaxX, maxY: pMaxY };
    }
    case 'ELLIPSE': {
      const majorLen = Math.sqrt(entity.majorAxis.x ** 2 + entity.majorAxis.y ** 2);
      return {
        minX: entity.center.x - majorLen,
        minY: entity.center.y - majorLen,
        maxX: entity.center.x + majorLen,
        maxY: entity.center.y + majorLen,
      };
    }
    case 'TEXT':
      return {
        minX: entity.insertionPoint.x,
        minY: entity.insertionPoint.y,
        maxX: entity.insertionPoint.x + entity.height * entity.text.length * 0.6,
        maxY: entity.insertionPoint.y + entity.height,
      };
    case 'MTEXT':
      return {
        minX: entity.insertionPoint.x,
        minY: entity.insertionPoint.y - entity.height,
        maxX: entity.insertionPoint.x + (entity.width || entity.height * 10),
        maxY: entity.insertionPoint.y + entity.height,
      };
    case 'SPLINE': {
      if (entity.controlPoints.length === 0) return null;
      let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
      for (const p of entity.controlPoints) {
        sMinX = Math.min(sMinX, p.x);
        sMinY = Math.min(sMinY, p.y);
        sMaxX = Math.max(sMaxX, p.x);
        sMaxY = Math.max(sMaxY, p.y);
      }
      return { minX: sMinX, minY: sMinY, maxX: sMaxX, maxY: sMaxY };
    }
    case 'POINT':
      return {
        minX: entity.position.x,
        minY: entity.position.y,
        maxX: entity.position.x,
        maxY: entity.position.y,
      };
    case 'INSERT':
      // Fallback: zero-size bbox at insertion point.
      // Use computeInsertBBox() or computeEntityBBoxWithDoc() for proper bounds.
      return {
        minX: entity.insertionPoint.x,
        minY: entity.insertionPoint.y,
        maxX: entity.insertionPoint.x,
        maxY: entity.insertionPoint.y,
      };
    case 'DIMENSION':
      if (entity.defPoint) {
        return {
          minX: Math.min(entity.defPoint.x, entity.defPoint2?.x ?? entity.defPoint.x, entity.defPoint3?.x ?? entity.defPoint.x),
          minY: Math.min(entity.defPoint.y, entity.defPoint2?.y ?? entity.defPoint.y, entity.defPoint3?.y ?? entity.defPoint.y),
          maxX: Math.max(entity.defPoint.x, entity.defPoint2?.x ?? entity.defPoint.x, entity.defPoint3?.x ?? entity.defPoint.x),
          maxY: Math.max(entity.defPoint.y, entity.defPoint2?.y ?? entity.defPoint.y, entity.defPoint3?.y ?? entity.defPoint.y),
        };
      }
      return null;
    case 'HATCH': {
      let hMinX = Infinity, hMinY = Infinity, hMaxX = -Infinity, hMaxY = -Infinity;
      let hasPoints = false;
      for (const path of entity.boundaryPaths) {
        if (path.vertices) {
          for (const v of path.vertices) {
            hasPoints = true;
            hMinX = Math.min(hMinX, v.x);
            hMinY = Math.min(hMinY, v.y);
            hMaxX = Math.max(hMaxX, v.x);
            hMaxY = Math.max(hMaxY, v.y);
          }
        }
      }
      return hasPoints ? { minX: hMinX, minY: hMinY, maxX: hMaxX, maxY: hMaxY } : null;
    }
    default:
      return null;
  }
}
