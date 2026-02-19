import { describe, it, expect } from 'vitest';
import { parseEntities } from './entities.js';
import type { DxfToken } from '../tokenizer.js';
import type {
  DxfEntity,
  DxfLineEntity,
  DxfCircleEntity,
  DxfPointEntity,
  DxfInsertEntity,
  DxfPolylineEntity,
} from '../types.js';

describe('parseEntities', () => {
  it('parses a single LINE entity', () => {
    const tokens: DxfToken[] = [
      { code: 0, value: 'LINE' },
      { code: 8, value: 'Layer1' },
      { code: 10, value: '1.0' },
      { code: 20, value: '2.0' },
      { code: 30, value: '3.0' },
      { code: 11, value: '4.0' },
      { code: 21, value: '5.0' },
      { code: 31, value: '6.0' },
      { code: 0, value: 'ENDSEC' },
    ];
    const entities: DxfEntity[] = [];
    parseEntities(tokens, 0, entities);
    expect(entities).toHaveLength(1);
    const line = entities[0] as DxfLineEntity;
    expect(line.type).toBe('LINE');
    expect(line.layer).toBe('Layer1');
    expect(line.start).toEqual({ x: 1, y: 2, z: 3 });
    expect(line.end).toEqual({ x: 4, y: 5, z: 6 });
  });

  it('parses multiple entity types', () => {
    const tokens: DxfToken[] = [
      { code: 0, value: 'LINE' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 11, value: '1' }, { code: 21, value: '1' }, { code: 31, value: '0' },
      { code: 0, value: 'CIRCLE' },
      { code: 10, value: '5' }, { code: 20, value: '5' }, { code: 30, value: '0' },
      { code: 40, value: '3' },
      { code: 0, value: 'POINT' },
      { code: 10, value: '10' }, { code: 20, value: '10' }, { code: 30, value: '0' },
      { code: 0, value: 'ENDSEC' },
    ];
    const entities: DxfEntity[] = [];
    parseEntities(tokens, 0, entities);
    expect(entities).toHaveLength(3);
    expect(entities[0]!.type).toBe('LINE');
    expect(entities[1]!.type).toBe('CIRCLE');
    expect(entities[2]!.type).toBe('POINT');
  });

  it('silently skips unknown entity types', () => {
    const tokens: DxfToken[] = [
      { code: 0, value: 'XLINE' },
      { code: 10, value: '0' }, { code: 20, value: '0' },
      { code: 0, value: 'POINT' },
      { code: 10, value: '1' }, { code: 20, value: '1' }, { code: 30, value: '0' },
      { code: 0, value: 'ENDSEC' },
    ];
    const entities: DxfEntity[] = [];
    parseEntities(tokens, 0, entities);
    expect(entities).toHaveLength(1);
    expect(entities[0]!.type).toBe('POINT');
  });

  it('stops at ENDSEC', () => {
    const tokens: DxfToken[] = [
      { code: 0, value: 'POINT' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 0, value: 'ENDSEC' },
      { code: 0, value: 'POINT' },  // should not be parsed
      { code: 10, value: '99' }, { code: 20, value: '99' }, { code: 30, value: '99' },
    ];
    const entities: DxfEntity[] = [];
    const next = parseEntities(tokens, 0, entities);
    expect(entities).toHaveLength(1);
    expect(next).toBe(5); // past ENDSEC
  });

  it('stops at ENDBLK (used inside blocks)', () => {
    const tokens: DxfToken[] = [
      { code: 0, value: 'LINE' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 11, value: '1' }, { code: 21, value: '1' }, { code: 31, value: '0' },
      { code: 0, value: 'ENDBLK' },
    ];
    const entities: DxfEntity[] = [];
    const next = parseEntities(tokens, 0, entities);
    expect(entities).toHaveLength(1);
    expect(next).toBe(8); // past ENDBLK
  });

  it('handles POLYLINE with VERTEX/SEQEND sequence', () => {
    const tokens: DxfToken[] = [
      { code: 0, value: 'POLYLINE' },
      { code: 70, value: '1' },  // closed
      { code: 0, value: 'VERTEX' },
      { code: 10, value: '0' }, { code: 20, value: '0' },
      { code: 0, value: 'VERTEX' },
      { code: 10, value: '10' }, { code: 20, value: '0' },
      { code: 0, value: 'VERTEX' },
      { code: 10, value: '10' }, { code: 20, value: '10' },
      { code: 0, value: 'SEQEND' },
      { code: 0, value: 'ENDSEC' },
    ];
    const entities: DxfEntity[] = [];
    parseEntities(tokens, 0, entities);
    const poly = entities[0] as DxfPolylineEntity;
    expect(poly.type).toBe('POLYLINE');
    expect(poly.closed).toBe(true);
    expect(poly.vertices).toHaveLength(3);
    expect(poly.vertices[1]!.x).toBe(10);
  });

  it('handles INSERT with ATTRIBs (code 66=1)', () => {
    const tokens: DxfToken[] = [
      { code: 0, value: 'INSERT' },
      { code: 2, value: 'BlockA' },
      { code: 10, value: '5' }, { code: 20, value: '5' }, { code: 30, value: '0' },
      { code: 66, value: '1' },
      { code: 0, value: 'ATTRIB' },
      { code: 2, value: 'TAG1' },
      { code: 1, value: 'Value1' },
      { code: 10, value: '5' }, { code: 20, value: '5' }, { code: 30, value: '0' },
      { code: 0, value: 'SEQEND' },
      { code: 0, value: 'ENDSEC' },
    ];
    const entities: DxfEntity[] = [];
    parseEntities(tokens, 0, entities);
    const insert = entities[0] as DxfInsertEntity;
    expect(insert.type).toBe('INSERT');
    expect(insert.blockName).toBe('BlockA');
    expect(insert.attribs).toHaveLength(1);
    expect(insert.attribs[0]!.tag).toBe('TAG1');
    expect(insert.attribs[0]!.text).toBe('Value1');
  });
});
