import type { DxfToken } from '../tokenizer.js';
import type { DxfBlock, DxfEntity, Point3D } from '../types.js';
import { parseEntities } from './entities.js';

export function parseBlocks(tokens: DxfToken[], i: number, blocks: Map<string, DxfBlock>): number {
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token.code === 0 && token.value === 'ENDSEC') return i + 1;

    if (token.code === 0 && token.value === 'BLOCK') {
      i++;
      const block: DxfBlock = {
        name: '',
        basePoint: { x: 0, y: 0, z: 0 } as Point3D,
        entities: [] as DxfEntity[],
        flags: 0,
      };

      // Parse block header tags until we hit a code 0 (which is either an entity or ENDBLK)
      while (i < tokens.length && tokens[i]!.code !== 0) {
        const tag = tokens[i]!;
        switch (tag.code) {
          case 2: block.name = tag.value; break;
          case 8: /* layer — skip for blocks */ break;
          case 10: block.basePoint.x = parseFloat(tag.value); break;
          case 20: block.basePoint.y = parseFloat(tag.value); break;
          case 30: block.basePoint.z = parseFloat(tag.value); break;
          case 70: block.flags = parseInt(tag.value, 10); break;
        }
        i++;
      }

      // Parse block entities (between BLOCK header and ENDBLK)
      // parseEntities will stop at ENDBLK and return i+1 past it
      i = parseEntities(tokens, i, block.entities);

      // Store block (skip model/paper space — their entities are in ENTITIES section)
      if (block.name && !block.name.startsWith('*Model_Space') && !block.name.startsWith('*Paper_Space')) {
        blocks.set(block.name, block);
      }
    } else {
      i++;
    }
  }
  return i;
}
