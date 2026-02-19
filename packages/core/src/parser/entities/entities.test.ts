import { describe, it, expect } from 'vitest';
import { parseLwPolyline } from './lwpolyline.js';
import { parseText } from './text.js';
import { parseMText } from './mtext.js';
import { parseInsert } from './insert.js';
import { parseHatch } from './hatch.js';
import type { DxfToken } from '../tokenizer.js';

describe('parseLwPolyline', () => {
  it('parses vertices from sequential code 10/20 pairs', () => {
    const tags: DxfToken[] = [
      { code: 10, value: '0' },
      { code: 20, value: '0' },
      { code: 10, value: '10' },
      { code: 20, value: '0' },
      { code: 10, value: '10' },
      { code: 20, value: '10' },
    ];
    const entity = parseLwPolyline(tags);
    expect(entity.type).toBe('LWPOLYLINE');
    expect(entity.vertices).toHaveLength(3);
    expect(entity.vertices[0]).toEqual({ x: 0, y: 0, bulge: 0, startWidth: 0, endWidth: 0 });
    expect(entity.vertices[2]).toEqual({ x: 10, y: 10, bulge: 0, startWidth: 0, endWidth: 0 });
  });

  it('parses closed flag (code 70, bit 1)', () => {
    const tags: DxfToken[] = [
      { code: 70, value: '1' },
      { code: 10, value: '0' }, { code: 20, value: '0' },
    ];
    expect(parseLwPolyline(tags).closed).toBe(true);
  });

  it('parses open polyline (code 70 = 0)', () => {
    const tags: DxfToken[] = [
      { code: 70, value: '0' },
      { code: 10, value: '0' }, { code: 20, value: '0' },
    ];
    expect(parseLwPolyline(tags).closed).toBe(false);
  });

  it('parses elevation (code 38)', () => {
    const tags: DxfToken[] = [
      { code: 38, value: '5.5' },
      { code: 10, value: '0' }, { code: 20, value: '0' },
    ];
    expect(parseLwPolyline(tags).elevation).toBe(5.5);
  });

  it('parses constant width (code 43)', () => {
    const tags: DxfToken[] = [
      { code: 43, value: '0.25' },
      { code: 10, value: '0' }, { code: 20, value: '0' },
    ];
    expect(parseLwPolyline(tags).constantWidth).toBe(0.25);
  });

  it('parses per-vertex bulge, startWidth, endWidth', () => {
    const tags: DxfToken[] = [
      { code: 10, value: '0' },
      { code: 20, value: '0' },
      { code: 40, value: '0.1' },
      { code: 41, value: '0.2' },
      { code: 42, value: '0.5' },
    ];
    const entity = parseLwPolyline(tags);
    expect(entity.vertices[0]!.startWidth).toBe(0.1);
    expect(entity.vertices[0]!.endWidth).toBe(0.2);
    expect(entity.vertices[0]!.bulge).toBe(0.5);
  });

  it('returns empty vertices when no code 10 present', () => {
    const entity = parseLwPolyline([{ code: 70, value: '0' }]);
    expect(entity.vertices).toHaveLength(0);
  });
});

