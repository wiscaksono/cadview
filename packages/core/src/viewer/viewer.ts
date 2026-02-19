import type { DxfDocument, DxfEntity, DxfLayer } from '../parser/types.js';
import type { ViewTransform } from '../renderer/camera.js';
import type { Theme } from '../renderer/theme.js';
import type { CadViewerEventMap } from './events.js';
import { parseDxf } from '../parser/index.js';
import { CanvasRenderer } from '../renderer/canvas-renderer.js';
import { Camera, fitToView, screenToWorld } from '../renderer/camera.js';
import { LayerManager } from './layers.js';
import { EventEmitter } from './events.js';
import { InputHandler } from './input-handler.js';
import { SpatialIndex, hitTest } from './selection.js';
import { MeasureTool, findSnaps, renderMeasureOverlay } from './measure.js';
import { computeEntitiesBounds } from '../utils/bbox.js';

export type Tool = 'pan' | 'select' | 'measure';

/**
 * Interface for registering custom file format converters.
 * Converters are checked in order during `loadFile()` and `loadBuffer()`.
 * The first converter whose `detect()` returns true will be used.
 */
export interface FormatConverter {
  /**
   * Return true if the buffer is in this format.
   * Implementations should check magic bytes, not file extensions.
   * Must not throw — return false on any error.
   */
  detect(buffer: ArrayBuffer): boolean;

  /**
   * Convert the buffer to a DXF string.
   * The returned string must be valid DXF parseable by `parseDxf()`.
   */
  convert(buffer: ArrayBuffer): Promise<string>;
}

export interface CadViewerOptions {
  theme?: Theme;
  backgroundColor?: string;
  antialias?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number;
  initialTool?: Tool;
  /** Format converters for non-DXF file formats (e.g. DWG via @cadview/dwg). */
  formatConverters?: FormatConverter[];
}

interface ResolvedOptions {
  theme: Theme;
  backgroundColor: string | undefined;
  antialias: boolean;
  minZoom: number;
  maxZoom: number;
  zoomSpeed: number;
  initialTool: Tool;
}

export class CadViewer {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private camera: Camera;
  private layerManager: LayerManager;
  private emitter: EventEmitter<CadViewerEventMap>;
  private spatialIndex: SpatialIndex;
  private measureTool: MeasureTool;
  private doc: DxfDocument | null = null;
  private options: ResolvedOptions;
  private currentTool: Tool;
  private inputHandler: InputHandler;
  private resizeObserver: ResizeObserver;
  private formatConverters: FormatConverter[];
  private selectedEntityIndex: number = -1;
  private renderPending: boolean = false;
  private destroyed: boolean = false;
  private loadGeneration: number = 0;
  private mouseScreenX: number = 0;
  private mouseScreenY: number = 0;

  constructor(canvas: HTMLCanvasElement, options?: CadViewerOptions) {
    this.canvas = canvas;
    this.options = {
      theme: options?.theme ?? 'dark',
      backgroundColor: options?.backgroundColor,
      antialias: options?.antialias ?? true,
      minZoom: options?.minZoom ?? 0.0001,
      maxZoom: options?.maxZoom ?? 100000,
      zoomSpeed: options?.zoomSpeed ?? 1.1,
      initialTool: options?.initialTool ?? 'pan',
    };

    this.formatConverters = options?.formatConverters ?? [];
    this.renderer = new CanvasRenderer(canvas);
    this.camera = new Camera(this.options);
    this.layerManager = new LayerManager();
    this.emitter = new EventEmitter();
    this.spatialIndex = new SpatialIndex();
    this.measureTool = new MeasureTool();
    this.currentTool = this.options.initialTool;

    // Input handling
    this.inputHandler = new InputHandler(canvas, this);

    // Auto-resize on container resize
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);

    // Set cursor
    canvas.style.cursor = this.getCursorForTool(this.currentTool);

