import type { DxfToken } from '../tokenizer.js';
import type { DxfMTextEntity } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parseMText(tags: DxfToken[]): DxfMTextEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfMTextEntity = {
    ...base,
    type: 'MTEXT',
    text: '',
    insertionPoint: { x: 0, y: 0, z: 0 },
    height: 1,
    width: 0,
    attachmentPoint: 1,
    drawingDirection: 1,
    rotation: 0,
    lineSpacingStyle: 1,
    lineSpacingFactor: 1,
    style: 'STANDARD',
    bgFill: 0,
    bgFillScale: 1.5,
  };

  const textChunks: string[] = [];

  for (const tag of tags) {
    switch (tag.code) {
      case 1:
        textChunks.push(tag.value);  // final chunk
        break;
      case 3:
        textChunks.push(tag.value);  // intermediate chunk
        break;
      case 7:  entity.style = tag.value; break;
      case 10: entity.insertionPoint.x = parseFloat(tag.value); break;
      case 20: entity.insertionPoint.y = parseFloat(tag.value); break;
      case 30: entity.insertionPoint.z = parseFloat(tag.value); break;
      case 11:
        if (!entity.textDirection) entity.textDirection = { x: 0, y: 0, z: 0 };
        entity.textDirection.x = parseFloat(tag.value);
        break;
      case 21:
        if (!entity.textDirection) entity.textDirection = { x: 0, y: 0, z: 0 };
        entity.textDirection.y = parseFloat(tag.value);
        break;
      case 31:
        if (!entity.textDirection) entity.textDirection = { x: 0, y: 0, z: 0 };
        entity.textDirection.z = parseFloat(tag.value);
        break;
      case 40: entity.height = parseFloat(tag.value); break;
      case 41: entity.width = parseFloat(tag.value); break;
      case 44: entity.lineSpacingFactor = parseFloat(tag.value); break;
      case 50: entity.rotation = parseFloat(tag.value); break;
      case 71: entity.attachmentPoint = parseInt(tag.value, 10); break;
      case 72: entity.drawingDirection = parseInt(tag.value, 10); break;
      case 73: entity.lineSpacingStyle = parseInt(tag.value, 10); break;
      case 90: entity.bgFill = parseInt(tag.value, 10); break;
    }
  }

  entity.text = textChunks.join('');
  return entity;
}
