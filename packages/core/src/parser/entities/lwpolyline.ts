import type { DxfToken } from '../tokenizer.js';
import type { DxfLwPolylineEntity, DxfLwPolylineVertex } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parseLwPolyline(tags: DxfToken[]): DxfLwPolylineEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfLwPolylineEntity = {
    ...base,
    type: 'LWPOLYLINE',
    vertices: [],
    closed: false,
    constantWidth: 0,
    elevation: 0,
  };

  let currentVertex: DxfLwPolylineVertex | null = null;

  for (const tag of tags) {
    switch (tag.code) {
      case 70:
        entity.closed = (parseInt(tag.value, 10) & 1) !== 0;
        break;
      case 38:
        entity.elevation = parseFloat(tag.value);
        break;
      case 43:
        entity.constantWidth = parseFloat(tag.value);
        break;
      case 10:
        // New vertex starts at each code 10
        if (currentVertex) entity.vertices.push(currentVertex);
        currentVertex = { x: parseFloat(tag.value), y: 0, bulge: 0, startWidth: 0, endWidth: 0 };
        break;
      case 20:
        if (currentVertex) currentVertex.y = parseFloat(tag.value);
        break;
      case 40:
        if (currentVertex) currentVertex.startWidth = parseFloat(tag.value);
        break;
      case 41:
        if (currentVertex) currentVertex.endWidth = parseFloat(tag.value);
        break;
      case 42:
        if (currentVertex) currentVertex.bulge = parseFloat(tag.value);
        break;
    }
  }
  if (currentVertex) entity.vertices.push(currentVertex);

  return entity;
}