    // Initial render (empty canvas with background)
    this.requestRender();
  }

  // === Loading ===

  /**
   * Throws if the viewer has been destroyed.
   * Call at the start of any public method that mutates state.
   */
  private guardDestroyed(): void {
    if (this.destroyed) {
      throw new Error('CadViewer: cannot call methods on a destroyed instance.');
    }
  }

  /**
   * Run registered format converters on a buffer.
   * Returns the converted DXF string if a converter matched, or null otherwise.
   * Each converter's detect() is wrapped in try/catch — a throwing detect() is skipped.
   */
  private async runConverters(buffer: ArrayBuffer): Promise<string | null> {
    for (const converter of this.formatConverters) {
      let detected = false;
      try {
        detected = converter.detect(buffer);
      } catch {
        // detect() should not throw — skip this converter
        continue;
      }
      if (detected) {
        return converter.convert(buffer);
      }
    }
    return null;
  }

  /**
   * Load a CAD file from a browser File object.
   * Automatically detects the format using registered converters (e.g. DWG).
   * Falls back to DXF parsing if no converter matches.
   */
  async loadFile(file: File): Promise<void> {
    this.guardDestroyed();
    const generation = ++this.loadGeneration;

    const buffer = await file.arrayBuffer();
    if (this.destroyed || generation !== this.loadGeneration) return;

    const dxfString = await this.runConverters(buffer);
    if (this.destroyed || generation !== this.loadGeneration) return;

    this.doc = dxfString != null ? parseDxf(dxfString) : parseDxf(buffer);
    this.onDocumentLoaded();
  }

  /**
   * Load a CAD file from an ArrayBuffer with format converter support.
   * Unlike `loadArrayBuffer()` (sync, DXF-only), this method is async and
   * checks registered FormatConverters for non-DXF formats.
   */
  async loadBuffer(buffer: ArrayBuffer): Promise<void> {
    this.guardDestroyed();
    const generation = ++this.loadGeneration;

    const dxfString = await this.runConverters(buffer);
    if (this.destroyed || generation !== this.loadGeneration) return;

    this.doc = dxfString != null ? parseDxf(dxfString) : parseDxf(buffer);
    this.onDocumentLoaded();
  }

  /**
   * Load a pre-parsed DxfDocument directly, bypassing the parser.
   * Useful for custom parsers or pre-processed documents.
   */
  loadDocument(doc: DxfDocument): void {
    this.guardDestroyed();
    ++this.loadGeneration;

    if (!doc || !Array.isArray(doc.entities) || !(doc.layers instanceof Map)) {
      throw new Error('CadViewer: invalid DxfDocument — expected entities array and layers Map.');
    }

    this.doc = doc;
    this.onDocumentLoaded();
  }

  /**
   * Load a DXF string directly (synchronous, no format conversion).
   */
  loadString(dxf: string): void {
    this.guardDestroyed();
    ++this.loadGeneration;
    this.doc = parseDxf(dxf);
    this.onDocumentLoaded();
  }

  /**
   * Load a DXF file from an ArrayBuffer (synchronous, no format conversion).
   * For format conversion support (e.g. DWG), use `loadFile()` or `loadBuffer()` instead.
   */
  loadArrayBuffer(buffer: ArrayBuffer): void {
    this.guardDestroyed();
    ++this.loadGeneration;
    this.doc = parseDxf(buffer);
    this.onDocumentLoaded();
  }

  /**
   * Clear the current document and reset all state without destroying the viewer.
   */
  clearDocument(): void {
    this.guardDestroyed();
    ++this.loadGeneration;
    this.doc = null;
    this.selectedEntityIndex = -1;
    this.spatialIndex.clear();
    this.layerManager.clear();
    this.measureTool.deactivate();
    this.requestRender();
  }

  private onDocumentLoaded(): void {
    if (!this.doc) return;

    // Initialize layers
    this.layerManager.setLayers(this.doc.layers);

    // Build spatial index
    this.spatialIndex.build(this.doc.entities);

    // Reset selection and measurement
    this.selectedEntityIndex = -1;
    this.measureTool.deactivate();
    if (this.currentTool === 'measure') {
      this.measureTool.activate();
    }

    // Fit to view
    this.fitToView();
  }

  // === Camera Controls ===

  fitToView(): void {
    this.guardDestroyed();
    if (!this.doc) return;

    const bounds = this.computeDocumentBounds();
    if (!bounds) return;

    const rect = this.canvas.getBoundingClientRect();
    this.camera.setTransform(
      fitToView(rect.width, rect.height, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
    );
    this.requestRender();
    this.emitter.emit('viewchange', this.camera.getTransform());
  }

  zoomTo(scale: number): void {
    this.guardDestroyed();
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const factor = scale / this.camera.getTransform().scale;
    this.camera.zoom(centerX, centerY, factor);
    this.requestRender();
    this.emitter.emit('viewchange', this.camera.getTransform());
  }

  panTo(worldX: number, worldY: number): void {
    this.guardDestroyed();
    const rect = this.canvas.getBoundingClientRect();
    const vt = this.camera.getTransform();
    const currentSX = worldX * vt.scale + vt.offsetX;
    const currentSY = -worldY * vt.scale + vt.offsetY;
    const dx = rect.width / 2 - currentSX;
    const dy = rect.height / 2 - currentSY;
    this.camera.pan(dx, dy);
    this.requestRender();
    this.emitter.emit('viewchange', this.camera.getTransform());
  }

  getViewTransform(): ViewTransform {
    return { ...this.camera.getTransform() };
  }

  /** @internal */
  getZoomSpeed(): number {
    return this.options.zoomSpeed;
  }

  // === Layers ===

  getLayers(): DxfLayer[] {
    return this.layerManager.getAllLayers();
  }

  setLayerVisible(name: string, visible: boolean): void {
    this.guardDestroyed();
    this.layerManager.setVisible(name, visible);
    this.requestRender();
  }

  setLayerColor(name: string, color: string): void {
    this.guardDestroyed();
    this.layerManager.setColorOverride(name, color);
    this.requestRender();
  }

  // === Theme ===

  setTheme(theme: Theme): void {
    this.guardDestroyed();
    this.options.theme = theme;
    this.requestRender();
  }

  getTheme(): Theme {
    return this.options.theme;
  }

  setBackgroundColor(color: string): void {
    this.guardDestroyed();
    this.options.backgroundColor = color;
    this.requestRender();
  }

  // === Tools ===

  setTool(tool: Tool): void {
    this.guardDestroyed();
    if (this.currentTool === 'measure' && tool !== 'measure') {
      this.measureTool.deactivate();
    }
    this.currentTool = tool;
    this.canvas.style.cursor = this.getCursorForTool(tool);

    if (tool === 'measure') {
      this.measureTool.activate();
    }
    if (tool !== 'select') {
      this.selectedEntityIndex = -1;
    }
    this.requestRender();
  }

  getTool(): Tool {
    return this.currentTool;
  }

  private getCursorForTool(tool: Tool): string {
    switch (tool) {
      case 'pan': return 'grab';
      case 'select': return 'crosshair';
      case 'measure': return 'crosshair';
    }
  }

  // === Events ===

  on<K extends keyof CadViewerEventMap>(
    event: K,
    callback: (data: CadViewerEventMap[K]) => void,
  ): void {
    this.emitter.on(event, callback);
  }

  off<K extends keyof CadViewerEventMap>(
    event: K,
    callback: (data: CadViewerEventMap[K]) => void,
  ): void {
    this.emitter.off(event, callback);
  }

  // === Document Access ===

  getDocument(): DxfDocument | null {
    return this.doc;
  }

  getEntities(): DxfEntity[] {
    return this.doc?.entities ?? [];
  }

  // === Lifecycle ===

  resize(): void {
    this.renderer.updateSize();
    this.requestRender();
  }

  destroy(): void {
    this.destroyed = true;
    this.inputHandler.destroy();
    this.resizeObserver.disconnect();
    this.renderer.destroy();
    this.emitter.removeAllListeners();
    this.spatialIndex.clear();
    this.layerManager.clear();
    this.doc = null;
  }

  // === Internal (called by InputHandler) ===

  /** @internal */
  requestRender(): void {
    if (this.renderPending || this.destroyed) return;
    this.renderPending = true;
    requestAnimationFrame(() => {
      this.renderPending = false;
      if (this.destroyed) return;
      this.doRender();
    });
  }

  private doRender(): void {
    if (!this.doc) {
      this.renderer.renderEmpty(this.options.theme);
      return;
    }
    this.renderer.render(
      this.doc,
      this.camera.getTransform(),
      this.options.theme,
      this.layerManager.getVisibleLayerNames(),
      this.selectedEntityIndex,
    );

    // Render measurement overlay on top
    if (this.currentTool === 'measure' && this.measureTool.state.phase !== 'idle') {
      const ctx = this.renderer.getContext();
      renderMeasureOverlay(
        ctx,
        this.camera.getTransform(),
        this.measureTool,
        this.mouseScreenX,
        this.mouseScreenY,
        this.options.theme,
      );
    }
  }

  /** @internal */
  handlePan(dx: number, dy: number): void {
    this.camera.pan(dx, dy);
    this.requestRender();
    this.emitter.emit('viewchange', this.camera.getTransform());
  }

  /** @internal */
  handleZoom(screenX: number, screenY: number, factor: number): void {
    this.camera.zoom(screenX, screenY, factor);
    this.requestRender();
    this.emitter.emit('viewchange', this.camera.getTransform());
  }

  /** @internal */
  handleClick(screenX: number, screenY: number): void {
    if (!this.doc) return;
    const vt = this.camera.getTransform();
    const [wx, wy] = screenToWorld(vt, screenX, screenY);

    switch (this.currentTool) {
      case 'select':
        this.handleSelect(wx, wy, screenX, screenY);
        break;
      case 'measure': {
        const snaps = findSnaps(wx, wy, this.doc.entities, this.spatialIndex, vt.scale);
        const snap = snaps.length > 0 ? snaps[0]! : null;
        const result = this.measureTool.handleClick(wx, wy, snap);
        this.requestRender();
        if (result) {
          this.emitter.emit('measure', result);
        }
        break;
      }
    }
  }

  /** @internal — called by InputHandler for mouse move */
  handleMouseMove(screenX: number, screenY: number): void {
    this.mouseScreenX = screenX;
    this.mouseScreenY = screenY;

    if (this.currentTool === 'measure' && this.doc) {
      const vt = this.camera.getTransform();
      const [wx, wy] = screenToWorld(vt, screenX, screenY);
      const snaps = findSnaps(wx, wy, this.doc.entities, this.spatialIndex, vt.scale);
      this.measureTool.handleMove(snaps[0] ?? null);
      this.requestRender();
    }
  }

  private handleSelect(wx: number, wy: number, sx: number, sy: number): void {
    if (!this.doc) return;
    const index = hitTest(
      wx, wy,
      this.doc.entities,
      this.spatialIndex,
      this.layerManager.getVisibleLayerNames(),
      this.camera.getTransform().scale,
    );
    this.selectedEntityIndex = index;
    this.requestRender();

    if (index >= 0 && this.doc) {
      const entity = this.doc.entities[index];
      if (entity) {
        this.emitter.emit('select', {
          entity,
          entityIndex: index,
          worldPoint: { x: wx, y: wy },
          screenPoint: { x: sx, y: sy },
        });
      }
    }
  }

  private computeDocumentBounds(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (!this.doc) return null;

    if (this.doc.header.extMin && this.doc.header.extMax) {
      return {
        minX: this.doc.header.extMin.x,
        minY: this.doc.header.extMin.y,
        maxX: this.doc.header.extMax.x,
        maxY: this.doc.header.extMax.y,
      };
    }

    return computeEntitiesBounds(this.doc.entities);
  }
}
