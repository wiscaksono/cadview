import { describe, it, expect } from 'vitest';
import type {
  DxfDocument,
  DxfEntity,
  DxfInsertEntity,
  DxfLineEntity,
  DxfBlock,
} from '../parser/types.js';
import {
  computeEntityBBox,
  computeInsertBBox,
  computeBlockContentsBBox,
  computeEntityBBoxWithDoc,
  computeEntitiesBounds,
  type BBox,
} from './bbox.js';

// ─── Helpers ────────────────────────────────────────────────────────

const BASE_ENTITY = {
  layer: '0',
  color: 256,
  lineType: 'BYLAYER',
  lineTypeScale: 1,
  lineWeight: -1,
  visible: true,
  extrusion: { x: 0, y: 0, z: 1 },
} as const;

function makeLine(x1: number, y1: number, x2: number, y2: number): DxfLineEntity {
  return {
    ...BASE_ENTITY,
    type: 'LINE',
    start: { x: x1, y: y1, z: 0 },
    end: { x: x2, y: y2, z: 0 },
  };
}

function makeInsert(
  blockName: string,
  x: number,
  y: number,
  opts?: Partial<Pick<DxfInsertEntity, 'scaleX' | 'scaleY' | 'scaleZ' | 'rotation' | 'columnCount' | 'rowCount' | 'columnSpacing' | 'rowSpacing'>>,
): DxfInsertEntity {
  return {
    ...BASE_ENTITY,
    type: 'INSERT',
    blockName,
    insertionPoint: { x, y, z: 0 },
    scaleX: opts?.scaleX ?? 1,
    scaleY: opts?.scaleY ?? 1,
    scaleZ: opts?.scaleZ ?? 1,
    rotation: opts?.rotation ?? 0,
    columnCount: opts?.columnCount ?? 1,
    rowCount: opts?.rowCount ?? 1,
    columnSpacing: opts?.columnSpacing ?? 0,
    rowSpacing: opts?.rowSpacing ?? 0,
    attribs: [],
  };
}

function makeBlock(name: string, entities: DxfEntity[], basePoint = { x: 0, y: 0, z: 0 }): DxfBlock {
  return { name, basePoint, entities, flags: 0 };
}

function makeDoc(entities: DxfEntity[], blocks: DxfBlock[]): DxfDocument {
  const blockMap = new Map<string, DxfBlock>();
  for (const b of blocks) blockMap.set(b.name, b);
  return {
    header: { acadVersion: 'AC1027', insUnits: 0, measurement: 0, ltScale: 1 },
    layers: new Map(),
    lineTypes: new Map(),
    styles: new Map(),
    blocks: blockMap,
    entities,
  };
}

// ─── computeEntityBBox (without doc) ────────────────────────────────

describe('computeEntityBBox', () => {
  it('INSERT returns zero-size bbox at insertion point', () => {
    const insert = makeInsert('BLOCK_A', 10, 20);
    const bbox = computeEntityBBox(insert);
    expect(bbox).toEqual({ minX: 10, minY: 20, maxX: 10, maxY: 20 });
  });
});

// ─── computeBlockContentsBBox ───────────────────────────────────────

describe('computeBlockContentsBBox', () => {
  it('computes bounds of a simple block', () => {
    const block = makeBlock('A', [makeLine(0, 0, 100, 50)]);
    const doc = makeDoc([], [block]);
    const cache = new Map<string, BBox | null>();

    const bbox = computeBlockContentsBBox('A', doc, cache);
    expect(bbox).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 50 });
  });

  it('returns null for empty block', () => {
    const block = makeBlock('EMPTY', []);
    const doc = makeDoc([], [block]);
    const cache = new Map<string, BBox | null>();

    expect(computeBlockContentsBBox('EMPTY', doc, cache)).toBeNull();
  });

  it('returns null for missing block', () => {
    const doc = makeDoc([], []);
    const cache = new Map<string, BBox | null>();

    expect(computeBlockContentsBBox('MISSING', doc, cache)).toBeNull();
  });

  it('caches results', () => {
    const block = makeBlock('A', [makeLine(0, 0, 10, 10)]);
    const doc = makeDoc([], [block]);
    const cache = new Map<string, BBox | null>();

    const b1 = computeBlockContentsBBox('A', doc, cache);
    const b2 = computeBlockContentsBBox('A', doc, cache);
    expect(b1).toBe(b2); // same reference from cache
  });

  it('handles nested blocks', () => {
    // Block B: line from (0,0) to (10,10)
    const blockB = makeBlock('B', [makeLine(0, 0, 10, 10)]);
    // Block A: contains INSERT of B at (50,50)
    const blockA = makeBlock('A', [makeInsert('B', 50, 50)]);
    const doc = makeDoc([], [blockA, blockB]);
    const cache = new Map<string, BBox | null>();

    const bbox = computeBlockContentsBBox('A', doc, cache);
    // B's content is [0,0] to [10,10], inserted at (50,50), so: [50,50] to [60,60]
    expect(bbox).toEqual({ minX: 50, minY: 50, maxX: 60, maxY: 60 });
  });

  it('handles circular references without infinite recursion', () => {
    // Block A references B, Block B references A
    const blockA = makeBlock('A', [makeInsert('B', 0, 0)]);
    const blockB = makeBlock('B', [makeInsert('A', 0, 0)]);
    const doc = makeDoc([], [blockA, blockB]);
    const cache = new Map<string, BBox | null>();

    // Should not hang — circular ref breaks via cache sentinel
    const bbox = computeBlockContentsBBox('A', doc, cache);
    // Both blocks only contain INSERT entities that eventually resolve to null
    expect(bbox).toBeNull();
  });
});

