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
  className?: string;
  style?: CSSProperties;
  options?: Omit<CadViewerOptions, 'theme' | 'initialTool'>;
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
      className,
      style,
      options,
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
      const viewer = viewerRef.current;
      if (!viewer || !file) return;

      if (file instanceof File) {
        viewer.loadFile(file).then(
          () => onLayersLoaded?.(viewer.getLayers()),
          (err) => console.error('CadViewer: failed to load file', err),
        );
      } else if (file instanceof ArrayBuffer) {
        viewer.loadArrayBuffer(file);
        onLayersLoaded?.(viewer.getLayers());
      } else if (typeof file === 'string') {
        viewer.loadString(file);
        onLayersLoaded?.(viewer.getLayers());
      }
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
