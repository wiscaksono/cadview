import type { DxfToken } from '../tokenizer.js';
import type { DxfLineEntity } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parseLine(tags: DxfToken[]): DxfLineEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfLineEntity = {
    ...base,
    type: 'LINE',
    start: { x: 0, y: 0, z: 0 },
    end: { x: 0, y: 0, z: 0 },
  };

  for (const tag of tags) {
    switch (tag.code) {
      case 10: entity.start.x = parseFloat(tag.value); break;
      case 20: entity.start.y = parseFloat(tag.value); break;
      case 30: entity.start.z = parseFloat(tag.value); break;
      case 11: entity.end.x = parseFloat(tag.value); break;
      case 21: entity.end.y = parseFloat(tag.value); break;
      case 31: entity.end.z = parseFloat(tag.value); break;
    }
  }

  return entity;
}
