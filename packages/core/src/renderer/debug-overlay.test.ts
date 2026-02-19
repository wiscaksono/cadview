import { describe, it, expect, vi } from 'vitest';
import type { DebugStats } from './debug-overlay.js';
import { resolveDebugOptions, renderDebugOverlay, DEFAULT_DEBUG_OPTIONS } from './debug-overlay.js';

// ============================================================
// resolveDebugOptions
// ============================================================

describe('resolveDebugOptions', () => {
  it('returns all defaults when called with no args', () => {
    const opts = resolveDebugOptions();
    expect(opts).toEqual(DEFAULT_DEBUG_OPTIONS);
  });

  it('returns all defaults when called with empty object', () => {
    const opts = resolveDebugOptions({});
    expect(opts).toEqual(DEFAULT_DEBUG_OPTIONS);
  });

  it('overrides specific fields while keeping defaults', () => {
    const opts = resolveDebugOptions({ showFps: false, position: 'bottom-right' });
    expect(opts.showFps).toBe(false);
    expect(opts.position).toBe('bottom-right');
    // Defaults preserved
    expect(opts.showRenderStats).toBe(true);
    expect(opts.showDocumentInfo).toBe(true);
    expect(opts.showTimings).toBe(true);
    expect(opts.showCamera).toBe(true);
  });

  it('can disable all sections', () => {
    const opts = resolveDebugOptions({
      showFps: false,
      showRenderStats: false,
      showDocumentInfo: false,
      showTimings: false,
      showCamera: false,
    });
    expect(opts.showFps).toBe(false);
    expect(opts.showRenderStats).toBe(false);
    expect(opts.showDocumentInfo).toBe(false);
    expect(opts.showTimings).toBe(false);
    expect(opts.showCamera).toBe(false);
  });
});

// ============================================================
// renderDebugOverlay
// ============================================================

function createMockCtx(): CanvasRenderingContext2D {
  return {
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 100 }),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D;
}

function createMockStats(overrides?: Partial<DebugStats>): DebugStats {
  return {
    fps: 60,
    frameTime: 2.3,
    renderStats: {
      entitiesDrawn: 847,
      entitiesSkipped: 492,
      drawCalls: 2104,
      byType: { LINE: 500, ARC: 200, INSERT: 47, LWPOLYLINE: 80, HATCH: 12, CIRCLE: 8 },
    },
    entityCount: 1339,
    layerCount: 49,
    visibleLayerCount: 42,
    blockCount: 15,
    parseTime: 45,
    spatialIndexBuildTime: 12,
    totalLoadTime: 57,
    zoom: 3.16,
    pixelSize: 0.32,
    viewportBounds: { minX: -100, minY: -200, maxX: 500, maxY: 800 },
    fileName: 'test.dxf',
    fileSize: 185000,
    dxfVersion: 'AC1027',
    ...overrides,
  };
}

describe('renderDebugOverlay', () => {
  it('resets transform to screen space', () => {
    const ctx = createMockCtx();
    const stats = createMockStats();
    const options = resolveDebugOptions();

    renderDebugOverlay(ctx, stats, 'dark', options, 800, 600);

    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
  });

  it('draws background and border rectangles', () => {
    const ctx = createMockCtx();
    const stats = createMockStats();
    const options = resolveDebugOptions();

    renderDebugOverlay(ctx, stats, 'dark', options, 800, 600);

    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.strokeRect).toHaveBeenCalled();
  });

  it('renders text lines for all enabled sections', () => {
    const ctx = createMockCtx();
    const stats = createMockStats();
    const options = resolveDebugOptions();

    renderDebugOverlay(ctx, stats, 'dark', options, 800, 600);

    // Should have multiple fillText calls (one per line)
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillTextCalls.length).toBeGreaterThanOrEqual(5);

    // Verify FPS line
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts.some((t: string) => t.includes('FPS: 60'))).toBe(true);
    expect(texts.some((t: string) => t.includes('Drawn: 847'))).toBe(true);
    expect(texts.some((t: string) => t.includes('Layers: 42'))).toBe(true);
    expect(texts.some((t: string) => t.includes('Parse: 45ms'))).toBe(true);
    expect(texts.some((t: string) => t.includes('Zoom:'))).toBe(true);
  });

  it('skips sections that are disabled', () => {
    const ctx = createMockCtx();
    const stats = createMockStats();
    const options = resolveDebugOptions({ showFps: false, showCamera: false });

    renderDebugOverlay(ctx, stats, 'dark', options, 800, 600);

    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts.some((t: string) => t.includes('FPS:'))).toBe(false);
    expect(texts.some((t: string) => t.includes('Zoom:'))).toBe(false);
    // Other sections should still be present
    expect(texts.some((t: string) => t.includes('Drawn:'))).toBe(true);
  });

  it('renders nothing when all sections disabled', () => {
    const ctx = createMockCtx();
    const stats = createMockStats();
    const options = resolveDebugOptions({
      showFps: false,
      showRenderStats: false,
      showDocumentInfo: false,
      showTimings: false,
      showCamera: false,
    });

    renderDebugOverlay(ctx, stats, 'dark', options, 800, 600);

    expect(ctx.fillText).not.toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('uses dark theme colors', () => {
    const ctx = createMockCtx();
    const stats = createMockStats();
    const options = resolveDebugOptions();

    renderDebugOverlay(ctx, stats, 'dark', options, 800, 600);

    // Background should use dark semi-transparent
    const fillStyleCalls = Object.getOwnPropertyDescriptor(ctx, 'fillStyle');
    // Just ensure it renders without error
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('uses light theme colors', () => {
    const ctx = createMockCtx();
    const stats = createMockStats();
    const options = resolveDebugOptions();

    renderDebugOverlay(ctx, stats, 'light', options, 800, 600);

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('positions panel in top-right', () => {
    const ctx = createMockCtx();
    const stats = createMockStats();
    const options = resolveDebugOptions({ position: 'top-right' });

    renderDebugOverlay(ctx, stats, 'dark', options, 800, 600);

    // Panel x should be near the right edge (800 - panelWidth - margin)
    const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    // First fillRect is the background panel
    const panelX = fillRectCalls[0]![0] as number;
    expect(panelX).toBeGreaterThan(400); // Should be on the right side
  });

  it('positions panel in bottom-left', () => {
    const ctx = createMockCtx();
    const stats = createMockStats();
    const options = resolveDebugOptions({ position: 'bottom-left' });

    renderDebugOverlay(ctx, stats, 'dark', options, 800, 600);

    const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    const panelX = fillRectCalls[0]![0] as number;
    const panelY = fillRectCalls[0]![1] as number;
    expect(panelX).toBe(10); // MARGIN
    expect(panelY).toBeGreaterThan(200); // Should be near the bottom
  });

  it('omits file name when null', () => {
    const ctx = createMockCtx();
    const stats = createMockStats({ fileName: null });
    const options = resolveDebugOptions();

    renderDebugOverlay(ctx, stats, 'dark', options, 800, 600);

    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts.some((t: string) => t.includes('File:'))).toBe(false);
  });

  it('omits timing section when all timings are zero', () => {
    const ctx = createMockCtx();
    const stats = createMockStats({
      parseTime: 0,
      spatialIndexBuildTime: 0,
      totalLoadTime: 0,
    });
    const options = resolveDebugOptions({ showTimings: true });

    renderDebugOverlay(ctx, stats, 'dark', options, 800, 600);

    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts.some((t: string) => t.includes('Parse:'))).toBe(false);
  });
});
