import type { Theme } from './theme.js';
import { THEMES } from './theme.js';

// === Types ===

export interface RenderStats {
  entitiesDrawn: number;
  entitiesSkipped: number;
  drawCalls: number;
  byType: Record<string, number>;
}

export interface DebugOptions {
  showFps?: boolean;
  showRenderStats?: boolean;
  showDocumentInfo?: boolean;
  showTimings?: boolean;
  showCamera?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface DebugStats {
  fps: number;
  frameTime: number;
  renderStats: RenderStats;
  entityCount: number;
  layerCount: number;
  visibleLayerCount: number;
  blockCount: number;
  parseTime: number;
  spatialIndexBuildTime: number;
  totalLoadTime: number;
  zoom: number;
  pixelSize: number;
  viewportBounds: { minX: number; minY: number; maxX: number; maxY: number };
  fileName: string | null;
  fileSize: number;
  dxfVersion: string | null;
}

// === Defaults ===

type ResolvedDebugOptions = Required<DebugOptions>;

export const DEFAULT_DEBUG_OPTIONS: ResolvedDebugOptions = {
  showFps: true,
  showRenderStats: true,
  showDocumentInfo: true,
  showTimings: true,
  showCamera: true,
  position: 'top-left',
};

export function resolveDebugOptions(input?: Partial<DebugOptions>): ResolvedDebugOptions {
  return { ...DEFAULT_DEBUG_OPTIONS, ...input };
}

// === Helpers ===

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatZoom(scale: number): string {
  if (scale >= 1) return `${scale.toFixed(2)}x`;
  return `1:${(1 / scale).toFixed(1)}`;
}

// === Overlay Renderer ===

const FONT = '11px monospace';
const LINE_HEIGHT = 15;
const SEPARATOR_HEIGHT = 8;
const PADDING = 8;
const MARGIN = 10;

/**
 * Render a debug overlay panel on the canvas in screen space.
 * Follows the same pattern as renderMeasureOverlay — resets transform to screen space.
 */
export function renderDebugOverlay(
  ctx: CanvasRenderingContext2D,
  stats: DebugStats,
  theme: Theme,
  options: ResolvedDebugOptions,
  canvasWidth: number,
  canvasHeight: number,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Build lines grouped by section
  const sections: string[][] = [];

  if (options.showFps) {
    sections.push([
      `FPS: ${stats.fps}  Frame: ${stats.frameTime.toFixed(1)}ms`,
    ]);
  }

  if (options.showRenderStats) {
    const total = stats.renderStats.entitiesDrawn + stats.renderStats.entitiesSkipped;
    const lines: string[] = [
      `Drawn: ${stats.renderStats.entitiesDrawn} / ${total}  Calls: ${stats.renderStats.drawCalls}`,
    ];

    // Top entity types by count
    const types = Object.entries(stats.renderStats.byType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([type, count]) => `${type}: ${count}`)
      .join('  ');
    if (types) lines.push(types);

    sections.push(lines);
  }

  if (options.showDocumentInfo) {
    const lines: string[] = [
      `Layers: ${stats.visibleLayerCount} / ${stats.layerCount}  Blocks: ${stats.blockCount}`,
    ];
    if (stats.dxfVersion) lines.push(`DXF: ${stats.dxfVersion}`);
    if (stats.fileName) lines.push(`File: ${stats.fileName}`);
    if (stats.fileSize > 0) lines.push(`Size: ${formatBytes(stats.fileSize)}`);
    sections.push(lines);
  }

  if (options.showTimings) {
    const parts: string[] = [];
    if (stats.parseTime > 0) parts.push(`Parse: ${stats.parseTime.toFixed(0)}ms`);
    if (stats.spatialIndexBuildTime > 0) parts.push(`Index: ${stats.spatialIndexBuildTime.toFixed(0)}ms`);
    if (stats.totalLoadTime > 0) parts.push(`Load: ${stats.totalLoadTime.toFixed(0)}ms`);
    if (parts.length > 0) {
      sections.push([parts.join('  ')]);
    }
  }

  if (options.showCamera) {
    const b = stats.viewportBounds;
    sections.push([
      `Zoom: ${formatZoom(stats.zoom)}  Pixel: ${stats.pixelSize.toFixed(2)}`,
      `View: [${b.minX.toFixed(0)}, ${b.minY.toFixed(0)}] \u2192 [${b.maxX.toFixed(0)}, ${b.maxY.toFixed(0)}]`,
    ]);
  }

  if (sections.length === 0) return;

  // Flatten with separators between sections
  ctx.font = FONT;

  const rows: Array<{ text: string; isSeparator: boolean }> = [];
  for (let s = 0; s < sections.length; s++) {
    if (s > 0) rows.push({ text: '', isSeparator: true });
    for (const line of sections[s]!) {
      rows.push({ text: line, isSeparator: false });
    }
  }

  // Measure panel dimensions
  let maxWidth = 0;
  for (const row of rows) {
    if (!row.isSeparator) {
      const w = ctx.measureText(row.text).width;
      if (w > maxWidth) maxWidth = w;
    }
  }

  const panelWidth = maxWidth + PADDING * 2;
  let panelHeight = PADDING * 2;
  for (const row of rows) {
    panelHeight += row.isSeparator ? SEPARATOR_HEIGHT : LINE_HEIGHT;
  }

  // Position
  let x: number;
  let y: number;
  switch (options.position) {
    case 'top-left':
      x = MARGIN; y = MARGIN; break;
    case 'top-right':
      x = canvasWidth - panelWidth - MARGIN; y = MARGIN; break;
    case 'bottom-left':
      x = MARGIN; y = canvasHeight - panelHeight - MARGIN; break;
    case 'bottom-right':
      x = canvasWidth - panelWidth - MARGIN; y = canvasHeight - panelHeight - MARGIN; break;
  }

  // Background
  const config = THEMES[theme];
  ctx.fillStyle = theme === 'dark' ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(x, y, panelWidth, panelHeight);

  // Border
  ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, panelWidth - 1, panelHeight - 1);

  // Text
  ctx.fillStyle = theme === 'dark' ? config.defaultEntityColor : 'rgba(0, 0, 0, 0.85)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  let cursorY = y + PADDING;
  for (const row of rows) {
    if (row.isSeparator) {
      cursorY += SEPARATOR_HEIGHT;
    } else {
      ctx.fillText(row.text, x + PADDING, cursorY);
      cursorY += LINE_HEIGHT;
    }
  }
}
