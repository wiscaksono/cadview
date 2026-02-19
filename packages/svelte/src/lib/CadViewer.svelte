<script lang="ts">
  import { untrack } from 'svelte';
  import {
    CadViewer as CoreCadViewer,
    type CadViewerOptions,
    type FormatConverter,
    type DebugOptions,
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
    /** Enable debug overlay. Pass `true` for defaults, or a `DebugOptions` object. */
    debug?: boolean | DebugOptions;
    options?: Omit<CadViewerOptions, 'theme' | 'initialTool' | 'debug'>;
    /** Format converters for non-DXF file formats (e.g. DWG via @cadview/dwg). */
    formatConverters?: FormatConverter[];
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
    debug,
    options = {},
    formatConverters,
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
    const initialDebug = untrack(() => debug);
    const initialOptions = untrack(() => options);

    const initialConverters = untrack(() => formatConverters);

    const v = new CoreCadViewer(canvas, {
      theme: initialTheme,
      initialTool: initialTool,
      debug: initialDebug,
      formatConverters: initialConverters,
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

  // React to debug changes
  $effect(() => {
    if (debug !== undefined) {
      viewer?.setDebug(debug);
    }
  });

  // React to file changes
  $effect(() => {
    if (!viewer || !file) return;
    const v = viewer;
    let cancelled = false;

    const load = async () => {
      try {
        if (file instanceof File) {
          await v.loadFile(file);
        } else if (file instanceof ArrayBuffer) {
          await v.loadBuffer(file);
        } else if (typeof file === 'string') {
          v.loadString(file);
        }
        if (!cancelled) {
          untrack(() => onlayersloaded)?.(v.getLayers());
        }
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('CadViewer: failed to load file', err);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
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
