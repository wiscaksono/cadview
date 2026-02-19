import type { DxfToken } from '../tokenizer.js';
import type { DxfSplineEntity, Point3D } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parseSpline(tags: DxfToken[]): DxfSplineEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfSplineEntity = {
    ...base,
    type: 'SPLINE',
    degree: 3,
    flags: 0,
    knots: [],
    controlPoints: [],
    fitPoints: [],
    weights: [],
  };

  let currentCP: Point3D | null = null;
  let currentFP: Point3D | null = null;

  for (const tag of tags) {
    switch (tag.code) {
      case 70: entity.flags = parseInt(tag.value, 10); break;
      case 71: entity.degree = parseInt(tag.value, 10); break;
      // 72 = knot count, 73 = control point count, 74 = fit point count — informational, skip
      case 40: entity.knots.push(parseFloat(tag.value)); break;
      case 41: entity.weights.push(parseFloat(tag.value)); break;
      case 10:
        if (currentCP) entity.controlPoints.push(currentCP);
        currentCP = { x: parseFloat(tag.value), y: 0, z: 0 };
        break;
      case 20:
        if (currentCP) currentCP.y = parseFloat(tag.value);
        break;
      case 30:
        if (currentCP) currentCP.z = parseFloat(tag.value);
        break;
      case 11:
        if (currentFP) entity.fitPoints.push(currentFP);
        currentFP = { x: parseFloat(tag.value), y: 0, z: 0 };
        break;
      case 21:
        if (currentFP) currentFP.y = parseFloat(tag.value);
        break;
      case 31:
        if (currentFP) currentFP.z = parseFloat(tag.value);
        break;
      case 12:
        if (!entity.startTangent) entity.startTangent = { x: 0, y: 0, z: 0 };
        entity.startTangent.x = parseFloat(tag.value);
        break;
      case 22:
        if (entity.startTangent) entity.startTangent.y = parseFloat(tag.value);
        break;
      case 32:
        if (entity.startTangent) entity.startTangent.z = parseFloat(tag.value);
        break;
      case 13:
        if (!entity.endTangent) entity.endTangent = { x: 0, y: 0, z: 0 };
        entity.endTangent.x = parseFloat(tag.value);
        break;
      case 23:
        if (entity.endTangent) entity.endTangent.y = parseFloat(tag.value);
        break;
      case 33:
        if (entity.endTangent) entity.endTangent.z = parseFloat(tag.value);
        break;
    }
  }
  if (currentCP) entity.controlPoints.push(currentCP);
  if (currentFP) entity.fitPoints.push(currentFP);

  return entity;
}
