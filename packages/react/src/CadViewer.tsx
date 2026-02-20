import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from 'react';
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

export interface CadViewerProps {
  file?: File | ArrayBuffer | string | null;
  theme?: Theme;
  tool?: Tool;
  /** Enable debug overlay. Pass `true` for defaults, or a `DebugOptions` object. */
  debug?: boolean | DebugOptions;
  /** Enable off-main-thread DXF parsing via Web Worker. */
  worker?: boolean;
  className?: string;
  style?: CSSProperties;
  options?: Omit<CadViewerOptions, 'theme' | 'initialTool' | 'debug' | 'worker'>;
  /** Format converters for non-DXF file formats (e.g. DWG via @cadview/dwg). */
  formatConverters?: FormatConverter[];
  onSelect?: (event: SelectEvent) => void;
  onMeasure?: (event: MeasureEvent) => void;
  onViewChange?: (transform: ViewTransform) => void;
  onLayersLoaded?: (layers: DxfLayer[]) => void;
}

export interface CadViewerRef {
  getViewer(): CoreCadViewer | null;
  fitToView(): void;
  getLayers(): DxfLayer[];
  setLayerVisible(name: string, visible: boolean): void;
}

export const CadViewer = forwardRef<CadViewerRef, CadViewerProps>(
  function CadViewer(props, ref) {
    const {
      file,
      theme = 'dark',
      tool = 'pan',
      debug,
      worker,
      className,
      style,
      options,
      formatConverters,
      onSelect,
      onMeasure,
      onViewChange,
      onLayersLoaded,
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const viewerRef = useRef<CoreCadViewer | null>(null);

    useEffect(() => {
      if (!canvasRef.current) return;

      const viewer = new CoreCadViewer(canvasRef.current, {
        theme,
        initialTool: tool,
        debug,
        worker,
        formatConverters,
        ...options,
      });
      viewerRef.current = viewer;

      return () => {
        viewer.destroy();
        viewerRef.current = null;
      };
    }, []);

    useEffect(() => {
      viewerRef.current?.setTheme(theme);
    }, [theme]);

    useEffect(() => {
      viewerRef.current?.setTool(tool);
    }, [tool]);

    useEffect(() => {
      if (debug !== undefined) {
        viewerRef.current?.setDebug(debug);
      }
    }, [debug]);

    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer || !file) return;
      let cancelled = false;

      const load = async () => {
        try {
          if (file instanceof File) {
            await viewer.loadFile(file);
          } else if (file instanceof ArrayBuffer) {
            await viewer.loadBuffer(file);
          } else if (typeof file === 'string') {
            viewer.loadString(file);
          }
          if (!cancelled) {
            onLayersLoaded?.(viewer.getLayers());
          }
        } catch (err) {
          if (!cancelled) {
            console.error('CadViewer: failed to load file', err);
          }
        }
      };

      load();

      return () => {
        cancelled = true;
      };
    }, [file]);

    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer) return;

      const handlers: Array<() => void> = [];

      if (onSelect) {
        viewer.on('select', onSelect);
        handlers.push(() => viewer.off('select', onSelect));
      }
      if (onMeasure) {
        viewer.on('measure', onMeasure);
        handlers.push(() => viewer.off('measure', onMeasure));
      }
      if (onViewChange) {
        viewer.on('viewchange', onViewChange);
        handlers.push(() => viewer.off('viewchange', onViewChange));
      }

      return () => { handlers.forEach((h) => { h(); }); };
    }, [onSelect, onMeasure, onViewChange]);

    useImperativeHandle(ref, () => ({
      getViewer: () => viewerRef.current,
      fitToView: () => viewerRef.current?.fitToView(),
      getLayers: () => viewerRef.current?.getLayers() ?? [],
      setLayerVisible: (name: string, visible: boolean) =>
        viewerRef.current?.setLayerVisible(name, visible),
    }));

    return (
      <div
        className={className}
        style={{ position: 'relative', overflow: 'hidden', ...style }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>
    );
  },
);
