import type { Point2D, DxfEntity } from '../parser/types.js';
import type { ViewTransform } from '../renderer/camera.js';
import type { Theme } from '../renderer/theme.js';
import type { MeasureEvent } from './events.js';
import type { SpatialIndex } from './selection.js';
import { THEMES } from '../renderer/theme.js';
import { worldToScreen, screenToWorld } from '../renderer/camera.js';

export type SnapType = 'endpoint' | 'midpoint' | 'center' | 'nearest';

export interface SnapResult {
  point: Point2D;
  type: SnapType;
  entityIndex: number;
}

export type MeasureState =
  | { phase: 'idle' }
  | { phase: 'first-point' }
  | { phase: 'second-point'; firstPoint: Point2D; firstSnap?: SnapResult }
  | { phase: 'done'; firstPoint: Point2D; secondPoint: Point2D; distance: number; angle: number };

export class MeasureTool {
  state: MeasureState = { phase: 'idle' };
  currentSnap: SnapResult | null = null;

  activate(): void {
    this.state = { phase: 'first-point' };
    this.currentSnap = null;
  }

  deactivate(): void {
    this.state = { phase: 'idle' };
    this.currentSnap = null;
  }

  handleClick(wx: number, wy: number, snap: SnapResult | null): MeasureEvent | null {
    const point = snap ? snap.point : { x: wx, y: wy };

    switch (this.state.phase) {
      case 'first-point':
        this.state = {
          phase: 'second-point',
          firstPoint: point,
          firstSnap: snap ?? undefined,
        };
        return null;

      case 'second-point': {
        const p1 = this.state.firstPoint;
        const p2 = point;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        this.state = { phase: 'done', firstPoint: p1, secondPoint: p2, distance, angle };

        return {
          distance,
          angle,
          deltaX: dx,
          deltaY: dy,
          points: [p1, p2],
        };
      }

      case 'done':
        // Reset and start new measurement
        this.state = { phase: 'second-point', firstPoint: point };
        return null;

      default:
        return null;
    }
  }

  handleMove(snap: SnapResult | null): void {
    this.currentSnap = snap;
  }
}

// --- Snap System ---

export function findSnaps(
  wx: number,
  wy: number,
  entities: DxfEntity[],
  spatialIndex: SpatialIndex,
  scale: number,
  snapTypes: Set<SnapType> = new Set(['endpoint', 'midpoint', 'center']),
): SnapResult[] {
  const tolerance = 10 / scale;
  const results: SnapResult[] = [];

  const candidates = spatialIndex.search(
    wx - tolerance, wy - tolerance,
    wx + tolerance, wy + tolerance,
  );

  for (const item of candidates) {
    const entity = entities[item.entityIndex];
    if (!entity) continue;
    const idx = item.entityIndex;

    switch (entity.type) {
      case 'LINE': {
        if (snapTypes.has('endpoint')) {
          addIfClose(results, entity.start.x, entity.start.y, 'endpoint', idx, wx, wy, tolerance);
          addIfClose(results, entity.end.x, entity.end.y, 'endpoint', idx, wx, wy, tolerance);
        }
        if (snapTypes.has('midpoint')) {
          const mx = (entity.start.x + entity.end.x) / 2;
          const my = (entity.start.y + entity.end.y) / 2;
          addIfClose(results, mx, my, 'midpoint', idx, wx, wy, tolerance);
        }
        break;
      }

      case 'CIRCLE': {
        if (snapTypes.has('center')) {
          addIfClose(results, entity.center.x, entity.center.y, 'center', idx, wx, wy, tolerance);
        }
        if (snapTypes.has('endpoint')) {
          for (const angle of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
            const qx = entity.center.x + entity.radius * Math.cos(angle);
            const qy = entity.center.y + entity.radius * Math.sin(angle);
            addIfClose(results, qx, qy, 'endpoint', idx, wx, wy, tolerance);
          }
        }
        break;
      }

      case 'ARC': {
        if (snapTypes.has('center')) {
          addIfClose(results, entity.center.x, entity.center.y, 'center', idx, wx, wy, tolerance);
        }
        if (snapTypes.has('endpoint')) {
          const startRad = entity.startAngle * Math.PI / 180;
          const endRad = entity.endAngle * Math.PI / 180;
          addIfClose(results, entity.center.x + entity.radius * Math.cos(startRad), entity.center.y + entity.radius * Math.sin(startRad), 'endpoint', idx, wx, wy, tolerance);
          addIfClose(results, entity.center.x + entity.radius * Math.cos(endRad), entity.center.y + entity.radius * Math.sin(endRad), 'endpoint', idx, wx, wy, tolerance);
        }
        break;
      }

      case 'LWPOLYLINE':
      case 'POLYLINE': {
        if (snapTypes.has('endpoint')) {
          for (const v of entity.vertices) {
            addIfClose(results, v.x, v.y, 'endpoint', idx, wx, wy, tolerance);
          }
        }
        if (snapTypes.has('midpoint')) {
          for (let i = 0; i < entity.vertices.length - 1; i++) {
            const a = entity.vertices[i]!;
            const b = entity.vertices[i + 1]!;
            addIfClose(results, (a.x + b.x) / 2, (a.y + b.y) / 2, 'midpoint', idx, wx, wy, tolerance);
          }
        }
        break;
      }

      case 'ELLIPSE': {
        if (snapTypes.has('center')) {
          addIfClose(results, entity.center.x, entity.center.y, 'center', idx, wx, wy, tolerance);
        }
        break;
      }

      case 'TEXT': {
        if (snapTypes.has('endpoint')) {
          addIfClose(results, entity.insertionPoint.x, entity.insertionPoint.y, 'endpoint', idx, wx, wy, tolerance);
        }
        break;
      }
      case 'MTEXT': {
        if (snapTypes.has('endpoint')) {
          addIfClose(results, entity.insertionPoint.x, entity.insertionPoint.y, 'endpoint', idx, wx, wy, tolerance);
        }
        break;
      }
    }
  }

  results.sort((a, b) =>
    Math.hypot(a.point.x - wx, a.point.y - wy) -
    Math.hypot(b.point.x - wx, b.point.y - wy)
  );

  return results;
}

