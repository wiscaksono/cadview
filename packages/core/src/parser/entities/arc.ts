import type { DxfToken } from '../tokenizer.js';
import type { DxfArcEntity } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parseArc(tags: DxfToken[]): DxfArcEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfArcEntity = {
    ...base,
    type: 'ARC',
    center: { x: 0, y: 0, z: 0 },
    radius: 0,
    startAngle: 0,
    endAngle: 360,
  };

  for (const tag of tags) {
    switch (tag.code) {
      case 10: entity.center.x = parseFloat(tag.value); break;
      case 20: entity.center.y = parseFloat(tag.value); break;
      case 30: entity.center.z = parseFloat(tag.value); break;
      case 40: entity.radius = parseFloat(tag.value); break;
      case 50: entity.startAngle = parseFloat(tag.value); break;
      case 51: entity.endAngle = parseFloat(tag.value); break;
    }
  }

  return entity;
}
