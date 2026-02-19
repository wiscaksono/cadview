import type { DxfToken } from '../tokenizer.js';
import type { DxfHatchEntity, DxfHatchBoundaryPath, DxfHatchEdge, Point2D } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parseHatch(tags: DxfToken[]): DxfHatchEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfHatchEntity = {
    ...base,
    type: 'HATCH',
    patternName: '',
    solidFill: true,
    associative: false,
    hatchStyle: 0,
    patternType: 1,
    patternAngle: 0,
    patternScale: 1,
    boundaryPaths: [],
  };

  let i = 0;
  // First pass: get non-boundary properties
  while (i < tags.length) {
    const tag = tags[i]!;
    switch (tag.code) {
      case 2: entity.patternName = tag.value; break;
      case 41: entity.patternScale = parseFloat(tag.value); break;
      case 52: entity.patternAngle = parseFloat(tag.value); break;
      case 70: entity.solidFill = tag.value === '1'; break;
      case 71: entity.associative = tag.value === '1'; break;
      case 75: entity.hatchStyle = parseInt(tag.value, 10); break;
      case 76: entity.patternType = parseInt(tag.value, 10); break;
      case 91: {
        // Number of boundary paths — now parse them
        const pathCount = parseInt(tag.value, 10);
        i++;
        for (let p = 0; p < pathCount && i < tags.length; p++) {
          const result = parseBoundaryPath(tags, i);
          entity.boundaryPaths.push(result.path);
          i = result.nextIndex;
        }
        continue; // skip the i++ at bottom
      }
    }
    i++;
  }

  return entity;
}

function parseBoundaryPath(tags: DxfToken[], i: number): { path: DxfHatchBoundaryPath; nextIndex: number } {
  // First tag should be code 92 (path type flag)
  let flags = 0;
  if (i < tags.length && tags[i]!.code === 92) {
    flags = parseInt(tags[i]!.value, 10);
    i++;
  }

  const isPolyline = (flags & 2) !== 0;

  if (isPolyline) {
    return parsePolylinePath(tags, i, flags);
  } else {
    return parseEdgePath(tags, i, flags);
  }
}

function parsePolylinePath(tags: DxfToken[], i: number, flags: number): { path: DxfHatchBoundaryPath; nextIndex: number } {
  const path: DxfHatchBoundaryPath = {
    type: 'polyline',
    vertices: [],
    bulges: [],
    flags,
  };

  // Code 72 = has bulge flag
  let hasBulge = false;
  if (i < tags.length && tags[i]!.code === 72) {
    hasBulge = tags[i]!.value === '1';
    i++;
  }

  // Code 73 = is closed
  if (i < tags.length && tags[i]!.code === 73) {
    path.isClosed = tags[i]!.value === '1';
    i++;
  }

  // Code 93 = number of vertices
  let vertexCount = 0;
  if (i < tags.length && tags[i]!.code === 93) {
    vertexCount = parseInt(tags[i]!.value, 10);
    i++;
  }

  for (let v = 0; v < vertexCount && i < tags.length; v++) {
    const vertex: Point2D = { x: 0, y: 0 };
    if (tags[i]!.code === 10) {
      vertex.x = parseFloat(tags[i]!.value);
      i++;
    }
    if (i < tags.length && tags[i]!.code === 20) {
      vertex.y = parseFloat(tags[i]!.value);
      i++;
    }
    path.vertices!.push(vertex);

    if (hasBulge && i < tags.length && tags[i]!.code === 42) {
      path.bulges!.push(parseFloat(tags[i]!.value));
      i++;
    } else if (hasBulge) {
      path.bulges!.push(0);
    }
  }

  // Skip source boundary objects count (code 97) and handles (code 330)
  while (i < tags.length && (tags[i]!.code === 97 || tags[i]!.code === 330)) {
    if (tags[i]!.code === 97) {
      const count = parseInt(tags[i]!.value, 10);
      i++;
      for (let s = 0; s < count && i < tags.length && tags[i]!.code === 330; s++) {
        i++;
      }
    } else {
      i++;
    }
  }

  return { path, nextIndex: i };
}

