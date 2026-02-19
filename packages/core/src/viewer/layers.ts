import type { DxfLayer } from '../parser/types.js';

export class LayerManager {
  private layers: Map<string, DxfLayer> = new Map();
  private visibility: Map<string, boolean> = new Map();
  private colorOverrides: Map<string, string> = new Map();
  private visibleCache: Set<string> | null = null;

  setLayers(layers: Map<string, DxfLayer>): void {
    // Defensive copy — avoid shared mutation with DxfDocument
    this.layers = new Map(layers);
    this.visibility.clear();
    this.colorOverrides.clear();
    this.visibleCache = null;
    for (const [name, layer] of this.layers) {
      this.visibility.set(name, !layer.isOff && !layer.isFrozen);
    }
  }

  getAllLayers(): DxfLayer[] {
    return Array.from(this.layers.values());
  }

  setVisible(name: string, visible: boolean): void {
    this.visibility.set(name, visible);
    this.visibleCache = null; // Invalidate cache
  }

  isVisible(name: string): boolean {
    return this.visibility.get(name) ?? true;
  }

  setColorOverride(name: string, color: string): void {
    this.colorOverrides.set(name, color);
  }

  getColorOverride(name: string): string | undefined {
    return this.colorOverrides.get(name);
  }

  getVisibleLayerNames(): Set<string> {
    if (this.visibleCache) return this.visibleCache;

    const visible = new Set<string>();
    for (const [name, isVisible] of this.visibility) {
      if (isVisible) visible.add(name);
    }
    this.visibleCache = visible;
    return visible;
  }

  clear(): void {
    this.layers.clear();
    this.visibility.clear();
    this.colorOverrides.clear();
    this.visibleCache = null;
  }
}
