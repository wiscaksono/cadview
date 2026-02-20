import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  DxfLineEntity,
  DxfArcEntity,
  DxfCircleEntity,
  DxfLwPolylineEntity,
  DxfPolylineEntity,
  DxfEllipseEntity,
  DxfSplineEntity,
} from '../../parser/types.js';
import {
  isBatchableStroke,
  appendLinePath,
  appendArcPath,
  appendCirclePath,
  appendLwPolylinePath,
  appendPolylinePath,
  appendEllipsePath,
  appendSplinePath,
  appendStrokePath,
} from './batch-path.js';

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

function mockCtx() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

// ─── isBatchableStroke ──────────────────────────────────────────────

describe('isBatchableStroke', () => {
  it('returns true for all 7 batchable stroke-only types', () => {
    for (const type of ['LINE', 'ARC', 'CIRCLE', 'LWPOLYLINE', 'POLYLINE', 'ELLIPSE', 'SPLINE']) {
      expect(isBatchableStroke(type)).toBe(true);
    }
  });

  it('returns false for non-batchable types', () => {
    for (const type of ['TEXT', 'MTEXT', 'INSERT', 'DIMENSION', 'HATCH', 'POINT']) {
      expect(isBatchableStroke(type)).toBe(false);
    }
  });

  it('returns false for unknown types', () => {
    expect(isBatchableStroke('UNKNOWN')).toBe(false);
    expect(isBatchableStroke('')).toBe(false);
  });
});

// ─── appendLinePath ─────────────────────────────────────────────────

describe('appendLinePath', () => {
  it('calls moveTo then lineTo without beginPath or stroke', () => {
    const ctx = mockCtx();
    const entity: DxfLineEntity = {
      ...BASE_ENTITY,
      type: 'LINE',
      start: { x: 1, y: 2, z: 0 },
      end: { x: 3, y: 4, z: 0 },
    };

    appendLinePath(ctx, entity);

    expect(ctx.moveTo).toHaveBeenCalledWith(1, 2);
    expect(ctx.lineTo).toHaveBeenCalledWith(3, 4);
    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });
});

// ─── appendArcPath ──────────────────────────────────────────────────