describe('parseText', () => {
  it('parses text content and insertion point', () => {
    const tags: DxfToken[] = [
      { code: 1, value: 'Hello World' },
      { code: 10, value: '5' },
      { code: 20, value: '10' },
      { code: 30, value: '0' },
      { code: 40, value: '2.5' },
    ];
    const entity = parseText(tags);
    expect(entity.type).toBe('TEXT');
    expect(entity.text).toBe('Hello World');
    expect(entity.insertionPoint).toEqual({ x: 5, y: 10, z: 0 });
    expect(entity.height).toBe(2.5);
  });

  it('parses alignment point (codes 11/21/31)', () => {
    const tags: DxfToken[] = [
      { code: 1, value: 'Aligned' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 11, value: '10' }, { code: 21, value: '20' }, { code: 31, value: '5' },
      { code: 40, value: '1' },
    ];
    const entity = parseText(tags);
    expect(entity.alignmentPoint).toEqual({ x: 10, y: 20, z: 5 });
  });

  it('has no alignment point when codes 11/21/31 are absent', () => {
    const tags: DxfToken[] = [
      { code: 1, value: 'Simple' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 40, value: '1' },
    ];
    const entity = parseText(tags);
    expect(entity.alignmentPoint).toBeUndefined();
  });

  it('parses rotation, widthFactor, obliqueAngle', () => {
    const tags: DxfToken[] = [
      { code: 1, value: 'Rotated' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 40, value: '1' },
      { code: 50, value: '45' },
      { code: 41, value: '0.8' },
      { code: 51, value: '15' },
    ];
    const entity = parseText(tags);
    expect(entity.rotation).toBe(45);
    expect(entity.widthFactor).toBe(0.8);
    expect(entity.obliqueAngle).toBe(15);
  });

  it('parses style, hAlign, vAlign, generationFlags', () => {
    const tags: DxfToken[] = [
      { code: 1, value: 'Styled' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 40, value: '1' },
      { code: 7, value: 'ARIAL' },
      { code: 72, value: '1' },
      { code: 73, value: '2' },
      { code: 71, value: '6' },
    ];
    const entity = parseText(tags);
    expect(entity.style).toBe('ARIAL');
    expect(entity.hAlign).toBe(1);
    expect(entity.vAlign).toBe(2);
    expect(entity.generationFlags).toBe(6);
  });

  it('uses defaults for omitted properties', () => {
    const entity = parseText([]);
    expect(entity.text).toBe('');
    expect(entity.height).toBe(1);
    expect(entity.rotation).toBe(0);
    expect(entity.widthFactor).toBe(1);
    expect(entity.obliqueAngle).toBe(0);
    expect(entity.style).toBe('STANDARD');
    expect(entity.hAlign).toBe(0);
    expect(entity.vAlign).toBe(0);
  });
});

