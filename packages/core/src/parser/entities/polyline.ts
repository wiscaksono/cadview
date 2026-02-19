import type { DxfToken } from '../tokenizer.js';
import type { DxfPolylineEntity } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parsePolyline(tags: DxfToken[]): DxfPolylineEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfPolylineEntity = {
    ...base,
    type: 'POLYLINE',
    vertices: [],  // filled in by entities dispatcher from VERTEX entities
    closed: false,
    is3d: false,
  };

  for (const tag of tags) {
    switch (tag.code) {
      case 70: {
        const flags = parseInt(tag.value, 10);
        entity.closed = (flags & 1) !== 0;
        entity.is3d = (flags & 8) !== 0;
        break;
      }
    }
  }

  return entity;
}
