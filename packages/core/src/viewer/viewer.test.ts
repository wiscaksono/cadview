/**
 * Tests for CadViewer — FormatConverter integration, guardDestroyed,
 * loadGeneration (stale async), loadBuffer, loadDocument, and clearDocument.
 *
 * Because CadViewer depends on browser APIs (Canvas 2D, ResizeObserver, DOM events),
 * we mock the minimal surface required to construct and exercise it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FormatConverter } from './viewer.js';
import type { DxfDocument } from '../parser/types.js';

// ============================================================
// Browser API mocks
// ============================================================

function createMockCanvas(): HTMLCanvasElement {
  const listeners: Record<string, Function[]> = {};
  const ctx = {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    setTransform: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 100 }),
    canvas: { width: 800, height: 600 },
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    textAlign: '',
    textBaseline: '',
    setLineDash: vi.fn(),
  };

  return {
    getContext: vi.fn().mockReturnValue(ctx),
    getBoundingClientRect: vi.fn().mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }),
    addEventListener: vi.fn((type: string, cb: Function) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type]!.push(cb);
    }),
    removeEventListener: vi.fn(),
    width: 800,
    height: 600,
    clientWidth: 800,
    clientHeight: 600,
    style: { cursor: '' },
  } as unknown as HTMLCanvasElement;
}

let resizeObserverInstances: { disconnect: ReturnType<typeof vi.fn> }[] = [];

function setupGlobals() {
  // Mock window (for window.devicePixelRatio used by CanvasRenderer)
  if (typeof globalThis.window === 'undefined') {
    (globalThis as any).window = {};
  }
  (globalThis as any).window.devicePixelRatio = 1;

  // Mock ResizeObserver
  globalThis.ResizeObserver = vi.fn().mockImplementation(() => {
    const instance = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
    resizeObserverInstances.push(instance);
    return instance;
  }) as any;

  // Mock requestAnimationFrame
  globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
    // Execute synchronously for test predictability
    cb(0);
    return 0;
  }) as any;
}

function teardownGlobals() {
  resizeObserverInstances = [];
  delete (globalThis as any).ResizeObserver;
  delete (globalThis as any).requestAnimationFrame;
  // Don't delete window entirely — just clean up our additions
}

// ============================================================
// Minimal valid DXF string (produces a parseable DxfDocument)
// ============================================================

const MINIMAL_DXF = `  0
SECTION
  2
HEADER
  9
$ACADVER
  1
AC1027
  0
ENDSEC
  0
SECTION
  2
ENTITIES
  0
ENDSEC
  0
EOF
`;

// DXF with header extents so fitToView() triggers a render
const DXF_WITH_EXTENTS = `  0
SECTION
  2
HEADER
  9
$ACADVER
  1
AC1027
  9
$EXTMIN
 10
0.0
 20
0.0
  9
$EXTMAX
 10
100.0
 20
100.0
  0
ENDSEC
  0
SECTION
  2
ENTITIES
  0
LINE
  8
0
 10
0.0
 20
0.0
 11
100.0
 21
100.0
  0
ENDSEC
  0
EOF
`;

// ============================================================
// Helpers
// ============================================================

function createMinimalDxfDocument(): DxfDocument {
  return {
    header: {
      acadVersion: 'AC1027',
      insUnits: 0,
      measurement: 0,
      ltScale: 1,
    },
    layers: new Map([
      ['0', {
        name: '0',
        color: 7,
        lineType: 'Continuous',
        flags: 0,
        lineWeight: -3,
        isOff: false,
        isFrozen: false,
        isLocked: false,
        trueColor: undefined,
      }],
    ]),
    lineTypes: new Map(),
    styles: new Map(),
    blocks: new Map(),
    entities: [],
  };
}

function strToBuffer(s: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(s).buffer as ArrayBuffer;
}

// ============================================================
// Tests
// ============================================================

describe('CadViewer', () => {
  let CadViewer: typeof import('./viewer.js').CadViewer;

  beforeEach(async () => {
    setupGlobals();
    // Dynamic import so mocks are in place when the module initializes
    const mod = await import('./viewer.js');
    CadViewer = mod.CadViewer;
  });

  afterEach(() => {
    teardownGlobals();
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------
  // guardDestroyed
  // ----------------------------------------------------------

  describe('guardDestroyed', () => {
    it('throws on loadString after destroy', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      expect(() => viewer.loadString(MINIMAL_DXF)).toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });

    it('throws on loadArrayBuffer after destroy', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      expect(() => viewer.loadArrayBuffer(strToBuffer(MINIMAL_DXF))).toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });

    it('throws on loadFile after destroy', async () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      const file = new File([MINIMAL_DXF], 'test.dxf');
      await expect(viewer.loadFile(file)).rejects.toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });

    it('throws on loadBuffer after destroy', async () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      await expect(viewer.loadBuffer(strToBuffer(MINIMAL_DXF))).rejects.toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });

    it('throws on loadDocument after destroy', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      expect(() => viewer.loadDocument(createMinimalDxfDocument())).toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });

    it('throws on clearDocument after destroy', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      expect(() => viewer.clearDocument()).toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });

    it('throws on fitToView after destroy', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      expect(() => viewer.fitToView()).toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });

    it('throws on setTool after destroy', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      expect(() => viewer.setTool('select')).toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });

    it('throws on setTheme after destroy', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      expect(() => viewer.setTheme('light')).toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });

    it('throws on setLayerVisible after destroy', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      expect(() => viewer.setLayerVisible('0', false)).toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });

    it('throws on zoomTo after destroy', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      expect(() => viewer.zoomTo(2)).toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });

    it('throws on panTo after destroy', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      expect(() => viewer.panTo(0, 0)).toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });
  });

  // ----------------------------------------------------------
  // loadString / loadArrayBuffer (basic, no converters)
  // ----------------------------------------------------------

  describe('loadString', () => {
    it('loads a valid DXF string and sets the document', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.loadString(MINIMAL_DXF);

      const doc = viewer.getDocument();
      expect(doc).not.toBeNull();
      expect(doc!.header.acadVersion).toBe('AC1027');
      expect(doc!.layers.has('0')).toBe(true);

      viewer.destroy();
    });
  });

  describe('loadArrayBuffer', () => {
    it('loads a valid DXF ArrayBuffer and sets the document', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.loadArrayBuffer(strToBuffer(MINIMAL_DXF));

      const doc = viewer.getDocument();
      expect(doc).not.toBeNull();
      expect(doc!.header.acadVersion).toBe('AC1027');

      viewer.destroy();
    });
  });

  // ----------------------------------------------------------
  // loadDocument
  // ----------------------------------------------------------

  describe('loadDocument', () => {
    it('sets a pre-parsed document directly', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      const doc = createMinimalDxfDocument();
      viewer.loadDocument(doc);

      expect(viewer.getDocument()).toBe(doc);
      viewer.destroy();
    });

    it('throws for invalid document (missing entities)', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);

      expect(() => viewer.loadDocument({} as any)).toThrow(
        'CadViewer: invalid DxfDocument',
      );
      viewer.destroy();
    });

    it('throws for invalid document (entities is not array)', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);

      expect(() => viewer.loadDocument({
        entities: 'not-an-array',
        layers: new Map(),
      } as any)).toThrow('CadViewer: invalid DxfDocument');
      viewer.destroy();
    });

    it('throws for invalid document (layers is not Map)', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);

      expect(() => viewer.loadDocument({
        entities: [],
        layers: {},
      } as any)).toThrow('CadViewer: invalid DxfDocument');
      viewer.destroy();
    });
  });

  // ----------------------------------------------------------
  // clearDocument
  // ----------------------------------------------------------

  describe('clearDocument', () => {
    it('clears the loaded document', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.loadString(MINIMAL_DXF);
      expect(viewer.getDocument()).not.toBeNull();

      viewer.clearDocument();
      expect(viewer.getDocument()).toBeNull();
      expect(viewer.getEntities()).toEqual([]);

      viewer.destroy();
    });
  });

  // ----------------------------------------------------------
  // FormatConverter — loadBuffer
  // ----------------------------------------------------------

  describe('FormatConverter via loadBuffer', () => {
    it('uses matching converter to produce DXF string', async () => {
      const mockConverter: FormatConverter = {
        detect: vi.fn().mockReturnValue(true),
        convert: vi.fn().mockResolvedValue(MINIMAL_DXF),
      };

      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, {
        formatConverters: [mockConverter],
      });

      const fakeBuffer = strToBuffer('FAKEFILE');
      await viewer.loadBuffer(fakeBuffer);

      expect(mockConverter.detect).toHaveBeenCalledWith(fakeBuffer);
      expect(mockConverter.convert).toHaveBeenCalledWith(fakeBuffer);
      expect(viewer.getDocument()).not.toBeNull();
      expect(viewer.getDocument()!.header.acadVersion).toBe('AC1027');

      viewer.destroy();
    });

    it('falls back to DXF parsing when no converter matches', async () => {
      const mockConverter: FormatConverter = {
        detect: vi.fn().mockReturnValue(false),
        convert: vi.fn(),
      };

      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, {
        formatConverters: [mockConverter],
      });

      await viewer.loadBuffer(strToBuffer(MINIMAL_DXF));

      expect(mockConverter.detect).toHaveBeenCalled();
      expect(mockConverter.convert).not.toHaveBeenCalled();
      expect(viewer.getDocument()).not.toBeNull();

      viewer.destroy();
    });

    it('uses the first matching converter when multiple are registered', async () => {
      const converter1: FormatConverter = {
        detect: vi.fn().mockReturnValue(true),
        convert: vi.fn().mockResolvedValue(MINIMAL_DXF),
      };
      const converter2: FormatConverter = {
        detect: vi.fn().mockReturnValue(true),
        convert: vi.fn().mockResolvedValue(MINIMAL_DXF),
      };

      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, {
        formatConverters: [converter1, converter2],
      });

      await viewer.loadBuffer(strToBuffer('FAKEFILE'));

      expect(converter1.detect).toHaveBeenCalled();
      expect(converter1.convert).toHaveBeenCalled();
      // Second converter should NOT be checked since first matched
      expect(converter2.detect).not.toHaveBeenCalled();
      expect(converter2.convert).not.toHaveBeenCalled();

      viewer.destroy();
    });

    it('skips converter whose detect() throws and checks next', async () => {
      const throwingConverter: FormatConverter = {
        detect: vi.fn().mockImplementation(() => {
          throw new Error('detect crashed');
        }),
        convert: vi.fn(),
      };
      const goodConverter: FormatConverter = {
        detect: vi.fn().mockReturnValue(true),
        convert: vi.fn().mockResolvedValue(MINIMAL_DXF),
      };

      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, {
        formatConverters: [throwingConverter, goodConverter],
      });

      await viewer.loadBuffer(strToBuffer('FAKEFILE'));

      expect(throwingConverter.detect).toHaveBeenCalled();
      expect(throwingConverter.convert).not.toHaveBeenCalled();
      expect(goodConverter.detect).toHaveBeenCalled();
      expect(goodConverter.convert).toHaveBeenCalled();
      expect(viewer.getDocument()).not.toBeNull();

      viewer.destroy();
    });

    it('propagates convert() errors to the caller', async () => {
      const failingConverter: FormatConverter = {
        detect: vi.fn().mockReturnValue(true),
        convert: vi.fn().mockRejectedValue(new Error('conversion failed')),
      };

      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, {
        formatConverters: [failingConverter],
      });

      await expect(viewer.loadBuffer(strToBuffer('FAKEFILE'))).rejects.toThrow(
        'conversion failed',
      );

      viewer.destroy();
    });

    it('works with no converters registered', async () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);

      await viewer.loadBuffer(strToBuffer(MINIMAL_DXF));
      expect(viewer.getDocument()).not.toBeNull();

      viewer.destroy();
    });
  });

  // ----------------------------------------------------------
  // FormatConverter — loadFile
  // ----------------------------------------------------------

  describe('FormatConverter via loadFile', () => {
    it('passes file buffer to converter detect/convert', async () => {
      const mockConverter: FormatConverter = {
        detect: vi.fn().mockReturnValue(true),
        convert: vi.fn().mockResolvedValue(MINIMAL_DXF),
      };

      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, {
        formatConverters: [mockConverter],
      });

      const file = new File(['FAKEFILE'], 'test.dwg');
      await viewer.loadFile(file);

      expect(mockConverter.detect).toHaveBeenCalled();
      expect(mockConverter.convert).toHaveBeenCalled();
      expect(viewer.getDocument()).not.toBeNull();

      viewer.destroy();
    });

    it('falls back to DXF parsing for .dxf files when converter does not match', async () => {
      const mockConverter: FormatConverter = {
        detect: vi.fn().mockReturnValue(false),
        convert: vi.fn(),
      };

      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, {
        formatConverters: [mockConverter],
      });

      const file = new File([MINIMAL_DXF], 'test.dxf');
      await viewer.loadFile(file);

      expect(mockConverter.detect).toHaveBeenCalled();
      expect(mockConverter.convert).not.toHaveBeenCalled();
      expect(viewer.getDocument()).not.toBeNull();

      viewer.destroy();
    });
  });

  // ----------------------------------------------------------
  // Stale async detection (loadGeneration)
  // ----------------------------------------------------------

  describe('stale async detection', () => {
    it('silently discards results when a new load supersedes an in-flight one', async () => {
      let resolveConvert!: (value: string) => void;
      const slowConverter: FormatConverter = {
        detect: vi.fn().mockReturnValue(true),
        convert: vi.fn().mockImplementation(
          () => new Promise<string>((resolve) => { resolveConvert = resolve; }),
        ),
      };

      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, {
        formatConverters: [slowConverter],
      });

      // Start first load (slow, will be superseded)
      const firstLoad = viewer.loadBuffer(strToBuffer('FIRST'));

      // Start second load (sync DXF, no converter match — use different converter)
      const fastConverter: FormatConverter = {
        detect: vi.fn().mockReturnValue(false),
        convert: vi.fn(),
      };
      // Replace format converters is not supported, so we test by loading synchronously
      // which bumps the generation counter
      viewer.loadString(MINIMAL_DXF);
      const docAfterSync = viewer.getDocument();
      expect(docAfterSync).not.toBeNull();

      // Now resolve the slow converter — it should be a no-op
      resolveConvert(
        `  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1015\n  0\nENDSEC\n  0\nEOF\n`,
      );
      await firstLoad;

      // Document should still be the one from loadString, not from the slow converter
      expect(viewer.getDocument()!.header.acadVersion).toBe('AC1027');

      viewer.destroy();
    });

    it('silently discards loadFile results when destroyed during async convert', async () => {
      let resolveConvert!: (value: string) => void;
      const slowConverter: FormatConverter = {
        detect: vi.fn().mockReturnValue(true),
        convert: vi.fn().mockImplementation(
          () => new Promise<string>((resolve) => { resolveConvert = resolve; }),
        ),
      };

      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, {
        formatConverters: [slowConverter],
      });

      const loadPromise = viewer.loadBuffer(strToBuffer('FAKEFILE'));

      // Destroy while convert is pending
      viewer.destroy();

      // Resolve the converter — should be silently ignored
      resolveConvert(MINIMAL_DXF);
      await loadPromise;

      // Document should be null (cleared by destroy)
      expect(viewer.getDocument()).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // Debug Mode
  // ----------------------------------------------------------

  describe('debug mode', () => {
    it('debug is off by default — getDebugStats returns null', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);

      expect(viewer.getDebugStats()).toBeNull();
      viewer.destroy();
    });

    it('debug: true enables debug mode', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, { debug: true });
      viewer.loadString(DXF_WITH_EXTENTS);

      const stats = viewer.getDebugStats();
      expect(stats).not.toBeNull();
      expect(stats!.fps).toBeGreaterThanOrEqual(0);
      expect(stats!.renderStats).toBeDefined();
      expect(stats!.renderStats.entitiesDrawn).toBeGreaterThanOrEqual(0);
      expect(stats!.renderStats.entitiesSkipped).toBeGreaterThanOrEqual(0);
      expect(stats!.renderStats.drawCalls).toBeGreaterThanOrEqual(0);

      viewer.destroy();
    });

    it('debug: object enables debug mode with granular options', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, {
        debug: { showFps: true, showCamera: false, position: 'bottom-right' },
      });
      viewer.loadString(DXF_WITH_EXTENTS);

      const stats = viewer.getDebugStats();
      expect(stats).not.toBeNull();

      viewer.destroy();
    });

    it('setDebug(true) enables debug mode at runtime', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.loadString(DXF_WITH_EXTENTS);

      expect(viewer.getDebugStats()).toBeNull();

      viewer.setDebug(true);
      // After setDebug triggers a render, stats should be available
      const stats = viewer.getDebugStats();
      expect(stats).not.toBeNull();

      viewer.destroy();
    });

    it('setDebug(false) disables debug mode at runtime', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, { debug: true });
      viewer.loadString(DXF_WITH_EXTENTS);

      expect(viewer.getDebugStats()).not.toBeNull();

      viewer.setDebug(false);
      expect(viewer.getDebugStats()).toBeNull();

      viewer.destroy();
    });

    it('setDebug throws when destroyed', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);
      viewer.destroy();

      expect(() => viewer.setDebug(true)).toThrow(
        'CadViewer: cannot call methods on a destroyed instance.',
      );
    });

    it('records parse timing', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, { debug: true });
      viewer.loadString(DXF_WITH_EXTENTS);

      const stats = viewer.getDebugStats();
      expect(stats).not.toBeNull();
      expect(stats!.parseTime).toBeGreaterThanOrEqual(0);
      expect(typeof stats!.parseTime).toBe('number');

      viewer.destroy();
    });

    it('records spatial index build timing', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, { debug: true });
      viewer.loadString(DXF_WITH_EXTENTS);

      const stats = viewer.getDebugStats();
      expect(stats).not.toBeNull();
      expect(stats!.spatialIndexBuildTime).toBeGreaterThanOrEqual(0);

      viewer.destroy();
    });

    it('reports document info', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, { debug: true });
      viewer.loadString(DXF_WITH_EXTENTS);

      const stats = viewer.getDebugStats();
      expect(stats).not.toBeNull();
      expect(stats!.dxfVersion).toBe('AC1027');
      expect(stats!.layerCount).toBeGreaterThanOrEqual(1);
      expect(stats!.entityCount).toBe(1); // one LINE entity
      expect(stats!.fileSize).toBeGreaterThan(0);

      viewer.destroy();
    });

    it('reports camera info', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, { debug: true });
      viewer.loadString(DXF_WITH_EXTENTS);

      const stats = viewer.getDebugStats();
      expect(stats).not.toBeNull();
      expect(typeof stats!.zoom).toBe('number');
      expect(typeof stats!.pixelSize).toBe('number');
      expect(stats!.viewportBounds).toBeDefined();
      expect(typeof stats!.viewportBounds.minX).toBe('number');

      viewer.destroy();
    });

    it('totalLoadTime equals parseTime + spatialIndexBuildTime', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, { debug: true });
      viewer.loadString(DXF_WITH_EXTENTS);

      const stats = viewer.getDebugStats();
      expect(stats).not.toBeNull();
      expect(stats!.totalLoadTime).toBe(stats!.parseTime + stats!.spatialIndexBuildTime);

      viewer.destroy();
    });

    it('loadDocument sets parseTime to 0', () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, { debug: true });

      // Use a doc with entities/extents so fitToView triggers a render
      const doc = createMinimalDxfDocument();
      doc.header.extMin = { x: 0, y: 0, z: 0 };
      doc.header.extMax = { x: 100, y: 100, z: 0 };
      viewer.loadDocument(doc);

      const stats = viewer.getDebugStats();
      expect(stats).not.toBeNull();
      expect(stats!.parseTime).toBe(0);

      viewer.destroy();
    });
  });

  // ----------------------------------------------------------
  // Constructor options
  // ----------------------------------------------------------

  describe('constructor options', () => {
    it('stores formatConverters from options', async () => {
      const converter: FormatConverter = {
        detect: vi.fn().mockReturnValue(true),
        convert: vi.fn().mockResolvedValue(MINIMAL_DXF),
      };

      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas, {
        formatConverters: [converter],
      });

      await viewer.loadBuffer(strToBuffer('test'));
      expect(converter.detect).toHaveBeenCalled();

      viewer.destroy();
    });

    it('defaults to empty formatConverters when not provided', async () => {
      const canvas = createMockCanvas();
      const viewer = new CadViewer(canvas);

      // Should parse as DXF directly (no converters to check)
      await viewer.loadBuffer(strToBuffer(MINIMAL_DXF));
      expect(viewer.getDocument()).not.toBeNull();

      viewer.destroy();
    });
  });
});
