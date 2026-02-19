import type { DxfToken } from '../tokenizer.js';
import type { DxfCircleEntity } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parseCircle(tags: DxfToken[]): DxfCircleEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfCircleEntity = {
    ...base,
    type: 'CIRCLE',
    center: { x: 0, y: 0, z: 0 },
    radius: 0,
  };

  for (const tag of tags) {
    switch (tag.code) {
      case 10: entity.center.x = parseFloat(tag.value); break;
      case 20: entity.center.y = parseFloat(tag.value); break;
      case 30: entity.center.z = parseFloat(tag.value); break;
      case 40: entity.radius = parseFloat(tag.value); break;
    }
  }

  return entity;
}
