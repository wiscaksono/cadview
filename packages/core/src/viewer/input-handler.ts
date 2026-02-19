import type { CadViewer } from './viewer.js';

export class InputHandler {
  private isPanning = false;
  private lastX = 0;
  private lastY = 0;
  private touches: Map<number, { x: number; y: number }> = new Map();

  // Bound event handlers (for cleanup)
  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;
  private onWheel: (e: WheelEvent) => void;
  private onTouchStart: (e: TouchEvent) => void;
  private onTouchMove: (e: TouchEvent) => void;
  private onTouchEnd: (e: TouchEvent) => void;
  private onContextMenu: (e: Event) => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private viewer: CadViewer,
  ) {
    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);
    this.onWheel = this.handleWheel.bind(this);
    this.onTouchStart = this.handleTouchStart.bind(this);
    this.onTouchMove = this.handleTouchMove.bind(this);
    this.onTouchEnd = this.handleTouchEnd.bind(this);
    this.onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
    canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }

  // --- Pointer Events (Mouse) ---

  private handlePointerDown(e: PointerEvent): void {
    const tool = this.viewer.getTool();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.button === 0 && tool === 'pan') {
      this.startPan(e, x, y);
    } else if (e.button === 1) {
      // Middle click: always pan
      this.startPan(e, x, y);
    } else if (e.button === 0 && (tool === 'select' || tool === 'measure')) {
      this.viewer.handleClick(x, y);
    }
  }

  private startPan(e: PointerEvent, x: number, y: number): void {
    this.isPanning = true;
    this.lastX = x;
    this.lastY = y;
    this.canvas.setPointerCapture(e.pointerId);
    this.canvas.style.cursor = 'grabbing';
  }

  private handlePointerMove(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isPanning) {
      const dx = x - this.lastX;
      const dy = y - this.lastY;
      this.lastX = x;
      this.lastY = y;
      this.viewer.handlePan(dx, dy);
    } else {
      // Report mouse position for snap preview
      this.viewer.handleMouseMove(x, y);
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.releasePointerCapture(e.pointerId);
      this.canvas.style.cursor = this.viewer.getTool() === 'pan' ? 'grab' : 'crosshair';
    }
  }

  // --- Wheel (Zoom) ---

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const delta = -Math.sign(e.deltaY);
    const speed = this.viewer.getZoomSpeed();
    const factor = delta > 0 ? speed : 1 / speed;

    this.viewer.handleZoom(x, y, factor);
  }

  // --- Touch Events (Pinch-to-Zoom) ---

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      this.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();

    if (this.touches.size === 2 && e.touches.length === 2) {
      const t0 = e.touches[0]!;
      const t1 = e.touches[1]!;
      const prev = Array.from(this.touches.values());

      const prevDist = Math.hypot(prev[0]!.x - prev[1]!.x, prev[0]!.y - prev[1]!.y);
      const currDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);

      if (prevDist > 0) {
        const zoomFactor = currDist / prevDist;

        const rect = this.canvas.getBoundingClientRect();
        const prevCenterX = (prev[0]!.x + prev[1]!.x) / 2 - rect.left;
        const prevCenterY = (prev[0]!.y + prev[1]!.y) / 2 - rect.top;
        const currCenterX = (t0.clientX + t1.clientX) / 2 - rect.left;
        const currCenterY = (t0.clientY + t1.clientY) / 2 - rect.top;

        this.viewer.handleZoom(prevCenterX, prevCenterY, zoomFactor);
        this.viewer.handlePan(currCenterX - prevCenterX, currCenterY - prevCenterY);
      }
    } else if (this.touches.size === 1 && e.touches.length === 1) {
      const t = e.touches[0]!;
      const prev = this.touches.get(t.identifier);
      if (prev) {
        this.viewer.handlePan(
          t.clientX - prev.x,
          t.clientY - prev.y,
        );
      }
    }

    for (const t of Array.from(e.changedTouches)) {
      this.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    for (const t of Array.from(e.changedTouches)) {
      this.touches.delete(t.identifier);
    }
  }
}
