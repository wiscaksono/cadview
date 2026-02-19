import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import {
  CadViewer,
  type CadViewerOptions,
  type DxfLayer,
  type Theme,
  type Tool,
} from '@cadview/core';

export function useCadViewer(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options?: CadViewerOptions,
) {
  const viewer = ref<CadViewer | null>(null);
  const layers = ref<DxfLayer[]>([]);
  const isLoaded = ref(false);

  onMounted(() => {
    if (!canvasRef.value) return;
    viewer.value = new CadViewer(canvasRef.value, options);
  });

  onUnmounted(() => {
    viewer.value?.destroy();
    viewer.value = null;
  });

  const loadFile = async (file: File) => {
    if (!viewer.value) return;
    await viewer.value.loadFile(file);
    layers.value = viewer.value.getLayers();
    isLoaded.value = true;
  };

  const loadString = (dxf: string) => {
    if (!viewer.value) return;
    viewer.value.loadString(dxf);
    layers.value = viewer.value.getLayers();
    isLoaded.value = true;
  };

  return {
    viewer,
    layers,
    isLoaded,
    loadFile,
    loadString,
    fitToView: () => viewer.value?.fitToView(),
    setLayerVisible: (name: string, visible: boolean) =>
      viewer.value?.setLayerVisible(name, visible),
    setTheme: (theme: Theme) => viewer.value?.setTheme(theme),
    setTool: (tool: Tool) => viewer.value?.setTool(tool),
  };
}
