import type { DxfToken } from '../tokenizer.js';
import type { DxfPointEntity } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parsePoint(tags: DxfToken[]): DxfPointEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfPointEntity = {
    ...base,
    type: 'POINT',
    position: { x: 0, y: 0, z: 0 },
  };

  for (const tag of tags) {
    switch (tag.code) {
      case 10: entity.position.x = parseFloat(tag.value); break;
      case 20: entity.position.y = parseFloat(tag.value); break;
      case 30: entity.position.z = parseFloat(tag.value); break;
    }
  }

  return entity;
}
