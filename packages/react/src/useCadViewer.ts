import { useEffect, useRef, useState, useCallback } from 'react';
import {
  CadViewer,
  type CadViewerOptions,
  type DxfLayer,
} from '@cadview/core';

export function useCadViewer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options?: CadViewerOptions,
) {
  const viewerRef = useRef<CadViewer | null>(null);
  const [viewer, setViewer] = useState<CadViewer | null>(null);
  const [layers, setLayers] = useState<DxfLayer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const v = new CadViewer(canvasRef.current, options);
    viewerRef.current = v;
    setViewer(v);
    return () => {
      v.destroy();
      viewerRef.current = null;
      setViewer(null);
    };
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (!viewerRef.current) return;
    setError(null);
    try {
      await viewerRef.current.loadFile(file);
      setLayers(viewerRef.current.getLayers());
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  const loadString = useCallback((dxf: string) => {
    if (!viewerRef.current) return;
    setError(null);
    try {
      viewerRef.current.loadString(dxf);
      setLayers(viewerRef.current.getLayers());
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  return {
    viewer,
    layers,
    isLoaded,
    error,
    loadFile,
    loadString,
    fitToView: () => viewerRef.current?.fitToView(),
    setLayerVisible: (name: string, visible: boolean) =>
      viewerRef.current?.setLayerVisible(name, visible),
    setTheme: (theme: 'dark' | 'light') =>
      viewerRef.current?.setTheme(theme),
    setTool: (tool: 'pan' | 'select' | 'measure') =>
      viewerRef.current?.setTool(tool),
  };
}
