import type { DxfEntity } from '../parser/types.js';

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function computeEntitiesBounds(entities: DxfEntity[]): BBox | null {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  let hasAny = false;

  for (const entity of entities) {
    const bbox = computeEntityBBox(entity);
    if (!bbox) continue;
    hasAny = true;
    minX = Math.min(minX, bbox.minX);
    minY = Math.min(minY, bbox.minY);
    maxX = Math.max(maxX, bbox.maxX);
    maxY = Math.max(maxY, bbox.maxY);
  }

  return hasAny ? { minX, minY, maxX, maxY } : null;
}

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