// ─── computeInsertBBox ──────────────────────────────────────────────

describe('computeInsertBBox', () => {
  it('computes bounds of a simple INSERT (no scale, no rotation)', () => {
    const block = makeBlock('A', [makeLine(0, 0, 100, 50)]);
    const doc = makeDoc([], [block]);
    const cache = new Map<string, BBox | null>();

    const insert = makeInsert('A', 200, 300);
    const bbox = computeInsertBBox(insert, doc, cache);
    expect(bbox).toEqual({ minX: 200, minY: 300, maxX: 300, maxY: 350 });
  });

  it('applies basePoint offset', () => {
    const block = makeBlock('A', [makeLine(0, 0, 100, 50)], { x: 10, y: 20, z: 0 });
    const doc = makeDoc([], [block]);
    const cache = new Map<string, BBox | null>();

    const insert = makeInsert('A', 200, 300);
    const bbox = computeInsertBBox(insert, doc, cache);
    // Content [0,0]-[100,50] offset by basePoint [-10,-20] → [-10,-20]-[90,30]
    // Translated to insertionPoint (200,300) → [190,280]-[290,330]
    expect(bbox).toEqual({ minX: 190, minY: 280, maxX: 290, maxY: 330 });
  });

  it('applies scale', () => {
    const block = makeBlock('A', [makeLine(0, 0, 10, 10)]);
    const doc = makeDoc([], [block]);
    const cache = new Map<string, BBox | null>();

    const insert = makeInsert('A', 0, 0, { scaleX: 2, scaleY: 3 });
    const bbox = computeInsertBBox(insert, doc, cache);
    // Content [0,0]-[10,10] → scaled to [0,0]-[20,30]
    expect(bbox).toEqual({ minX: 0, minY: 0, maxX: 20, maxY: 30 });
  });

  it('handles negative scale (mirroring)', () => {
    const block = makeBlock('A', [makeLine(0, 0, 10, 10)]);
    const doc = makeDoc([], [block]);
    const cache = new Map<string, BBox | null>();

    const insert = makeInsert('A', 0, 0, { scaleX: -1, scaleY: 1 });
    const bbox = computeInsertBBox(insert, doc, cache);
    // Content [0,0]-[10,10] with scaleX=-1 → [-10,0]-[0,10]
    expect(bbox).toEqual({ minX: -10, minY: 0, maxX: 0, maxY: 10 });
  });

  it('applies 90-degree rotation', () => {
    const block = makeBlock('A', [makeLine(0, 0, 10, 0)]);
    const doc = makeDoc([], [block]);
    const cache = new Map<string, BBox | null>();

    const insert = makeInsert('A', 0, 0, { rotation: 90 });
    const bbox = computeInsertBBox(insert, doc, cache);
    // Line [0,0]-[10,0] rotated 90° → becomes vertical [0,0]-[0,10]
    // AABB: approximately [-epsilon, 0] to [epsilon, 10]
    expect(bbox!.minX).toBeCloseTo(0, 5);
    expect(bbox!.minY).toBeCloseTo(0, 5);
    expect(bbox!.maxX).toBeCloseTo(0, 5);
    expect(bbox!.maxY).toBeCloseTo(10, 5);
  });

  it('applies 45-degree rotation', () => {
    const block = makeBlock('A', [makeLine(0, 0, 10, 0)]);
    const doc = makeDoc([], [block]);
    const cache = new Map<string, BBox | null>();

    const insert = makeInsert('A', 0, 0, { rotation: 45 });
    const bbox = computeInsertBBox(insert, doc, cache);
    // Line [0,0]-[10,0] rotated 45° → endpoints at (0,0) and (10*cos45, 10*sin45) ≈ (7.07, 7.07)
    const d = 10 * Math.cos(Math.PI / 4);
    expect(bbox!.minX).toBeCloseTo(0, 3);
    expect(bbox!.minY).toBeCloseTo(0, 3);
    expect(bbox!.maxX).toBeCloseTo(d, 3);
    expect(bbox!.maxY).toBeCloseTo(d, 3);
  });

  it('handles MINSERT grid (no rotation)', () => {
    const block = makeBlock('A', [makeLine(0, 0, 10, 10)]);
    const doc = makeDoc([], [block]);
    const cache = new Map<string, BBox | null>();

    const insert = makeInsert('A', 0, 0, {
      columnCount: 3,
      rowCount: 2,
      columnSpacing: 20,
      rowSpacing: 30,
    });
    const bbox = computeInsertBBox(insert, doc, cache);
    // Single block: [0,0]-[10,10]
    // Grid: 3 cols × 2 rows, spacing 20x30
    // Max col offset = (3-1)*20 = 40, max row offset = (2-1)*30 = 30
    // AABB: [0,0] to [10+40, 10+30] = [0,0]-[50,40]
    expect(bbox).toEqual({ minX: 0, minY: 0, maxX: 50, maxY: 40 });
  });

  it('returns null for missing block', () => {
    const doc = makeDoc([], []);
    const cache = new Map<string, BBox | null>();

    const insert = makeInsert('MISSING', 0, 0);
    expect(computeInsertBBox(insert, doc, cache)).toBeNull();
  });

  it('returns null for empty block', () => {
    const block = makeBlock('EMPTY', []);
    const doc = makeDoc([], [block]);
    const cache = new Map<string, BBox | null>();

    const insert = makeInsert('EMPTY', 0, 0);
    expect(computeInsertBBox(insert, doc, cache)).toBeNull();
  });
});

