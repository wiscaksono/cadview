import type { DxfToken } from '../tokenizer.js';
import type { DxfTextEntity } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parseText(tags: DxfToken[]): DxfTextEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfTextEntity = {
    ...base,
    type: 'TEXT',
    text: '',
    insertionPoint: { x: 0, y: 0, z: 0 },
    height: 1,
    rotation: 0,
    widthFactor: 1,
    obliqueAngle: 0,
    style: 'STANDARD',
    hAlign: 0,
    vAlign: 0,
    generationFlags: 0,
  };

  for (const tag of tags) {
    switch (tag.code) {
      case 1:  entity.text = tag.value; break;
      case 10: entity.insertionPoint.x = parseFloat(tag.value); break;
      case 20: entity.insertionPoint.y = parseFloat(tag.value); break;
      case 30: entity.insertionPoint.z = parseFloat(tag.value); break;
      case 11:
        if (!entity.alignmentPoint) entity.alignmentPoint = { x: 0, y: 0, z: 0 };
        entity.alignmentPoint.x = parseFloat(tag.value);
        break;
      case 21:
        if (!entity.alignmentPoint) entity.alignmentPoint = { x: 0, y: 0, z: 0 };
        entity.alignmentPoint.y = parseFloat(tag.value);
        break;
      case 31:
        if (!entity.alignmentPoint) entity.alignmentPoint = { x: 0, y: 0, z: 0 };
        entity.alignmentPoint.z = parseFloat(tag.value);
        break;
      case 40: entity.height = parseFloat(tag.value); break;
      case 41: entity.widthFactor = parseFloat(tag.value); break;
      case 50: entity.rotation = parseFloat(tag.value); break;
      case 51: entity.obliqueAngle = parseFloat(tag.value); break;
      case 7:  entity.style = tag.value; break;
      case 71: entity.generationFlags = parseInt(tag.value, 10); break;
      case 72: entity.hAlign = parseInt(tag.value, 10); break;
      case 73: entity.vAlign = parseInt(tag.value, 10); break;
    }
  }

  return entity;
}