describe('parseMText', () => {
  it('concatenates code 3 + code 1 chunks for long text', () => {
    const tags: DxfToken[] = [
      { code: 3, value: 'Hello ' },
      { code: 3, value: 'World ' },
      { code: 1, value: 'End' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 40, value: '1' },
    ];
    const entity = parseMText(tags);
    expect(entity.type).toBe('MTEXT');
    expect(entity.text).toBe('Hello World End');
  });

  it('handles text with only code 1 (short text)', () => {
    const tags: DxfToken[] = [
      { code: 1, value: 'Short' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 40, value: '1' },
    ];
    const entity = parseMText(tags);
    expect(entity.text).toBe('Short');
  });

  it('parses text direction (codes 11/21/31)', () => {
    const tags: DxfToken[] = [
      { code: 1, value: 'Dir' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 11, value: '1' }, { code: 21, value: '0' }, { code: 31, value: '0' },
      { code: 40, value: '1' },
    ];
    const entity = parseMText(tags);
    expect(entity.textDirection).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('parses width, attachmentPoint, drawingDirection', () => {
    const tags: DxfToken[] = [
      { code: 1, value: 'Test' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 40, value: '2' },
      { code: 41, value: '100' },
      { code: 71, value: '5' },
      { code: 72, value: '3' },
    ];
    const entity = parseMText(tags);
    expect(entity.height).toBe(2);
    expect(entity.width).toBe(100);
    expect(entity.attachmentPoint).toBe(5);
    expect(entity.drawingDirection).toBe(3);
  });

  it('parses line spacing and background fill', () => {
    const tags: DxfToken[] = [
      { code: 1, value: 'Test' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 40, value: '1' },
      { code: 73, value: '2' },
      { code: 44, value: '1.5' },
      { code: 90, value: '1' },
    ];
    const entity = parseMText(tags);
    expect(entity.lineSpacingStyle).toBe(2);
    expect(entity.lineSpacingFactor).toBe(1.5);
    expect(entity.bgFill).toBe(1);
  });

  it('uses defaults for omitted properties', () => {
    const entity = parseMText([]);
    expect(entity.text).toBe('');
    expect(entity.height).toBe(1);
    expect(entity.width).toBe(0);
    expect(entity.attachmentPoint).toBe(1);
    expect(entity.drawingDirection).toBe(1);
    expect(entity.style).toBe('STANDARD');
    expect(entity.bgFill).toBe(0);
    expect(entity.bgFillScale).toBe(1.5);
  });
});

describe('parseInsert', () => {
  it('parses block name and insertion point', () => {
    const tags: DxfToken[] = [
      { code: 2, value: 'MyBlock' },
      { code: 10, value: '10' },
      { code: 20, value: '20' },
      { code: 30, value: '5' },
    ];
    const entity = parseInsert(tags);
    expect(entity.type).toBe('INSERT');
    expect(entity.blockName).toBe('MyBlock');
    expect(entity.insertionPoint).toEqual({ x: 10, y: 20, z: 5 });
  });

  it('parses scale factors', () => {
    const tags: DxfToken[] = [
      { code: 2, value: 'Block' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 41, value: '2' },
      { code: 42, value: '3' },
      { code: 43, value: '4' },
    ];
    const entity = parseInsert(tags);
    expect(entity.scaleX).toBe(2);
    expect(entity.scaleY).toBe(3);
    expect(entity.scaleZ).toBe(4);
  });

  it('parses rotation and column/row array', () => {
    const tags: DxfToken[] = [
      { code: 2, value: 'Block' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 50, value: '90' },
      { code: 70, value: '3' },
      { code: 71, value: '2' },
      { code: 44, value: '10' },
      { code: 45, value: '15' },
    ];
    const entity = parseInsert(tags);
    expect(entity.rotation).toBe(90);
    expect(entity.columnCount).toBe(3);
    expect(entity.rowCount).toBe(2);
    expect(entity.columnSpacing).toBe(10);
    expect(entity.rowSpacing).toBe(15);
  });

  it('uses default scale of 1 and count of 1', () => {
    const entity = parseInsert([{ code: 2, value: 'Block' }]);
    expect(entity.scaleX).toBe(1);
    expect(entity.scaleY).toBe(1);
    expect(entity.scaleZ).toBe(1);
    expect(entity.columnCount).toBe(1);
    expect(entity.rowCount).toBe(1);
  });

  it('initializes empty attribs array', () => {
    const entity = parseInsert([{ code: 2, value: 'Block' }]);
    expect(entity.attribs).toEqual([]);
  });
});

describe('parseHatch', () => {
  it('parses basic hatch properties', () => {
    const tags: DxfToken[] = [
      { code: 2, value: 'SOLID' },
      { code: 70, value: '1' },
      { code: 71, value: '0' },
      { code: 75, value: '0' },
      { code: 76, value: '1' },
      { code: 41, value: '1.0' },
      { code: 52, value: '0' },
    ];
    const entity = parseHatch(tags);
    expect(entity.type).toBe('HATCH');
    expect(entity.patternName).toBe('SOLID');
    expect(entity.solidFill).toBe(true);
    expect(entity.associative).toBe(false);
    expect(entity.hatchStyle).toBe(0);
    expect(entity.patternType).toBe(1);
  });

  it('parses non-solid fill', () => {
    const tags: DxfToken[] = [
      { code: 2, value: 'ANSI31' },
      { code: 70, value: '0' },
      { code: 41, value: '2.0' },
      { code: 52, value: '45' },
    ];
    const entity = parseHatch(tags);
    expect(entity.solidFill).toBe(false);
    expect(entity.patternScale).toBe(2);
    expect(entity.patternAngle).toBe(45);
  });

  it('parses polyline boundary path', () => {
    const tags: DxfToken[] = [
      { code: 2, value: 'SOLID' },
      { code: 70, value: '1' },
      { code: 91, value: '1' },    // 1 boundary path
      { code: 92, value: '2' },    // polyline type (flag & 2)
      { code: 72, value: '0' },    // has bulge = false
      { code: 73, value: '1' },    // is closed
      { code: 93, value: '3' },    // 3 vertices
      { code: 10, value: '0' }, { code: 20, value: '0' },
      { code: 10, value: '10' }, { code: 20, value: '0' },
      { code: 10, value: '10' }, { code: 20, value: '10' },
    ];
    const entity = parseHatch(tags);
    expect(entity.boundaryPaths).toHaveLength(1);
    const path = entity.boundaryPaths[0]!;
    expect(path.type).toBe('polyline');
    expect(path.isClosed).toBe(true);
    expect(path.vertices).toHaveLength(3);
    expect(path.vertices![0]).toEqual({ x: 0, y: 0 });
    expect(path.vertices![2]).toEqual({ x: 10, y: 10 });
  });

  it('parses edge boundary path with line edges', () => {
    const tags: DxfToken[] = [
      { code: 2, value: 'SOLID' },
      { code: 70, value: '1' },
      { code: 91, value: '1' },    // 1 boundary path
      { code: 92, value: '0' },    // edge type (not polyline)
      { code: 93, value: '2' },    // 2 edges
      { code: 72, value: '1' },    // line edge
      { code: 10, value: '0' }, { code: 20, value: '0' },
      { code: 11, value: '10' }, { code: 21, value: '0' },
      { code: 72, value: '1' },    // line edge
      { code: 10, value: '10' }, { code: 20, value: '0' },
      { code: 11, value: '10' }, { code: 21, value: '10' },
    ];
    const entity = parseHatch(tags);
    expect(entity.boundaryPaths).toHaveLength(1);
    const path = entity.boundaryPaths[0]!;
    expect(path.type).toBe('edges');
    expect(path.edges).toHaveLength(2);
    const edge1 = path.edges![0]!;
    expect(edge1.type).toBe('line');
    if (edge1.type === 'line') {
      expect(edge1.start).toEqual({ x: 0, y: 0 });
      expect(edge1.end).toEqual({ x: 10, y: 0 });
    }
  });

  it('parses edge boundary path with arc edge', () => {
    const tags: DxfToken[] = [
      { code: 2, value: 'SOLID' },
      { code: 70, value: '1' },
      { code: 91, value: '1' },
      { code: 92, value: '0' },
      { code: 93, value: '1' },
      { code: 72, value: '2' },    // arc edge
      { code: 10, value: '5' }, { code: 20, value: '5' },
      { code: 40, value: '10' },
      { code: 50, value: '0' },
      { code: 51, value: '180' },
      { code: 73, value: '1' },
    ];
    const entity = parseHatch(tags);
    const edge = entity.boundaryPaths[0]!.edges![0]!;
    expect(edge.type).toBe('arc');
    if (edge.type === 'arc') {
      expect(edge.center).toEqual({ x: 5, y: 5 });
      expect(edge.radius).toBe(10);
      expect(edge.startAngle).toBe(0);
      expect(edge.endAngle).toBe(180);
      expect(edge.ccw).toBe(true);
    }
  });

  it('parses multiple boundary paths', () => {
    const tags: DxfToken[] = [
      { code: 2, value: 'SOLID' },
      { code: 70, value: '1' },
      { code: 91, value: '2' },    // 2 boundary paths
      // Path 1: polyline
      { code: 92, value: '2' },
      { code: 72, value: '0' },
      { code: 73, value: '1' },
      { code: 93, value: '2' },
      { code: 10, value: '0' }, { code: 20, value: '0' },
      { code: 10, value: '10' }, { code: 20, value: '10' },
      // Path 2: edge
      { code: 92, value: '0' },
      { code: 93, value: '1' },
      { code: 72, value: '1' },
      { code: 10, value: '0' }, { code: 20, value: '0' },
      { code: 11, value: '5' }, { code: 21, value: '5' },
    ];
    const entity = parseHatch(tags);
    expect(entity.boundaryPaths).toHaveLength(2);
    expect(entity.boundaryPaths[0]!.type).toBe('polyline');
    expect(entity.boundaryPaths[1]!.type).toBe('edges');
  });

  it('handles zero boundary paths', () => {
    const tags: DxfToken[] = [
      { code: 2, value: 'SOLID' },
      { code: 70, value: '1' },
    ];
    const entity = parseHatch(tags);
    expect(entity.boundaryPaths).toHaveLength(0);
  });
});
