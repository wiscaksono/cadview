import type { Point2D, DxfEntity } from '../parser/types.js';
import type { ViewTransform } from '../renderer/camera.js';

export interface SelectEvent {
  entity: DxfEntity;
  entityIndex: number;
  worldPoint: Point2D;
  screenPoint: Point2D;
}

export interface MeasureEvent {
  distance: number;
  angle: number;
  deltaX: number;
  deltaY: number;
  points: [Point2D, Point2D];
}

export interface CadViewerEventMap {
  select: SelectEvent;
  measure: MeasureEvent;
  viewchange: ViewTransform;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (data: any) => void;

export class EventEmitter<T extends Record<string, any> = Record<string, any>> {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    this.listeners.get(event as string)!.add(callback as EventCallback);
  }

  off<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    this.listeners.get(event as string)?.delete(callback as EventCallback);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const callbacks = this.listeners.get(event as string);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(data);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
