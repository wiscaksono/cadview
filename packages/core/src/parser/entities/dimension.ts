import type { DxfToken } from '../tokenizer.js';
import type { DxfDimensionEntity } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parseDimension(tags: DxfToken[]): DxfDimensionEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfDimensionEntity = {
    ...base,
    type: 'DIMENSION',
    blockName: '',
    dimStyle: 'STANDARD',
    dimType: 0,
    defPoint: { x: 0, y: 0, z: 0 },
    textMidpoint: { x: 0, y: 0, z: 0 },
    textOverride: '',
    rotation: 0,
    textRotation: 0,
    leaderLength: 0,
  };

  for (const tag of tags) {
    switch (tag.code) {
      case 1:  entity.textOverride = tag.value; break;
      case 2:  entity.blockName = tag.value; break;
      case 3:  entity.dimStyle = tag.value; break;
      case 10: entity.defPoint.x = parseFloat(tag.value); break;
      case 20: entity.defPoint.y = parseFloat(tag.value); break;
      case 30: entity.defPoint.z = parseFloat(tag.value); break;
      case 11: entity.textMidpoint.x = parseFloat(tag.value); break;
      case 21: entity.textMidpoint.y = parseFloat(tag.value); break;
      case 31: entity.textMidpoint.z = parseFloat(tag.value); break;
      case 13:
        if (!entity.defPoint2) entity.defPoint2 = { x: 0, y: 0, z: 0 };
        entity.defPoint2.x = parseFloat(tag.value); break;
      case 23:
        if (!entity.defPoint2) entity.defPoint2 = { x: 0, y: 0, z: 0 };
        entity.defPoint2.y = parseFloat(tag.value); break;
      case 33:
        if (!entity.defPoint2) entity.defPoint2 = { x: 0, y: 0, z: 0 };
        entity.defPoint2.z = parseFloat(tag.value); break;
      case 14:
        if (!entity.defPoint3) entity.defPoint3 = { x: 0, y: 0, z: 0 };
        entity.defPoint3.x = parseFloat(tag.value); break;
      case 24:
        if (!entity.defPoint3) entity.defPoint3 = { x: 0, y: 0, z: 0 };
        entity.defPoint3.y = parseFloat(tag.value); break;
      case 34:
        if (!entity.defPoint3) entity.defPoint3 = { x: 0, y: 0, z: 0 };
        entity.defPoint3.z = parseFloat(tag.value); break;
      case 15:
        if (!entity.defPoint4) entity.defPoint4 = { x: 0, y: 0, z: 0 };
        entity.defPoint4.x = parseFloat(tag.value); break;
      case 25:
        if (!entity.defPoint4) entity.defPoint4 = { x: 0, y: 0, z: 0 };
        entity.defPoint4.y = parseFloat(tag.value); break;
      case 35:
        if (!entity.defPoint4) entity.defPoint4 = { x: 0, y: 0, z: 0 };
        entity.defPoint4.z = parseFloat(tag.value); break;
      case 16:
        if (!entity.defPoint5) entity.defPoint5 = { x: 0, y: 0, z: 0 };
        entity.defPoint5.x = parseFloat(tag.value); break;
      case 26:
        if (!entity.defPoint5) entity.defPoint5 = { x: 0, y: 0, z: 0 };
        entity.defPoint5.y = parseFloat(tag.value); break;
      case 36:
        if (!entity.defPoint5) entity.defPoint5 = { x: 0, y: 0, z: 0 };
        entity.defPoint5.z = parseFloat(tag.value); break;
      case 40: entity.leaderLength = parseFloat(tag.value); break;
      case 50: entity.rotation = parseFloat(tag.value); break;
      case 53: entity.textRotation = parseFloat(tag.value); break;
      case 70: entity.dimType = parseInt(tag.value, 10); break;
    }
  }

  return entity;
}
