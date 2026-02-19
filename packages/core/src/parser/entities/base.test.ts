import { describe, it, expect } from 'vitest';
import { parseBaseEntity, readPoint3D } from './base.js';
import type { DxfToken } from '../tokenizer.js';

describe('parseBaseEntity', () => {
  it('returns defaults when given empty tags', () => {
    const base = parseBaseEntity([]);
    expect(base.type).toBe('');
    expect(base.layer).toBe('0');
    expect(base.color).toBe(256); // BYLAYER
    expect(base.lineType).toBe('BYLAYER');
    expect(base.lineTypeScale).toBe(1);
    expect(base.lineWeight).toBe(-1); // BYLAYER
    expect(base.visible).toBe(true);
    expect(base.extrusion).toEqual({ x: 0, y: 0, z: 1 });
    expect(base.handle).toBeUndefined();
    expect(base.trueColor).toBeUndefined();
  });

  it('parses handle (code 5)', () => {
    const base = parseBaseEntity([{ code: 5, value: 'A1' }]);
    expect(base.handle).toBe('A1');
  });

  it('parses layer (code 8)', () => {
    const base = parseBaseEntity([{ code: 8, value: 'Walls' }]);
    expect(base.layer).toBe('Walls');
  });

  it('parses lineType (code 6)', () => {
    const base = parseBaseEntity([{ code: 6, value: 'DASHED' }]);
    expect(base.lineType).toBe('DASHED');
  });

  it('parses lineTypeScale (code 48)', () => {
    const base = parseBaseEntity([{ code: 48, value: '2.5' }]);
    expect(base.lineTypeScale).toBe(2.5);
  });

  it('parses visibility (code 60): 0 = visible, 1 = invisible', () => {
    expect(parseBaseEntity([{ code: 60, value: '0' }]).visible).toBe(true);
    expect(parseBaseEntity([{ code: 60, value: '1' }]).visible).toBe(false);
    expect(parseBaseEntity([{ code: 60, value: '' }]).visible).toBe(true);
  });

  it('parses ACI color (code 62)', () => {
    const base = parseBaseEntity([{ code: 62, value: '5' }]);
    expect(base.color).toBe(5);
  });

  it('parses lineWeight (code 370)', () => {
    const base = parseBaseEntity([{ code: 370, value: '25' }]);
    expect(base.lineWeight).toBe(25);
  });

  it('parses trueColor (code 420)', () => {
    const base = parseBaseEntity([{ code: 420, value: '16711680' }]);
    expect(base.trueColor).toBe(16711680); // 0xFF0000
  });

  it('parses extrusion direction (codes 210/220/230)', () => {
    const tags: DxfToken[] = [
      { code: 210, value: '0' },
      { code: 220, value: '0' },
      { code: 230, value: '-1' },
    ];
    const base = parseBaseEntity(tags);
    expect(base.extrusion).toEqual({ x: 0, y: 0, z: -1 });
  });

  it('handles all properties together', () => {
    const tags: DxfToken[] = [
      { code: 5, value: 'FF' },
      { code: 8, value: 'MyLayer' },
      { code: 6, value: 'CENTER' },
      { code: 48, value: '0.5' },
      { code: 60, value: '0' },
      { code: 62, value: '1' },
      { code: 370, value: '50' },
      { code: 420, value: '255' },
      { code: 210, value: '1' },
      { code: 220, value: '0' },
      { code: 230, value: '0' },
    ];
    const base = parseBaseEntity(tags);
    expect(base.handle).toBe('FF');
    expect(base.layer).toBe('MyLayer');
    expect(base.lineType).toBe('CENTER');
    expect(base.lineTypeScale).toBe(0.5);
    expect(base.visible).toBe(true);
    expect(base.color).toBe(1);
    expect(base.lineWeight).toBe(50);
    expect(base.trueColor).toBe(255);
    expect(base.extrusion).toEqual({ x: 1, y: 0, z: 0 });
  });
});

describe('readPoint3D', () => {
  it('reads x/y/z from sequential codes 10/20/30', () => {
    const tags: DxfToken[] = [
      { code: 10, value: '1.5' },
      { code: 20, value: '2.5' },
      { code: 30, value: '3.5' },
    ];
    const { point, consumed } = readPoint3D(tags, 0);
    expect(point).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
    expect(consumed).toBe(3);
  });

  it('reads only x when y/z codes are missing', () => {
    const tags: DxfToken[] = [
      { code: 10, value: '5.0' },
      { code: 8, value: 'Layer' }, // not a y code
    ];
    const { point, consumed } = readPoint3D(tags, 0);
    expect(point.x).toBe(5);
    expect(point.y).toBe(0);
    expect(point.z).toBe(0);
    expect(consumed).toBe(1);
  });

  it('reads from non-zero start index', () => {
    const tags: DxfToken[] = [
      { code: 8, value: 'Layer' },
      { code: 11, value: '10' },
      { code: 21, value: '20' },
      { code: 31, value: '30' },
    ];
    const { point, consumed } = readPoint3D(tags, 1);
    expect(point).toEqual({ x: 10, y: 20, z: 30 });
    expect(consumed).toBe(3);
  });

  it('handles empty tags array', () => {
    const { point, consumed } = readPoint3D([], 0);
    expect(point).toEqual({ x: 0, y: 0, z: 0 });
    expect(consumed).toBe(0);
  });
});
