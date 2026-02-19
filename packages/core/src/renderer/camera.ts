export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function worldToScreen(vt: ViewTransform, wx: number, wy: number): [number, number] {
  return [
    wx * vt.scale + vt.offsetX,
    -wy * vt.scale + vt.offsetY,
  ];
}

export function screenToWorld(vt: ViewTransform, sx: number, sy: number): [number, number] {
  return [
    (sx - vt.offsetX) / vt.scale,
    -(sy - vt.offsetY) / vt.scale,
  ];
}

export function applyTransform(ctx: CanvasRenderingContext2D, vt: ViewTransform): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(vt.scale * dpr, 0, 0, -vt.scale * dpr, vt.offsetX * dpr, vt.offsetY * dpr);
}

export function fitToView(
  canvasWidth: number,
  canvasHeight: number,
  minX: number, minY: number,
  maxX: number, maxY: number,
  padding: number = 0.05,
): ViewTransform {
  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;

  if (worldWidth <= 0 || worldHeight <= 0) {
    return { scale: 1, offsetX: canvasWidth / 2, offsetY: canvasHeight / 2 };
  }

  const scaleX = canvasWidth / worldWidth;
  const scaleY = canvasHeight / worldHeight;
  const scale = Math.min(scaleX, scaleY) * (1 - padding * 2);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const offsetX = canvasWidth / 2 - centerX * scale;
  const offsetY = canvasHeight / 2 + centerY * scale;

  return { scale, offsetX, offsetY };
}

export function zoomAtPoint(
  vt: ViewTransform,
  screenX: number,
  screenY: number,
  zoomFactor: number,
  minScale: number = 0.0001,
  maxScale: number = 100000,
): ViewTransform {
  const newScale = Math.max(minScale, Math.min(maxScale, vt.scale * zoomFactor));
  const actualFactor = newScale / vt.scale;

  return {
    scale: newScale,
    offsetX: screenX - (screenX - vt.offsetX) * actualFactor,
    offsetY: screenY - (screenY - vt.offsetY) * actualFactor,
  };
}

export class Camera {
  private transform: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
  private minScale: number;
  private maxScale: number;

  constructor(options: { minZoom: number; maxZoom: number }) {
    this.minScale = options.minZoom;
    this.maxScale = options.maxZoom;
  }

  getTransform(): ViewTransform {
    return this.transform;
  }

  setTransform(vt: ViewTransform): void {
    this.transform = vt;
  }

  pan(dx: number, dy: number): void {
    this.transform = {
      ...this.transform,
      offsetX: this.transform.offsetX + dx,
      offsetY: this.transform.offsetY + dy,
    };
  }

  zoom(screenX: number, screenY: number, factor: number): void {
    this.transform = zoomAtPoint(
      this.transform, screenX, screenY, factor,
      this.minScale, this.maxScale,
    );
  }
}