function parseEdgePath(tags: DxfToken[], i: number, flags: number): { path: DxfHatchBoundaryPath; nextIndex: number } {
  const path: DxfHatchBoundaryPath = {
    type: 'edges',
    edges: [],
    flags,
  };

  // Code 93 = number of edges
  let edgeCount = 0;
  if (i < tags.length && tags[i]!.code === 93) {
    edgeCount = parseInt(tags[i]!.value, 10);
    i++;
  }

  for (let e = 0; e < edgeCount && i < tags.length; e++) {
    // Code 72 = edge type
    if (tags[i]!.code !== 72) break;
    const edgeType = parseInt(tags[i]!.value, 10);
    i++;

    switch (edgeType) {
      case 1: { // Line
        const edge: DxfHatchEdge = {
          type: 'line',
          start: { x: 0, y: 0 },
          end: { x: 0, y: 0 },
        };
        if (i < tags.length && tags[i]!.code === 10) { edge.start.x = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 20) { edge.start.y = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 11) { edge.end.x = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 21) { edge.end.y = parseFloat(tags[i]!.value); i++; }
        path.edges!.push(edge);
        break;
      }
      case 2: { // Arc
        const edge: DxfHatchEdge = {
          type: 'arc',
          center: { x: 0, y: 0 },
          radius: 0,
          startAngle: 0,
          endAngle: 360,
          ccw: true,
        };
        if (i < tags.length && tags[i]!.code === 10) { edge.center.x = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 20) { edge.center.y = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 40) { edge.radius = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 50) { edge.startAngle = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 51) { edge.endAngle = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 73) { edge.ccw = tags[i]!.value === '1'; i++; }
        path.edges!.push(edge);
        break;
      }
      case 3: { // Ellipse
        const edge: DxfHatchEdge = {
          type: 'ellipse',
          center: { x: 0, y: 0 },
          majorAxis: { x: 1, y: 0 },
          minorRatio: 1,
          startAngle: 0,
          endAngle: Math.PI * 2,
          ccw: true,
        };
        if (i < tags.length && tags[i]!.code === 10) { edge.center.x = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 20) { edge.center.y = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 11) { edge.majorAxis.x = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 21) { edge.majorAxis.y = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 40) { edge.minorRatio = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 50) { edge.startAngle = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 51) { edge.endAngle = parseFloat(tags[i]!.value); i++; }
        if (i < tags.length && tags[i]!.code === 73) { edge.ccw = tags[i]!.value === '1'; i++; }
        path.edges!.push(edge);
        break;
      }
      case 4: { // Spline
        let degree = 3;
        const knots: number[] = [];
        const controlPoints: Point2D[] = [];

        if (i < tags.length && tags[i]!.code === 94) { degree = parseInt(tags[i]!.value, 10); i++; }
        // Code 73 = rational flag (skip)
        if (i < tags.length && tags[i]!.code === 73) { i++; }
        // Code 74 = periodic flag (skip)
        if (i < tags.length && tags[i]!.code === 74) { i++; }

        let knotCount = 0;
        if (i < tags.length && tags[i]!.code === 95) { knotCount = parseInt(tags[i]!.value, 10); i++; }
        let cpCount = 0;
        if (i < tags.length && tags[i]!.code === 96) { cpCount = parseInt(tags[i]!.value, 10); i++; }

        for (let k = 0; k < knotCount && i < tags.length && tags[i]!.code === 40; k++) {
          knots.push(parseFloat(tags[i]!.value));
          i++;
        }
        for (let c = 0; c < cpCount && i < tags.length; c++) {
          const pt: Point2D = { x: 0, y: 0 };
          if (tags[i]!.code === 10) { pt.x = parseFloat(tags[i]!.value); i++; }
          if (i < tags.length && tags[i]!.code === 20) { pt.y = parseFloat(tags[i]!.value); i++; }
          controlPoints.push(pt);
        }

        path.edges!.push({ type: 'spline', degree, knots, controlPoints });
        break;
      }
      default:
        // Unknown edge type, skip
        break;
    }
  }

  // Skip source boundary objects count (code 97) and handles (code 330)
  while (i < tags.length && (tags[i]!.code === 97 || tags[i]!.code === 330)) {
    if (tags[i]!.code === 97) {
      const count = parseInt(tags[i]!.value, 10);
      i++;
      for (let s = 0; s < count && i < tags.length && tags[i]!.code === 330; s++) {
        i++;
      }
    } else {
      i++;
    }
  }

  return { path, nextIndex: i };
}