describe('appendArcPath', () => {
  it('calls moveTo to arc start then arc, without beginPath or stroke', () => {
    const ctx = mockCtx();
    const entity: DxfArcEntity = {
      ...BASE_ENTITY,
      type: 'ARC',
      center: { x: 0, y: 0, z: 0 },
      radius: 10,
      startAngle: 0,
      endAngle: 90,
    };

    appendArcPath(ctx, entity);

    // moveTo should be at arc start: (cx + r*cos(0), cy + r*sin(0)) = (10, 0)
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 0);
    expect(ctx.arc).toHaveBeenCalledWith(0, 0, 10, 0, Math.PI / 2, false);
    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('computes correct moveTo for non-zero start angle', () => {
    const ctx = mockCtx();
    const entity: DxfArcEntity = {
      ...BASE_ENTITY,
      type: 'ARC',
      center: { x: 5, y: 5, z: 0 },
      radius: 10,
      startAngle: 90,
      endAngle: 180,
    };

    appendArcPath(ctx, entity);

    const startRad = Math.PI / 2;
    expect(ctx.moveTo).toHaveBeenCalledWith(
      5 + 10 * Math.cos(startRad),
      5 + 10 * Math.sin(startRad),
    );
  });

  it('skips if radius <= 0', () => {
    const ctx = mockCtx();
    const entity: DxfArcEntity = {
      ...BASE_ENTITY,
      type: 'ARC',
      center: { x: 0, y: 0, z: 0 },
      radius: 0,
      startAngle: 0,
      endAngle: 90,
    };

    appendArcPath(ctx, entity);

    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });
});

// ─── appendCirclePath ───────────────────────────────────────────────

describe('appendCirclePath', () => {
  it('calls moveTo to (cx+r, cy) then full arc', () => {
    const ctx = mockCtx();
    const entity: DxfCircleEntity = {
      ...BASE_ENTITY,
      type: 'CIRCLE',
      center: { x: 5, y: 10, z: 0 },
      radius: 3,
    };

    appendCirclePath(ctx, entity);

    expect(ctx.moveTo).toHaveBeenCalledWith(8, 10); // 5 + 3 = 8
    expect(ctx.arc).toHaveBeenCalledWith(5, 10, 3, 0, Math.PI * 2);
    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('skips if radius <= 0', () => {
    const ctx = mockCtx();
    const entity: DxfCircleEntity = {
      ...BASE_ENTITY,
      type: 'CIRCLE',
      center: { x: 0, y: 0, z: 0 },
      radius: -1,
    };

    appendCirclePath(ctx, entity);

    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });
});

// ─── appendLwPolylinePath ───────────────────────────────────────────

describe('appendLwPolylinePath', () => {
  it('renders straight segments with moveTo + lineTo', () => {
    const ctx = mockCtx();
    const entity: DxfLwPolylineEntity = {
      ...BASE_ENTITY,
      type: 'LWPOLYLINE',
      closed: false,
      constantWidth: 0,
      elevation: 0,
      vertices: [
        { x: 0, y: 0, bulge: 0, startWidth: 0, endWidth: 0 },
        { x: 10, y: 0, bulge: 0, startWidth: 0, endWidth: 0 },
        { x: 10, y: 10, bulge: 0, startWidth: 0, endWidth: 0 },
      ],
    };

    appendLwPolylinePath(ctx, entity);

    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.lineTo).toHaveBeenCalledTimes(2);
    expect(ctx.lineTo).toHaveBeenCalledWith(10, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(10, 10);
    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('skips if fewer than 2 vertices', () => {
    const ctx = mockCtx();
    const entity: DxfLwPolylineEntity = {
      ...BASE_ENTITY,
      type: 'LWPOLYLINE',
      closed: false,
      constantWidth: 0,
      elevation: 0,
      vertices: [{ x: 0, y: 0, bulge: 0, startWidth: 0, endWidth: 0 }],
    };

    appendLwPolylinePath(ctx, entity);

    expect(ctx.moveTo).not.toHaveBeenCalled();
  });

  it('handles closed polyline (extra segment back to first vertex)', () => {
    const ctx = mockCtx();
    const entity: DxfLwPolylineEntity = {
      ...BASE_ENTITY,
      type: 'LWPOLYLINE',
      closed: true,
      constantWidth: 0,
      elevation: 0,
      vertices: [
        { x: 0, y: 0, bulge: 0, startWidth: 0, endWidth: 0 },
        { x: 10, y: 0, bulge: 0, startWidth: 0, endWidth: 0 },
        { x: 10, y: 10, bulge: 0, startWidth: 0, endWidth: 0 },
      ],
    };

    appendLwPolylinePath(ctx, entity);

    // 3 segments for closed triangle (0→1, 1→2, 2→0)
    expect(ctx.lineTo).toHaveBeenCalledTimes(3);
  });

  it('uses arc for bulge segments', () => {
    const ctx = mockCtx();
    const entity: DxfLwPolylineEntity = {
      ...BASE_ENTITY,
      type: 'LWPOLYLINE',
      closed: false,
      constantWidth: 0,
      elevation: 0,
      vertices: [
        { x: 0, y: 0, bulge: 1, startWidth: 0, endWidth: 0 },
        { x: 10, y: 0, bulge: 0, startWidth: 0, endWidth: 0 },
      ],
    };

    appendLwPolylinePath(ctx, entity);

    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    // bulge=1 produces an arc call
    expect(ctx.arc).toHaveBeenCalled();
  });
});

// ─── appendPolylinePath ─────────────────────────────────────────────

describe('appendPolylinePath', () => {
  it('renders straight segments', () => {
    const ctx = mockCtx();
    const entity: DxfPolylineEntity = {
      ...BASE_ENTITY,
      type: 'POLYLINE',
      closed: false,
      is3d: false,
      vertices: [
        { x: 0, y: 0, bulge: 0, startWidth: 0, endWidth: 0 },
        { x: 5, y: 5, bulge: 0, startWidth: 0, endWidth: 0 },
      ],
    };

    appendPolylinePath(ctx, entity);

    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(5, 5);
    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('skips if fewer than 2 vertices', () => {
    const ctx = mockCtx();
    const entity: DxfPolylineEntity = {
      ...BASE_ENTITY,
      type: 'POLYLINE',
      closed: false,
      is3d: false,
      vertices: [],
    };

    appendPolylinePath(ctx, entity);

    expect(ctx.moveTo).not.toHaveBeenCalled();
  });
});

// ─── appendEllipsePath ──────────────────────────────────────────────

describe('appendEllipsePath', () => {
  it('calls moveTo to ellipse start then ellipse, without beginPath or stroke', () => {
    const ctx = mockCtx();
    const entity: DxfEllipseEntity = {
      ...BASE_ENTITY,
      type: 'ELLIPSE',
      center: { x: 0, y: 0, z: 0 },
      majorAxis: { x: 10, y: 0, z: 0 },
      minorRatio: 0.5,
      startParam: 0,
      endParam: Math.PI * 2,
    };

    appendEllipsePath(ctx, entity);

    // Major axis along X: rotation=0, majorLength=10, minorLength=5
    // Start at param=0: moveTo(0 + 10*1*1 - 5*0*0, 0 + 10*0*1 + 5*1*0) = (10, 0)
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 0);
    expect(ctx.ellipse).toHaveBeenCalledWith(0, 0, 10, 5, 0, 0, Math.PI * 2, false);
    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('skips if major axis is degenerate', () => {
    const ctx = mockCtx();
    const entity: DxfEllipseEntity = {
      ...BASE_ENTITY,
      type: 'ELLIPSE',
      center: { x: 0, y: 0, z: 0 },
      majorAxis: { x: 0, y: 0, z: 0 },
      minorRatio: 0.5,
      startParam: 0,
      endParam: Math.PI * 2,
    };

    appendEllipsePath(ctx, entity);

    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.ellipse).not.toHaveBeenCalled();
  });

  it('skips if minorRatio <= 0', () => {
    const ctx = mockCtx();
    const entity: DxfEllipseEntity = {
      ...BASE_ENTITY,
      type: 'ELLIPSE',
      center: { x: 0, y: 0, z: 0 },
      majorAxis: { x: 10, y: 0, z: 0 },
      minorRatio: 0,
      startParam: 0,
      endParam: Math.PI * 2,
    };

    appendEllipsePath(ctx, entity);

    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.ellipse).not.toHaveBeenCalled();
  });
});

// ─── appendSplinePath ───────────────────────────────────────────────

describe('appendSplinePath', () => {
  it('renders evaluated points as moveTo + lineTo sequence', () => {
    const ctx = mockCtx();
    // A simple degree-1 spline (piecewise linear) with 3 control points
    const entity: DxfSplineEntity = {
      ...BASE_ENTITY,
      type: 'SPLINE',
      flags: 0,
      degree: 1,
      controlPoints: [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 10, z: 0 },
        { x: 20, y: 0, z: 0 },
      ],
      knots: [0, 0, 0.5, 1, 1],
      fitPoints: [],
      weights: [],
    };

    appendSplinePath(ctx, entity, 1);

    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.beginPath).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('calls closePath for closed splines (flags & 1)', () => {
    const ctx = mockCtx();
    const entity: DxfSplineEntity = {
      ...BASE_ENTITY,
      type: 'SPLINE',
      flags: 1, // closed
      degree: 1,
      controlPoints: [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 10, z: 0 },
        { x: 20, y: 0, z: 0 },
      ],
      knots: [0, 0, 0.5, 1, 1],
      fitPoints: [],
      weights: [],
    };

    appendSplinePath(ctx, entity, 1);

    expect(ctx.closePath).toHaveBeenCalled();
  });
});

// ─── appendStrokePath (dispatcher) ──────────────────────────────────

describe('appendStrokePath', () => {
  it('dispatches LINE to appendLinePath', () => {
    const ctx = mockCtx();
    const entity = {
      ...BASE_ENTITY,
      type: 'LINE' as const,
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 1, z: 0 },
    };

    appendStrokePath(ctx, entity, 1);

    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(1, 1);
  });

  it('dispatches ARC to appendArcPath', () => {
    const ctx = mockCtx();
    const entity = {
      ...BASE_ENTITY,
      type: 'ARC' as const,
      center: { x: 0, y: 0, z: 0 },
      radius: 5,
      startAngle: 0,
      endAngle: 90,
    };

    appendStrokePath(ctx, entity, 1);

    expect(ctx.moveTo).toHaveBeenCalledWith(5, 0);
    expect(ctx.arc).toHaveBeenCalled();
  });

  it('dispatches CIRCLE to appendCirclePath', () => {
    const ctx = mockCtx();
    const entity = {
      ...BASE_ENTITY,
      type: 'CIRCLE' as const,
      center: { x: 0, y: 0, z: 0 },
      radius: 5,
    };

    appendStrokePath(ctx, entity, 1);

    expect(ctx.moveTo).toHaveBeenCalledWith(5, 0);
    expect(ctx.arc).toHaveBeenCalled();
  });

  it('dispatches ELLIPSE to appendEllipsePath', () => {
    const ctx = mockCtx();
    const entity = {
      ...BASE_ENTITY,
      type: 'ELLIPSE' as const,
      center: { x: 0, y: 0, z: 0 },
      majorAxis: { x: 10, y: 0, z: 0 },
      minorRatio: 0.5,
      startParam: 0,
      endParam: Math.PI * 2,
    };

    appendStrokePath(ctx, entity, 1);

    expect(ctx.ellipse).toHaveBeenCalled();
  });

  it('does nothing for non-batchable types', () => {
    const ctx = mockCtx();
    // TEXT is not batchable — appendStrokePath should be a no-op
    const entity = {
      ...BASE_ENTITY,
      type: 'TEXT' as const,
      insertionPoint: { x: 0, y: 0, z: 0 },
      height: 1,
      text: 'hello',
      rotation: 0,
      hAlign: 0,
      vAlign: 0,
    };

    appendStrokePath(ctx, entity as any, 1);

    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.lineTo).not.toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.ellipse).not.toHaveBeenCalled();
  });
});

// ─── Key invariant: no beginPath or stroke in any append function ───

describe('batch invariant: no beginPath/stroke calls', () => {
  const entities = [
    {
      name: 'LINE',
      entity: { ...BASE_ENTITY, type: 'LINE' as const, start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 1, z: 0 } },
    },
    {
      name: 'ARC',
      entity: { ...BASE_ENTITY, type: 'ARC' as const, center: { x: 0, y: 0, z: 0 }, radius: 5, startAngle: 0, endAngle: 90 },
    },
    {
      name: 'CIRCLE',
      entity: { ...BASE_ENTITY, type: 'CIRCLE' as const, center: { x: 0, y: 0, z: 0 }, radius: 5 },
    },
    {
      name: 'LWPOLYLINE',
      entity: {
        ...BASE_ENTITY, type: 'LWPOLYLINE' as const, closed: false, constantWidth: 0, elevation: 0,
        vertices: [{ x: 0, y: 0, bulge: 0, startWidth: 0, endWidth: 0 }, { x: 1, y: 1, bulge: 0, startWidth: 0, endWidth: 0 }],
      },
    },
    {
      name: 'POLYLINE',
      entity: {
        ...BASE_ENTITY, type: 'POLYLINE' as const, closed: false, is3d: false,
        vertices: [{ x: 0, y: 0, bulge: 0, startWidth: 0, endWidth: 0 }, { x: 1, y: 1, bulge: 0, startWidth: 0, endWidth: 0 }],
      },
    },
    {
      name: 'ELLIPSE',
      entity: {
        ...BASE_ENTITY, type: 'ELLIPSE' as const, center: { x: 0, y: 0, z: 0 },
        majorAxis: { x: 10, y: 0, z: 0 }, minorRatio: 0.5, startParam: 0, endParam: Math.PI * 2,
      },
    },
  ];

  for (const { name, entity } of entities) {
    it(`${name}: never calls beginPath or stroke`, () => {
      const ctx = mockCtx();
      appendStrokePath(ctx, entity as any, 1);
      expect(ctx.beginPath).not.toHaveBeenCalled();
      expect(ctx.stroke).not.toHaveBeenCalled();
    });
  }
});