function addIfClose(
  results: SnapResult[],
  x: number, y: number,
  type: SnapType,
  entityIndex: number,
  wx: number, wy: number,
  tolerance: number,
): void {
  if (Math.hypot(x - wx, y - wy) <= tolerance) {
    results.push({ point: { x, y }, type, entityIndex });
  }
}

// --- Overlay Rendering ---

export function renderMeasureOverlay(
  ctx: CanvasRenderingContext2D,
  vt: ViewTransform,
  measureTool: MeasureTool,
  mouseScreenX: number,
  mouseScreenY: number,
  theme: Theme,
): void {
  const config = THEMES[theme];
  ctx.setTransform(1, 0, 0, 1, 0, 0); // switch to screen space

  const state = measureTool.state;

  // Draw snap indicator
  if (measureTool.currentSnap) {
    const [sx, sy] = worldToScreen(vt, measureTool.currentSnap.point.x, measureTool.currentSnap.point.y);
    drawSnapIndicator(ctx, sx, sy, measureTool.currentSnap.type, config.measureColor);
  }

  if (state.phase === 'second-point') {
    const [sx1, sy1] = worldToScreen(vt, state.firstPoint.x, state.firstPoint.y);
    let targetX: number;
    let targetY: number;

    if (measureTool.currentSnap) {
      const [snapSx, snapSy] = worldToScreen(vt, measureTool.currentSnap.point.x, measureTool.currentSnap.point.y);
      targetX = snapSx;
      targetY = snapSy;
    } else {
      targetX = mouseScreenX;
      targetY = mouseScreenY;
    }

    // Dashed dimension line
    ctx.strokeStyle = config.measureColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Endpoint markers
    drawEndpointMarker(ctx, sx1, sy1, config.measureColor);
    drawEndpointMarker(ctx, targetX, targetY, config.measureColor);

    // Live distance label
    let twx: number;
    let twy: number;
    if (measureTool.currentSnap) {
      twx = measureTool.currentSnap.point.x;
      twy = measureTool.currentSnap.point.y;
    } else {
      [twx, twy] = screenToWorld(vt, mouseScreenX, mouseScreenY);
    }
    const dist = Math.hypot(twx - state.firstPoint.x, twy - state.firstPoint.y);
    drawMeasureLabel(ctx, (sx1 + targetX) / 2, (sy1 + targetY) / 2, dist, theme);
  }

  if (state.phase === 'done') {
    const [sx1, sy1] = worldToScreen(vt, state.firstPoint.x, state.firstPoint.y);
    const [sx2, sy2] = worldToScreen(vt, state.secondPoint.x, state.secondPoint.y);

    // Solid dimension line
    ctx.strokeStyle = config.measureColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    drawEndpointMarker(ctx, sx1, sy1, config.measureColor);
    drawEndpointMarker(ctx, sx2, sy2, config.measureColor);
    drawMeasureLabel(ctx, (sx1 + sx2) / 2, (sy1 + sy2) / 2, state.distance, theme);
  }
}

function drawSnapIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, type: SnapType, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const size = 8;

  switch (type) {
    case 'endpoint':
      ctx.strokeRect(x - size / 2, y - size / 2, size, size);
      break;
    case 'midpoint':
      ctx.beginPath();
      ctx.moveTo(x, y - size / 2);
      ctx.lineTo(x + size / 2, y + size / 2);
      ctx.lineTo(x - size / 2, y + size / 2);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'center':
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'nearest':
      ctx.beginPath();
      ctx.moveTo(x - size / 2, y - size / 2);
      ctx.lineTo(x + size / 2, y + size / 2);
      ctx.moveTo(x + size / 2, y - size / 2);
      ctx.lineTo(x - size / 2, y + size / 2);
      ctx.stroke();
      break;
  }
}

function drawEndpointMarker(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawMeasureLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  distance: number,
  theme: Theme,
): void {
  const label = distance.toFixed(4);

  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  const metrics = ctx.measureText(label);
  const pad = 4;
  const bgX = x - metrics.width / 2 - pad;
  const bgY = y - 20;
  const bgW = metrics.width + pad * 2;
  const bgH = 18;

  ctx.fillStyle = theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)';
  ctx.fillRect(bgX, bgY, bgW, bgH);

  ctx.fillStyle = THEMES[theme].measureColor;
  ctx.fillText(label, x, y - 6);
}
