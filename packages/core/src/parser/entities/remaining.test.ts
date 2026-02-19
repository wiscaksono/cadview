import { describe, it, expect } from 'vitest';
import { parseLine } from './line.js';
import { parseCircle } from './circle.js';
import { parseArc } from './arc.js';
import { parseEllipse } from './ellipse.js';
import { parseSpline } from './spline.js';
import { parseDimension } from './dimension.js';
import { parsePoint } from './point.js';
import { parsePolyline } from './polyline.js';
import type { DxfToken } from '../tokenizer.js';

// ── LINE ────────────────────────────────────────────────────────────

describe('parseLine', () => {
  it('parses start and end coordinates', () => {
    const tags: DxfToken[] = [
      { code: 10, value: '1' }, { code: 20, value: '2' }, { code: 30, value: '3' },
      { code: 11, value: '4' }, { code: 21, value: '5' }, { code: 31, value: '6' },
    ];
    const entity = parseLine(tags);
    expect(entity.type).toBe('LINE');
    expect(entity.start).toEqual({ x: 1, y: 2, z: 3 });
    expect(entity.end).toEqual({ x: 4, y: 5, z: 6 });
  });

  it('defaults to origin for both points', () => {
    const entity = parseLine([]);
    expect(entity.start).toEqual({ x: 0, y: 0, z: 0 });
    expect(entity.end).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('propagates base entity properties', () => {
    const tags: DxfToken[] = [
      { code: 8, value: 'Walls' },
      { code: 62, value: '1' },
      { code: 5, value: 'A1' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 11, value: '1' }, { code: 21, value: '1' }, { code: 31, value: '0' },
    ];
    const entity = parseLine(tags);
    expect(entity.layer).toBe('Walls');
    expect(entity.color).toBe(1);
    expect(entity.handle).toBe('A1');
  });
});

// ── CIRCLE ──────────────────────────────────────────────────────────

describe('parseCircle', () => {
  it('parses center and radius', () => {
    const tags: DxfToken[] = [
      { code: 10, value: '10' }, { code: 20, value: '20' }, { code: 30, value: '5' },
      { code: 40, value: '7.5' },
    ];
    const entity = parseCircle(tags);
    expect(entity.type).toBe('CIRCLE');
    expect(entity.center).toEqual({ x: 10, y: 20, z: 5 });
    expect(entity.radius).toBe(7.5);
  });

  it('defaults radius to 0', () => {
    const entity = parseCircle([]);
    expect(entity.radius).toBe(0);
    expect(entity.center).toEqual({ x: 0, y: 0, z: 0 });
  });
});

// ── ARC ─────────────────────────────────────────────────────────────

describe('parseArc', () => {
  it('parses center, radius, and angles', () => {
    const tags: DxfToken[] = [
      { code: 10, value: '5' }, { code: 20, value: '5' }, { code: 30, value: '0' },
      { code: 40, value: '10' },
      { code: 50, value: '45' },
      { code: 51, value: '270' },
    ];
    const entity = parseArc(tags);
    expect(entity.type).toBe('ARC');
    expect(entity.center).toEqual({ x: 5, y: 5, z: 0 });
    expect(entity.radius).toBe(10);
    expect(entity.startAngle).toBe(45);
    expect(entity.endAngle).toBe(270);
  });

  it('defaults endAngle to 360 and startAngle to 0', () => {
    const entity = parseArc([]);
    expect(entity.startAngle).toBe(0);
    expect(entity.endAngle).toBe(360);
  });

  it('handles negative angles', () => {
    const tags: DxfToken[] = [
      { code: 50, value: '-10' },
      { code: 51, value: '370' },
    ];
    const entity = parseArc(tags);
    expect(entity.startAngle).toBe(-10);
    expect(entity.endAngle).toBe(370);
  });
});

// ── ELLIPSE ─────────────────────────────────────────────────────────

describe('parseEllipse', () => {
  it('parses center, major axis, and parameters', () => {
    const tags: DxfToken[] = [
      { code: 10, value: '10' }, { code: 20, value: '20' }, { code: 30, value: '0' },
      { code: 11, value: '5' }, { code: 21, value: '0' }, { code: 31, value: '0' },
      { code: 40, value: '0.5' },
      { code: 41, value: '0' },
      { code: 42, value: '3.14159' },
    ];
    const entity = parseEllipse(tags);
    expect(entity.type).toBe('ELLIPSE');
    expect(entity.center).toEqual({ x: 10, y: 20, z: 0 });
    expect(entity.majorAxis).toEqual({ x: 5, y: 0, z: 0 });
    expect(entity.minorRatio).toBe(0.5);
    expect(entity.startParam).toBe(0);
    expect(entity.endParam).toBeCloseTo(3.14159);
  });

  it('defaults to full ellipse (endParam = 2*PI)', () => {
    const entity = parseEllipse([]);
    expect(entity.startParam).toBe(0);
    expect(entity.endParam).toBeCloseTo(Math.PI * 2);
    expect(entity.minorRatio).toBe(1);
    expect(entity.majorAxis).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('parses 3D major axis', () => {
    const tags: DxfToken[] = [
      { code: 11, value: '3' }, { code: 21, value: '4' }, { code: 31, value: '5' },
    ];
    const entity = parseEllipse(tags);
    expect(entity.majorAxis).toEqual({ x: 3, y: 4, z: 5 });
  });
});

// ── SPLINE ──────────────────────────────────────────────────────────

describe('parseSpline', () => {
  it('parses degree and flags', () => {
    const tags: DxfToken[] = [
      { code: 71, value: '3' },
      { code: 70, value: '11' },
    ];
    const entity = parseSpline(tags);
    expect(entity.type).toBe('SPLINE');
    expect(entity.degree).toBe(3);
    expect(entity.flags).toBe(11);
  });

  it('parses knots and control points', () => {
    const tags: DxfToken[] = [
      { code: 71, value: '2' },
      { code: 40, value: '0' },
      { code: 40, value: '0' },
      { code: 40, value: '1' },
      { code: 40, value: '1' },
      { code: 10, value: '0' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 10, value: '5' }, { code: 20, value: '10' }, { code: 30, value: '0' },
    ];
    const entity = parseSpline(tags);
    expect(entity.knots).toEqual([0, 0, 1, 1]);
    expect(entity.controlPoints).toHaveLength(2);
    expect(entity.controlPoints[0]).toEqual({ x: 0, y: 0, z: 0 });
    expect(entity.controlPoints[1]).toEqual({ x: 5, y: 10, z: 0 });
  });

  it('parses fit points', () => {
    const tags: DxfToken[] = [
      { code: 11, value: '0' }, { code: 21, value: '0' }, { code: 31, value: '0' },
      { code: 11, value: '5' }, { code: 21, value: '5' }, { code: 31, value: '0' },
      { code: 11, value: '10' }, { code: 21, value: '0' }, { code: 31, value: '0' },
    ];
    const entity = parseSpline(tags);
    expect(entity.fitPoints).toHaveLength(3);
    expect(entity.fitPoints[1]).toEqual({ x: 5, y: 5, z: 0 });
  });

  it('parses weights', () => {
    const tags: DxfToken[] = [
      { code: 41, value: '1.0' },
      { code: 41, value: '2.0' },
      { code: 41, value: '1.0' },
    ];
    const entity = parseSpline(tags);
    expect(entity.weights).toEqual([1, 2, 1]);
  });

  it('parses start and end tangents', () => {
    const tags: DxfToken[] = [
      { code: 12, value: '1' }, { code: 22, value: '0' }, { code: 32, value: '0' },
      { code: 13, value: '0' }, { code: 23, value: '1' }, { code: 33, value: '0' },
    ];
    const entity = parseSpline(tags);
    expect(entity.startTangent).toEqual({ x: 1, y: 0, z: 0 });
    expect(entity.endTangent).toEqual({ x: 0, y: 1, z: 0 });
  });

  it('has no tangents when codes 12/13 are absent', () => {
    const entity = parseSpline([]);
    expect(entity.startTangent).toBeUndefined();
    expect(entity.endTangent).toBeUndefined();
  });
});

// ── DIMENSION ───────────────────────────────────────────────────────

describe('parseDimension', () => {
  it('parses basic dimension properties', () => {
    const tags: DxfToken[] = [
      { code: 2, value: '*D1' },
      { code: 3, value: 'ISO-25' },
      { code: 70, value: '0' },
      { code: 1, value: '100.5' },
      { code: 10, value: '50' }, { code: 20, value: '0' }, { code: 30, value: '0' },
      { code: 11, value: '25' }, { code: 21, value: '10' }, { code: 31, value: '0' },
    ];
    const entity = parseDimension(tags);
    expect(entity.type).toBe('DIMENSION');
    expect(entity.blockName).toBe('*D1');
    expect(entity.dimStyle).toBe('ISO-25');
    expect(entity.dimType).toBe(0);
    expect(entity.textOverride).toBe('100.5');
    expect(entity.defPoint).toEqual({ x: 50, y: 0, z: 0 });
    expect(entity.textMidpoint).toEqual({ x: 25, y: 10, z: 0 });
  });

  it('parses optional definition points (defPoint2-5)', () => {
    const tags: DxfToken[] = [
      { code: 13, value: '10' }, { code: 23, value: '20' }, { code: 33, value: '0' },
      { code: 14, value: '30' }, { code: 24, value: '40' }, { code: 34, value: '0' },
      { code: 15, value: '50' }, { code: 25, value: '60' }, { code: 35, value: '0' },
      { code: 16, value: '70' }, { code: 26, value: '80' }, { code: 36, value: '0' },
    ];
    const entity = parseDimension(tags);
    expect(entity.defPoint2).toEqual({ x: 10, y: 20, z: 0 });
    expect(entity.defPoint3).toEqual({ x: 30, y: 40, z: 0 });
    expect(entity.defPoint4).toEqual({ x: 50, y: 60, z: 0 });
    expect(entity.defPoint5).toEqual({ x: 70, y: 80, z: 0 });
  });

  it('leaves defPoint2-5 undefined when not present', () => {
    const entity = parseDimension([]);
    expect(entity.defPoint2).toBeUndefined();
    expect(entity.defPoint3).toBeUndefined();
    expect(entity.defPoint4).toBeUndefined();
    expect(entity.defPoint5).toBeUndefined();
  });

  it('parses rotation, textRotation, and leaderLength', () => {
    const tags: DxfToken[] = [
      { code: 50, value: '45' },
      { code: 53, value: '90' },
      { code: 40, value: '12.5' },
    ];
    const entity = parseDimension(tags);
    expect(entity.rotation).toBe(45);
    expect(entity.textRotation).toBe(90);
    expect(entity.leaderLength).toBe(12.5);
  });

  it('uses default dimStyle of STANDARD', () => {
    const entity = parseDimension([]);
    expect(entity.dimStyle).toBe('STANDARD');
    expect(entity.textOverride).toBe('');
    expect(entity.rotation).toBe(0);
  });
});

// ── POINT ───────────────────────────────────────────────────────────

describe('parsePoint', () => {
  it('parses position', () => {
    const tags: DxfToken[] = [
      { code: 10, value: '42' }, { code: 20, value: '-10.5' }, { code: 30, value: '7' },
    ];
    const entity = parsePoint(tags);
    expect(entity.type).toBe('POINT');
    expect(entity.position).toEqual({ x: 42, y: -10.5, z: 7 });
  });

  it('defaults position to origin', () => {
    const entity = parsePoint([]);
    expect(entity.position).toEqual({ x: 0, y: 0, z: 0 });
  });
});

// ── POLYLINE ────────────────────────────────────────────────────────

describe('parsePolyline', () => {
  it('parses closed flag from bit 1 of code 70', () => {
    const tags: DxfToken[] = [{ code: 70, value: '1' }];
    const entity = parsePolyline(tags);
    expect(entity.type).toBe('POLYLINE');
    expect(entity.closed).toBe(true);
    expect(entity.is3d).toBe(false);
  });

  it('parses is3d flag from bit 8 of code 70', () => {
    const tags: DxfToken[] = [{ code: 70, value: '8' }];
    const entity = parsePolyline(tags);
    expect(entity.closed).toBe(false);
    expect(entity.is3d).toBe(true);
  });

  it('parses combined flags (closed + 3d = 9)', () => {
    const tags: DxfToken[] = [{ code: 70, value: '9' }];
    const entity = parsePolyline(tags);
    expect(entity.closed).toBe(true);
    expect(entity.is3d).toBe(true);
  });

  it('defaults to open 2D with empty vertices', () => {
    const entity = parsePolyline([]);
    expect(entity.closed).toBe(false);
    expect(entity.is3d).toBe(false);
    expect(entity.vertices).toEqual([]);
  });
});
