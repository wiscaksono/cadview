import type { DxfToken } from '../tokenizer.js';
import type { DxfEntityBase, Point3D } from '../types.js';

/**
 * Parse common entity properties shared by all entity types.
 * Handles: handle, layer, color, trueColor, lineType, lineTypeScale,
 * lineWeight, visibility, and extrusion direction.
 */
export function parseBaseEntity(tags: DxfToken[]): DxfEntityBase {
  const base: DxfEntityBase = {
    type: '',
    layer: '0',
    color: 256,        // BYLAYER
    lineType: 'BYLAYER',
    lineTypeScale: 1.0,
    lineWeight: -1,    // BYLAYER
    visible: true,
    extrusion: { x: 0, y: 0, z: 1 },
  };

  for (const tag of tags) {
    switch (tag.code) {
      case 5:   base.handle = tag.value; break;
      case 8:   base.layer = tag.value; break;
      case 6:   base.lineType = tag.value; break;
      case 48:  base.lineTypeScale = parseFloat(tag.value); break;
      case 60:  base.visible = tag.value === '0' || tag.value === ''; break;
      case 62:  base.color = parseInt(tag.value, 10); break;
      case 370: base.lineWeight = parseInt(tag.value, 10); break;
      case 420: base.trueColor = parseInt(tag.value, 10); break;
      case 210: base.extrusion.x = parseFloat(tag.value); break;
      case 220: base.extrusion.y = parseFloat(tag.value); break;
      case 230: base.extrusion.z = parseFloat(tag.value); break;
    }
  }

  return base;
}

/** Read a Point3D from tokens starting at position i (expects codes 10/20/30 or similar) */
export function readPoint3D(tags: DxfToken[], startIndex: number): { point: Point3D; consumed: number } {
  const point: Point3D = { x: 0, y: 0, z: 0 };
  let consumed = 0;
  let i = startIndex;

  if (i < tags.length) {
    point.x = parseFloat(tags[i]!.value);
    consumed++;
    i++;
  }
  if (i < tags.length && (tags[i]!.code === 20 || tags[i]!.code === 21 || tags[i]!.code === 22 || tags[i]!.code === 23 || tags[i]!.code === 24 || tags[i]!.code === 25)) {
    point.y = parseFloat(tags[i]!.value);
    consumed++;
    i++;
  }
  if (i < tags.length && (tags[i]!.code === 30 || tags[i]!.code === 31 || tags[i]!.code === 32 || tags[i]!.code === 33 || tags[i]!.code === 34 || tags[i]!.code === 35)) {
    point.z = parseFloat(tags[i]!.value);
    consumed++;
  }

  return { point, consumed };
}