// ─── computeEntityBBoxWithDoc ───────────────────────────────────────

describe('computeEntityBBoxWithDoc', () => {
  it('resolves INSERT entities to proper bounds', () => {
    const block = makeBlock('A', [makeLine(0, 0, 50, 50)]);
    const insert = makeInsert('A', 100, 100);
    const doc = makeDoc([insert], [block]);
    const cache = new Map<string, BBox | null>();

    const bbox = computeEntityBBoxWithDoc(insert, doc, cache);
    expect(bbox).toEqual({ minX: 100, minY: 100, maxX: 150, maxY: 150 });
  });

  it('falls back to computeEntityBBox for non-INSERT', () => {
    const line = makeLine(5, 10, 15, 20);
    const doc = makeDoc([line], []);
    const cache = new Map<string, BBox | null>();

    const bbox = computeEntityBBoxWithDoc(line, doc, cache);
    expect(bbox).toEqual({ minX: 5, minY: 10, maxX: 15, maxY: 20 });
  });
});

// ─── computeEntitiesBounds (with doc) ───────────────────────────────

describe('computeEntitiesBounds', () => {
  it('with doc: includes proper INSERT bounds', () => {
    const block = makeBlock('A', [makeLine(0, 0, 100, 100)]);
    const line = makeLine(-10, -10, 0, 0);
    const insert = makeInsert('A', 200, 200);
    const doc = makeDoc([line, insert], [block]);

    const bounds = computeEntitiesBounds([line, insert], doc);
    // Line: [-10,-10]-[0,0], Insert: [200,200]-[300,300]
    expect(bounds).toEqual({ minX: -10, minY: -10, maxX: 300, maxY: 300 });
  });

  it('without doc: INSERT is just a point', () => {
    const insert = makeInsert('A', 200, 200);
    const line = makeLine(-10, -10, 0, 0);

    const bounds = computeEntitiesBounds([line, insert]);
    // Line: [-10,-10]-[0,0], Insert point: [200,200]
    expect(bounds).toEqual({ minX: -10, minY: -10, maxX: 200, maxY: 200 });
  });
});
