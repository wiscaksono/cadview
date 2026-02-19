import type { DxfToken } from '../tokenizer.js';
import type { DxfEllipseEntity } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parseEllipse(tags: DxfToken[]): DxfEllipseEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfEllipseEntity = {
    ...base,
    type: 'ELLIPSE',
    center: { x: 0, y: 0, z: 0 },
    majorAxis: { x: 1, y: 0, z: 0 },
    minorRatio: 1,
    startParam: 0,
    endParam: Math.PI * 2,
  };

  for (const tag of tags) {
    switch (tag.code) {
      case 10: entity.center.x = parseFloat(tag.value); break;
      case 20: entity.center.y = parseFloat(tag.value); break;
      case 30: entity.center.z = parseFloat(tag.value); break;
      case 11: entity.majorAxis.x = parseFloat(tag.value); break;
      case 21: entity.majorAxis.y = parseFloat(tag.value); break;
      case 31: entity.majorAxis.z = parseFloat(tag.value); break;
      case 40: entity.minorRatio = parseFloat(tag.value); break;
      case 41: entity.startParam = parseFloat(tag.value); break;
      case 42: entity.endParam = parseFloat(tag.value); break;
    }
  }

  return entity;
}
