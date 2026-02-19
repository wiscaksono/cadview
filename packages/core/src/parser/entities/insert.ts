import type { DxfToken } from '../tokenizer.js';
import type { DxfInsertEntity } from '../types.js';
import { parseBaseEntity } from './base.js';

export function parseInsert(tags: DxfToken[]): DxfInsertEntity {
  const base = parseBaseEntity(tags);
  const entity: DxfInsertEntity = {
    ...base,
    type: 'INSERT',
    blockName: '',
    insertionPoint: { x: 0, y: 0, z: 0 },
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    rotation: 0,
    columnCount: 1,
    rowCount: 1,
    columnSpacing: 0,
    rowSpacing: 0,
    attribs: [],
  };

  for (const tag of tags) {
    switch (tag.code) {
      case 2:  entity.blockName = tag.value; break;
      case 10: entity.insertionPoint.x = parseFloat(tag.value); break;
      case 20: entity.insertionPoint.y = parseFloat(tag.value); break;
      case 30: entity.insertionPoint.z = parseFloat(tag.value); break;
      case 41: entity.scaleX = parseFloat(tag.value); break;
      case 42: entity.scaleY = parseFloat(tag.value); break;
      case 43: entity.scaleZ = parseFloat(tag.value); break;
      case 44: entity.columnSpacing = parseFloat(tag.value); break;
      case 45: entity.rowSpacing = parseFloat(tag.value); break;
      case 50: entity.rotation = parseFloat(tag.value); break;
      case 70: entity.columnCount = parseInt(tag.value, 10) || 1; break;
      case 71: entity.rowCount = parseInt(tag.value, 10) || 1; break;
    }
  }

  return entity;
}
