<script lang="ts">
  import { untrack } from 'svelte';
  import {
    CadViewer as CoreCadViewer,
    type CadViewerOptions,
    type DxfLayer,
    type SelectEvent,
    type MeasureEvent,
    type ViewTransform,
    type Tool,
    type Theme,
  } from '@cadview/core';

  interface Props {
    file?: File | ArrayBuffer | string | null;
    theme?: Theme;
    tool?: Tool;
    options?: Omit<CadViewerOptions, 'theme' | 'initialTool'>;
    class?: string;
    onselect?: (event: SelectEvent) => void;
    onmeasure?: (event: MeasureEvent) => void;
    onviewchange?: (transform: ViewTransform) => void;
    onlayersloaded?: (layers: DxfLayer[]) => void;
  }

  let {
    file = null,
    theme = 'dark',
    tool = 'pan',
    options = {},
    class: className = '',
    onselect,
    onmeasure,
    onviewchange,
    onlayersloaded,
  }: Props = $props();

  let canvas: HTMLCanvasElement;
  let viewer: CoreCadViewer | null = $state(null);

  // Initialize viewer — untrack reactive reads to prevent re-creation
  $effect(() => {
    if (!canvas) return;

    const initialTheme = untrack(() => theme);
    const initialTool = untrack(() => tool);
    const initialOptions = untrack(() => options);

    const v = new CoreCadViewer(canvas, {
      theme: initialTheme,
      initialTool: initialTool,
      ...initialOptions,
    });
    viewer = v;

    return () => {
      v.destroy();
      viewer = null;
    };
  });

  // React to theme changes
  $effect(() => {
    viewer?.setTheme(theme);
  });

  // React to tool changes
  $effect(() => {
    viewer?.setTool(tool);
  });

  // React to file changes
  $effect(() => {
    if (!viewer || !file) return;
    const v = viewer;

    if (file instanceof File) {
      v.loadFile(file).then(
        () => { untrack(() => onlayersloaded)?.(v.getLayers()); },
        (err: unknown) => { console.error('CadViewer: failed to load file', err); },
      );
    } else if (file instanceof ArrayBuffer) {
      v.loadArrayBuffer(file);
      untrack(() => onlayersloaded)?.(v.getLayers());
    } else if (typeof file === 'string') {
      v.loadString(file);
      untrack(() => onlayersloaded)?.(v.getLayers());
    }
  });

  // Event listener management
  $effect(() => {
    if (!viewer) return;
    const v = viewer;

    const cleanups: Array<() => void> = [];

    if (onselect) {
      v.on('select', onselect);
      cleanups.push(() => { v.off('select', onselect!); });
    }
    if (onmeasure) {
      v.on('measure', onmeasure);
      cleanups.push(() => { v.off('measure', onmeasure!); });
    }
    if (onviewchange) {
      v.on('viewchange', onviewchange);
      cleanups.push(() => { v.off('viewchange', onviewchange!); });
    }

    return () => { cleanups.forEach((c) => { c(); }); };
  });

  export function getViewer(): CoreCadViewer | null {
    return viewer;
  }

  export function fitToView(): void {
    viewer?.fitToView();
  }

  export function getLayers(): DxfLayer[] {
    return viewer?.getLayers() ?? [];
  }

  export function setLayerVisible(name: string, visible: boolean): void {
    viewer?.setLayerVisible(name, visible);
  }
</script>

<div class={className} style="position: relative; overflow: hidden;">
  <canvas
    bind:this={canvas}
    style="display: block; width: 100%; height: 100%;"
  ></canvas>
</div>
